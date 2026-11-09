import { useState, useEffect, type ReactNode } from 'react';
import { useI18n } from '../i18n';
import { displayBranchName } from '../lib/displayNames';
import { InProgressBadge } from './_inProgressKit';
import { Users, UserCheck, Wallet, CreditCard, Package, Building2, AlertTriangle, Loader2, Clock, Smartphone, Activity, Network } from 'lucide-react';
import {
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from 'recharts';

interface BranchCustomerItem {
  branchCode?: string;
  branchName: string;
  totalNasabah: number;
  nasabahAktif: number;
  persentaseAktif: number;
}

// A name/count slice used by the small distribution pies (status, MB, mb_status).
interface DistItem {
  name: string;
  nameEn?: string;
  value: number;
}

interface CorporateInsightData {
  totalNasabah?: number;
  nasabahDormant?: number;
  nasabahAktif: number;
  cabangCakupan: number;
  totalNetPosition?: number;
  totalDanaSimpanan: number;
  totalOutstandingLoan?: number;
  nasabahChurnRisk: number;
  branchCustomerTable?: BranchCustomerItem[];
  topProducts: Array<{ rank: number; name: string; type?: string; users: number }>;
  trbByBranch?: Array<{ code?: string; name: string; value: number }>;
  churnByBranch?: Array<{ code?: string; name: string; value: number; churnCount: number; total: number }>;
  segmentByPersona?: Array<{ name: string; nameEn?: string; value: number }>;
  segmentByArchetype?: Array<{ name: string; nameEn?: string; value: number }>;
}

// Localized label for a product_type (Saving / Loan / Deposit) from
// recommender.cust_data. Unknown/empty types fall back to a generic label.
function productTypeLabel(type: string | null | undefined, lang: 'id' | 'en'): string {
  const key = (type || '').trim().toLowerCase();
  const map: Record<string, { id: string; en: string }> = {
    saving: { id: 'Produk Tabungan', en: 'Saving Product' },
    tabungan: { id: 'Produk Tabungan', en: 'Saving Product' },
    loan: { id: 'Produk Pinjaman', en: 'Loan Product' },
    pinjaman: { id: 'Produk Pinjaman', en: 'Loan Product' },
    kredit: { id: 'Produk Kredit', en: 'Credit Product' },
    deposit: { id: 'Produk Deposito', en: 'Deposit Product' },
    deposito: { id: 'Produk Deposito', en: 'Deposit Product' },
    giro: { id: 'Produk Giro', en: 'Current Account' },
  };
  const entry = map[key];
  if (!entry) return lang === 'id' ? 'Produk Unggulan Bank' : 'Bank Product';
  return lang === 'id' ? entry.id : entry.en;
}

export function CorporateInsight() {
  const { lang } = useI18n();
  const [data, setData] = useState<CorporateInsightData | null>(null);
  const [productsReady, setProductsReady] = useState(true);
  const [statusDist, setStatusDist] = useState<DistItem[]>([]);
  const [mbDist, setMbDist] = useState<DistItem[]>([]);
  const [mbStatusDist, setMbStatusDist] = useState<DistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Top-products product_type filter ("all" | TABUNGAN | DEPOSITO | KREDIT | GIRO | OTHER).
  const [productType, setProductType] = useState<string>('all');
  const [filteredProducts, setFilteredProducts] = useState<Array<{ rank: number; name: string; type?: string; users: number }> | null>(null);
  // Per-branch chart "how many branches shown" sliders + the active/churn/trb
  // tab. Declared here (with the other hooks) so they always run before the
  // early error-return below — moving them lower would violate rules-of-hooks
  // (React error #300) whenever the page hits the error branch.
  const [activeShown, setActiveShown] = useState<number>(18); // active chart: top 18 branches
  const [trbShown, setTrbShown] = useState<number>(18);       // TRB chart: top 18 branches
  const [churnShown, setChurnShown] = useState<number>(18);   // churn chart: top 18 branches
  const [distTab, setDistTab] = useState<'active' | 'churn' | 'trb'>('active');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('auth_token');
        // Reads from the new bag_demo database (ods.mv_h + ods.trb_score).
        // Response wraps the insight DTO + per-section "ready" flags.
        const res = await fetch('/api/v1/executive/bag-corporate-insight', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          setError(`HTTP ${res.status}`);
          return;
        }
        const body = await res.json();
        if (body.success && body.data && body.data.insight) {
          setData(body.data.insight);
          setProductsReady(body.data.productsReady !== false);
          setStatusDist(Array.isArray(body.data.statusDistribution) ? body.data.statusDistribution : []);
          // Order the MB adoption slices so "MB User" is listed first, "Non-MB User" below.
          setMbDist(
            Array.isArray(body.data.mbDistribution)
              ? [...body.data.mbDistribution].sort((a: DistItem, b: DistItem) => {
                  const rank = (d: DistItem) => ((d.nameEn || d.name || '').toLowerCase().includes('non') ? 1 : 0);
                  return rank(a) - rank(b);
                })
              : []
          );
          setMbStatusDist(Array.isArray(body.data.mbStatusDistribution) ? body.data.mbStatusDistribution : []);
        } else {
          setError(body.message || 'INVALID_RESPONSE');
        }
      } catch (err: any) {
        console.error('Failed to fetch corporate insight data:', err);
        setError(err?.message || 'NETWORK_ERROR');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Re-fetch the Top-3 products when the product_type filter changes.
  // "all" uses the already-loaded (unfiltered) list from the main response.
  useEffect(() => {
    if (productType === 'all') { setFilteredProducts(null); return; }
    let cancelled = false;
    async function fetchFiltered() {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`/api/v1/executive/bag-corporate-insight/top-products?productType=${encodeURIComponent(productType)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const body = await res.json();
          if (!cancelled && body.success && body.data) {
            setFilteredProducts(Array.isArray(body.data.topProducts) ? body.data.topProducts : []);
            setProductsReady(body.data.productsReady !== false);
          }
        }
      } catch (err) {
        console.error('Failed to fetch filtered top products:', err);
        if (!cancelled) setFilteredProducts([]);
      }
    }
    fetchFiltered();
    return () => { cancelled = true; };
  }, [productType]);

  // Error state — show a clear message instead of fake fallback data.
  // (Only after loading has finished; while loading we show the skeleton + spinner.)
  if (error && !loading) {
    return (
      <div className="px-6 pt-3 pb-6">
        <div className="bg-white border border-red-200 rounded-xl p-6 shadow-xs max-w-2xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {lang === 'id'
                  ? 'Tidak bisa terhubung ke database'
                  : 'Cannot connect to the database'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {lang === 'id'
                  ? 'Data Wawasan Korporat gagal dimuat. Periksa koneksi ke database lalu muat ulang halaman.'
                  : 'Corporate Insight data failed to load. Check the database connection and reload the page.'}
              </p>
              {error && (
                <p className="text-xs text-slate-400 mt-2 font-mono">({error})</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Locale used for number grouping / decimals follows the UI language:
  // ID -> "1.011.004" (dot thousands), EN -> "1,011,004" (comma thousands).
  const numLocale = lang === 'id' ? 'id-ID' : 'en-US';
  // While loading, data is still null — KPI values render as "-" and charts are
  // empty, with a big spinner overlay on top. Captions/labels stay visible.
  const dashNum = (v: number | null | undefined) =>
    loading || v === null || v === undefined ? '-' : v.toLocaleString(numLocale);
  const totalCustomers = dashNum(data?.totalNasabah);
  const activeCustomers = dashNum(data?.nasabahAktif);
  const branchScope = data?.cabangCakupan ?? '-';
  // Currency label follows the UI language: "Rp" (ID) / "IDR" (EN).
  const currency = lang === 'id' ? 'Rp' : 'IDR';
  // Percentage with exactly 2 decimals, locale-aware (ID uses a comma: "20,13%").
  const formatPct = (v: number) =>
    `${v.toLocaleString(numLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  const trillion = (v: number) =>
    `${currency} ${v.toLocaleString(numLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} T`;
  const fundingT = loading || data?.totalDanaSimpanan == null ? '-' : trillion(data.totalDanaSimpanan);
  const loanT = loading || data?.totalOutstandingLoan == null ? '-' : trillion(data.totalOutstandingLoan);

  // Sub-line under Total Customers: "<count> Dormant (<pct>%)" of the whole
  // population. Everything else on the page excludes Dormant.
  // Shown as a footnote BELOW the KPI cards; the "*" marker sits on the Total
  // Customers label.
  const dormantCount = data?.nasabahDormant;
  const totalForDormant = data?.totalNasabah;
  const dormantFootnote =
    loading || dormantCount == null || !totalForDormant
      ? ''
      : `*) ${dormantCount.toLocaleString(numLocale)} Inactive and 0 Balance (${formatPct((dormantCount / totalForDormant) * 100)})`;

  const branchTable = data?.branchCustomerTable ?? [];

  // Chart data: the largest branches by total customers. A slider controls how
  // many are shown (default 18). Short label for the X axis (strip the leading
  // "Cabang " / "Kantor " prefix) while keeping the full name for the tooltip.
  // (activeShown state is declared at the top with the other hooks.)
  const activeMax = branchTable.length;
  const activeCount = Math.min(activeShown, activeMax || activeShown);
  const baseChartData = [...branchTable]
    .sort((a, b) => b.totalNasabah - a.totalNasabah)
    .slice(0, activeCount)
    .map((b) => ({
      // Both the X-axis label and the tooltip show the branch CODE.
      name: b.branchCode || b.branchName,
      shortName: b.branchCode || b.branchName
        .replace(/^Kantor Pusat\s+/i, '')
        .replace(/^Cabang\s+/i, ''),
      total: b.totalNasabah,
      aktif: b.nasabahAktif,
    }));

  // --- Outlier handling: broken Y-axis (two stacked panels) ----------------
  // One branch (e.g. Jakarta Pusat ~794k) can dwarf the rest (~15k), flattening
  // the chart. We detect such an outlier dynamically (not hard-coded): the
  // largest branch counts as an outlier when it is >= OUTLIER_FACTOR x the 2nd
  // largest. When that happens the chart is split into two panels sharing the
  // same X axis:
  //   - a tall BOTTOM panel scaled 0..bottomCap (~2nd largest + headroom), so
  //     every normal branch is readable;
  //   - a short TOP panel scaled [topMin..topMax] around the outlier value,
  //     where only the outlier bar reaches up; a break mark sits between them.
  const OUTLIER_FACTOR = 4;
  const sortedTotals = baseChartData.map((d) => d.total).sort((a, b) => b - a);
  const largest = sortedTotals[0] ?? 0;
  const secondLargest = sortedTotals[1] ?? 0;
  const hasOutlier = baseChartData.length >= 2 && secondLargest > 0 && largest >= secondLargest * OUTLIER_FACTOR;

  // Bottom panel cap = largest non-outlier bar + ~8% headroom, rounded to 1k.
  const bottomCap = hasOutlier ? Math.ceil((secondLargest * 1.08) / 1000) * 1000 : 0;
  // Top panel window around the outlier: floor a bit below, ceil a bit above,
  // rounded to a readable step so the ticks are clean (e.g. 785k..795k).
  const topStep = 5000;
  const topMin = hasOutlier ? Math.floor((largest * 0.985) / topStep) * topStep : 0;
  const topMax = hasOutlier ? Math.ceil((largest * 1.005) / topStep) * topStep : 0;

  // chartData keeps the REAL values (no clamping needed: each panel's domain
  // decides what shows). isOutlier flags the dominant branch for coloring.
  const chartData = baseChartData.map((d) => ({
    ...d,
    isOutlier: hasOutlier && d.total === largest,
    totalReal: d.total,
    aktifReal: d.aktif,
  }));
  const outlierRow = chartData.find((d) => d.isOutlier);

  // Average of active customers across all branches (drawn as a reference line
  // on the bottom panel). Excludes the outlier so the line reflects the rest.
  const nonOutlier = chartData.filter((d) => !d.isOutlier);
  const avgAktif =
    nonOutlier.length > 0
      ? nonOutlier.reduce((sum, b) => sum + b.aktif, 0) / nonOutlier.length
      : 0;

  // Total TRB per branch (raw IDR) for the pie chart. Backend returns the top
  // branches (desc). A slider lets the user choose how many to show (default 15).
  const trbByBranchAll = data?.trbByBranch ?? [];
  // (trbShown + distTab state are declared at the top with the other hooks.)
  const trbMax = trbByBranchAll.length;
  // Clamp the shown count to what's actually available.
  const trbCount = Math.min(trbShown, trbMax || trbShown);
  const trbByBranch = trbByBranchAll.slice(0, trbCount);
  const totalTrb = trbByBranch.reduce((sum, b) => sum + (b.value || 0), 0);

  // Short branch label (strip "Cabang "/"Kantor Pusat " prefix) for the X axis.
  const shortBranch = (name: string) =>
    (name || '').replace(/^Kantor Pusat\s+/i, '').replace(/^Cabang\s+/i, '');
  // TRB per branch as bar data (already sorted biggest->smallest by the backend),
  // value in BILLIONS of IDR (Milyar / Billion) for a readable Y axis.
  const trbBarData = trbByBranch.map((b) => ({
    name: b.code || b.name,
    shortName: b.code || shortBranch(b.name),
    trbJuta: (b.value || 0) / 1_000_000_000,
  }));

  // Average TRB (in billions) across the shown branches — drawn as a dashed
  // reference line, same idea as the active chart's "Avg Active" line.
  const avgTrbJuta =
    trbBarData.length > 0 ? trbBarData.reduce((s, b) => s + b.trbJuta, 0) / trbBarData.length : 0;

  // Broken Y-axis for TRB: a few branches (e.g. Jakarta Pusat / Tangerang) dwarf
  // the long tail. Split into a TOP band (big branches) and a BOTTOM band (the
  // rest) so smaller branches stay readable. The split threshold = max bar that
  // is still "small" (<= 3x the median), with headroom; anything taller shows in
  // the top band. Only engage when the top bar is >= 4x the bottom-band cap.
  const trbVals = trbBarData.map((d) => d.trbJuta).sort((a, b) => a - b);
  const trbMaxVal = trbVals.length > 0 ? trbVals[trbVals.length - 1] : 0;
  const trbMedian = trbVals.length > 0 ? trbVals[Math.floor(trbVals.length / 2)] : 0;
  const tailThreshold = trbMedian > 0 ? trbMedian * 3 : trbMaxVal;
  const tailMax = trbVals.filter((v) => v <= tailThreshold).pop() ?? trbMaxVal;
  const trbHasOutlier = trbBarData.length >= 3 && tailMax > 0 && trbMaxVal >= tailMax * 4;
  // Round caps to a readable step on the billions scale (e.g. max ~5,000 Milyar).
  const trbStep = trbMaxVal >= 1_000 ? 500 : trbMaxVal >= 100 ? 100 : trbMaxVal >= 10 ? 10 : 1;
  const trbBottomCap = trbHasOutlier ? Math.ceil((tailMax * 1.1) / trbStep) * trbStep : 0;
  const trbTopMax = trbHasOutlier ? Math.ceil((trbMaxVal * 1.03) / trbStep) * trbStep : 0;
  // Short Milyar/Billion formatter for the TRB axis ticks (keeps labels compact).
  const trbTick = (v: number) => `${Number(v).toLocaleString(numLocale)} ${lang === 'id' ? 'M' : 'B'}`;
  // Average-line label: keep 1 decimal so small selections don't collapse to 0.
  const trbAvgLabel = (v: number) =>
    `${v.toLocaleString(numLocale, { maximumFractionDigits: 1 })} ${lang === 'id' ? 'M' : 'B'}`;

  // --- Churn per branch (new "Churn" tab) ----------------------------------
  // Churn rate (%) per branch from churn.churn_result (share with churn_proba
  // > 0.7). Backend returns all branches sorted by rate desc. A slider controls
  // how many are shown (default 18). The dashed line = overall churn rate
  // (total churn / total customers across the SHOWN branches), a 0-100% metric
  // so no broken Y-axis is needed.
  const churnByBranchAll = data?.churnByBranch ?? [];
  // (churnShown state is declared at the top with the other hooks.)
  const churnMax = churnByBranchAll.length;
  const churnCount = Math.min(churnShown, churnMax || churnShown);
  const churnByBranch = churnByBranchAll.slice(0, churnCount);
  const churnBarData = churnByBranch.map((b) => ({
    name: b.code || b.name,
    shortName: b.code || shortBranch(b.name),
    rate: b.value || 0,
    churnCount: b.churnCount || 0,
    total: b.total || 0,
  }));
  // Overall churn rate across the shown branches (weighted by customer count),
  // drawn as the dashed reference line.
  const churnTotalCustomers = churnBarData.reduce((s, b) => s + b.total, 0);
  const churnTotalChurned = churnBarData.reduce((s, b) => s + b.churnCount, 0);
  const avgChurnRate = churnTotalCustomers > 0 ? (churnTotalChurned / churnTotalCustomers) * 100 : 0;

  // Palette for the pie slices (brand-aligned browns/golds + accents).
  const PIE_COLORS = [
    '#6B4E2E', '#B89230', '#D4AF37', '#8A6534', '#B4522E', '#C9A227',
    '#A47148', '#D8C4A8', '#7C5E3B', '#E0B050', '#9C6B3F', '#C08457',
    '#8B6914', '#D2A679', '#6F5029', '#E8C87E', '#A0522D', '#CBB994',
  ];

  // Format a raw IDR value into a billions string for the tooltip.
  // "Milyar" in Indonesian, "Billion" in English; currency "Rp" / "IDR".
  const formatTrbJuta = (v: number) => {
    const milyar = v / 1_000_000_000;
    const unit = lang === 'id' ? 'Milyar' : 'Billion';
    return `${currency} ${milyar.toLocaleString(numLocale, { maximumFractionDigits: 2 })} ${unit}`;
  };

  // Customer count per segment (persona) for the segment pie chart.
  const segmentByPersona = data?.segmentByPersona ?? [];
  const totalSegment = segmentByPersona.reduce((sum, s) => sum + (s.value || 0), 0);
  // Retention counterpart: customer count per retention archetype.
  const segmentByArchetype = data?.segmentByArchetype ?? [];
  const totalArchetype = segmentByArchetype.reduce((sum, s) => sum + (s.value || 0), 0);

  // When a product_type filter is active, show the filtered list; else the
  // unfiltered Top-3 from the main response.
  const topProducts = productType === 'all' ? (data?.topProducts ?? []) : (filteredProducts ?? []);
  // Product-type combo options (value sent to the API; label shown).
  const PRODUCT_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'all', label: lang === 'id' ? 'Semua Jenis Produk' : 'All Product Type' },
    { value: 'TABUNGAN', label: 'TABUNGAN' },
    { value: 'DEPOSITO', label: 'DEPOSITO' },
    { value: 'KREDIT', label: 'KREDIT' },
    { value: 'GIRO', label: 'GIRO' },
    { value: 'OTHER', label: 'OTHER' },
  ];

  return (
    <div className="relative px-6 pt-3 pb-6 space-y-6">
      {/* Loading is indicated only by the small spinner at the top-right (below),
          so the page structure stays interactive while data loads. */}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'id' ? 'Wawasan Korporat' : 'Corporate Insight'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {lang === 'id'
              ? 'Ringkasan portofolio & efektivitas analitik.'
              : 'Portfolio summary & analytics overview.'}
          </p>
        </div>
        {/* Small spinner at top-right while loading. */}
        {loading && <Loader2 className="w-5 h-5 animate-spin text-[#6B4E2E] mt-1" />}
      </div>

      {/* KPI Cards — Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Nasabah */}
        <KpiCard
          label={<>{lang === 'id' ? 'TOTAL NASABAH' : 'TOTAL CUSTOMERS'} <span className="text-red-600">*</span></>}
          value={totalCustomers}
          sub={`${branchScope} ${lang === 'id' ? 'cabang dalam cakupan' : 'branches in scope'}`}
          borderColor="border-l-[#6B4E2E]"
          valueColor="text-[#6B4E2E]"
          icon={Users}
        />

        {/* Card 2: Nasabah Aktif */}
        <KpiCard
          label={lang === 'id' ? 'NASABAH AKTIF' : 'ACTIVE CUSTOMERS'}
          value={activeCustomers}
          sub={lang === 'id' ? 'portofolio nasabah aktif' : 'active customer portfolio'}
          borderColor="border-l-emerald-600"
          valueColor="text-emerald-600"
          icon={UserCheck}
        />

        {/* Card 3: Total Funding Balance */}
        <KpiCard
          label={lang === 'id' ? 'DANA SIMPANAN' : 'TOTAL FUNDING BALANCE'}
          value={fundingT}
          sub={lang === 'id' ? 'tabungan & deposito nasabah' : 'savings & deposit balance'}
          borderColor="border-l-[#D4AF37]"
          valueColor="text-[#B89230]"
          icon={Wallet}
        />

        {/* Card 4: Total Outstanding Loan */}
        <KpiCard
          label={lang === 'id' ? 'TOTAL PINJAMAN' : 'TOTAL OUTSTANDING LOAN'}
          value={loanT}
          sub={lang === 'id' ? 'portofolio pinjaman & kredit' : 'loan & credit portfolio'}
          borderColor="border-l-indigo-600"
          valueColor="text-indigo-600"
          icon={CreditCard}
        />
      </div>

      {/* Footnote for the Total Customers "*" marker. */}
      {dormantFootnote && (
        <p className="-mt-5 text-xs text-red-600 font-medium">{dormantFootnote}</p>
      )}

      {/* Section 1c: Two distribution pies (left + right half) from ods.mv_h. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DistPie
          title={lang === 'id' ? 'Distribusi Status Nasabah' : 'Customer Status Distribution'}
          caption={lang === 'id' ? 'Aktif vs Tidak Aktif' : 'Active vs Inactive'}
          data={statusDist}
          lang={lang}
          numLocale={numLocale}
          palette={['#2E7D5B', '#B4522E']}
          icon={UserCheck}
          description={(d) => {
            const raw = (d.nameEn || d.name || '').toLowerCase();
            const isActive = raw.includes('active') && !raw.includes('inactive');
            if (isActive) {
              return lang === 'id'
                ? 'Ada transaksi dalam 12 bulan terakhir dan saldo lebih dari nol'
                : 'Has transactions in the last 12 months and a balance greater than zero';
            }
            return lang === 'id'
              ? 'Tidak ada transaksi dalam 12 bulan terakhir dan saldo nol'
              : 'No transactions in the last 12 months and zero balance';
          }}
        />
        <DistPie
          title={lang === 'id' ? 'Distribusi Pengguna Mobile Banking' : 'Mobile Banking Adoption'}
          caption={lang === 'id' ? 'Pengguna vs Bukan Pengguna' : 'User vs Non-User'}
          data={mbDist}
          lang={lang}
          numLocale={numLocale}
          palette={['#6B4E2E', '#D8C4A8']}
          icon={Smartphone}
          description={(d) => {
            const isMbUser = !(d.nameEn || d.name || '').toLowerCase().includes('non');
            if (isMbUser) {
              return lang === 'id'
                ? 'Nasabah yang bertransaksi melalui channel Mobile Banking dalam 12 bulan terakhir'
                : 'Customer who transacted via the Mobile Banking channel in the last 12 months';
            }
            return lang === 'id'
              ? 'Nasabah yang tidak bertransaksi melalui channel Mobile Banking dalam 12 bulan terakhir'
              : 'Customer who did not transact via the Mobile Banking channel in the last 12 months';
          }}
        />
      </div>

      {/* Section 1: Branch Customer Table (Full-Width with Paging 10 items/page) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 pb-2 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4.5 h-4.5 text-[#6B4E2E]" />
            <h3 className="text-base font-bold text-slate-800">
              {distTab === 'trb'
                ? (lang === 'id'
                    ? 'Distribusi TRB (Total Relationship Balance) Per Cabang'
                    : 'TRB (Total Relationship Balance) Distribution Per Branch')
                : distTab === 'churn'
                ? (lang === 'id' ? 'Distribusi Churn Per Cabang' : 'Churn Distribution Per Branch')
                : (lang === 'id' ? 'Distribusi Nasabah Aktif Per Cabang' : 'Active Customer Distribution Per Branch')}
            </h3>
          </div>
          <span className="text-xs font-bold text-[#6B4E2E] bg-[#6B4E2E]/10 border border-[#6B4E2E]/20 px-3 py-1 rounded-full">
            {branchTable.length} {lang === 'id' ? 'Cabang Terdaftar' : 'Registered Branches'}
          </span>
        </div>

        {/* Tabs: Active Customer | TRB */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 border border-slate-200 w-fit mb-3">
          <button
            type="button"
            onClick={() => setDistTab('active')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
              distTab === 'active' ? 'bg-[#6B4E2E] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'id' ? 'Nasabah Aktif' : 'Active Customer'}
          </button>
          <button
            type="button"
            onClick={() => setDistTab('churn')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
              distTab === 'churn' ? 'bg-[#6B4E2E] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Churn
          </button>
          <button
            type="button"
            onClick={() => setDistTab('trb')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
              distTab === 'trb' ? 'bg-[#6B4E2E] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            TRB
          </button>
        </div>
        {distTab === 'active' && (<>
        <p className="text-xs text-slate-400 mb-1 font-medium">
          {lang === 'id'
            ? 'Total nasabah vs nasabah aktif per kantor cabang. Garis putus-putus menunjukkan rata-rata nasabah aktif seluruh cabang.'
            : 'Total vs active customers per branch. The dashed line marks the average active customers across all branches.'}
        </p>
        {hasOutlier && outlierRow && (
          <p className="text-[11px] text-[#C9712D] mb-4 font-semibold flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-[#C9712D]" />
            {lang === 'id'
              ? `Cabang ${displayBranchName(outlierRow.name, lang)} (${outlierRow.totalReal.toLocaleString(numLocale)} nasabah) jauh lebih besar, jadi sumbu Y dipotong (grafik atas) agar cabang lain tetap terbaca.`
              : `Branch ${displayBranchName(outlierRow.name, lang)} (${outlierRow.totalReal.toLocaleString(numLocale)} customers) is far larger, so the Y axis is broken (top panel) to keep the other branches readable.`}
          </p>
        )}

        {hasOutlier ? (
          // Broken Y-axis: a short TOP panel for the outlier value window and a
          // tall BOTTOM panel for everyone else, split by a break mark.
          <div>
            {/* TOP panel: only the outlier reaches this high (topMin..topMax). */}
            <ResponsiveContainer width="100%" height={90}>
              <ComposedChart data={chartData} margin={{ top: 16, right: 20, bottom: 0, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="shortName" hide />
                <YAxis
                  width={56}
                  fontSize={11}
                  stroke="#64748B"
                  domain={[topMin, topMax]}
                  allowDataOverflow
                  ticks={[topMin, Math.round((topMin + topMax) / 2 / 1000) * 1000, topMax]}
                  tickFormatter={(v) => `${(v / 1000).toLocaleString(numLocale)}k`}
                />
                <Bar dataKey="total" fill="#C9712D" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
                  {chartData.map((d, idx) => (
                    <Cell key={idx} fill={d.isOutlier ? '#C9712D' : 'transparent'} />
                  ))}
                  <LabelList
                    dataKey="totalReal"
                    position="top"
                    content={(props: any) => {
                      const { x, y, width, index } = props;
                      const row = chartData[index];
                      if (!row || !row.isOutlier) return null;
                      return (
                        <text x={Number(x) + Number(width) / 2} y={Number(y) - 5} textAnchor="middle" fill="#C9712D" fontSize={11} fontWeight={800}>
                          {Number(row.totalReal).toLocaleString(numLocale)}
                        </text>
                      );
                    }}
                  />
                </Bar>
                <Bar dataKey="aktif" fill="#8A3A1E" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
                  {chartData.map((d, idx) => (
                    <Cell key={idx} fill={d.isOutlier ? '#8A3A1E' : 'transparent'} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>

            {/* BOTTOM panel: 0..bottomCap, every normal branch readable. Clipped
                (outlier) bars get zig-zag break marks drawn on them at the top. */}
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 20, bottom: 70, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="shortName" fontSize={10} stroke="#64748B" interval={0} angle={-45} textAnchor="end" height={70} />
                <YAxis
                  width={56}
                  fontSize={11}
                  stroke="#64748B"
                  domain={[0, bottomCap]}
                  allowDataOverflow
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toLocaleString(numLocale)}k` : `${v}`)}
                />
                <Tooltip
                  formatter={(value: number, name: string, props: any) => {
                    const row = props?.payload;
                    const key = props?.dataKey;
                    const real = row && row.isOutlier
                      ? (key === 'total' ? row.totalReal : key === 'aktif' ? row.aktifReal : value)
                      : value;
                    return [Number(real).toLocaleString(numLocale), name];
                  }}
                  labelFormatter={(_, payload) => {
                    if (payload && payload.length > 0) {
                      const row: any = payload[0].payload;
                      const base = displayBranchName(row.name, lang);
                      return row.isOutlier ? `${base} ${lang === 'id' ? '(skala dipotong)' : '(scale broken)'}` : base;
                    }
                    return '';
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="total" name={lang === 'id' ? 'Total Nasabah' : 'Total Customers'} fill="#D8C4A8" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {chartData.map((d, idx) => (
                    <Cell key={idx} fill={d.isOutlier ? '#C9712D' : '#D8C4A8'} />
                  ))}
                  <LabelList
                    dataKey="total"
                    content={(props: any) => {
                      const { x, y, width, value } = props;
                      if (value == null || value <= bottomCap) return null;
                      const cx = Number(x) + Number(width) / 2;
                      const top = Number(y);
                      return (
                        <g stroke="#C9712D" strokeWidth={2.5} fill="none">
                          <path d={`M${cx - 10} ${top + 8} L${cx - 2} ${top - 2}`} />
                          <path d={`M${cx + 2} ${top + 8} L${cx + 10} ${top - 2}`} />
                        </g>
                      );
                    }}
                  />
                </Bar>
                <Bar dataKey="aktif" name={lang === 'id' ? 'Nasabah Aktif' : 'Active Customers'} fill="#6B4E2E" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {chartData.map((d, idx) => (
                    <Cell key={idx} fill={d.isOutlier ? '#8A3A1E' : '#6B4E2E'} />
                  ))}
                  <LabelList
                    dataKey="aktif"
                    content={(props: any) => {
                      const { x, y, width, value } = props;
                      if (value == null || value <= bottomCap) return null;
                      const cx = Number(x) + Number(width) / 2;
                      const top = Number(y);
                      return (
                        <g stroke="#8A3A1E" strokeWidth={2.5} fill="none">
                          <path d={`M${cx - 10} ${top + 8} L${cx - 2} ${top - 2}`} />
                          <path d={`M${cx + 2} ${top + 8} L${cx + 10} ${top - 2}`} />
                        </g>
                      );
                    }}
                  />
                </Bar>
                <ReferenceLine
                  y={avgAktif}
                  stroke="#B4522E"
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  label={{
                    value: (lang === 'id' ? 'Rata-rata Aktif: ' : 'Avg Active: ') + Math.round(avgAktif).toLocaleString(numLocale),
                    position: 'insideTopRight',
                    fill: '#B4522E',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          // No extreme outlier: a single normal chart.
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 70, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="shortName" fontSize={10} stroke="#64748B" interval={0} angle={-45} textAnchor="end" height={70} />
              <YAxis width={56} fontSize={11} stroke="#64748B" tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toLocaleString(numLocale)}k` : `${v}`)} />
              <Tooltip
                formatter={(value: number, name: string) => [Number(value).toLocaleString(numLocale), name]}
                labelFormatter={(_, payload) => (payload && payload.length > 0 ? displayBranchName(payload[0].payload.name, lang) : '')}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="total" name={lang === 'id' ? 'Total Nasabah' : 'Total Customers'} fill="#D8C4A8" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="aktif" name={lang === 'id' ? 'Nasabah Aktif' : 'Active Customers'} fill="#6B4E2E" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <ReferenceLine
                y={avgAktif}
                stroke="#B4522E"
                strokeDasharray="6 4"
                strokeWidth={2}
                label={{
                  value: (lang === 'id' ? 'Rata-rata Aktif: ' : 'Avg Active: ') + Math.round(avgAktif).toLocaleString(numLocale),
                  position: 'insideTopRight',
                  fill: '#B4522E',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* Slider: how many branches to show (default 18). */}
        {activeMax > 1 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600">
                {lang === 'id' ? 'Jumlah cabang ditampilkan' : 'Branches shown'}
              </label>
              <span className="text-xs font-bold text-[#6B4E2E]">{activeCount} / {activeMax}</span>
            </div>
            <input
              type="range"
              min={1}
              max={activeMax}
              value={activeCount}
              onChange={(e) => setActiveShown(Number(e.target.value))}
              className="w-full accent-[#6B4E2E] cursor-pointer"
            />
          </div>
        )}
        </>)}

        {distTab === 'trb' && (
          <>
            <p className="text-xs text-slate-400 mb-1 font-medium">
              {lang === 'id'
                ? 'Total Relationship Balance (TRB) per kantor cabang, diurutkan dari yang terbesar. Garis putus-putus menunjukkan rata-rata TRB.'
                : 'Total Relationship Balance (TRB) per branch, ordered from largest to smallest. The dashed line marks the average TRB.'}
            </p>
            {trbHasOutlier && (
              <p className="text-[11px] text-[#6B4E2E] mb-4 font-semibold flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-[#6B4E2E]" />
                {lang === 'id'
                  ? 'Beberapa cabang jauh lebih besar, jadi sumbu Y dipotong (grafik atas) agar cabang lain tetap terbaca.'
                  : 'A few branches are far larger, so the Y axis is broken (top panel) to keep the other branches readable.'}
              </p>
            )}

            {trbHasOutlier ? (
              <div>
                {/* TOP panel: only the large branches reach this band. */}
                <ResponsiveContainer width="100%" height={90}>
                  <BarChart data={trbBarData} margin={{ top: 16, right: 20, bottom: 0, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="shortName" hide />
                    <YAxis
                      width={70}
                      fontSize={11}
                      stroke="#64748B"
                      domain={[trbBottomCap, trbTopMax]}
                      allowDataOverflow
                      ticks={[trbBottomCap, Math.round((trbBottomCap + trbTopMax) / 2 / trbStep) * trbStep, trbTopMax]}
                      tickFormatter={trbTick}
                    />
                    <Bar dataKey="trbJuta" fill="#6B4E2E" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>

                {/* BOTTOM panel: 0..trbBottomCap, the long tail readable.
                    Bars that exceed the cap get zig-zag break marks drawn at the top. */}
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={trbBarData} margin={{ top: 4, right: 20, bottom: 70, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="shortName" fontSize={10} stroke="#64748B" interval={0} angle={-45} textAnchor="end" height={70} />
                    <YAxis width={70} fontSize={11} stroke="#64748B" domain={[0, trbBottomCap]} allowDataOverflow tickFormatter={trbTick} />
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const p = payload[0].payload;
                        const raw = (p.trbJuta || 0) * 1_000_000_000;
                        const pct = totalTrb > 0 ? (raw / totalTrb) * 100 : 0;
                        return (
                          <div className="bg-white border border-slate-200 rounded-md shadow-sm px-3 py-2 text-xs">
                            <div className="font-bold text-slate-800">{displayBranchName(p.name, lang)}</div>
                            <div className="text-slate-600 mt-0.5">{formatTrbJuta(raw)} ({formatPct(pct)})</div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="trbJuta" name="TRB" fill="#6B4E2E" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      <LabelList
                        dataKey="trbJuta"
                        content={(props: any) => {
                          const { x, y, width, value } = props;
                          if (value == null || value <= trbBottomCap) return null; // only broken bars
                          const cx = Number(x) + Number(width) / 2;
                          const top = Number(y);
                          // Two zig-zag strokes centered on the bar, just above its clipped top.
                          return (
                            <g stroke="#6B4E2E" strokeWidth={2.5} fill="none">
                              <path d={`M${cx - 10} ${top + 8} L${cx - 2} ${top - 2}`} />
                              <path d={`M${cx + 2} ${top + 8} L${cx + 10} ${top - 2}`} />
                            </g>
                          );
                        }}
                      />
                    </Bar>
                    {avgTrbJuta <= trbBottomCap && (
                      <ReferenceLine
                        y={avgTrbJuta}
                        stroke="#B4522E"
                        strokeDasharray="6 4"
                        strokeWidth={2}
                        label={{
                          value: (lang === 'id' ? 'Rata-rata TRB: ' : 'Avg TRB: ') + trbAvgLabel(avgTrbJuta),
                          position: 'insideTopRight',
                          fill: '#B4522E',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={trbBarData} margin={{ top: 20, right: 20, bottom: 70, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="shortName" fontSize={10} stroke="#64748B" interval={0} angle={-45} textAnchor="end" height={70} />
                  <YAxis width={70} fontSize={11} stroke="#64748B" tickFormatter={trbTick} />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const p = payload[0].payload;
                      const raw = (p.trbJuta || 0) * 1_000_000_000;
                      const pct = totalTrb > 0 ? (raw / totalTrb) * 100 : 0;
                      return (
                        <div className="bg-white border border-slate-200 rounded-md shadow-sm px-3 py-2 text-xs">
                          <div className="font-bold text-slate-800">{displayBranchName(p.name, lang)}</div>
                          <div className="text-slate-600 mt-0.5">{formatTrbJuta(raw)} ({formatPct(pct)})</div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="trbJuta" name="TRB" fill="#6B4E2E" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <ReferenceLine
                    y={avgTrbJuta}
                    stroke="#B4522E"
                    strokeDasharray="6 4"
                    strokeWidth={2}
                    label={{
                      value: (lang === 'id' ? 'Rata-rata TRB: ' : 'Avg TRB: ') + trbAvgLabel(avgTrbJuta),
                      position: 'insideTopRight',
                      fill: '#B4522E',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Slider: how many branches to show (default: all). */}
            {trbMax > 1 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600">
                    {lang === 'id' ? 'Jumlah cabang ditampilkan' : 'Branches shown'}
                  </label>
                  <span className="text-xs font-bold text-[#6B4E2E]">{trbCount} / {trbMax}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={trbMax}
                  value={trbCount}
                  onChange={(e) => setTrbShown(Number(e.target.value))}
                  className="w-full accent-[#6B4E2E] cursor-pointer"
                />
              </div>
            )}
          </>
        )}

        {distTab === 'churn' && (
          <>
            <p className="text-xs text-slate-400 mb-4 font-medium">
              {lang === 'id'
                ? 'Rasio churn (nasabah dengan probabilitas churn > 70%) per kantor cabang, diurutkan dari yang tertinggi. Garis putus-putus menunjukkan rata-rata churn seluruh cabang yang ditampilkan.'
                : 'Churn rate (customers with churn probability > 70%) per branch, ordered from highest. The dashed line marks the overall churn rate across the shown branches.'}
            </p>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={churnBarData} margin={{ top: 20, right: 20, bottom: 70, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="shortName" fontSize={10} stroke="#64748B" interval={0} angle={-45} textAnchor="end" height={70} />
                <YAxis
                  width={48}
                  fontSize={11}
                  stroke="#64748B"
                  tickFormatter={(v) => `${Number(v).toLocaleString(numLocale)}%`}
                />
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const p = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 rounded-md shadow-sm px-3 py-2 text-xs">
                        <div className="font-bold text-slate-800">{displayBranchName(p.name, lang)}</div>
                        <div className="text-slate-600 mt-0.5">
                          {lang === 'id' ? 'Rasio churn: ' : 'Churn rate: '}
                          <span className="font-semibold text-[#C0392B]">{formatPct(p.rate)}</span>
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {Number(p.churnCount).toLocaleString(numLocale)} / {Number(p.total).toLocaleString(numLocale)}{' '}
                          {lang === 'id' ? 'nasabah' : 'customers'}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="rate"
                  name={lang === 'id' ? 'Rasio Churn' : 'Churn Rate'}
                  fill="#D8C4A8"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <ReferenceLine
                  y={avgChurnRate}
                  stroke="#B4522E"
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  label={{
                    value: (lang === 'id' ? 'Rata-rata Churn: ' : 'Avg Churn: ') + formatPct(avgChurnRate),
                    position: 'insideTopRight',
                    fill: '#B4522E',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
              </BarChart>
            </ResponsiveContainer>

            {/* Slider: how many branches to show (default 18). */}
            {churnMax > 1 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600">
                    {lang === 'id' ? 'Jumlah cabang ditampilkan' : 'Branches shown'}
                  </label>
                  <span className="text-xs font-bold text-[#6B4E2E]">{churnCount} / {churnMax}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={churnMax}
                  value={churnCount}
                  onChange={(e) => setChurnShown(Number(e.target.value))}
                  className="w-full accent-[#6B4E2E] cursor-pointer"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Section 1b (Customer Distribution per Cluster) removed per request. */}
      {false && (
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4.5 h-4.5 text-[#6B4E2E]" />
          <h3 className="text-base font-bold text-slate-800">
            {lang === 'id' ? 'Distribusi Nasabah per Cluster' : 'Customer Distribution per Cluster'}
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Acquisition — per needs_cluster persona */}
          <div>
            <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-[#6B4E2E] mb-1">
              <Network className="w-4 h-4" />
              {lang === 'id' ? 'Segmentasi Pengguna Semua Channel' : 'All-Channel User Segmentation'}
            </p>
            <ResponsiveContainer width="100%" height={360}>
              <PieChart>
                <Pie
                  data={segmentByPersona}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  label={(entry: any) => {
                    const pct = totalSegment > 0 ? (entry.value / totalSegment) * 100 : 0;
                    return pct >= 4 ? formatPct(pct) : '';
                  }}
                  labelLine={false}
                >
                  {segmentByPersona.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[(idx + 2) % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const p = payload[0].payload;
                    const pct = totalSegment > 0 ? (Number(p.value) / totalSegment) * 100 : 0;
                    return (
                      <div className="bg-white border border-slate-200 rounded-md shadow-sm px-3 py-2 text-xs">
                        <div className="font-bold text-slate-800">{lang === 'id' ? p.name : (p.nameEn || p.name)}</div>
                        <div className="text-slate-600 mt-0.5">
                          {Number(p.value).toLocaleString(numLocale)} {lang === 'id' ? 'nasabah' : 'customers'} ({formatPct(pct)})
                        </div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Right: Retention — per mb_archetype */}
          <div>
            <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-[#6B4E2E] mb-1">
              <Smartphone className="w-4 h-4" />
              {lang === 'id' ? 'Segmentasi Pengguna Mobile Banking' : 'Mobile Banking User Segmentation'}
            </p>
            {segmentByArchetype.length === 0 ? (
              <div className="flex items-center justify-center text-slate-400 text-sm italic" style={{ height: 360 }}>
                {lang === 'id' ? 'Data retensi belum tersedia.' : 'Retention data not available yet.'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={360}>
                <PieChart>
                  <Pie
                    data={segmentByArchetype}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={(entry: any) => {
                      const pct = totalArchetype > 0 ? (entry.value / totalArchetype) * 100 : 0;
                      return pct >= 4 ? formatPct(pct) : '';
                    }}
                    labelLine={false}
                  >
                    {segmentByArchetype.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[(idx + 4) % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const p = payload[0].payload;
                      const pct = totalArchetype > 0 ? (Number(p.value) / totalArchetype) * 100 : 0;
                      return (
                        <div className="bg-white border border-slate-200 rounded-md shadow-sm px-3 py-2 text-xs">
                          <div className="font-bold text-slate-800">{lang === 'id' ? p.name : (p.nameEn || p.name)}</div>
                          <div className="text-slate-600 mt-0.5">
                            {Number(p.value).toLocaleString(numLocale)} {lang === 'id' ? 'nasabah' : 'customers'} ({formatPct(pct)})
                          </div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Section 2: Top 3 Produk Terlaris (Moved Below Table) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Package className="w-4.5 h-4.5 text-[#6B4E2E]" />
            <h3 className="text-base font-bold text-slate-800">
              {lang === 'id' ? 'Top 3 Produk Terlaris' : 'Top 3 Best-Selling Products'}
            </h3>
            {/* bag_demo has no real product data yet (placeholders) -> In Progress. */}
            {(!productsReady || topProducts.length === 0) && <InProgressBadge />}
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {lang === 'id' ? 'Penetrasi Produk Perbankan' : 'Banking Product Penetration'}
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-3 font-medium">
          {lang === 'id' ? 'Berdasarkan jumlah pemegang produk aktif di seluruh cabang (termasuk nasabah dormant)' : 'Based on active product holding user count across all branches (including dormant customers)'}
        </p>

        {/* Product-type filter combo box. */}
        <div className="mb-4">
          <select
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6B4E2E]"
          >
            {PRODUCT_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {!productsReady || topProducts.length === 0 ? (
          // Empty state: no product data available in the source database yet.
          <div className="flex flex-col items-center justify-center text-center py-12 px-6 rounded-xl border border-dashed border-amber-300 bg-amber-50/50">
            <Clock className="w-8 h-8 text-amber-500 mb-3" />
            <p className="text-sm font-bold text-slate-700">
              {lang === 'id' ? 'Data produk belum tersedia' : 'Product data not available yet'}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              {lang === 'id'
                ? 'Data penetrasi produk belum tersedia di database. Bagian ini sedang dalam proses pengembangan (In Progress).'
                : 'Product penetration data is not yet available in the database. This section is still In Progress.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topProducts.map((p) => (
              <div key={p.rank} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#6B4E2E] text-white font-black text-xs shadow-2xs">
                    #{p.rank}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{p.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{productTypeLabel(p.type, lang)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-[#6B4E2E]">{p.users.toLocaleString('id-ID')}</p>
                  <p className="text-[10px] text-slate-400">{lang === 'id' ? 'nasabah' : 'customers'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Small donut-style distribution pie card used for the three mv_h distributions
// (customer status, MB adoption, MB activity). Shows a legend with counts and
// percentages, and an In Progress / empty state when there is no data.
function DistPie({
  title,
  caption,
  data,
  lang,
  numLocale,
  palette,
  icon: Icon,
  labelOverride,
  titleAsterisk,
  pctBase,
  footnote,
  description,
}: {
  title: string;
  caption: string;
  data: DistItem[];
  lang: 'id' | 'en';
  numLocale: string;
  palette: string[];
  icon?: any;
  // Optional per-slice label override (by index). Falls back to data name.
  labelOverride?: (d: DistItem, idx: number) => string;
  // Append a red "*" to the title (for a footnoted metric).
  titleAsterisk?: boolean;
  // Denominator for percentages. Defaults to the sum of the slices; set this to
  // compare against a larger base (e.g. all customers) instead.
  pctBase?: number;
  // Red footnote shown below the legend.
  footnote?: string;
  // Optional extra description line shown in the tooltip under the value.
  description?: (d: DistItem, idx: number) => string | null | undefined;
}) {
  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
  // Base used for percentage calc (slice sum unless an explicit base is given).
  const pctDen = pctBase && pctBase > 0 ? pctBase : total;
  const label = (d: DistItem, idx: number) =>
    labelOverride?.(d, idx) ?? (lang === 'id' ? d.name : d.nameEn || d.name);
  // Percentage with 2 decimals, locale-aware (ID uses a comma: "76,58%").
  const fmtPct = (v: number) =>
    `${v.toLocaleString(numLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      <div className="flex items-center gap-2 mb-0.5">
        {Icon && <Icon className="w-4.5 h-4.5 text-[#6B4E2E]" />}
        <h3 className="text-sm font-bold text-slate-800">
          {title}{titleAsterisk && <span className="text-red-600"> *</span>}
        </h3>
      </div>
      <p className="text-[11px] text-slate-600 mb-3 font-medium">{caption}</p>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-10 px-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/50">
          <Clock className="w-6 h-6 text-amber-500 mb-2" />
          <p className="text-xs font-bold text-slate-700">
            {lang === 'id' ? 'Data belum tersedia' : 'Data not available yet'}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {lang === 'id' ? 'Sedang dalam proses (In Progress).' : 'Still In Progress.'}
          </p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart margin={{ top: 24, right: 10, bottom: 24, left: 10 }}>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={92}
                paddingAngle={2}
                // Start the first slice (index 0 = the positive one: Active /
                // MB User / Active MB User) at the BOTTOM of the ring (6 o'clock)
                // and sweep clockwise, so the positive slice sits at the bottom.
                startAngle={-90}
                endAngle={-450}
                labelLine={false}
                label={(props: any) => {
                  const { cx, cy, midAngle, outerRadius, value } = props;
                  const pct = pctDen > 0 ? (value / pctDen) * 100 : 0;
                  if (pct < 3) return null; // hide tiny-slice labels to avoid overlap
                  // Place each label just outside its own slice, along the
                  // slice's mid-angle, so the percentage sits beside its segment.
                  const RAD = Math.PI / 180;
                  const r = Number(outerRadius) + 18;
                  const x = Number(cx) + r * Math.cos(-midAngle * RAD);
                  const y = Number(cy) + r * Math.sin(-midAngle * RAD);
                  return (
                    <text
                      x={x}
                      y={y}
                      fill="#334155"
                      fontSize={13}
                      fontWeight={500}
                      textAnchor={x >= Number(cx) ? 'start' : 'end'}
                      dominantBaseline="central"
                    >
                      {fmtPct(pct)}
                    </text>
                  );
                }}
              >
                {data.map((_, idx) => (
                  <Cell key={idx} fill={palette[idx % palette.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const p = payload[0].payload as DistItem;
                  const pIdx = data.findIndex((d) => d === p);
                  const pct = pctDen > 0 ? (Number(p.value) / pctDen) * 100 : 0;
                  return (
                    <div className="bg-white border border-slate-200 rounded-md shadow-sm px-3 py-2 text-xs max-w-[16rem]">
                      <div className="font-bold text-slate-800">{label(p, pIdx)}</div>
                      <div className="text-slate-600 mt-0.5">
                        {Number(p.value).toLocaleString(numLocale)} ({fmtPct(pct)})
                      </div>
                      {description?.(p, pIdx) && (
                        <div className="text-slate-500 mt-1 leading-snug font-normal">{description(p, pIdx)}</div>
                      )}
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend with counts + percentages — centered block, not full width */}
          <div className="mt-2 space-y-1.5 mx-auto w-full max-w-xs px-12">
            {data.map((d, idx) => {
              const pct = pctDen > 0 ? (d.value / pctDen) * 100 : 0;
              return (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: palette[idx % palette.length] }}
                    />
                    <span className="text-slate-600 font-medium truncate">{label(d, idx)}</span>
                  </div>
                  <span className="text-slate-800 font-bold whitespace-nowrap ml-2">
                    {d.value.toLocaleString(numLocale)} ({fmtPct(pct)})
                  </span>
                </div>
              );
            })}
          </div>
          {footnote && (
            <p className="mt-2 text-[11px] text-red-600 font-medium">{footnote}</p>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  subExtra,
  borderColor,
  valueColor,
  icon: Icon,
}: {
  label: ReactNode;
  value: string;
  sub: string;
  subExtra?: string;
  borderColor?: string;
  valueColor?: string;
  icon?: any;
}) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 border-l-4 ${borderColor || 'border-l-[#6B4E2E]'} shadow-xs select-none relative`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
      </div>
      <p className={`text-2xl font-bold ${valueColor || 'text-slate-900'}`}>{value}</p>
      <p className="text-xs text-slate-600 mt-1">{sub}</p>
      {subExtra && <p className="text-xs font-medium text-amber-700 mt-0.5">{subExtra}</p>}
    </div>
  );
}
