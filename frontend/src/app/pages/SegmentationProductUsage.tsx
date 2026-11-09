import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2 } from 'lucide-react';

interface ClusterInfo {
  clusterId: string;
  personaNameId: string;
  personaNameEn: string;
  customerCount: number;
}

interface ProductUsageResponse {
  clusters: ClusterInfo[];
  products: string[];
  usageData: Record<string, number[]>;
}

// Palette (supports up to the 5 bag_demo clusters).
const BAR_COLORS = ['#8A6534', '#0E7490', '#7C3AED', '#059669', '#B4522E'];

export function SegmentationProductUsage() {
  const { lang } = useI18n();
  // Acquisition (per needs-cluster) / Retention (per mb_archetype).
  const [tab, setTab] = useState<'acquisition' | 'retention'>('acquisition');
  const [viewMode, setViewMode] = useState<'product' | 'cluster'>('product');
  const [data, setData] = useState<ProductUsageResponse | null>(null);
  const [retData, setRetData] = useState<ProductUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedCluster, setSelectedCluster] = useState(0);
  // Persona description lookups (persona name -> description), for the rich
  // cluster-tab hover tooltip. Sourced from the characteristics endpoints, keyed
  // by persona name so it works for both acquisition and retention.
  const [descAcq, setDescAcq] = useState<Record<string, { id: string | null; en: string | null }>>({});
  const [descRet, setDescRet] = useState<Record<string, { id: string | null; en: string | null }>>({});
  // Cluster-tab hover tooltip (name + description), fixed-positioned.
  const [tabTip, setTabTip] = useState<{ x: number; y: number; title: string; body: string } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const base = '/api/v1/executive/segmentation';
        const [acqRes, retRes] = await Promise.all([
          fetch(`${base}/product-usage`, { headers }),
          fetch(`${base}/product-usage-retention`, { headers }),
        ]);
        if (acqRes.ok) {
          const body = await acqRes.json();
          if (body.success && body.data) {
            setData(body.data);
            if (body.data.products && body.data.products.length > 0) {
              setSelectedProduct(body.data.products[0]);
            }
          }
        }
        if (retRes.ok) {
          const retBody = await retRes.json();
          if (retBody.success && retBody.data) setRetData(retBody.data);
        }
        // Persona descriptions (for the cluster-tab tooltip), keyed by name.
        try {
          const [cAcq, cRet] = await Promise.all([
            fetch(`${base}/bag-overview/characteristics`, { headers }),
            fetch(`${base}/bag-overview/characteristics-retention`, { headers }),
          ]);
          const toMap = (arr: any[]): Record<string, { id: string | null; en: string | null }> => {
            const m: Record<string, { id: string | null; en: string | null }> = {};
            for (const r of arr || []) {
              if (r.personaName) m[r.personaName] = { id: r.description ?? null, en: r.descriptionEn ?? null };
              if (r.personaNameEn) m[r.personaNameEn] = { id: r.description ?? null, en: r.descriptionEn ?? null };
            }
            return m;
          };
          if (cAcq.ok) { const b = await cAcq.json(); if (b.success && Array.isArray(b.data)) setDescAcq(toMap(b.data)); }
          if (cRet.ok) { const b = await cRet.json(); if (b.success && Array.isArray(b.data)) setDescRet(toMap(b.data)); }
        } catch { /* tooltip descriptions are best-effort */ }
      } catch (err) {
        console.error('Failed to fetch product usage data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Active dataset follows the Acquisition / Retention tab.
  const active = tab === 'retention' ? retData : data;

  // Switching tabs resets the per-view selections and defaults the product.
  const switchTab = (t: 'acquisition' | 'retention') => {
    setTab(t);
    setSelectedCluster(0);
    const ds = t === 'retention' ? retData : data;
    setSelectedProduct(ds?.products?.[0] ?? '');
  };

  // Always render from the DB response only — no cached/dummy fallback.
  const clustersList = active?.clusters ?? [];
  const productsList = active?.products ?? [];
  const usageMap = active?.usageData ?? {};
  const hasData = clustersList.length > 0 && productsList.length > 0;

  const clusterNames = clustersList.map((c) => (lang === 'id' ? c.personaNameId : c.personaNameEn));

  // View A: Select product -> distribution across all clusters
  const productViewData = clustersList.map((c, i) => ({
    cluster: lang === 'id' ? c.personaNameId : c.personaNameEn,
    usage: usageMap[selectedProduct]?.[i] || 0,
    count: c.customerCount,
  }));

  // View B: Select cluster -> usage of all products in that cluster
  const currentClusterIndex = Math.min(selectedCluster, clustersList.length - 1);
  const clusterViewData = productsList.map((p) => ({
    product: p,
    usage: usageMap[p]?.[currentClusterIndex] || 0,
  }));

  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'id' ? 'Analisis Penggunaan Produk' : 'Product Usage Analysis'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {lang === 'id'
              ? 'Tingkat adopsi produk perbankan & kanal transaksi per segmen nasabah.'
              : 'Product adoption rate & transaction channels across customer segments.'}
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-[#6B4E2E] animate-spin" />
          </div>
        )}
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

      {!hasData ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 shadow-2xs flex flex-col items-center justify-center text-center gap-2">
          {loading ? (
            <>
              <Loader2 className="w-7 h-7 text-[#6B4E2E] animate-spin" />
              <p className="text-sm font-semibold text-slate-500">{lang === 'id' ? 'Memuat data...' : 'Loading data...'}</p>
            </>
          ) : (
            <p className="text-sm font-semibold text-slate-500">
              {lang === 'id' ? 'Data penggunaan produk belum tersedia.' : 'Product usage data is not available yet.'}
            </p>
          )}
        </div>
      ) : (
        /* Single white card: Per Produk/Per Segmen toggle + selection tabs + chart. */
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          {/* Row 1: view-mode toggle (Per Produk / Per Segmen) */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 border border-slate-200 w-fit">
            <button
              onClick={() => setViewMode('product')}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
                viewMode === 'product' ? 'bg-[#6B4E2E] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'id' ? 'Per Produk' : 'By Product'}
            </button>
            <button
              onClick={() => setViewMode('cluster')}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
                viewMode === 'cluster' ? 'bg-[#6B4E2E] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'id' ? 'Per Segmen' : 'By Segment'}
            </button>
          </div>

          {/* Row 2: selection as tabs — same style as the Segment Characteristics
              per-segment tabs (active tab flows into the content below). */}
          {viewMode === 'product' ? (
            <div className="flex items-end overflow-x-auto overflow-y-hidden no-scrollbar">
              {productsList.map((p) => {
                const isActive = selectedProduct === p;
                return (
                  <button
                    key={p}
                    type="button"
                    title={p}
                    onClick={() => setSelectedProduct(p)}
                    className={`relative flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg whitespace-nowrap transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-white text-[#8A6534] z-10'
                        : 'bg-[#8A6534]/10 text-slate-600 hover:bg-[#8A6534]/15 hover:text-slate-800'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-end overflow-x-auto overflow-y-hidden no-scrollbar">
              {clusterNames.map((cn, i) => {
                const isActive = currentClusterIndex === i;
                // Inactive tabs show only the first 2 words (3 if the 2nd is "&"),
                // matching the Demographics tabs on Segmentation Overview.
                const words = (cn || '').split(/\s+/);
                const take = words[1] === '&' ? 3 : 2;
                const short = words.slice(0, take).join(' ');
                // Rich hover tooltip = persona description (falls back to name).
                const descMap = tab === 'retention' ? descRet : descAcq;
                const d = descMap[cn];
                const desc = d ? (lang === 'id' ? d.id : (d.en || d.id)) : null;
                const tip = desc && desc.trim() ? desc : cn;
                return (
                  <button
                    key={i}
                    type="button"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const TIP_W = 576;
                      const x = Math.min(rect.left, Math.max(8, window.innerWidth - TIP_W - 8));
                      setTabTip({ x, y: rect.bottom + 6, title: cn, body: tip });
                    }}
                    onMouseLeave={() => setTabTip(null)}
                    onClick={() => { setSelectedCluster(i); setTabTip(null); }}
                    className={`relative flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg whitespace-nowrap transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-white text-[#8A6534] z-10'
                        : 'bg-[#8A6534]/10 text-slate-600 hover:bg-[#8A6534]/15 hover:text-slate-800'
                    }`}
                  >
                    {isActive ? cn : short}
                  </button>
                );
              })}
            </div>
          )}

          {/* Chart + title */}
          {viewMode === 'product' ? (
            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                {lang === 'id'
                  ? `Distribusi penetrasi "${selectedProduct}" di semua segmen nasabah`
                  : `"${selectedProduct}" penetration distribution across all customer segments`}
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                {lang === 'id'
                  ? 'Persentase pengguna / pemegang produk berdasarkan populasi nasabah per segmen'
                  : 'Percentage of active product holders based on population per segment'}
              </p>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={productViewData} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="cluster" fontSize={11} stroke="#64748B" />
                  <YAxis tickFormatter={(v) => `${v}%`} fontSize={11} stroke="#64748B" domain={[0, 100]} />
                  <Tooltip
                    formatter={(v: number) => [`${v.toFixed(2)}%`, lang === 'id' ? 'Penetrasi' : 'Penetration']}
                    labelFormatter={(lbl) => `${lbl}`}
                  />
                  <Bar dataKey="usage" radius={[6, 6, 0, 0]} barSize={48}>
                    {productViewData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                {lang === 'id'
                  ? `Penggunaan produk & kanal transaksi di segmen "${clusterNames[currentClusterIndex]}"`
                  : `Product & channel usage in "${clusterNames[currentClusterIndex]}" segment`}
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                {lang === 'id'
                  ? 'Tingkat adopsi produk & kanal transaksi perbankan (Total: ' + (clustersList[currentClusterIndex]?.customerCount?.toLocaleString('id-ID') || 0) + ' nasabah)'
                  : 'Product & channel adoption rates (Total: ' + (clustersList[currentClusterIndex]?.customerCount?.toLocaleString('id-ID') || 0) + ' customers)'}
              </p>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={clusterViewData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" tickFormatter={(v) => `${v}%`} fontSize={11} stroke="#64748B" domain={[0, 100]} />
                  <YAxis type="category" dataKey="product" width={140} fontSize={11} stroke="#64748B" />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(2)}%`, lang === 'id' ? 'Adopsi' : 'Adoption']} />
                  <Bar
                    dataKey="usage"
                    fill={BAR_COLORS[currentClusterIndex % BAR_COLORS.length]}
                    radius={[0, 6, 6, 0]}
                    barSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Cluster-tab hover tooltip (fixed position so it is never clipped by the
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
