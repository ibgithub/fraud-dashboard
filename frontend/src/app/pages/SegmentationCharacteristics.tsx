import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { Layers, Target, Loader2, AlertTriangle, Clock } from 'lucide-react';

// One row per persona segment from bag_demo segmentation.cluster_persona (via backend).
interface CustomerAnalytics {
  cluster: string;
  personaName: string;
  personaNameEn: string;
  recommendationType: string; // human_approach | special_approach
  riskLevel: string;
  totalCustomers: number | null;
  avgAge: number | null;
  avgTenureMonths: number | null;
  avgTotalBalance: number | null;
  avgProductsHeld: number | null;
  avgMonthlyTxn: number | null;
  mobileBankingRate: number | null; // 0..1
  mbShare: number | null;        // retention: share of txn via MB, 0..1
  retentionRate: number | null;  // retention: 0..1
  avgTotalAssets: number | null; // retention: IDR
  keyCharacteristic: string | null;
  keyCharacteristicEn: string | null;
  marketingStrategy: string | null;
  marketingStrategyEn: string | null;
  description?: string | null;    // persona tooltip (deskripsi_persona)
  descriptionEn?: string | null;  // persona tooltip (deskripsi_persona_en)
  strategies?: StrategyItem[] | null;
}

interface StrategyItem {
  label: string;
  labelEn: string;
  text: string | null;
  textEn: string | null;
}

export function SegmentationCharacteristics() {
  const { lang } = useI18n();
  const [acqRows, setAcqRows] = useState<CustomerAnalytics[]>([]);
  const [retRows, setRetRows] = useState<CustomerAnalytics[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Acquisition (persona_strategi_akuisisi) / Retention (persona_strategi_retensi).
  const [tab, setTab] = useState<'acquisition' | 'retention'>('acquisition');
  // Persona-tab hover tooltip (name + description), fixed-positioned from the
  // hovered tab's rect so it is never clipped by the scrollable tab row.
  const [tabTip, setTabTip] = useState<{ x: number; y: number; title: string; body: string } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('auth_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const base = '/api/v1/executive/segmentation/bag-overview';
        // Acquisition personas from persona_strategi_akuisisi; retention personas
        // from persona_strategi_retensi. Fetched together, switched by tab.
        const [acqRes, retRes] = await Promise.all([
          fetch(`${base}/characteristics`, { headers }),
          fetch(`${base}/characteristics-retention`, { headers }),
        ]);
        if (!acqRes.ok) {
          setError(`HTTP ${acqRes.status}`);
          return;
        }
        const acqBody = await acqRes.json();
        if (acqBody.success && Array.isArray(acqBody.data)) {
          setAcqRows(acqBody.data);
        } else {
          setError(acqBody.message || 'INVALID_RESPONSE');
          return;
        }
        if (retRes.ok) {
          const retBody = await retRes.json();
          if (retBody.success && Array.isArray(retBody.data)) setRetRows(retBody.data);
        }
      } catch (err: any) {
        console.error('Failed to fetch customer analytics:', err);
        setError(err?.message || 'NETWORK_ERROR');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Switching tabs resets the selected segment to the first one.
  const switchTab = (t: 'acquisition' | 'retention') => {
    setTab(t);
    setSelected(0);
  };

  // Loading state.
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

  // Active tab's rows (acquisition or retention).
  const rows = tab === 'retention' ? retRows : acqRows;

  // Error / empty state (acquisition is the primary dataset).
  if (error || acqRows.length === 0) {
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
                  ? 'Data karakteristik segmen gagal dimuat. Periksa koneksi ke database lalu muat ulang halaman.'
                  : 'Segment characteristics data failed to load. Check the database connection and reload the page.'}
              </p>
              {error && <p className="text-xs text-slate-400 mt-2 font-mono">({error})</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Numeric formatting helpers.
  const num = (v: number | null, digits = 0) =>
    v === null || v === undefined ? '-' : v.toLocaleString('id-ID', { maximumFractionDigits: digits });
  const withUnit = (value: string, unitId: string, unitEn: string) =>
    value === '-' ? value : `${value} ${lang === 'id' ? unitId : unitEn}`;
  // Money formatting, language-aware.
  //  ID: "Rp"  + Jt (juta/1e6)   / M (miliar/1e9)  / T (triliun/1e12)
  //  EN: "IDR" + M (million/1e6) / B (billion/1e9) / T (trillion/1e12)
  const rupiah = (v: number | null) => {
    if (v == null) return '-';
    const locale = lang === 'id' ? 'id-ID' : 'en-US';
    const sym = lang === 'id' ? 'Rp' : 'IDR';
    const fmt = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 1 });
    if (v >= 1_000_000_000_000) return `${sym} ${fmt(v / 1_000_000_000_000)} T`;
    if (v >= 1_000_000_000) return `${sym} ${fmt(v / 1_000_000_000)} ${lang === 'id' ? 'M' : 'B'}`;
    if (v >= 1_000_000) return `${sym} ${fmt(v / 1_000_000)} ${lang === 'id' ? 'Jt' : 'M'}`;
    return `${sym} ${v.toLocaleString(locale)}`;
  };

  // The currently selected persona for the active tab (guarded: retention may
  // still be loading / empty).
  const c = rows.length > 0 ? rows[Math.min(selected, rows.length - 1)] : null;
  const personaName = c ? (lang === 'id' ? c.personaName : (c.personaNameEn || c.personaName)) : '';

  // Tab-specific statistics. Acquisition keeps the original 5 rows; retention
  // uses tenure / txn-per-month / MB share / retention rate instead of balance.
  const stats: Array<{ labelId: string; labelEn: string; value: string }> = c
    ? tab === 'retention'
      ? [
          { labelId: 'Rata-rata Usia', labelEn: 'Avg Age', value: withUnit(num(c.avgAge), 'th', 'yr') },
          { labelId: 'Rata-rata Produk Dimiliki', labelEn: 'Avg Products Held', value: num(c.avgProductsHeld, 1) },
          { labelId: 'Rata-rata Masa Aktif', labelEn: 'Avg Tenure', value: withUnit(num(c.avgTenureMonths, 1), 'bln', 'mo') },
          { labelId: 'Rata-rata Transaksi / Bulan', labelEn: 'Avg Txn / Month', value: num(c.avgMonthlyTxn, 1) },
          { labelId: 'Porsi Mobile Banking', labelEn: 'Mobile Banking Share', value: c.mbShare == null ? '-' : `${num(c.mbShare * 100, 1)}%` },
          { labelId: 'Tingkat Retensi', labelEn: 'Retention Rate', value: c.retentionRate == null ? '-' : `${num(c.retentionRate * 100, 1)}%` },
          { labelId: 'Total Nasabah', labelEn: 'Total Customers', value: num(c.totalCustomers) },
        ]
      : [
          { labelId: 'Rata-rata Usia', labelEn: 'Avg Age', value: withUnit(num(c.avgAge), 'th', 'yr') },
          { labelId: 'Rata-rata Produk Dimiliki', labelEn: 'Avg Products Held', value: num(c.avgProductsHeld, 1) },
          { labelId: 'Rata-rata Saldo', labelEn: 'Avg Balance', value: rupiah(c.avgTotalBalance) },
          { labelId: 'Penggunaan Mobile Banking', labelEn: 'Mobile Banking Usage', value: c.mobileBankingRate == null ? '-' : `${num(c.mobileBankingRate * 100, 1)}%` },
          { labelId: 'Total Nasabah', labelEn: 'Total Customers', value: num(c.totalCustomers) },
        ]
    : [];

  const keyChar = c ? (lang === 'id' ? c.keyCharacteristic : (c.keyCharacteristicEn || c.keyCharacteristic)) : null;
  const strategy = c ? (lang === 'id' ? c.marketingStrategy : (c.marketingStrategyEn || c.marketingStrategy)) : null;

  // Key Characteristic: split on semicolons into separate points.
  const splitSemicolons = (text: string | null | undefined): string[] => {
    if (!text) return [];
    return text
      .split(/;\s*/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };
  // Business Strategy: split a paragraph into points on sentence periods.
  // Keeps the trailing period; "Channel:" / "KPI:" colons are not split.
  const splitSentences = (text: string | null | undefined): string[] => {
    if (!text) return [];
    return text
      .split(/\.\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => (s.endsWith('.') ? s : s + '.'));
  };
  // Key Characteristic: split on semicolons AND sentence periods, so each
  // sentence/clause becomes its own bullet (acquisition + retention).
  const keyCharItems = splitSemicolons(keyChar).flatMap((part) => splitSentences(part));
  // Legacy single-strategy fallback (used only if the labeled list is empty).
  const strategyItems = splitSentences(strategy).slice(0, 2);

  // Labeled business strategies (acquisition: 2 items; retention: 4 items).
  // Each strategy's text is broken into bullet points on sentence periods.
  const strategyList = (c?.strategies ?? [])
    .map((s) => ({
      label: lang === 'id' ? s.label : (s.labelEn || s.label),
      points: splitSentences(lang === 'id' ? s.text : (s.textEn || s.text)),
    }))
    .filter((s) => s.points.length > 0);

  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {lang === 'id' ? 'Karakteristik & Strategi Segmen' : 'Segment Characteristics & Strategy'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {lang === 'id'
            ? 'Profil demografi & formulasi strategi bisnis per segmen.'
            : 'Demographic profile & business strategy per segment.'}
        </p>
      </div>

      {/* Acquisition / Retention toggle — full width, two equal halves */}
      <div className="grid grid-cols-2 gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200">
        <button
          type="button"
          onClick={() => switchTab('acquisition')}
          className={`w-full px-4 py-2.5 text-sm font-bold rounded-lg transition cursor-pointer ${
            tab === 'acquisition' ? 'bg-[#8A6534] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {lang === 'id' ? 'Segmentasi Pengguna Semua Channel' : 'All-Channel User Segmentation'}
        </button>
        <button
          type="button"
          onClick={() => switchTab('retention')}
          className={`w-full px-4 py-2.5 text-sm font-bold rounded-lg transition cursor-pointer ${
            tab === 'retention' ? 'bg-[#8A6534] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {lang === 'id' ? 'Segmentasi Pengguna Mobile Banking' : 'Mobile Banking User Segmentation'}
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="w-full flex flex-col items-center justify-center text-center py-16 px-6 rounded-xl border border-dashed border-amber-300 bg-amber-50/50">
          <Clock className="w-8 h-8 text-amber-500 mb-2" />
          <p className="text-base font-bold text-slate-700">
            {lang === 'id' ? 'Data retensi belum tersedia' : 'Retention data not available yet'}
          </p>
          <p className="text-sm text-slate-500 mt-1 max-w-md">
            {lang === 'id'
              ? 'Karakteristik & strategi per archetype retensi gagal dimuat.'
              : 'Characteristics & strategy per retention archetype failed to load.'}
          </p>
        </div>
      ) : (
      /* Per-segment tabs — same style as the Demographics tabs: small text,
          no border/seam, active tab flows into the content card. */
      <div>
        <div className="flex items-end overflow-x-auto overflow-y-hidden no-scrollbar">
          {rows.map((r, i) => {
            const isActive = i === Math.min(selected, rows.length - 1);
            const full = lang === 'id' ? r.personaName : (r.personaNameEn || r.personaName);
            const words = (full || '').split(/\s+/);
            const take = words[1] === '&' ? 3 : 2;
            const short = words.slice(0, take).join(' ');
            // Rich hover tooltip = persona description (falls back to the name).
            const desc = lang === 'id' ? r.description : (r.descriptionEn || r.description);
            const tip = desc && desc.trim() ? desc : full;
            return (
              <button
                key={r.cluster || i}
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
                {isActive ? full : short}
              </button>
            );
          })}
        </div>

        {/* Tab content — white card, no top-left rounding/border so the active
            tab sits flush with no seam line. */}
        <div className="bg-white rounded-xl rounded-tl-none shadow-2xs p-5">
        {/* Main Grid: Cluster Statistics (left) + Key Characteristic & Strategy (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* Left Card: Cluster Statistics */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {lang === 'id' ? 'Statistik Segmen' : 'Segment Statistics'}
              </h3>
              <p className="text-xs text-[#8A6534] mt-0.5 font-bold">{personaName}</p>
            </div>
          </div>

          <div className="space-y-2">
            {stats.map((s) => (
              <StatRow key={s.labelId} label={lang === 'id' ? s.labelId : s.labelEn} value={s.value} />
            ))}
          </div>
        </div>

        {/* Right Card: Key Characteristic + Business Strategy */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="space-y-4">
            {/* Key Characteristic */}
            <div>
              <p className="text-xs font-extrabold text-slate-800 mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#8A6534]" />
                <span>{lang === 'id' ? 'Karakteristik Utama' : 'Key Characteristic'}</span>
              </p>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                {keyCharItems.length > 0 ? (
                  <div className="space-y-2.5">
                    {keyCharItems.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-xs text-slate-700 font-medium leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8A6534] shrink-0 mt-[7px]" />
                        <p className="flex-1 pt-0.5">{item}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">-</p>
                )}
              </div>
            </div>

            {/* Business Strategy */}
            <div>
              <div className="mb-2">
                <p className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-[#8A6534]" />
                  <span>{lang === 'id' ? 'Strategi Bisnis' : 'Business Strategy'}</span>
                </p>
              </div>
              <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/80">
                {strategyList.length > 0 ? (
                  <div className="space-y-3.5">
                    {strategyList.map((s, idx) => (
                      <div key={idx}>
                        <span className="inline-block text-[11px] font-bold text-[#8A6534] bg-[#8A6534]/10 border border-[#8A6534]/20 px-2 py-0.5 rounded-md mb-2">
                          {s.label}
                        </span>
                        <div className="space-y-1.5">
                          {s.points.map((pt, j) => (
                            <div key={j} className="flex items-start gap-2.5 text-xs text-slate-800 font-medium leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#8A6534] shrink-0 mt-[7px]" />
                              <p className="flex-1 pt-0.5">{pt}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : strategyItems.length > 0 ? (
                  <div className="space-y-2.5">
                    {strategyItems.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-xs text-slate-800 font-medium leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8A6534] shrink-0 mt-[7px]" />
                        <p className="flex-1 pt-0.5">{item}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-800 font-medium leading-relaxed">-</p>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
        </div>
      </div>
      )}

      {/* Persona-tab hover tooltip (fixed position so it is never clipped by the
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

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
      <span className="text-xs text-slate-700 font-bold">{label}</span>
      <span className="text-xs font-extrabold text-[#8A6534] text-right leading-snug">{value}</span>
    </div>
  );
}
