import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { ShoppingBag, Smartphone, Loader2, AlertTriangle } from 'lucide-react';

interface RecItem {
  name: string;
  pct: number;
  count: number;
}

interface ClusterRec {
  clusterId: string;
  personaName: string;
  personaNameEn: string;
  customerCount: number;
  bankingProducts: RecItem[];
  transactionServices: RecItem[];
  description?: string | null;    // persona tooltip (deskripsi_persona)
  descriptionEn?: string | null;  // persona tooltip (deskripsi_persona_en)
}

export function RecommenderRecommendations() {
  const { lang } = useI18n();
  const [rows, setRows] = useState<ClusterRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);
  // Acquisition (needs_cluster / All-Channel) vs Retention (mb_archetype / MB).
  const [tab, setTab] = useState<'acquisition' | 'retention'>('acquisition');
  // Segment-tab hover tooltip (persona description). Fixed-positioned from the
  // hovered tab's rect so it is not clipped by the scrollable tab row.
  const [tabTip, setTabTip] = useState<{ x: number; y: number; title: string; body: string } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('auth_token');
        const path = tab === 'retention'
          ? '/api/v1/executive/segmentation/bag-overview/recommender-retention'
          : '/api/v1/executive/segmentation/bag-overview/recommender';
        const res = await fetch(path, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          setError(`HTTP ${res.status}`);
          return;
        }
        const body = await res.json();
        if (body.success && Array.isArray(body.data)) {
          setRows(body.data);
          setSelected(0);
        } else {
          setError(body.message || 'INVALID_RESPONSE');
        }
      } catch (err: any) {
        console.error('Failed to fetch recommender data:', err);
        setError(err?.message || 'NETWORK_ERROR');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [tab]);

  const numLocale = lang === 'id' ? 'id-ID' : 'en-US';
  const fmtPct = (v: number) =>
    `${v.toLocaleString(numLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  const personaLabel = (c: ClusterRec) => (lang === 'id' ? c.personaName : c.personaNameEn || c.personaName);

  if (loading) {
    return (
      <div className="px-6 pt-3 pb-6">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin text-[#8A6534]" />
          <span className="text-sm font-medium">{lang === 'id' ? 'Memuat data…' : 'Loading data…'}</span>
        </div>
      </div>
    );
  }

  if (error || rows.length === 0) {
    return (
      <div className="px-6 pt-3 pb-6">
        <div className="bg-white border border-red-200 rounded-xl p-6 shadow-xs max-w-2xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {lang === 'id' ? 'Tidak bisa terhubung ke database' : 'Cannot connect to the database'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {lang === 'id'
                  ? 'Data rekomendasi produk gagal dimuat. Periksa koneksi ke database lalu muat ulang halaman.'
                  : 'Product recommendation data failed to load. Check the database connection and reload the page.'}
              </p>
              {error && <p className="text-xs text-slate-400 mt-2 font-mono">({error})</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const c = rows[Math.min(selected, rows.length - 1)];

  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {lang === 'id' ? 'Rekomendasi Produk' : 'Product Recommendations'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {lang === 'id'
            ? 'Produk perbankan & layanan transaksi yang paling direkomendasikan per segmen nasabah.'
            : 'Most-recommended banking products & transaction services per customer segment.'}
        </p>
      </div>

      {/* Acquisition / Retention toggle — full width, two equal halves */}
      <div className="grid grid-cols-2 gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200">
        <button
          type="button"
          onClick={() => setTab('acquisition')}
          className={`w-full px-4 py-2.5 text-sm font-bold rounded-lg transition cursor-pointer ${
            tab === 'acquisition' ? 'bg-[#8A6534] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {lang === 'id' ? 'Segmentasi Pengguna Semua Channel' : 'All-Channel User Segmentation'}
        </button>
        <button
          type="button"
          onClick={() => setTab('retention')}
          className={`w-full px-4 py-2.5 text-sm font-bold rounded-lg transition cursor-pointer ${
            tab === 'retention' ? 'bg-[#8A6534] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {lang === 'id' ? 'Segmentasi Pengguna Mobile Banking' : 'Mobile Banking User Segmentation'}
        </button>
      </div>

      {/* Segment tabs (Chrome-style, same as the Segmentation Overview page):
          the active tab is white and flows into the card below; inactive tabs
          are tinted. The combo box is replaced by these tabs. */}
      <div>
        <div className="flex items-end overflow-x-auto overflow-y-hidden no-scrollbar">
          {rows.map((r, i) => {
            const isActive = i === selected;
            const full = personaLabel(r);
            // Tooltip = persona description, falling back to the full name.
            const desc = lang === 'id' ? r.description : (r.descriptionEn || r.description);
            const tip = desc && desc.trim() ? desc : full;
            return (
              <button
                key={r.clusterId}
                type="button"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const TIP_W = 576;
                  const x = Math.min(rect.left, Math.max(8, window.innerWidth - TIP_W - 8));
                  setTabTip({ x, y: rect.bottom + 6, title: full, body: tip });
                }}
                onMouseLeave={() => setTabTip(null)}
                onClick={() => { setSelected(i); setTabTip(null); }}
                className={`relative flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#8A6534] z-10'
                    : 'bg-[#8A6534]/10 text-slate-600 hover:bg-[#8A6534]/15 hover:text-slate-800'
                }`}
              >
                {full}
              </button>
            );
          })}
        </div>

        {/* Recommendation card for the selected segment — flush under the active
            tab (no top-left rounding, so the active tab merges in). */}
        <div className="bg-white border border-slate-200 rounded-xl rounded-tl-none p-5 shadow-2xs">
          {/* Total customers line below the tab header. */}
          <p className="text-xs text-slate-500 mb-4">
            {lang === 'id' ? 'Total nasabah' : 'Total customers'}:{' '}
            <span className="font-bold text-[#8A6534]">{c.customerCount.toLocaleString(numLocale)}</span>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Banking Products */}
          <div className="bg-[#8A6534]/5 p-4 rounded-lg border border-[#8A6534]/20">
            <p className="text-xs font-bold text-[#6B4E2E] flex items-center gap-1.5 mb-3">
              <ShoppingBag className="w-3.5 h-3.5 text-[#8A6534]" />
              <span>{lang === 'id' ? 'Top 3 Produk Perbankan' : 'Top 3 Banking Products'}</span>
            </p>
            <RecList items={c.bankingProducts} color="#8A6534" fmtPct={fmtPct} numLocale={numLocale} lang={lang} />
          </div>

          {/* Transaction Services */}
          <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
            <p className="text-xs font-bold text-cyan-800 flex items-center gap-1.5 mb-3">
              <Smartphone className="w-3.5 h-3.5 text-cyan-600" />
              <span>{lang === 'id' ? 'Top 3 Layanan Transaksi' : 'Top 3 Transaction Services'}</span>
            </p>
            <RecList items={c.transactionServices} color="#0E7490" fmtPct={fmtPct} numLocale={numLocale} lang={lang} />
          </div>
        </div>
        </div>
      </div>

      {/* Segment-tab hover tooltip (fixed position so it is never clipped by the
          scrollable tab row). Shows the persona name + description. */}
      {tabTip && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-[1000] w-[36rem] max-w-[90vw] rounded-lg bg-slate-900 text-white text-[11px] leading-relaxed font-medium px-3 py-2 shadow-xl"
          style={{ left: tabTip.x, top: tabTip.y }}
        >
          <div className="font-bold text-[#E8C87E] mb-0.5">{tabTip.title}</div>
          {tabTip.body}
        </div>
      )}
    </div>
  );
}

function RecList({
  items, color, fmtPct, numLocale, lang,
}: {
  items: RecItem[];
  color: string;
  fmtPct: (v: number) => string;
  numLocale: string;
  lang: 'id' | 'en';
}) {
  if (!items || items.length === 0) {
    return <p className="text-xs text-slate-500">-</p>;
  }
  const max = Math.max(1, ...items.map((i) => i.pct));
  return (
    <div className="space-y-3">
      {items.map((p, idx) => (
        <div key={idx}>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-2">
              <span
                className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: color }}
              >
                {idx + 1}
              </span>
              {p.name}
            </span>
            <span className="text-[11px] font-bold whitespace-nowrap" style={{ color }}>
              {fmtPct(p.pct)}
            </span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden ml-7">
            <div className="h-full rounded-full" style={{ width: `${(p.pct / max) * 100}%`, backgroundColor: color }} />
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 ml-7">
            {p.count.toLocaleString(numLocale)} {lang === 'id' ? 'nasabah' : 'customers'}
          </p>
        </div>
      ))}
    </div>
  );
}
