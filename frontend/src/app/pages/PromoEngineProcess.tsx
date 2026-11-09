import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useI18n } from '../i18n';
import { Rocket, Grid3x3, Download, Loader2, Eye, Search, Users, Building2 } from 'lucide-react';
import { MatrixSelection, SelectedCluster } from '../lib/matrixSelection';

// One selected customer from bag_demo (ods.churn_data_matrix / activity + joins).
interface PromoCustomer {
  cif: string;
  churnIndex: number | null;
  trbCategory: string | null;
  trb: number;
  personaCluster: number;
  personaName: string;
  action: string;
}

interface PromoResponse {
  customers: PromoCustomer[];
  totalElements: number;
  totalPages: number;
}

interface PersonaOption {
  value: string;
  nameId: string;
  nameEn: string;
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
    nameId: `${ACT_SEG_LABEL[seg].id} · ${ACT_TRB_LABEL[tier].id}`,
    nameEn: `${ACT_SEG_LABEL[seg].en} · ${ACT_TRB_LABEL[tier].en}`,
  }))
);
// Translate frontend activity key "<segment>_<trb>" -> stored "<trb>_<activity_category>".
function activityClassification(key: string): string {
  const us = key.lastIndexOf('_');
  const seg = key.substring(0, us);
  const trb = key.substring(us + 1);
  return `${trb}_${ACT_SEG_CAT[seg] ?? seg}`;
}

export function PromoEngineProcess() {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const isEn = lang === 'en';

  const authHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // TRB value shown in millions (same convention as the TRB pages).
  const trbText = (v: number) => `Rp ${(v / 1_000_000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Jt`;

  // The Action column maps the stored approach (special_approach / human_approach)
  // to a short button label. Both route to the Action Plan Detail, shown as "Detail".
  const actionLabel = (a: string) => (a === 'special_approach' || a === 'human_approach' ? 'Detail' : a);

  // Acquisition (needs_cluster personas) / Retention (mb_archetype personas).
  const [tab, setTab] = useState<'acquisition' | 'retention'>('acquisition');

  const [data, setData] = useState<PromoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Matrix selection, read from the DB (is_selected in both bag tables).
  const [selection, setSelection] = useState<MatrixSelection>({ clusters: [], total: 0, updatedAt: 0 });

  // Persona cluster options + filter (bag_demo needs_cluster personas).
  const [personaOptions, setPersonaOptions] = useState<PersonaOption[]>([]);
  const [personaCluster, setPersonaCluster] = useState<string>('all');
  // Per-branch filter (branch names present among the selected customers).
  const [branchOptions, setBranchOptions] = useState<string[]>([]);
  const [branch, setBranch] = useState<string>('all');
  const [searchInput, setSearchInput] = useState<string>('');
  const [appliedSearch, setAppliedSearch] = useState<string>('');

  // Navigate to the action-plan template (no name; CIF carried as context).
  function goToActionPlan(c: PromoCustomer) {
    const customerObj = {
      cif: c.cif, churn: c.churnIndex ?? 0, value: trbText(c.trb),
      cluster: c.personaName, action: c.action,
    };
    localStorage.setItem('selected_hot_target_customer', JSON.stringify(customerObj));
    navigate(`/campaign/action-plan-template?cif=${encodeURIComponent(c.cif)}`);
  }

  // Load the selected cells from the DB (bag_demo) for the "Selected clusters" bar.
  useEffect(() => {
    async function loadSelection() {
      try {
        const res = await fetch('/api/v1/executive/bag-matrix/selected', { headers: authHeaders() });
        if (!res.ok) return;
        const body = await res.json();
        const d = body?.data;
        if (!d) return;
        const clusters: SelectedCluster[] = [];
        for (const row of (d.churn ?? [])) {
          const cell = MATRIX_CLUSTERS.find((c) => c.key === row.classification);
          if (cell) clusters.push({ code: cell.code, name: isEn ? cell.nameEn : cell.nameId, key: cell.key, count: Number(row.count) || 0 });
        }
        for (const row of (d.activity ?? [])) {
          const cell = ACTIVITY_MATRIX.find((c) => activityClassification(c.key) === row.classification);
          if (cell) clusters.push({ code: cell.code, name: isEn ? cell.nameEn : cell.nameId, key: cell.key, count: Number(row.count) || 0 });
        }
        setSelection({ clusters, total: Number(d.total) || 0, updatedAt: Date.now() });
      } catch (err) {
        console.error('Failed to load matrix selection from DB:', err);
      }
    }
    loadSelection();
  }, [isEn]);

  // Load persona-cluster dropdown options (bag_demo). Options differ per tab:
  // acquisition = needs_cluster personas; retention = mb_archetype personas.
  useEffect(() => {
    async function loadPersonaOptions() {
      try {
        const res = await fetch(`/api/v1/executive/bag-matrix/persona-options?mode=${tab}`, { headers: authHeaders() });
        if (res.ok) {
          const body = await res.json();
          if (body.success && Array.isArray(body.data)) setPersonaOptions(body.data);
        }
      } catch (err) {
        console.error('Failed to load persona options:', err);
      }
    }
    loadPersonaOptions();
  }, [tab]);

  // Load the per-branch dropdown options (branches among selected customers).
  useEffect(() => {
    async function loadBranchOptions() {
      try {
        const res = await fetch('/api/v1/executive/bag-matrix/branches', { headers: authHeaders() });
        if (res.ok) {
          const body = await res.json();
          if (body.success && Array.isArray(body.data)) setBranchOptions(body.data);
        }
      } catch (err) {
        console.error('Failed to load branch options:', err);
      }
    }
    loadBranchOptions();
  }, []);

  const hasSelection = selection.clusters.length > 0;

  // Load the selected-customer list from bag_demo.
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const qs = new URLSearchParams();
        qs.set('page', String(currentPage - 1));
        qs.set('size', String(pageSize));
        qs.set('lang', lang);
        qs.set('mode', tab);
        if (personaCluster && personaCluster !== 'all') qs.set('personaCluster', personaCluster);
        if (branch && branch !== 'all') qs.set('branch', branch);
        if (appliedSearch.trim()) qs.set('search', appliedSearch.trim());
        const res = await fetch(`/api/v1/executive/bag-matrix/selected-customers?${qs.toString()}`, { headers: authHeaders() });
        if (res.ok) {
          const body = await res.json();
          if (body.success && body.data) setData(body.data);
        }
      } catch (err) {
        console.error('Failed to fetch promo engine data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentPage, personaCluster, branch, appliedSearch, lang, tab]);

  // Reset to the first page whenever the persona, branch, applied search, or tab changes.
  useEffect(() => { setCurrentPage(1); }, [personaCluster, branch, appliedSearch, tab]);

  const customers = data ? data.customers : [];
  const totalPages = data?.totalPages || 1;
  const totalElements = data?.totalElements || 0;

  async function handleDownloadCsv() {
    let rows: PromoCustomer[] = customers;
    try {
      const qs = new URLSearchParams({ page: '0', size: '100000', lang, mode: tab });
      if (personaCluster && personaCluster !== 'all') qs.set('personaCluster', personaCluster);
      if (branch && branch !== 'all') qs.set('branch', branch);
      if (appliedSearch.trim()) qs.set('search', appliedSearch.trim());
      const res = await fetch(`/api/v1/executive/bag-matrix/selected-customers?${qs.toString()}`, { headers: authHeaders() });
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data && Array.isArray(body.data.customers)) rows = body.data.customers;
      }
    } catch (err) {
      console.error('CSV fetch failed, using current page:', err);
    }

    const headers = ['CIF', 'Churn (%)', isEn ? 'TRB Category' : 'Kategori TRB', 'TRB', isEn ? 'Persona Cluster' : 'Cluster Persona', isEn ? 'Action' : 'Aksi'];
    const esc = (v: string | number) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(',')];
    rows.forEach((c) => {
      lines.push([
        esc(c.cif),
        esc(c.churnIndex ?? ''),
        esc((c.trbCategory ?? '').toUpperCase()),
        esc(trbText(c.trb)),
        esc(c.personaName),
        esc(actionLabel(c.action)),
      ].join(','));
    });
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Promo_Engine_Customers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="px-6 pt-3 pb-6 space-y-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Rocket className="w-6 h-6 text-[#8A6534]" />
          {isEn ? 'Action Plan Detail' : 'Action Plan Detail'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {isEn
            ? 'List of selected customers to be processed by the promo engine.'
            : 'Daftar nasabah terpilih yang akan diproses oleh promo engine.'}
        </p>
      </div>

      {/* Toggle on top (same style as Segmentation Overview) — a slate tray with
          padded pill tabs, rounded top only, merging into the card below. */}
      <div className="grid grid-cols-2 gap-1 bg-slate-100 rounded-t-xl p-1.5 border border-b-0 border-slate-200">
        <button
          type="button"
          onClick={() => { setTab('acquisition'); setPersonaCluster('all'); }}
          className={`w-full px-4 py-3 text-sm font-bold rounded-lg transition cursor-pointer ${
            tab === 'acquisition' ? 'bg-[#8A6534] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {isEn ? 'All-Channel User Segmentation' : 'Segmentasi Pengguna Semua Channel'}
        </button>
        <button
          type="button"
          onClick={() => { setTab('retention'); setPersonaCluster('all'); }}
          className={`w-full px-4 py-3 text-sm font-bold rounded-lg transition cursor-pointer ${
            tab === 'retention' ? 'bg-[#8A6534] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {isEn ? 'Mobile Banking User Segmentation' : 'Segmentasi Pengguna Mobile Banking'}
        </button>
      </div>

      {/* The card below the toggle (rounded bottom, no top border so it merges
          with the toggle tray): selected clusters + filters, divided by color. */}
      <div className="border border-slate-200 rounded-b-xl overflow-hidden">
      {/* Selected clusters from the bag matrix (is_selected). */}
      {hasSelection && (
        <div className="bg-[#8A6534]/5 border-b border-slate-200 p-4 flex items-start gap-3 flex-wrap">
          <Grid3x3 className="w-4 h-4 text-[#8A6534] mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-700 mb-1.5">
              {isEn ? 'Selected clusters from Customer Matrix:' : 'Cluster terpilih dari Matriks Nasabah:'}
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
            {isEn ? 'Selected total: ' : 'Total terpilih: '}
            <span className="font-bold text-slate-800">{selection.total.toLocaleString('id-ID')}</span>
          </span>
        </div>
      )}

      {/* Filters: persona cluster + search */}
      <div className="bg-white p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#8A6534] shrink-0" />
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            {isEn ? 'Branch:' : 'Cabang:'}
          </label>
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#8A6534]"
          >
            <option value="all">{isEn ? 'All' : 'Semua'}</option>
            {branchOptions.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#8A6534] shrink-0" />
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            {isEn ? 'Persona Cluster:' : 'Cluster Persona:'}
          </label>
          <select
            value={personaCluster}
            onChange={(e) => setPersonaCluster(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#8A6534]"
          >
            <option value="all">{isEn ? 'All' : 'Semua'}</option>
            {personaOptions.map((p) => (
              <option key={p.value} value={p.value}>{isEn ? p.nameEn : p.nameId}</option>
            ))}
          </select>
        </div>

        <div className="flex items-stretch w-full sm:w-80 sm:ml-auto">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={isEn ? 'Search CIF...' : 'Cari CIF...'}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setAppliedSearch(searchInput); }}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 border-r-0 rounded-l-lg focus:outline-none focus:ring-1 focus:ring-[#8A6534]"
            />
          </div>
          <button
            type="button"
            onClick={() => setAppliedSearch(searchInput)}
            className="px-3 bg-[#6B4E2E] hover:bg-[#4A3620] text-white text-xs font-medium rounded-r-lg flex items-center justify-center transition cursor-pointer"
          >
            {isEn ? 'Search' : 'Cari'}
          </button>
        </div>
      </div>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden mt-4">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 flex-wrap gap-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Rocket className="w-4 h-4 text-[#8A6534]" />
            {isEn ? 'Customer List' : 'Daftar Nasabah'}
            {loading && <Loader2 className="w-4 h-4 text-[#6B4E2E] animate-spin" />}
          </h3>
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={customers.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            {isEn ? 'Download CSV' : 'Download CSV'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase">CIF</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase text-right">Churn</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase text-center">{isEn ? 'TRB Category' : 'Kategori TRB'}</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase text-right">TRB</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase">{isEn ? 'Persona Cluster' : 'Cluster Persona'}</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase">{isEn ? 'Action' : 'Aksi'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 italic text-xs">
                    {loading
                      ? (isEn ? 'Loading data...' : 'Memuat data...')
                      : !hasSelection
                      ? (isEn ? 'Please select clusters in Customer Matrix first.' : 'Silakan pilih cluster di Memilih Matriks Nasabah terlebih dahulu.')
                      : (isEn ? 'No customers found.' : 'Tidak ada nasabah.')}
                  </td>
                </tr>
              )}
              {customers.map((c, idx) => (
                <tr key={c.cif + idx} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono text-xs text-slate-600">{c.cif}</td>
                  <td className="py-3 px-4 text-right font-bold text-red-600">{c.churnIndex != null ? `${c.churnIndex}%` : '-'}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-block px-2 py-0.5 text-xs font-extrabold rounded bg-amber-50 text-amber-800 border border-amber-200">
                      {(c.trbCategory ?? '-').toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 text-xs">{trbText(c.trb)}</td>
                  <td className="py-3 px-4 text-slate-600 text-xs">{c.personaName}</td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => goToActionPlan(c)}
                      title={isEn ? 'Configure Action Plan Recommendation' : 'Buat Setting Rekomendasi Action Plan'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {actionLabel(c.action)}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {customers.length > 0 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3 bg-slate-50/50">
            <div className="text-xs text-slate-500 font-medium">
              {isEn ? 'Showing page' : 'Menampilkan halaman'} {currentPage} / {totalPages} — {totalElements.toLocaleString('id-ID')} {isEn ? 'customers' : 'nasabah'}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">«</button>
              <span className="text-xs font-semibold text-slate-700">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
