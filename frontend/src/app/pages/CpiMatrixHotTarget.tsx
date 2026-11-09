import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useI18n } from '../i18n';
import { Grid3x3, Layers, Target, ArrowRight, ArrowLeft, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { MatrixSelection, SelectedCluster, saveHotTargetPersona } from '../lib/matrixSelection';
import { PERSONA_CLUSTERS, clusterIndexByKey } from '../lib/personaData';

// One row per cluster from segmentation.customer_analytics (via backend).
interface CustomerAnalytics {
  cluster: string;
  personaName: string;
  personaNameEn: string;
  recommendationType: string;
  riskLevel: string;
  totalCustomers: number | null;
  avgAge: number | null;
  avgTenureMonths: number | null;
  avgTotalBalance: number | null;
  avgProductsHeld: number | null;
  avgMonthlyTxn: number | null;
  mobileBankingRate: number | null;
  mbShare?: number | null;        // retention: share of txn via MB, 0..1
  retentionRate?: number | null;  // retention: 0..1
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

// Split a paragraph into sentences for numbered-list display.
function splitSentences(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\.\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => (s.endsWith('.') ? s : s + '.'));
}

// Split on semicolons into separate points (used for Key Characteristic).
function splitSemicolons(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/;\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Churn x TRB matrix cells (mirrors /cpi-matrix/overview). key = "<trb>_<churn>".
const MATRIX_CLUSTERS = [
  { code: 'C7', key: 'hi_lo',  nameId: 'Churn Rendah · TRB Tinggi',  nameEn: 'Churn Lo · TRB Hi' },
  { code: 'C8', key: 'hi_med', nameId: 'Churn Sedang · TRB Tinggi',  nameEn: 'Churn Med · TRB Hi' },
  { code: 'C9', key: 'hi_hi',  nameId: 'Churn Tinggi · TRB Tinggi',  nameEn: 'Churn Hi · TRB Hi' },
  { code: 'C4', key: 'med_lo',  nameId: 'Churn Rendah · TRB Sedang', nameEn: 'Churn Lo · TRB Med' },
  { code: 'C5', key: 'med_med', nameId: 'Churn Sedang · TRB Sedang', nameEn: 'Churn Med · TRB Med' },
  { code: 'C6', key: 'med_hi',  nameId: 'Churn Tinggi · TRB Sedang', nameEn: 'Churn Hi · TRB Med' },
  { code: 'C1', key: 'lo_lo',  nameId: 'Churn Rendah · TRB Rendah',  nameEn: 'Churn Lo · TRB Lo' },
  { code: 'C2', key: 'lo_med', nameId: 'Churn Sedang · TRB Rendah',  nameEn: 'Churn Med · TRB Lo' },
  { code: 'C3', key: 'lo_hi',  nameId: 'Churn Tinggi · TRB Rendah',  nameEn: 'Churn Hi · TRB Lo' },
];

// Activity x TRB matrix cells. key = "<segment>_<trb>".
const ACT_SEG_LABEL: Record<string, { id: string; en: string }> = {
  inactiveCust: { id: 'Nasabah Tidak Aktif', en: 'Inactive Customer' },
  unregMb:      { id: 'Belum Terdaftar MB',  en: 'Unregistered Mobile Banking' },
  inactiveMb:   { id: 'MB Tidak Aktif',      en: 'Inactive Mobile Banking' },
};
const ACT_SEG_CAT: Record<string, string> = { inactiveCust: 'inactive_cust', unregMb: 'non_mb', inactiveMb: 'inactive_mb' };
const ACT_TRB_LABEL: Record<string, { id: string; en: string }> = {
  hi: { id: 'TRB Tinggi', en: 'TRB Hi' }, med: { id: 'TRB Sedang', en: 'TRB Med' }, lo: { id: 'TRB Rendah', en: 'TRB Lo' },
};
const ACTIVITY_MATRIX = (['hi', 'med', 'lo'] as const).flatMap((tier, rIdx) =>
  (['inactiveCust', 'unregMb', 'inactiveMb'] as const).map((seg, cIdx) => ({
    code: `A${rIdx * 3 + cIdx + 1}`,
    key: `${seg}_${tier}`,
    seg, tier,
    nameId: `${ACT_SEG_LABEL[seg].id} · ${ACT_TRB_LABEL[tier].id}`,
    nameEn: `${ACT_SEG_LABEL[seg].en} · ${ACT_TRB_LABEL[tier].en}`,
  }))
);
// Translate a frontend activity key "<segment>_<trb>" to the stored
// matrix_classification "<trb>_<activity_category>".
function activityClassification(key: string): string {
  const us = key.lastIndexOf('_');
  const seg = key.substring(0, us);
  const trb = key.substring(us + 1);
  return `${trb}_${ACT_SEG_CAT[seg] ?? seg}`;
}

// Map segmentation cluster code → persona label (ID / EN)
const PERSONA_LABELS: Record<string, { id: string; en: string }> = {
  cluster_0: { id: 'Pelajar Muda & Produktif', en: 'Young Students & Productive Youth' },
  cluster_1: { id: 'Senior & Aman', en: 'Senior & Secure' },
  cluster_2: { id: 'Pengusaha Kecil & Berorientasi Pertumbuhan', en: 'Small Business & Growth-Oriented Entrepreneurs' },
  cluster_3: { id: 'Nasabah Rentan & Membutuhkan Bantuan', en: 'Vulnerable & Support-Seeking Customers' },
};

function personaLabel(cluster: string | null | undefined, lang: string): string {
  if (!cluster) return 'N/A';
  const p = PERSONA_LABELS[cluster];
  if (!p) return 'N/A';
  return lang === 'id' ? p.id : p.en;
}

// First persona key — used as the default selection (no "all" option).
const FIRST_PERSONA = Object.keys(PERSONA_LABELS)[0];

// Pie palette for the segmentation distribution card — same as the
// Segmentation Overview page so the donut colours match.
const SEG_COLORS = ['#8A6534', '#0E7490', '#7C3AED', '#059669', '#B4522E', '#C9A227', '#6B4E2E'];

export function CpiMatrixHotTarget() {
  const { lang } = useI18n();
  const navigate = useNavigate();
  // Matrix selection, read from the DB (is_selected=TRUE in ods.churn_data_matrix
  // + ods.activity_data_matrix). total = distinct cif across both (overlap once).
  const [selection, setSelection] = useState<MatrixSelection>({ clusters: [], total: 0, updatedAt: 0 });
  // Per-cluster analytics (acquisition personas) from the characteristics endpoint.
  const [analyticsByCluster, setAnalyticsByCluster] = useState<Record<string, CustomerAnalytics>>({});
  // Per-archetype analytics (retention) from the characteristics-retention endpoint.
  const [retentionByCluster, setRetentionByCluster] = useState<Record<string, CustomerAnalytics>>({});

  // Active persona cluster (driven by the per-cluster tab bar).
  const [personaInput, setPersonaInput] = useState<string>(FIRST_PERSONA);
  const [, setAppliedPersona] = useState<string>(FIRST_PERSONA);

  // Persist the initial persona so the Detail Action Plan page can default to it
  // even if the user never changes the combo box here.
  useEffect(() => {
    saveHotTargetPersona(personaInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the selected cells from the DB (bag_demo). Maps each stored
  // matrix_classification to its grid cell code/name via MATRIX_CLUSTERS
  // (churn) and ACTIVITY_MATRIX (activity). total = distinct customers.
  useEffect(() => {
    async function loadSelection() {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch('/api/v1/executive/bag-matrix/selected', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const body = await res.json();
        const d = body?.data;
        if (!d) return;
        const clusters: SelectedCluster[] = [];
        for (const row of (d.churn ?? [])) {
          const cell = MATRIX_CLUSTERS.find((c) => c.key === row.classification);
          if (cell) clusters.push({ code: cell.code, name: lang === 'id' ? cell.nameId : cell.nameEn, key: cell.key, count: Number(row.count) || 0 });
        }
        for (const row of (d.activity ?? [])) {
          // stored classification "<trb>_<activity_category>"; translate to the
          // frontend ACTIVITY_MATRIX key "<segment>_<trb>".
          const cell = ACTIVITY_MATRIX.find((c) => activityClassification(c.key) === row.classification);
          if (cell) clusters.push({ code: cell.code, name: lang === 'id' ? cell.nameId : cell.nameEn, key: cell.key, count: Number(row.count) || 0 });
        }
        setSelection({ clusters, total: Number(d.total) || 0, updatedAt: Date.now() });
      } catch (err) {
        console.error('Failed to load matrix selection from DB:', err);
      }
    }
    loadSelection();
  }, [lang]);

  const hasSelection = selection.clusters.length > 0;

  // Customer Segmentation Distribution: Acquisition (needs_cluster personas)
  // vs Retention (mb_archetype), from the bag-overview endpoint — same data and
  // layout as the Segmentation Overview page. Toggle controls which is shown.
  const [distTab, setDistTab] = useState<'acquisition' | 'retention'>('acquisition');

  // Persona-tab hover tooltip. Positioned with fixed coordinates (from the
  // hovered tab's bounding rect) so it is not clipped by the tab row's
  // horizontal scroll container. Holds the persona name + description.
  const [tabTip, setTabTip] = useState<{ x: number; y: number; title: string; body: string } | null>(null);
  type SegRow = { name: string; nameId: string; value: number };
  const [segAcq, setSegAcq] = useState<SegRow[]>([]);
  const [segRet, setSegRet] = useState<SegRow[]>([]);
  const segData = distTab === 'retention' ? segRet : segAcq;
  const segTotal = segData.reduce((s, d) => s + d.value, 0);
  const numLocale = lang === 'id' ? 'id-ID' : 'en-US';
  const formatPct = (v: number) =>
    `${v.toLocaleString(numLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

  useEffect(() => {
    async function fetchSegmentation() {
      try {
        const token = localStorage.getItem('auth_token');
        // Scoped to the current matrix SELECTION (totals match "Selected total"),
        // not the whole population. The Segmentation Overview page keeps using
        // /segmentation/bag-overview (full population) instead.
        const res = await fetch('/api/v1/executive/bag-matrix/selected-distribution', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const body = await res.json();
          const d = body?.data;
          const toRows = (arr: any): SegRow[] =>
            Array.isArray(arr)
              ? arr.map((s: any) => ({ name: s.nameEn || s.name, nameId: s.name, value: Number(s.count) || 0 }))
              : [];
          if (body.success && d) {
            setSegAcq(toRows(d.segments));
            setSegRet(toRows(d.archetypes));
          }
        }
      } catch (err) {
        console.error('Failed to fetch segmentation distribution:', err);
      }
    }
    fetchSegmentation();
  }, []);

  // Fetch per-cluster characteristics from segmentation.cluster_persona (bag_demo).
  useEffect(() => {
    async function fetchCustomerAnalytics() {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch('/api/v1/executive/segmentation/bag-overview/characteristics', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const body = await res.json();
          if (body.success && Array.isArray(body.data)) {
            const map: Record<string, CustomerAnalytics> = {};
            for (const row of body.data) {
              if (row.cluster) map[row.cluster] = row as CustomerAnalytics;
            }
            setAnalyticsByCluster(map);
          }
        }
      } catch (err) {
        console.error('Failed to fetch customer analytics:', err);
      }
    }
    fetchCustomerAnalytics();
  }, []);

  // Fetch per-archetype RETENTION characteristics (persona_strategi_retensi).
  useEffect(() => {
    async function fetchRetention() {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch('/api/v1/executive/segmentation/bag-overview/characteristics-retention', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const body = await res.json();
          if (body.success && Array.isArray(body.data)) {
            const map: Record<string, CustomerAnalytics> = {};
            for (const row of body.data) {
              if (row.cluster) map[row.cluster] = row as CustomerAnalytics;
            }
            setRetentionByCluster(map);
          }
        }
      } catch (err) {
        console.error('Failed to fetch retention characteristics:', err);
      }
    }
    fetchRetention();
  }, []);

  // Persona cluster detail for the characteristics panel.
  // The panel follows the combo box selection directly, so it always shows a
  // persona (defaulting to the first one) without waiting for "Terapkan".
  const activePersona = personaInput;
  const activeClusterIdx = clusterIndexByKey(activePersona);
  const activeCluster = PERSONA_CLUSTERS[activeClusterIdx];
  // Characteristics panel follows the Acquisition/Retention toggle:
  //   acquisition -> analyticsByCluster (needs_cluster personas)
  //   retention   -> retentionByCluster (mb_archetype personas)
  const activeAnalytics = distTab === 'retention' ? retentionByCluster : analyticsByCluster;
  // Tabs are driven by the backend characteristics so all clusters show up,
  // matching the Segment Characteristics page. Sorted by the numeric suffix.
  const clusterOrder = Object.keys(activeAnalytics).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ''), 10);
    const nb = parseInt(b.replace(/\D/g, ''), 10);
    return (isNaN(na) ? 0 : na) - (isNaN(nb) ? 0 : nb);
  });

  // Active persona for the characteristics panel. If the current selection is
  // not in the active dataset (e.g. after toggling), fall back to the first.
  const ca = activeAnalytics[activePersona] ?? activeAnalytics[clusterOrder[0]];
  const personaDisplayName = ca
    ? (lang === 'id' ? ca.personaName : (ca.personaNameEn || ca.personaName))
    : (lang === 'id' ? activeCluster.nameId : activeCluster.nameEn);
  const caNum = (v: number | null | undefined, digits = 0) =>
    v === null || v === undefined ? '-' : v.toLocaleString('id-ID', { maximumFractionDigits: digits });
  const caMobilePct = ca && ca.mobileBankingRate != null ? ca.mobileBankingRate * 100 : null;
  const caAvgBalance =
    !ca || ca.avgTotalBalance == null
      ? '-'
      : ca.avgTotalBalance >= 1_000_000
      ? `Rp ${(ca.avgTotalBalance / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Jt`
      : `Rp ${caNum(ca.avgTotalBalance)}`;
  // Append a language-specific unit after the value, unless the value is "-".
  const withUnit = (value: string, unitId: string, unitEn: string) =>
    value === '-' ? value : `${value} ${lang === 'id' ? unitId : unitEn}`;
  // Stat rows differ by tab (same as the Segment Characteristics page):
  //   acquisition -> age / products / balance / MB usage / total
  //   retention   -> age / products / tenure / txn-per-month / MB share / retention rate / total
  const caStats: Array<{ labelId: string; labelEn: string; value: string }> = !ca
    ? []
    : distTab === 'retention'
    ? [
        { labelId: 'Rata-rata Usia', labelEn: 'Avg Age', value: withUnit(caNum(ca.avgAge), 'th', 'yr') },
        { labelId: 'Rata-rata Produk Dimiliki', labelEn: 'Avg Products Held', value: caNum(ca.avgProductsHeld, 1) },
        { labelId: 'Rata-rata Masa Aktif', labelEn: 'Avg Tenure', value: withUnit(caNum(ca.avgTenureMonths, 1), 'bln', 'mo') },
        { labelId: 'Rata-rata Transaksi / Bulan', labelEn: 'Avg Txn / Month', value: caNum(ca.avgMonthlyTxn, 1) },
        { labelId: 'Porsi Mobile Banking', labelEn: 'Mobile Banking Share', value: ca.mbShare == null ? '-' : `${caNum(ca.mbShare * 100, 1)}%` },
        { labelId: 'Tingkat Retensi', labelEn: 'Retention Rate', value: ca.retentionRate == null ? '-' : `${caNum(ca.retentionRate * 100, 1)}%` },
        { labelId: 'Total Nasabah', labelEn: 'Total Customers', value: caNum(ca.totalCustomers) },
      ]
    : [
        // Acquisition: same five rows as the Segment Characteristics page.
        { labelId: 'Rata-rata Usia', labelEn: 'Avg Age', value: withUnit(caNum(ca.avgAge), 'th', 'yr') },
        { labelId: 'Rata-rata Produk Dimiliki', labelEn: 'Avg Products Held', value: caNum(ca.avgProductsHeld, 1) },
        { labelId: 'Rata-rata Saldo', labelEn: 'Avg Balance', value: caAvgBalance },
        { labelId: 'Penggunaan Mobile Banking', labelEn: 'Mobile Banking Usage', value: caMobilePct == null ? '-' : `${caNum(caMobilePct, 1)}%` },
        { labelId: 'Total Nasabah', labelEn: 'Total Customers', value: caNum(ca.totalCustomers) },
      ];
  // Key Characteristic: split on semicolons into separate points (same as the
  // Segment Characteristics page).
  const caKeyCharItems = splitSemicolons(ca ? (lang === 'id' ? ca.keyCharacteristic : (ca.keyCharacteristicEn || ca.keyCharacteristic)) : null);
  // Legacy single-strategy fallback (used only if the labeled list is empty).
  const caStrategyItems = splitSentences(ca ? (lang === 'id' ? ca.marketingStrategy : (ca.marketingStrategyEn || ca.marketingStrategy)) : null).slice(0, 2);
  // Labeled business strategies (acquisition/retention), each broken into bullet
  // points on sentence periods — identical to the Segment Characteristics page.
  const caStrategyList = (ca?.strategies ?? [])
    .map((s) => ({
      label: lang === 'id' ? s.label : (s.labelEn || s.label),
      points: splitSentences(lang === 'id' ? s.text : (s.textEn || s.text)),
    }))
    .filter((s) => s.points.length > 0);
  const caRecType = ca?.recommendationType;

  // When the toggle changes (or data loads), ensure the selected persona exists
  // in the active dataset; otherwise snap to the first cluster of that tab.
  useEffect(() => {
    if (clusterOrder.length > 0 && !clusterOrder.includes(personaInput)) {
      setPersonaInput(clusterOrder[0]);
      setAppliedPersona(clusterOrder[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distTab, clusterOrder.join(',')]);

  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'id' ? 'Bisnis Strategi Per Cluster' : 'Business Strategy Per Cluster'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {lang === 'id'
              ? 'Karakteristik dan strategi bisnis untuk setiap cluster nasabah terpilih dari matriks.'
              : 'Characteristics and business strategy for each selected customer cluster from the matrix.'}
          </p>
        </div>
      </div>

      {/* Selected clusters from Customer Matrix */}
      {hasSelection && (
        <div className="bg-[#8A6534]/5 border border-[#8A6534]/20 rounded-xl p-4 flex items-start gap-3 flex-wrap shadow-2xs">
          <Grid3x3 className="w-4 h-4 text-[#8A6534] mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-700 mb-1.5">
              {lang === 'id' ? 'Cluster terpilih dari Matriks Nasabah:' : 'Selected clusters from Customer Matrix:'}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {selection.clusters.map((c) => (
                <span key={c.code} className="inline-flex items-center gap-1 bg-white border border-[#8A6534]/30 text-[#6B4E2E] font-semibold text-xs px-2 py-0.5 rounded-full">
                  <span className="font-mono font-bold">{c.code}</span> {c.name}
                  <span className="text-slate-400 font-normal">({c.count.toLocaleString('id-ID')})</span>
                </span>
              ))}
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            {lang === 'id' ? 'Total terpilih: ' : 'Selected total: '}
            <span className="font-bold text-slate-800">{selection.total.toLocaleString('id-ID')}</span>
          </span>
        </div>
      )}

      {/* Customer Segmentation Distribution — same as /segmentation/overview:
          Acquisition / Retention toggle on top (merges into the card), then the
          donut + legend. Acquisition = needs_cluster personas; Retention =
          mb_archetype personas. */}
      <div>
        {/* Acquisition / Retention toggle (segmented control). */}
        <div className="flex items-stretch gap-1 bg-slate-100 border border-slate-200 rounded-t-xl p-1">
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

        <div className="bg-white border border-slate-200 border-t-0 rounded-b-xl shadow-2xs p-5">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-[#8A6534]" />
              {lang === 'id' ? 'Distribusi Segmentasi Nasabah' : 'Customer Segmentation Distribution'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              {lang === 'id'
                ? 'Persentase & jumlah nasabah per persona segmentasi.'
                : 'Percentage & customer count per segmentation persona.'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart margin={{ top: 8, right: 40, bottom: 8, left: 40 }}>
                <Pie
                  data={segData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={92}
                  paddingAngle={2}
                  label={(entry: any) => {
                    const pct = segTotal > 0 ? (entry.value / segTotal) * 100 : 0;
                    return pct >= 5 ? formatPct(pct) : '';
                  }}
                  labelLine={false}
                >
                  {segData.map((_, idx) => (
                    <Cell key={idx} fill={SEG_COLORS[idx % SEG_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const p = payload[0].payload;
                    const pct = segTotal > 0 ? (Number(p.value) / segTotal) * 100 : 0;
                    return (
                      <div className="bg-white border border-slate-200 rounded-md shadow-sm px-3 py-2 text-xs">
                        <div className="font-bold text-slate-800">{lang === 'id' ? p.nameId : p.name}</div>
                        <div className="text-slate-600 mt-0.5">
                          {Number(p.value).toLocaleString(numLocale)} {lang === 'id' ? 'nasabah' : 'customers'} ({formatPct(pct)})
                        </div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend with counts + percentages */}
            <div className="space-y-2">
              {segData.map((d, idx) => {
                const pct = segTotal > 0 ? (d.value / segTotal) * 100 : 0;
                return (
                  <div key={`${distTab}-${idx}`} className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SEG_COLORS[idx % SEG_COLORS.length] }} />
                      <span className="text-xs text-slate-700 font-semibold truncate">{lang === 'id' ? d.nameId : d.name}</span>
                    </div>
                    <span className="text-xs font-extrabold text-[#8A6534] whitespace-nowrap">
                      {d.value.toLocaleString(numLocale)} ({formatPct(pct)})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Per-cluster tabs → Statistik + Karakteristik + Strategi Bisnis.
          Driven by the backend characteristics so ALL clusters show (same set
          and tab style as the Segment Characteristics page): small text, no
          border/seam, active tab flows into the content card. */}
      <div>
        {/* Tab headers */}
        <div className="flex items-end overflow-x-auto overflow-y-hidden no-scrollbar">
          {(clusterOrder.length > 0 ? clusterOrder : Object.keys(PERSONA_LABELS)).map((key) => {
            const isActive = key === personaInput;
            // Prefer the persona name from segmentation.cluster_persona; fall
            // back to the static label until the data has loaded.
            const caRow = activeAnalytics[key];
            const full = caRow
              ? (lang === 'id' ? caRow.personaName : (caRow.personaNameEn || caRow.personaName))
              : personaLabel(key, lang);
            // Tooltip = persona description (deskripsi_persona), falling back to
            // the full persona name when the description is not available.
            const desc = caRow
              ? (lang === 'id' ? caRow.description : (caRow.descriptionEn || caRow.description))
              : null;
            const tip = desc && desc.trim() ? desc : full;
            // Inactive label: first 2 words; but if the 2nd word is "&", take 3
            // words so the word after "&" is included (and "&" stays visible).
            const words = (full || '').split(/\s+/);
            const take = words[1] === '&' ? 3 : 2;
            const short = words.slice(0, take).join(' ');
            return (
              <button
                key={key}
                type="button"
                onMouseEnter={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  // Clamp so the wider (576px) tooltip stays within the viewport.
                  const TIP_W = 576;
                  const x = Math.min(r.left, Math.max(8, window.innerWidth - TIP_W - 8));
                  setTabTip({ x, y: r.bottom + 6, title: full, body: tip });
                }}
                onMouseLeave={() => setTabTip(null)}
                onClick={() => { setPersonaInput(key); setAppliedPersona(key); saveHotTargetPersona(key); setTabTip(null); }}
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
            tab sits flush with no seam line (same as Segment Characteristics). */}
        <div className="bg-white rounded-xl rounded-tl-none shadow-2xs p-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
              {/* Left: Cluster Statistics */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      {lang === 'id' ? 'Statistik Cluster' : 'Cluster Statistics'}
                    </h3>
                    <p className="text-xs text-[#8A6534] mt-0.5 font-bold">
                      {personaDisplayName}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {caStats.map((s) => (
                    <div key={s.labelId} className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
                      <span className="text-xs text-slate-700 font-bold">{lang === 'id' ? s.labelId : s.labelEn}</span>
                      <span className="text-xs font-extrabold text-[#8A6534] text-right leading-snug">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Key Characteristic + Business Strategy */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-extrabold text-slate-800 mb-2 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#8A6534]" />
                      <span>{lang === 'id' ? 'Karakteristik Utama' : 'Key Characteristic'}</span>
                    </p>
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      {caKeyCharItems.length > 0 ? (
                        <div className="space-y-2.5">
                          {caKeyCharItems.map((item, idx) => (
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

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-[#8A6534]" />
                        <span>{lang === 'id' ? 'Strategi Bisnis' : 'Business Strategy'}</span>
                      </p>
                      {(() => {
                        if (!caRecType) return null;
                        const label =
                          caRecType === 'human_approach'
                            ? (lang === 'id' ? 'Pendekatan Humanis' : 'Human Approach')
                            : caRecType === 'special_approach'
                            ? (lang === 'id' ? 'Pendekatan Khusus' : 'Special Approach')
                            : caRecType;
                        return (
                          <span className="shrink-0 text-[11px] font-bold text-[#8A6534] bg-[#8A6534]/10 border border-[#8A6534]/20 px-2 py-0.5 rounded-md">
                            {label}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/80">
                      {caStrategyList.length > 0 ? (
                        <div className="space-y-3.5">
                          {caStrategyList.map((s, idx) => (
                            <div key={idx}>
                              <span className="inline-block text-[11px] font-bold text-[#8A6534] bg-[#8A6534]/10 border border-[#8A6534]/20 px-2 py-0.5 rounded-md mb-2">
                                {s.label}
                              </span>
                              <div className="space-y-1.5">
                                {s.points.map((pt, j) => (
                                  <div key={j} className="flex items-start gap-2.5 text-xs text-slate-800 font-medium leading-relaxed">
                                    <span className="shrink-0 pt-0.5 font-bold text-[#8A6534] tabular-nums">{j + 1}.</span>
                                    <p className="flex-1 pt-0.5">{pt}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : caStrategyItems.length > 0 ? (
                        <div className="space-y-2.5">
                          {caStrategyItems.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-3 text-xs text-slate-800 font-medium leading-relaxed">
                              <span className="shrink-0 pt-0.5 font-bold text-[#8A6534] tabular-nums">{idx + 1}.</span>
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

      {/* Back to Overview + Continue to Promo Engine */}
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={() => navigate('/cpi-matrix/overview')}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          {lang === 'id' ? 'Kembali' : 'Back'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/cpi-matrix/promo-engine')}
          disabled={!hasSelection}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#8A6534] hover:bg-[#6f5029] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition shadow-sm"
        >
          {lang === 'id' ? 'Lanjutkan' : 'Continue'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

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
