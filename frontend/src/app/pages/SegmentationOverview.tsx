import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { PieChart as PieIcon, Users, AlertTriangle, Loader2, Clock } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, ReferenceLine } from 'recharts';

// One segment as returned by /api/v1/segmentation/bag-overview (from ods.mv_h.s).
interface SegmentItem {
  segment: number;
  name: string;
  nameEn?: string;
  count: number;
  pct: number;
}

// One demographic datapoint from ods.mv_segment_demographics (long format).
interface DemoItem {
  key: string;
  label: string;
  labelEn?: string;
  count: number;
  statValue?: number | null;
}

// metric -> ordered rows. Only ready metrics are returned by the backend.
interface DemoMetrics {
  age_bucket?: DemoItem[];
  age_stats?: DemoItem[];
  gender?: DemoItem[];
  marital?: DemoItem[];
  occupation?: DemoItem[];
}

// One segment's demographics (needs_cluster 0..4), Dormant excluded.
interface DemoSegment {
  segment: number;
  name: string;
  nameEn?: string;
  total: number;
  metrics: DemoMetrics;
  description?: string | null;    // persona tooltip (deskripsi_persona)
  descriptionEn?: string | null;  // persona tooltip (deskripsi_persona_en)
}

interface OverviewData {
  segmentsReady: boolean;
  totalCustomers: number;
  segments: SegmentItem[];
  archetypes?: SegmentItem[];
  archetypesReady?: boolean;
  demographics?: DemoSegment[];
  demographicsReady: boolean;
  demographicsRetention?: DemoSegment[];
  demographicsRetentionReady?: boolean;
  metricsReady: boolean;
}

// Palet warna segmen - selaras tema (aksen emas/coklat brand + warna pendukung).
const BAR_COLORS = ['#8A6534', '#0E7490', '#7C3AED', '#059669', '#B4522E', '#C9A227', '#6B4E2E'];

export function SegmentationOverview() {
  const { lang } = useI18n();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Which demographic segment tab is active (needs_cluster value).
  const [activeDemoSeg, setActiveDemoSeg] = useState<number | null>(null);
  // Customer Segmentation Distribution tab: 'acquisition' | 'retention'.
  const [distTab, setDistTab] = useState<'acquisition' | 'retention'>('acquisition');
  // Demographic-tab hover tooltip (persona description). Fixed-positioned from
  // the hovered tab's rect so it is not clipped by the tab row's scroll area.
  const [tabTip, setTabTip] = useState<{ x: number; y: number; title: string; body: string } | null>(null);


  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('auth_token');
        // Reads the customer-to-segment assignment from bag_demo (ods.mv_h.s).
        // Under /api/v1/executive/** so nginx routes it to analytics-service.
        const res = await fetch('/api/v1/executive/segmentation/bag-overview', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          setError(`HTTP ${res.status}`);
          return;
        }
        const body = await res.json();
        if (body.success && body.data) {
          setData(body.data);
        } else {
          setError(body.message || 'INVALID_RESPONSE');
        }
      } catch (err: any) {
        console.error('Failed to fetch segmentation overview:', err);
        setError(err?.message || 'NETWORK_ERROR');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (error && !loading) {
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
                  ? 'Data Ringkasan Segmentasi gagal dimuat. Periksa koneksi ke database lalu muat ulang halaman.'
                  : 'Segmentation Overview data failed to load. Check the database connection and reload the page.'}
              </p>
              {error && <p className="text-xs text-slate-400 mt-2 font-mono">({error})</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const numLocale = lang === 'id' ? 'id-ID' : 'en-US';
  // Percent with exactly 2 decimals, locale-aware (ID uses a comma: "60,30%").
  const formatPct = (v: number) =>
    `${v.toLocaleString(numLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  const segments = data?.segments ?? [];
  const segmentsReady = (data?.segmentsReady ?? false) && segments.length > 0;
  const archetypes = data?.archetypes ?? [];
  const archetypesReady = (data?.archetypesReady ?? false) && archetypes.length > 0;
  // Demographics follow the global Acquisition/Retention toggle.
  const demoAcqSegments = data?.demographics ?? [];
  const demoRetSegments = data?.demographicsRetention ?? [];
  const demoSegments = distTab === 'retention' ? demoRetSegments : demoAcqSegments;
  const demographicsReady =
    distTab === 'retention'
      ? (data?.demographicsRetentionReady ?? false) && demoRetSegments.length > 0
      : (data?.demographicsReady ?? false) && demoAcqSegments.length > 0;
  // Active demographic segment: the chosen tab, else the first segment.
  const activeSeg =
    demoSegments.find((s) => s.segment === activeDemoSeg) ?? demoSegments[0] ?? null;
  const demo = activeSeg?.metrics ?? {};
  const label = (s: SegmentItem) => (lang === 'id' ? s.name : s.nameEn || s.name);
  const demoSegLabel = (s: DemoSegment) => (lang === 'id' ? s.name : s.nameEn || s.name);
  // Short tab label: first 2 words; if the 2nd word is "&", take 3 so the word
  // after "&" is kept (same rule as the Hot Target cluster tabs).
  const shortSegLabel = (full: string) => {
    const words = full.split(/\s+/);
    const take = words[1] === '&' ? 3 : 2;
    return words.slice(0, take).join(' ');
  };
  // Localized label for a demographic datapoint.
  const demoLabel = (d: DemoItem) => (lang === 'id' ? d.label : d.labelEn || d.label);
  const intLocale = (v: number) => v.toLocaleString(numLocale);
  // Active distribution dataset follows the selected tab (acquisition/retention).
  const distItems = distTab === 'retention' ? archetypes : segments;
  // Total customers across the active distribution (for pie percentages).
  const segTotal = distItems.reduce((sum, s) => sum + (s.count || 0), 0);

  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'id' ? 'Ringkasan Segmentasi' : 'Segmentation Overview'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {lang === 'id' ? 'Hasil pemetaan segmen nasabah.' : 'Customer segment mapping.'}
          </p>
        </div>
        {loading && <Loader2 className="w-5 h-5 animate-spin text-[#6B4E2E] mt-1" />}
      </div>

      {/* Segmentation + Demographics, wrapped in ONE white card. The global
          Acquisition / Retention toggle sits on top like tabs (but a toggle)
          and merges into the card. It controls both Distribution & Demographics. */}
      <div>
        {/* Toggle on top — taller, merges into the card below (rounded top only) */}
        <div className="grid grid-cols-2 gap-1 bg-slate-100 rounded-t-xl p-1.5 border border-b-0 border-slate-200">
          <button
            type="button"
            onClick={() => setDistTab('acquisition')}
            className={`w-full px-4 py-3 text-sm font-bold rounded-lg transition cursor-pointer ${
              distTab === 'acquisition' ? 'bg-[#8A6534] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'id' ? 'Segmentasi Pengguna Semua Channel' : 'All-Channel User Segmentation'}
          </button>
          <button
            type="button"
            onClick={() => setDistTab('retention')}
            className={`w-full px-4 py-3 text-sm font-bold rounded-lg transition cursor-pointer ${
              distTab === 'retention' ? 'bg-[#8A6534] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'id' ? 'Segmentasi Pengguna Mobile Banking' : 'Mobile Banking User Segmentation'}
          </button>
        </div>

        {/* One white card holding Distribution + Demographics */}
        <div className="bg-white border border-slate-200 rounded-b-xl shadow-2xs p-5 space-y-6">

        {/* --- Customer Segmentation Distribution --- */}
        <div>
        <div className="mb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-[#8A6534]" />
            {lang === 'id' ? 'Distribusi Segmentasi Nasabah' : 'Customer Segmentation Distribution'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            {lang === 'id'
              ? 'Persentase & jumlah nasabah per persona segmentasi.'
              : 'Percentage & customer count per segmentation persona.'}
          </p>
        </div>

        {(distTab === 'acquisition' ? !segmentsReady : !archetypesReady) ? (
          <EmptyInProgress lang={lang} loading={loading} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart margin={{ top: 8, right: 40, bottom: 8, left: 40 }}>
                <Pie
                  data={distItems}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={92}
                  paddingAngle={2}
                  label={(entry: any) => {
                    const pct = segTotal > 0 ? (entry.count / segTotal) * 100 : 0;
                    return pct >= 5 ? formatPct(pct) : '';
                  }}
                  labelLine={false}
                >
                  {distItems.map((_, idx) => (
                    <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const p = payload[0].payload as SegmentItem;
                    const pct = segTotal > 0 ? (Number(p.count) / segTotal) * 100 : 0;
                    return (
                      <div className="bg-white border border-slate-200 rounded-md shadow-sm px-3 py-2 text-xs">
                        <div className="font-bold text-slate-800">{label(p)}</div>
                        <div className="text-slate-600 mt-0.5">
                          {Number(p.count).toLocaleString(numLocale)} {lang === 'id' ? 'nasabah' : 'customers'} ({formatPct(pct)})
                        </div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend with counts + percentages */}
            <div className="space-y-2">
              {distItems.map((s, i) => {
                const pct = segTotal > 0 ? (s.count / segTotal) * 100 : 0;
                return (
                  <div key={`${distTab}-${s.segment}`} className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
                      <span className="text-xs text-slate-700 font-semibold truncate">{label(s)}</span>
                    </div>
                    <span className="text-xs font-extrabold text-[#8A6534] whitespace-nowrap">
                      {s.count.toLocaleString(numLocale)} ({formatPct(pct)})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </div>

        {/* --- Demographics (inside the same white card) --- */}
        <div>
        <div className="mb-3 pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#8A6534]" />
            <span>{lang === 'id' ? 'Data Demografi' : 'Demographics'}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            {lang === 'id'
              ? 'Sebaran usia, jenis kelamin, status pernikahan, dan pekerjaan nasabah per segmen.'
              : 'Distribution of customer age, gender, marital status, and occupation per segment.'}
          </p>
        </div>

        {/* Demographics content follows the global Acquisition/Retention toggle
            above (acquisition = per needs_cluster, retention = per archetype). */}
        <div>
        {!demographicsReady ? (
          <div className="w-full flex flex-col items-center justify-center text-center py-10 px-6 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 bg-white">
            {loading ? <Loader2 className="w-7 h-7 text-[#6B4E2E] mb-2 animate-spin" /> : <Clock className="w-7 h-7 text-amber-500 mb-2" />}
            <p className="text-sm font-bold text-slate-700">
              {loading
                ? lang === 'id' ? 'Memuat data...' : 'Loading data...'
                : lang === 'id' ? 'Data demografi belum tersedia' : 'Demographic data not available yet'}
            </p>
          </div>
        ) : (
          <>
            {/* Chrome-style segment tabs (same as /cpi-matrix/hot-target):
                active tab is white and merges into the card below; inactive tabs
                are tinted. Active tab shows the full persona name, inactive tabs
                show the first 2 words. Single row, horizontally scrollable. */}
            <div className="flex items-end overflow-x-auto overflow-y-hidden no-scrollbar">
              {demoSegments.map((s) => {
                const isActive = activeSeg?.segment === s.segment;
                const full = demoSegLabel(s);
                // Tooltip = persona description, falling back to the full name.
                const desc = lang === 'id' ? s.description : (s.descriptionEn || s.description);
                const tip = desc && desc.trim() ? desc : full;
                return (
                  <button
                    key={s.segment}
                    type="button"
                    onMouseEnter={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      const TIP_W = 576;
                      const x = Math.min(r.left, Math.max(8, window.innerWidth - TIP_W - 8));
                      setTabTip({ x, y: r.bottom + 6, title: full, body: tip });
                    }}
                    onMouseLeave={() => setTabTip(null)}
                    onClick={() => { setActiveDemoSeg(s.segment); setTabTip(null); }}
                    className={`relative flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg whitespace-nowrap transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-white text-[#8A6534] z-10'
                        : 'bg-[#8A6534]/10 text-slate-600 hover:bg-[#8A6534]/15 hover:text-slate-800'
                    }`}
                  >
                    {isActive ? full : shortSegLabel(full)}
                  </button>
                );
              })}
            </div>

            {/* Tab content — white card. No top-left rounding so the active tab
                sits flush with no seam line between tab and content. */}
            <div className="bg-white rounded-xl rounded-tl-none shadow-2xs p-5 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Age buckets — vertical bars, with a dashed average-age line. */}
              {demo.age_bucket && demo.age_bucket.length > 0 && (
                <DemoBarCard
                  title={lang === 'id' ? 'Kelompok Usia' : 'Age Group'}
                  data={demo.age_bucket.map((d) => ({ name: demoLabel(d), value: d.count }))}
                  color="#7DBFD1"
                  numLocale={numLocale}
                  avgAge={demo.age_stats?.find((s) => s.key === 'avg')?.statValue ?? null}
                  avgLabel={lang === 'id' ? 'Rata-rata' : 'Average'}
                  yrLabel={lang === 'id' ? 'th' : 'yr'}
                />
              )}

              {/* Gender — full pie, legend placed below the chart (centered). */}
              {demo.gender && demo.gender.length > 0 && (
                <DemoDonutCard
                  title={lang === 'id' ? 'Jenis Kelamin' : 'Gender'}
                  data={demo.gender.map((d, i) => ({ name: demoLabel(d), value: d.count, color: GENDER_COLORS[i % GENDER_COLORS.length] }))}
                  numLocale={numLocale}
                  formatPct={formatPct}
                  custLabel={lang === 'id' ? 'nasabah' : 'customers'}
                  pie
                  legendBelow
                />
              )}

              {/* Marital status — donut, pushed down to fill the empty space below. */}
              {demo.marital && demo.marital.length > 0 && (
                <DemoDonutCard
                  title={lang === 'id' ? 'Status Pernikahan' : 'Marital Status'}
                  data={demo.marital.map((d, i) => ({ name: demoLabel(d), value: d.count, color: BAR_COLORS[i % BAR_COLORS.length] }))}
                  numLocale={numLocale}
                  formatPct={formatPct}
                  custLabel={lang === 'id' ? 'nasabah' : 'customers'}
                  padTop
                />
              )}

              {/* Occupation — horizontal bar list (top volumes). */}
              {demo.occupation && demo.occupation.length > 0 && (
                <DemoHBarCard
                  title={lang === 'id' ? 'Pekerjaan' : 'Occupation'}
                  data={demo.occupation
                    .map((d) => ({ name: demoLabel(d), value: d.count }))
                    .sort((a, b) => b.value - a.value)}
                  numLocale={numLocale}
                  intLocale={intLocale}
                />
              )}
            </div>
            </div>
          </>
        )}
        </div>
        </div>
        </div>
      </div>

      {/* Demographic-tab hover tooltip (fixed position so it is never clipped by
          the scrollable tab row). Shows the persona name + description. */}
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

// ---------------------------------------------------------------------------
// Demographics sub-cards.
// ---------------------------------------------------------------------------
const GENDER_COLORS = ['#0E7490', '#B4522E'];

// Map an average age to the bucket label that contains it (buckets match the
// MV: 17-24, 25-34, 35-44, 45-54, 55-64, 65+). Used to place the average-age
// reference line on the categorical Age Group axis.
function ageBucketLabel(age: number): string {
  if (age <= 24) return '17-24';
  if (age <= 34) return '25-34';
  if (age <= 44) return '35-44';
  if (age <= 54) return '45-54';
  if (age <= 64) return '55-64';
  return '65+';
}

function DemoBarCard({ title, data, color, numLocale, avgAge = null, avgLabel = 'Average', yrLabel = 'yr' }: { title: string; data: { name: string; value: number }[]; color: string; numLocale: string; avgAge?: number | null; avgLabel?: string; yrLabel?: string }) {
  // The average-age line is drawn at the center of the bucket that contains the
  // average, but only if that bucket is present in the chart data.
  const avgBucket = avgAge != null ? ageBucketLabel(avgAge) : null;
  const showAvg = avgBucket != null && data.some((d) => d.name === avgBucket);
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <h4 className="text-xs font-bold text-slate-700 mb-3">{title}</h4>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="name" fontSize={11} stroke="#64748B" tickLine={false} />
          <YAxis fontSize={10} stroke="#64748B" tickFormatter={(v: number) => v.toLocaleString(numLocale)} width={48} />
          <Tooltip formatter={(v: any) => Number(v).toLocaleString(numLocale)} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={48} />
          {showAvg && avgAge != null && (
            <ReferenceLine
              x={avgBucket as string}
              stroke="#B4522E"
              strokeDasharray="5 4"
              strokeWidth={2}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
      {/* Average-age caption below the chart (the dashed red line above marks it). */}
      {showAvg && avgAge != null && (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <span className="inline-block w-5 border-t-2 border-dashed border-[#B4522E]" />
          {avgLabel}: <span className="text-[#B4522E] font-bold">{avgAge.toLocaleString(numLocale)} {yrLabel}</span>
        </p>
      )}
    </div>
  );
}

function DemoDonutCard({ title, data, numLocale, formatPct, custLabel, pie = false, shiftRight = false, padTop = false, legendBelow = false }: { title: string; data: { name: string; value: number; color: string }[]; numLocale: string; formatPct: (v: number) => string; custLabel: string; pie?: boolean; shiftRight?: boolean; padTop?: boolean; legendBelow?: boolean }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  // shiftRight: nudge the pie right so left-slice percent labels aren't clipped.
  // padTop: push the chart + legend down to fill empty space below.
  // legendBelow: stack layout — pie on top (full width), legend underneath.
  const cx = shiftRight && !legendBelow ? '62%' : '50%';
  // Extra top/bottom margin so the outside percent labels (rendered above and
  // below the circle) are not clipped by the chart container.
  const chartMargin = shiftRight && !legendBelow
    ? { top: 26, right: 6, bottom: 26, left: 28 }
    : { top: 26, right: 6, bottom: 26, left: 6 };

  const chart = (
    <ResponsiveContainer width="100%" height={legendBelow ? 230 : 236}>
      <PieChart margin={chartMargin}>
        <Pie data={data} dataKey="value" nameKey="name" cx={cx} cy="50%" innerRadius={pie ? 0 : 44} outerRadius={78} paddingAngle={pie ? 1 : 2}
          label={(e: any) => { const pct = total > 0 ? (e.value / total) * 100 : 0; return pct >= 6 ? formatPct(pct) : ''; }} labelLine={false}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Tooltip content={({ active, payload }: any) => {
          if (!active || !payload || payload.length === 0) return null;
          const p = payload[0].payload as { name: string; value: number };
          const pct = total > 0 ? (p.value / total) * 100 : 0;
          return (
            <div className="bg-white border border-slate-200 rounded-md shadow-sm px-3 py-2 text-xs">
              <div className="font-bold text-slate-800">{p.name}</div>
              <div className="text-slate-600 mt-0.5">{p.value.toLocaleString(numLocale)} {custLabel} ({formatPct(pct)})</div>
            </div>
          );
        }} />
      </PieChart>
    </ResponsiveContainer>
  );

  // Legend below: a centered, wrapping horizontal row. Otherwise a vertical list.
  const legend = legendBelow ? (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 mt-1">
      {data.map((d, i) => {
        const pct = total > 0 ? (d.value / total) * 100 : 0;
        return (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-xs text-slate-700 font-medium">{d.name}</span>
            <span className="text-xs font-bold text-slate-500">{formatPct(pct)}</span>
          </div>
        );
      })}
    </div>
  ) : (
    <div className="space-y-1.5">
      {data.map((d, i) => {
        const pct = total > 0 ? (d.value / total) * 100 : 0;
        return (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-xs text-slate-700 font-medium truncate">{d.name}</span>
            </div>
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">{formatPct(pct)}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <h4 className="text-xs font-bold text-slate-700 mb-3">{title}</h4>
      {legendBelow ? (
        <div className={padTop ? 'pt-6' : ''}>
          {chart}
          {legend}
        </div>
      ) : (
        <div className={`grid grid-cols-2 gap-2 items-center ${padTop ? 'pt-6' : ''}`}>
          {chart}
          {legend}
        </div>
      )}
    </div>
  );
}

function DemoHBarCard({ title, data, numLocale, intLocale }: { title: string; data: { name: string; value: number }[]; numLocale: string; intLocale: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <h4 className="text-xs font-bold text-slate-700 mb-3">{title}</h4>
      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
        {data.map((d, i) => (
          <div key={i}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] text-slate-700 font-medium truncate" title={d.name}>{d.name}</span>
              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">{intLocale(d.value)}</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-[#8A6534]" style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Shared empty / In Progress state used when there is no segment data.
function EmptyInProgress({ lang, loading }: { lang: 'id' | 'en'; loading: boolean }) {
  return (
    <div className="w-full flex flex-col items-center justify-center text-center py-12 px-6 rounded-xl border border-dashed border-amber-300 bg-amber-50/50">
      {loading ? (
        <Loader2 className="w-7 h-7 text-[#6B4E2E] mb-2 animate-spin" />
      ) : (
        <Clock className="w-7 h-7 text-amber-500 mb-2" />
      )}
      <p className="text-sm font-bold text-slate-700">
        {loading
          ? lang === 'id' ? 'Memuat data...' : 'Loading data...'
          : lang === 'id' ? 'Data segmen belum tersedia' : 'Segment data not available yet'}
      </p>
      {!loading && (
        <p className="text-xs text-slate-500 mt-1 max-w-md">
          {lang === 'id'
            ? 'Data segmentasi nasabah belum ditemukan di database. Bagian ini sedang dalam proses (In Progress).'
            : 'Customer segmentation data was not found in the database. This section is still In Progress.'}
        </p>
      )}
    </div>
  );
}
