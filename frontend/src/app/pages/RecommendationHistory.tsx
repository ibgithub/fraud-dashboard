import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import {
  History, TrendingUp, CheckCircle2, XCircle, Send, Filter, Download,
  Search, Calendar, Users, Building2, BarChart3, FileText, Eye,
  Clock, ArrowUpRight, Package, Handshake, X, Loader2
} from 'lucide-react';

// Persona segments — aligned with /segmentation/overview
type PersonaKey = 'senior' | 'vulnerable' | 'young' | 'sme' | 'unknown';

const PERSONAS: Record<PersonaKey, { nameId: string; nameEn: string; color: string; bg: string; text: string; border: string }> = {
  senior: {
    nameId: 'Senior & Aman',
    nameEn: 'Senior & Secure',
    color: '#8A6534',
    bg: 'bg-[#8A6534]/10',
    text: 'text-[#6f5029]',
    border: 'border-[#8A6534]/30',
  },
  vulnerable: {
    nameId: 'Nasabah Rentan & Membutuhkan Bantuan',
    nameEn: 'Vulnerable & Support-Seeking Customers',
    color: '#0E7490',
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
  },
  young: {
    nameId: 'Pelajar Muda & Produktif',
    nameEn: 'Young Students & Productive Youth',
    color: '#7C3AED',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
  },
  sme: {
    nameId: 'Pengusaha Kecil & Berorientasi Pertumbuhan',
    nameEn: 'Small Business & Growth-Oriented Entrepreneurs',
    color: '#059669',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  unknown: {
    nameId: 'Lainnya',
    nameEn: 'Other',
    color: '#64748B',
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
  },
};

// Map a free-text persona name (from segmentation.pred_result) to a PersonaKey.
function mapPersonaNameToKey(name: string | null | undefined): PersonaKey {
  if (!name) return 'unknown';
  const n = name.toLowerCase();
  if (n.includes('senior')) return 'senior';
  if (n.includes('vulnerable') || n.includes('rentan')) return 'vulnerable';
  if (n.includes('young') || n.includes('student') || n.includes('pelajar') || n.includes('muda')) return 'young';
  if (n.includes('business') || n.includes('entrepreneur') || n.includes('pengusaha') || n.includes('sme')) return 'sme';
  return 'unknown';
}

interface RecommendationRecord {
  id: string;
  cif: string;
  customerName: string;
  branch: string;
  aum: number;
  segmentation: PersonaKey;
  recommendationType: 'product' | 'non-product';
  recommendationName: string;
  offeredProduct?: string;  // concrete accepted product, e.g. "DEPOSITO BERJANGKA"
  offeredRate?: string;     // offered rate, e.g. "6%"
  status: 'sent' | 'accepted' | 'approved' | 'rejected';
  sentDate: string;
  acceptedDate?: string;
  approvedDate?: string;
  rejectedDate?: string;
  matrixCluster: string;
}

interface SummaryStats {
  totalSent: number;
  totalApproved: number;
  totalRejected: number;
  approvalRate: number;
}

export function RecommendationHistory() {
  const { lang } = useI18n();
  const isEn = lang === 'en';

  const [records, setRecords] = useState<RecommendationRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<RecommendationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filter inputs (draft - not applied until Submit is pressed)
  const [searchCif, setSearchCif] = useState('');
  const [searchName, setSearchName] = useState('');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterSegmentation, setFilterSegmentation] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Applied filters (only updated when Submit is pressed)
  const [appliedFilters, setAppliedFilters] = useState({
    searchCif: '',
    searchName: '',
    filterBranch: 'all',
    filterSegmentation: 'all',
    filterStatus: 'all',
    filterType: 'all',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Summary stats
  const [stats, setStats] = useState<SummaryStats>({
    totalSent: 0,
    totalApproved: 0,
    totalRejected: 0,
    approvalRate: 0,
  });

  // Detail modal
  const [selectedRecord, setSelectedRecord] = useState<RecommendationRecord | null>(null);

  // Persona label helper
  const personaName = (key: PersonaKey) => (isEn ? PERSONAS[key].nameEn : PERSONAS[key].nameId);

  // Derive AUM & Churn tier from matrix cluster code (C1..C9)
  // Grid: C7=AUM Hi/Churn Lo, C8=AUM Hi/Churn Med, C9=AUM Hi/Churn Hi
  //       C4=AUM Med/Churn Lo, C5=AUM Med/Churn Med, C6=AUM Med/Churn Hi
  //       C1=AUM Lo/Churn Lo,  C2=AUM Lo/Churn Med,  C3=AUM Lo/Churn Hi
  const clusterTiers = (matrixCluster: string): { aum: string; churn: string } | null => {
    const code = matrixCluster.trim().slice(0, 2).toUpperCase();
    const map: Record<string, { aum: string; churn: string }> = {
      C7: { aum: 'Hi', churn: 'Lo' }, C8: { aum: 'Hi', churn: 'Med' }, C9: { aum: 'Hi', churn: 'Hi' },
      C4: { aum: 'Med', churn: 'Lo' }, C5: { aum: 'Med', churn: 'Med' }, C6: { aum: 'Med', churn: 'Hi' },
      C1: { aum: 'Lo', churn: 'Lo' }, C2: { aum: 'Lo', churn: 'Med' }, C3: { aum: 'Lo', churn: 'Hi' },
    };
    return map[code] ?? null;
  };

  const tierLabel = (t: string) => {
    if (t === 'Hi') return 'Hi';
    if (t === 'Med') return 'Med';
    return 'Lo';
  };

  // Branch & persona options for filters (loaded from API)
  const [branchOptions, setBranchOptions] = useState<string[]>([]);
  const [personaOptions, setPersonaOptions] = useState<string[]>([]);
  // Total records for pagination (from server)
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const authHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Map an API record (backend RecordDto) to the frontend RecommendationRecord
  const mapApiRecord = (r: any, idx: number): RecommendationRecord => ({
    id: `${r.cif}-${idx}`,
    cif: String(r.cif ?? ''),
    customerName: r.customerName ?? '',
    branch: r.branch ?? '',
    aum: Number(r.aum ?? 0),
    segmentation: mapPersonaNameToKey(r.segmentation),
    recommendationType: r.recommendationType === 'product' ? 'product' : 'non-product',
    recommendationName: r.recommendationName ?? '',
    offeredProduct: r.offeredProduct ?? undefined,
    offeredRate: r.offeredRate ?? undefined,
    status: (['sent', 'accepted', 'approved', 'rejected'].includes(r.status) ? r.status : 'sent') as RecommendationRecord['status'],
    matrixCluster: r.matrixCluster ?? '',
    sentDate: r.sentDate ?? '',
    acceptedDate: r.acceptedDate ?? undefined,
    approvedDate: r.approvedDate ?? undefined,
    rejectedDate: r.rejectedDate ?? undefined,
  });

  // Load branch & persona filter options once
  useEffect(() => {
    async function loadOptions() {
      try {
        const [bRes, pRes] = await Promise.all([
          fetch('/api/v1/executive/recommendation-history/branches', { headers: authHeaders() }),
          fetch('/api/v1/executive/recommendation-history/personas', { headers: authHeaders() }),
        ]);
        if (bRes.ok) {
          const b = await bRes.json();
          if (b.success && Array.isArray(b.data)) setBranchOptions(b.data);
        }
        if (pRes.ok) {
          const p = await pRes.json();
          if (p.success && Array.isArray(p.data)) setPersonaOptions(p.data);
        }
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    }
    loadOptions();
  }, []);

  // Fetch page data from the API whenever applied filters or page changes
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const qs = new URLSearchParams({
          page: String(currentPage - 1),
          size: String(pageSize),
        });
        if (appliedFilters.searchCif) qs.append('searchCif', appliedFilters.searchCif);
        if (appliedFilters.searchName) qs.append('searchName', appliedFilters.searchName);
        if (appliedFilters.filterBranch !== 'all') qs.append('branch', appliedFilters.filterBranch);
        if (appliedFilters.filterSegmentation !== 'all') qs.append('segmentation', appliedFilters.filterSegmentation);
        if (appliedFilters.filterStatus !== 'all') qs.append('status', appliedFilters.filterStatus);
        if (appliedFilters.filterType !== 'all') qs.append('type', appliedFilters.filterType);

        const res = await fetch(`/api/v1/executive/recommendation-history?${qs.toString()}`, { headers: authHeaders() });
        if (res.ok) {
          const body = await res.json();
          if (body.success && body.data) {
            const d = body.data;
            const mapped = (d.records || []).map(mapApiRecord);
            setRecords(mapped);
            setFilteredRecords(mapped);
            setTotalElements(d.totalElements ?? mapped.length);
            setTotalPages(d.totalPages ?? 1);
            setStats({
              totalSent: d.totalSent ?? 0,
              totalApproved: d.totalApproved ?? 0,
              totalRejected: d.totalRejected ?? 0,
              approvalRate: d.approvalRate ?? 0,
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch recommendation history:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [appliedFilters, currentPage]);

  // Submit handler - apply the draft filter inputs (reset to page 1)
  const handleSubmitFilters = () => {
    setCurrentPage(1);
    setAppliedFilters({
      searchCif,
      searchName,
      filterBranch,
      filterSegmentation,
      filterStatus,
      filterType,
    });
  };

  // Clear handler - reset both draft inputs and applied filters
  const handleClearFilters = () => {
    setSearchCif('');
    setSearchName('');
    setFilterBranch('all');
    setFilterSegmentation('all');
    setFilterStatus('all');
    setFilterType('all');
    setCurrentPage(1);
    setAppliedFilters({
      searchCif: '',
      searchName: '',
      filterBranch: 'all',
      filterSegmentation: 'all',
      filterStatus: 'all',
      filterType: 'all',
    });
  };

  // Server-side pagination: records are already the current page
  const paginatedRecords = filteredRecords;

  // Filter dropdown options (from API)
  const branches = branchOptions;

  // Export ALL filtered records to an Excel file (fetches the full filtered set first).
  const handleExportExcel = async () => {
    // Fetch all rows matching the current applied filters (cap at 100k)
    let exportRecords: RecommendationRecord[] = filteredRecords;
    try {
      const qs = new URLSearchParams({ page: '0', size: '100000' });
      if (appliedFilters.searchCif) qs.append('searchCif', appliedFilters.searchCif);
      if (appliedFilters.searchName) qs.append('searchName', appliedFilters.searchName);
      if (appliedFilters.filterBranch !== 'all') qs.append('branch', appliedFilters.filterBranch);
      if (appliedFilters.filterSegmentation !== 'all') qs.append('segmentation', appliedFilters.filterSegmentation);
      if (appliedFilters.filterStatus !== 'all') qs.append('status', appliedFilters.filterStatus);
      if (appliedFilters.filterType !== 'all') qs.append('type', appliedFilters.filterType);
      const res = await fetch(`/api/v1/executive/recommendation-history?${qs.toString()}`, { headers: authHeaders() });
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data && Array.isArray(body.data.records)) {
          exportRecords = body.data.records.map(mapApiRecord);
        }
      }
    } catch (err) {
      console.error('Export fetch failed, using current page:', err);
    }

    // Escape values so they are safe inside XML
    const esc = (v: string | number | undefined) =>
      String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const statusLabel = (s: RecommendationRecord['status']) => {
      const map = {
        sent: isEn ? 'Sent' : 'Terkirim',
        accepted: isEn ? 'Accepted' : 'Diterima',
        approved: isEn ? 'Approved' : 'Disetujui',
        rejected: isEn ? 'Rejected' : 'Diabaikan',
      };
      return map[s];
    };
    const typeLabel = (t: RecommendationRecord['recommendationType']) =>
      t === 'product' ? (isEn ? 'Product' : 'Produk') : (isEn ? 'Non-Product' : 'Non-Produk');

    const dataRows = exportRecords
      .map((r, idx) => `
   <Row>
    <Cell><Data ss:Type="Number">${idx + 1}</Data></Cell>
    <Cell ss:StyleID="BoldCell"><Data ss:Type="String">${esc(r.cif)}</Data></Cell>
    <Cell><Data ss:Type="String">${esc(r.customerName)}</Data></Cell>
    <Cell><Data ss:Type="String">${esc(r.branch)}</Data></Cell>
    <Cell ss:StyleID="NumberCell"><Data ss:Type="Number">${r.aum}</Data></Cell>
    <Cell><Data ss:Type="String">${esc(personaName(r.segmentation))}</Data></Cell>
    <Cell><Data ss:Type="String">${esc(typeLabel(r.recommendationType))}</Data></Cell>
    <Cell><Data ss:Type="String">${esc(r.recommendationName)}</Data></Cell>
    <Cell><Data ss:Type="String">${esc(r.matrixCluster)}</Data></Cell>
    <Cell><Data ss:Type="String">${esc(statusLabel(r.status))}</Data></Cell>
    <Cell><Data ss:Type="String">${esc(r.sentDate)}</Data></Cell>
    <Cell><Data ss:Type="String">${esc(r.acceptedDate)}</Data></Cell>
    <Cell><Data ss:Type="String">${esc(r.approvedDate)}</Data></Cell>
    <Cell><Data ss:Type="String">${esc(r.rejectedDate)}</Data></Cell>
   </Row>`)
      .join('');

    const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#6B4E2E" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Font ss:FontName="Calibri" ss:Size="15" ss:Bold="1" ss:Color="#6B4E2E"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="SubTitleStyle">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Italic="1" ss:Color="#64748B"/>
  </Style>
  <Style ss:ID="BoldCell">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
  </Style>
  <Style ss:ID="NumberCell">
   <NumberFormat ss:Format="#,##0"/>
  </Style>
 </Styles>

 <Worksheet ss:Name="${isEn ? 'Business Strategy Monitoring' : 'Pemantauan Strategi Bisnis'}">
  <Table ss:DefaultColumnWidth="120">
   <Row ss:Height="25">
    <Cell ss:StyleID="TitleStyle"><Data ss:Type="String">${isEn ? 'Business Strategy Monitoring' : 'Pemantauan Strategi Bisnis'}</Data></Cell>
   </Row>
   <Row ss:Height="18">
    <Cell ss:StyleID="SubTitleStyle"><Data ss:Type="String">${isEn ? 'Export Date: ' : 'Tanggal Export: '}${new Date().toLocaleString('id-ID')}</Data></Cell>
   </Row>
   <Row ss:Height="18">
    <Cell ss:StyleID="SubTitleStyle"><Data ss:Type="String">${isEn ? 'Total Records: ' : 'Total Data: '}${exportRecords.length} | ${isEn ? 'Approved' : 'Disetujui'}: ${stats.totalApproved} | ${isEn ? 'Rejected' : 'Diabaikan'}: ${stats.totalRejected} | ${isEn ? 'Approval Rate' : 'Tingkat Persetujuan'}: ${stats.approvalRate.toFixed(1)}%</Data></Cell>
   </Row>
   <Row></Row>
   <Row ss:Height="22">
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">No</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">CIF</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${isEn ? 'Customer Name' : 'Nama Nasabah'}</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${isEn ? 'Branch' : 'Cabang'}</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">TRB</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${isEn ? 'Segmentation' : 'Segmentasi'}</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${isEn ? 'Type' : 'Tipe'}</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${isEn ? 'Recommendation' : 'Rekomendasi'}</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${isEn ? 'Matrix Cluster' : 'Kotak Matriks'}</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Status</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${isEn ? 'Sent Date' : 'Tgl Dikirim'}</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${isEn ? 'Accepted Date' : 'Tgl Diterima'}</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${isEn ? 'Approved Date' : 'Tgl Disetujui'}</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${isEn ? 'Rejected Date' : 'Tgl Diabaikan'}</Data></Cell>
   </Row>${dataRows}
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Recommendation_History_${new Date().toISOString().slice(0, 10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Status badge
  const getStatusBadge = (status: RecommendationRecord['status']) => {
    const badges = {
      sent: { 
        bg: 'bg-amber-50', 
        text: 'text-amber-700', 
        border: 'border-amber-200',
        icon: Send,
        label: isEn ? 'Sent' : 'Terkirim'
      },
      accepted: { 
        bg: 'bg-blue-50', 
        text: 'text-blue-700', 
        border: 'border-blue-200',
        icon: CheckCircle2,
        label: isEn ? 'Accepted' : 'Diterima'
      },
      approved: { 
        bg: 'bg-emerald-50', 
        text: 'text-emerald-700', 
        border: 'border-emerald-200',
        icon: CheckCircle2,
        label: isEn ? 'Approved' : 'Disetujui'
      },
      rejected: { 
        bg: 'bg-rose-50', 
        text: 'text-rose-700', 
        border: 'border-rose-200',
        icon: XCircle,
        label: isEn ? 'Rejected' : 'Diabaikan'
      },
    };
    const badge = badges[status];
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
        <Icon className="w-3.5 h-3.5" />
        {badge.label}
      </span>
    );
  };

  return (
    <div className="px-6 pt-3 pb-6 space-y-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-[#8A6534]" />
            {isEn ? 'Business Strategy Monitoring' : 'Pemantauan Strategi Bisnis'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isEn
              ? 'Transaction history of product & non-product recommendations sent to customers with status tracking.'
              : 'Riwayat transaksi rekomendasi produk & non-produk yang dikirim ke nasabah dengan tracking status.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Small spinner at top-right while loading (same as /corporate-insight). */}
          {loading && <Loader2 className="w-5 h-5 animate-spin text-[#6B4E2E]" />}
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            {isEn ? 'Export to Excel' : 'Ekspor ke Excel'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sent */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-5 rounded-xl border-2 border-amber-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-md shrink-0">
              <Send className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">
                {isEn ? 'Total Sent' : 'Total Terkirim'}
              </p>
              <p className="text-3xl font-black text-amber-900">{stats.totalSent.toLocaleString('id-ID')}</p>
              <p className="text-xs text-amber-700 mt-1 font-medium">
                {isEn ? 'Recommendations sent' : 'Rekomendasi terkirim'}
              </p>
            </div>
          </div>
        </div>

        {/* Total Approved */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-5 rounded-xl border-2 border-emerald-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md shrink-0">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1">
                {isEn ? 'Approved' : 'Disetujui'}
              </p>
              <p className="text-3xl font-black text-emerald-900">{stats.totalApproved.toLocaleString('id-ID')}</p>
              <p className="text-xs text-emerald-700 mt-1 font-medium">
                {isEn ? 'Customer approved' : 'Nasabah setuju'}
              </p>
            </div>
          </div>
        </div>

        {/* Total Rejected */}
        <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 p-5 rounded-xl border-2 border-rose-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-600 flex items-center justify-center shadow-md shrink-0">
              <XCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-rose-600 uppercase tracking-wide mb-1">
                {isEn ? 'Rejected' : 'Diabaikan'}
              </p>
              <p className="text-3xl font-black text-rose-900">{stats.totalRejected.toLocaleString('id-ID')}</p>
              <p className="text-xs text-rose-700 mt-1 font-medium">
                {isEn ? 'Customer rejected' : 'Nasabah abaikan'}
              </p>
            </div>
          </div>
        </div>

        {/* Approval Rate */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-5 rounded-xl border-2 border-indigo-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shrink-0">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-1">
                {isEn ? 'Approval Rate' : 'Tingkat Persetujuan'}
              </p>
              <p className="text-3xl font-black text-indigo-900">{stats.approvalRate.toFixed(1)}%</p>
              <p className="text-xs text-indigo-700 mt-1 font-medium">
                {isEn ? 'Conversion rate' : 'Tingkat konversi'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Filter className="w-5 h-5 text-slate-600" />
          <h2 className="text-sm font-bold text-slate-900">
            {isEn ? 'Filters' : 'Filter Data'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Search CIF */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
              {isEn ? 'Search CIF' : 'Cari CIF'}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchCif}
                onChange={(e) => setSearchCif(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitFilters(); }}
                placeholder={isEn ? 'Enter CIF...' : 'Masukkan CIF...'}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#8A6534] focus:border-[#8A6534] transition"
              />
            </div>
          </div>

          {/* Search Name */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
              {isEn ? 'Search Name' : 'Cari Nama'}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitFilters(); }}
                placeholder={isEn ? 'Enter name...' : 'Masukkan nama...'}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#8A6534] focus:border-[#8A6534] transition"
              />
            </div>
          </div>

          {/* Filter Branch */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
              {isEn ? 'Branch' : 'Cabang'}
            </label>
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#8A6534] focus:border-[#8A6534] transition"
            >
              <option value="all">{isEn ? 'All Branches' : 'Semua Cabang'}</option>
              {branches.map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </div>

          {/* Filter Segmentation */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
              {isEn ? 'Segmentation' : 'Segmentasi'}
            </label>
            <select
              value={filterSegmentation}
              onChange={(e) => setFilterSegmentation(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#8A6534] focus:border-[#8A6534] transition"
            >
              <option value="all">{isEn ? 'All Segments' : 'Semua Segmen'}</option>
              {personaOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#8A6534] focus:border-[#8A6534] transition"
            >
              <option value="all">{isEn ? 'All Status' : 'Semua Status'}</option>
              <option value="sent">{isEn ? 'Sent' : 'Terkirim'}</option>
              <option value="accepted">{isEn ? 'Accepted' : 'Diterima'}</option>
              <option value="approved">{isEn ? 'Approved' : 'Disetujui'}</option>
              <option value="rejected">{isEn ? 'Rejected' : 'Diabaikan'}</option>
            </select>
          </div>

          {/* Filter Type */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
              {isEn ? 'Type' : 'Tipe'}
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#8A6534] focus:border-[#8A6534] transition"
            >
              <option value="all">{isEn ? 'All Types' : 'Semua Tipe'}</option>
              <option value="product">{isEn ? 'Product' : 'Produk'}</option>
              <option value="non-product">{isEn ? 'Non-Product' : 'Non-Produk'}</option>
            </select>
          </div>
        </div>

        {/* Filter Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClearFilters}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition"
          >
            <X className="w-4 h-4" />
            {isEn ? 'Clear' : 'Bersihkan'}
          </button>
          <button
            type="button"
            onClick={handleSubmitFilters}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#8A6534] hover:bg-[#6f5029] rounded-lg transition shadow-sm"
          >
            <Search className="w-4 h-4" />
            {isEn ? 'Submit' : 'Terapkan'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">CIF</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                  {isEn ? 'Branch' : 'Cabang'}
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">TRB</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                  {isEn ? 'Segmentation' : 'Segmentasi'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                  {isEn ? 'Recommendation' : 'Rekomendasi'}
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">
                  {isEn ? 'Action' : 'Aksi'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 text-sm font-mono font-semibold text-slate-900">{record.cif}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{record.branch}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">
                    Rp {(record.aum / 1000000).toFixed(1)} M
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border ${PERSONAS[record.segmentation].bg} ${PERSONAS[record.segmentation].text} ${PERSONAS[record.segmentation].border}`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: PERSONAS[record.segmentation].color }}
                      />
                      {personaName(record.segmentation)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      {record.recommendationType === 'product' ? (
                        <Package className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <Handshake className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      )}
                      <p className="text-xs font-bold text-slate-900 leading-tight">{record.recommendationName}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getStatusBadge(record.status)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedRecord(record)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {isEn ? 'Detail' : 'Detail'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-xs text-slate-600">
            {isEn ? 'Showing' : 'Menampilkan'} {totalElements === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalElements)} {isEn ? 'of' : 'dari'} {totalElements.toLocaleString('id-ID')} {isEn ? 'records' : 'data'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isEn ? 'Previous' : 'Sebelumnya'}
            </button>
            <span className="text-xs font-semibold text-slate-600">
              {isEn ? 'Page' : 'Halaman'} {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isEn ? 'Next' : 'Selanjutnya'}
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#8A6534]" />
                  {isEn ? 'Recommendation Detail' : 'Detail Rekomendasi'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-mono">CIF {selectedRecord.cif}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Customer info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    {isEn ? 'Customer Name' : 'Nama Nasabah'}
                  </p>
                  <p className="text-sm font-bold text-slate-900">{selectedRecord.customerName}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    {isEn ? 'Branch' : 'Cabang'}
                  </p>
                  <p className="text-sm font-bold text-slate-900">{selectedRecord.branch}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    {isEn ? 'Segmentation' : 'Segmentasi'}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1.5 mt-0.5 px-2 py-0.5 text-xs font-bold rounded-md border ${PERSONAS[selectedRecord.segmentation].bg} ${PERSONAS[selectedRecord.segmentation].text} ${PERSONAS[selectedRecord.segmentation].border}`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: PERSONAS[selectedRecord.segmentation].color }}
                    />
                    {personaName(selectedRecord.segmentation)}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">TRB</p>
                  <p className="text-sm font-bold text-slate-900">Rp {(selectedRecord.aum / 1000000).toFixed(1)} M</p>
                </div>
                {(() => {
                  const tiers = clusterTiers(selectedRecord.matrixCluster);
                  if (!tiers) return null;
                  return (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                        {isEn ? 'Matrix Box' : 'Kotak Matrix'}
                      </p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        Churn {tierLabel(tiers.churn)} × TRB {tierLabel(tiers.aum)}
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Recommendation + matrix cluster */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-start gap-2">
                  {selectedRecord.recommendationType === 'product' ? (
                    <Package className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Handshake className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900 leading-tight">{selectedRecord.recommendationName}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedRecord.recommendationType === 'product'
                        ? (isEn ? 'Product Recommendation' : 'Rekomendasi Produk')
                        : (isEn ? 'Non-Product Recommendation' : 'Rekomendasi Non-Produk')}
                    </p>
                    {/* Concrete accepted product + offered rate (product recs only). */}
                    {selectedRecord.offeredProduct && (
                      <div className="mt-2.5 flex items-center justify-between gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                        <div>
                          <p className="text-[10px] font-semibold text-emerald-700/70 uppercase tracking-wide">
                            {isEn ? 'Accepted Product' : 'Produk Diterima'}
                          </p>
                          <p className="text-sm font-bold text-emerald-800 leading-tight">{selectedRecord.offeredProduct}</p>
                        </div>
                        {selectedRecord.offeredRate && (
                          <div className="text-right shrink-0">
                            <p className="text-[10px] font-semibold text-emerald-700/70 uppercase tracking-wide">
                              {isEn ? 'Rate' : 'Rate'}
                            </p>
                            <p className="text-base font-extrabold text-emerald-700 leading-tight">{selectedRecord.offeredRate}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  {isEn ? 'Current Status' : 'Status Saat Ini'}
                </p>
                {getStatusBadge(selectedRecord.status)}
              </div>

              {/* Timeline */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  {isEn ? 'Transaction Timeline' : 'Linimasa Transaksi'}
                </p>
                <div className="space-y-3">
                  {/* Sent */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Send className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{isEn ? 'Sent to customer' : 'Dikirim ke nasabah'}</p>
                      <p className="text-xs text-slate-500">{selectedRecord.sentDate}</p>
                    </div>
                  </div>
                  {/* Accepted */}
                  {selectedRecord.acceptedDate && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{isEn ? 'Accepted by customer' : 'Diterima nasabah'}</p>
                        <p className="text-xs text-slate-500">{selectedRecord.acceptedDate}</p>
                      </div>
                    </div>
                  )}
                  {/* Approved */}
                  {selectedRecord.approvedDate && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{isEn ? 'Approved by customer' : 'Disetujui nasabah'}</p>
                        <p className="text-xs text-slate-500">{selectedRecord.approvedDate}</p>
                      </div>
                    </div>
                  )}
                  {/* Rejected */}
                  {selectedRecord.rejectedDate && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                        <XCircle className="w-4 h-4 text-rose-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{isEn ? 'Rejected by customer' : 'Diabaikan nasabah'}</p>
                        <p className="text-xs text-slate-500">{selectedRecord.rejectedDate}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 text-sm font-bold text-white bg-[#8A6534] hover:bg-[#6f5029] rounded-lg transition"
              >
                {isEn ? 'Close' : 'Tutup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
