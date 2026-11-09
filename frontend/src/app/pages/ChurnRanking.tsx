import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { Loader2, Search, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { stripBranchPrefix } from '../lib/displayNames';

interface ProbabilityBucket {
  bucket: string; // e.g. "70-80%"
  count: number;
}

interface ChurnCustomerItem {
  rank: number;
  id: string;
  name?: string; // not displayed (removed from the churn model)
  branch: string;
  churnIndex: number;
  tier: string;
  totalBalance: number;
  occupation: string;
}

// Clickable, sortable table header. Shows an up/down chevron when it is the
// active sort column, or a neutral icon otherwise. Sorting is server-side.
function SortHeader({
  col, label, align, sortBy, sortDir, onSort,
}: {
  col: string;
  label: string;
  align: 'left' | 'right' | 'center';
  sortBy: string;
  sortDir: 'asc' | 'desc';
  onSort: (col: string) => void;
}) {
  const active = sortBy === col;
  const alignCls = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  const justifyCls = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
  return (
    <th className={`${alignCls} py-2.5 px-4 text-xs font-semibold uppercase select-none`}>
      <button
        type="button"
        onClick={() => onSort(col)}
        className={`inline-flex items-center gap-1 ${justifyCls} w-full cursor-pointer transition-colors hover:text-[#6B4E2E] ${active ? 'text-[#6B4E2E]' : 'text-slate-500'}`}
        title="Sort"
      >
        <span>{label}</span>
        {active ? (
          sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
        )}
      </button>
    </th>
  );
}

export function ChurnRanking() {
  const { lang } = useI18n();
  const [customers, setCustomers] = useState<ChurnCustomerItem[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('Semua Cabang');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Server-side sorting state. Default: churn index, descending.
  const [sortBy, setSortBy] = useState<string>('churnIndex');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Churn probability distribution (per-10% buckets) + the currently selected
  // bucket index (0..9, where 0 == "0-10%"). null means no range filter.
  const [distribution, setDistribution] = useState<ProbabilityBucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<number | null>(null);

  // Fetch branches list
  useEffect(() => {
    async function fetchBranches() {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch('/api/v1/executive/churn/branches', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const body = await res.json();
          if (body.success && body.data) {
            setBranches(body.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch branches:', err);
      }
    }
    fetchBranches();
  }, []);

  // Fetch the churn-probability distribution (per-10% buckets). Re-runs when the
  // branch changes so the chart reflects the current branch selection.
  useEffect(() => {
    async function fetchDistribution() {
      try {
        const token = localStorage.getItem('auth_token');
        let url = '/api/v1/executive/churn/probability-distribution';
        if (selectedBranch && selectedBranch !== 'Semua Cabang') {
          url += `?branch=${encodeURIComponent(selectedBranch)}`;
        }
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const body = await res.json();
          if (body.success && Array.isArray(body.data)) {
            setDistribution(body.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch probability distribution:', err);
      }
    }
    fetchDistribution();
  }, [selectedBranch]);

  // Fetch ranking items with server-side pagination + sorting. `bucket` is the
  // selected probability bucket index (0..9) or null; it maps to probMin/probMax.
  async function fetchRanking(
    page: number, size: number, branch: string, search: string,
    sBy = sortBy, sDir = sortDir, bucket = selectedBucket,
  ) {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      let url = `/api/v1/executive/churn/ranking?page=${page}&size=${size}&sortBy=${sBy}&sortDir=${sDir}`;
      if (branch && branch !== 'Semua Cabang') {
        url += `&branch=${encodeURIComponent(branch)}`;
      }
      if (search.trim()) {
        url += `&keyword=${encodeURIComponent(search.trim())}`;
      }
      if (bucket !== null) {
        const probMin = bucket / 10;
        const probMax = (bucket + 1) / 10;
        url += `&probMin=${probMin}&probMax=${probMax}`;
      }

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 401 || res.status === 403) {
        // Session expired / unauthorized → force re-login instead of showing an empty table
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_menus');
        window.location.href = '/login';
        return;
      }
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data) {
          setCustomers(body.data.items || []);
          setTotalElements(body.data.totalElements || 0);
          setTotalPages(body.data.totalPages || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch churn ranking:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRanking(currentPage, pageSize, selectedBranch, searchQuery, sortBy, sortDir, selectedBucket);
  }, [currentPage, pageSize, selectedBranch, sortBy, sortDir, selectedBucket]);

  // Click a probability bar: toggle the range filter for that 10% bucket. Clicking
  // the already-selected bucket clears the filter. Resets to page 0; the effect
  // above re-fetches because selectedBucket changes.
  function handleBucketClick(index: number) {
    setSelectedBucket((prev) => (prev === index ? null : index));
    setCurrentPage(0);
  }

  function handleBranchChange(newBranch: string) {
    setSelectedBranch(newBranch);
    setCurrentPage(0);
    fetchRanking(0, pageSize, newBranch, searchQuery);
  }

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setCurrentPage(0);
    fetchRanking(0, newSize, selectedBranch, searchQuery);
  }

  function handlePageChange(newPage: number) {
    setCurrentPage(newPage);
    fetchRanking(newPage, pageSize, selectedBranch, searchQuery, sortBy, sortDir);
  }

  // Click a sortable header: toggle direction if same column, else default DESC.
  // Resets to page 0. The effect re-fetches when sortBy/sortDir change.
  function handleSort(col: string) {
    let nextDir: 'asc' | 'desc' = 'desc';
    if (sortBy === col) nextDir = sortDir === 'desc' ? 'asc' : 'desc';
    setSortBy(col);
    setSortDir(nextDir);
    setCurrentPage(0);
  }

  function handleSearchSubmit() {
    setCurrentPage(0);
    fetchRanking(0, pageSize, selectedBranch, searchQuery);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  }

  function getPageNumbers(): number[] {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i);
    let start = Math.max(0, currentPage - 2);
    let end = start + 5;
    if (end > totalPages) {
      end = totalPages;
      start = end - 5;
    }
    return Array.from({ length: end - start }, (_, i) => start + i);
  }

  const pageLabel = lang === 'id' ? 'Halaman' : 'Page';

  return (
    <div className="px-6 pt-3 pb-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'id' ? 'Peringkat Churn Nasabah' : 'Customer Churn Ranking'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {lang === 'id'
              ? 'Daftar nasabah paling berisiko churn.'
              : 'List of highest-risk customers.'}
          </p>
        </div>
      </div>

      {/* Churn probability distribution — customers grouped into 10% buckets
          (0-10% .. 90-100%) from churn.churn_result. Clicking a bar filters the
          CIF list below to that probability range; clicking again clears it. */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              {lang === 'id' ? 'Distribusi Probabilitas Churn' : 'Churn Probability Distribution'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'id'
                ? 'Klik salah satu bar untuk memfilter daftar CIF berdasarkan rentang probabilitas (per 10%)'
                : 'Click a bar to filter the CIF list by probability range (per 10%)'}
            </p>
          </div>
          {selectedBucket !== null && (
            <button
              onClick={() => { setSelectedBucket(null); setCurrentPage(0); }}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#6B4E2E] bg-[#F3ECE2] border border-[#E3D5C2] rounded-lg hover:bg-[#E9DCC9] transition cursor-pointer"
              title={lang === 'id' ? 'Hapus filter' : 'Clear filter'}
            >
              <X className="w-3.5 h-3.5" />
              {distribution[selectedBucket]?.bucket}
            </button>
          )}
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={distribution} margin={{ top: 16, right: 20, bottom: 4, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="bucket" fontSize={11} stroke="#64748B" />
            <YAxis tickFormatter={(v) => Number(v).toLocaleString('id-ID')} fontSize={11} stroke="#64748B" />
            <Tooltip
              cursor={{ fill: 'rgba(138, 101, 52, 0.08)' }}
              formatter={(v: number) => [Number(v).toLocaleString('id-ID'), lang === 'id' ? 'Nasabah' : 'Customers']}
              labelFormatter={(lbl) => `${lang === 'id' ? 'Probabilitas' : 'Probability'}: ${lbl}`}
            />
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              barSize={44}
              onClick={(_, index) => handleBucketClick(index)}
              className="cursor-pointer"
            >
              {distribution.map((_, index) => (
                <Cell
                  key={index}
                  fill={selectedBucket === index ? '#4A3620' : '#8A6534'}
                  fillOpacity={selectedBucket === null || selectedBucket === index ? 1 : 0.4}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs text-slate-500 font-medium whitespace-nowrap">
            {lang === 'id' ? 'Cabang:' : 'Branch:'}
          </label>
          <select
            value={selectedBranch}
            onChange={(e) => handleBranchChange(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#6B4E2E]"
          >
            <option value="Semua Cabang">{lang === 'id' ? 'Semua Cabang' : 'All Branches'}</option>
            {branches.map((b) => (
              <option key={b} value={b}>{stripBranchPrefix(b)}</option>
            ))}
          </select>
        </div>

        <div className="flex items-stretch w-full sm:w-72">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={lang === 'id' ? 'Cari CIF...' : 'Search CIF...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 border-r-0 rounded-l-lg focus:outline-none focus:ring-1 focus:ring-[#6B4E2E]"
            />
          </div>
          <button
            onClick={handleSearchSubmit}
            className="px-3 bg-[#6B4E2E] hover:bg-[#4A3620] text-white text-xs font-medium rounded-r-lg flex items-center justify-center transition cursor-pointer"
          >
            {lang === 'id' ? 'Cari' : 'Search'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
            <Loader2 className="w-6 h-6 text-[#6B4E2E] animate-spin" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase w-12">#</th>
                <SortHeader col="cif" label="CIF" align="left" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader col="branch" label={lang === 'id' ? 'Cabang' : 'Branch'} align="left" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader col="churnIndex" label="Churn Index" align="right" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader col="trb" label={lang === 'id' ? 'TRB (juta)' : 'TRB (million)'} align="right" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader col="occupation" label={lang === 'id' ? 'Pekerjaan' : 'Occupation'} align="left" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {customers.length > 0 ? (
                customers.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition cursor-pointer">
                    <td className="py-2.5 px-4 text-slate-400 text-xs font-mono">{c.rank}</td>
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-600">{c.id}</td>
                    <td className="py-2.5 px-4 text-slate-600 text-xs">{stripBranchPrefix(c.branch)}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-red-600">{Number(c.churnIndex).toFixed(2)}%</td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-900 text-xs">
                      {(c.totalBalance / 1000000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-500">{c.occupation}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 italic">
                    {loading ? (lang === 'id' ? 'Memuat data...' : 'Loading data...') : (lang === 'id' ? 'Tidak ada data nasabah' : 'No customer data found')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 bg-white p-3 border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handlePageChange(0)}
            disabled={currentPage === 0 || loading}
            title={lang === 'id' ? 'Halaman pertama' : 'First page'}
            className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0 || loading}
            title={lang === 'id' ? 'Sebelumnya' : 'Previous'}
            className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {getPageNumbers().map((p) => (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
              disabled={loading}
              className={`px-3 py-1 text-xs rounded transition cursor-pointer ${
                p === currentPage
                  ? 'bg-[#6B4E2E] text-white font-medium'
                  : 'border border-slate-300 hover:bg-slate-50 text-slate-600'
              }`}
            >
              {p + 1}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1 || loading}
            title={lang === 'id' ? 'Berikutnya' : 'Next'}
            className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handlePageChange(totalPages - 1)}
            disabled={currentPage >= totalPages - 1 || loading}
            title={lang === 'id' ? 'Halaman terakhir' : 'Last page'}
            className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>

          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="ml-3 px-2.5 py-1 text-xs border border-slate-300 rounded bg-white cursor-pointer"
          >
            <option value={10}>10 / {pageLabel}</option>
            <option value={25}>25 / {pageLabel}</option>
            <option value={50}>50 / {pageLabel}</option>
            <option value={100}>100 / {pageLabel}</option>
          </select>
        </div>

        <div className="text-xs text-slate-500">
          {lang === 'id' ? 'Menampilkan' : 'Showing'} <span className="font-semibold text-slate-700">{customers.length}</span> {lang === 'id' ? 'dari total' : 'of'} <span className="font-semibold text-slate-700">{totalElements.toLocaleString('id-ID')}</span> Data
        </div>
      </div>
    </div>
  );
}
