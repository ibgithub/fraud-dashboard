import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { Wallet, Search, Loader2 } from 'lucide-react';
import { stripBranchPrefix } from '../lib/displayNames';

interface RankingItem {
  cif: string;
  name?: string; // not displayed (removed from the bag TRB model)
  branch: string;
  aum: number;
  tier: string;
}

function TierBadge({ tier }: { tier: string }) {
  const map: Record<string, string> = {
    Hi: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Med: 'bg-amber-50 text-amber-700 border-amber-200',
    Lo: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded border ${map[tier] || map.Lo}`}>
      {tier}
    </span>
  );
}

export function AumRanking() {
  const { lang } = useI18n();
  const isEn = lang === 'en';

  const [items, setItems] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [branches, setBranches] = useState<string[]>([]);
  const [branchInput, setBranchInput] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedBranch, setAppliedBranch] = useState('all');
  const [appliedSearch, setAppliedSearch] = useState('');

  // TRB tier distribution [hi, med] from setting TRB_TIER_DISTRIBUTION (default 20|30).
  const [tierPct, setTierPct] = useState<[number, number]>([20, 30]);

  const authHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await fetch('/api/v1/executive/aum/branches', { headers: authHeaders() });
        if (res.ok) {
          const b = await res.json();
          if (b.success && Array.isArray(b.data)) setBranches(b.data);
        }
      } catch { /* ignore */ }
    }
    async function loadTierPct() {
      try {
        const res = await fetch('/api/settings/by-name/TRB_TIER_DISTRIBUTION', { headers: authHeaders() });
        if (res.ok) {
          const sb = await res.json();
          const val: string | undefined = sb?.data?.value;
          if (val) {
            const parts = val.split('|').map((x: string) => parseFloat(x.trim()));
            if (parts.length === 3 && parts.every((n: number) => !isNaN(n))) {
              setTierPct([parts[0], parts[1]]);
            }
          }
        }
      } catch { /* keep defaults */ }
    }
    loadBranches();
    loadTierPct();
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const qs = new URLSearchParams({ page: String(currentPage - 1), size: String(pageSize) });
        if (appliedSearch) qs.append('search', appliedSearch);
        if (appliedBranch !== 'all') qs.append('branch', appliedBranch);
        qs.append('hiPct', String(Math.round(tierPct[0])));
        qs.append('medPct', String(Math.round(tierPct[1])));
        const res = await fetch(`/api/v1/executive/aum/ranking?${qs.toString()}`, { headers: authHeaders() });
        if (res.ok) {
          const body = await res.json();
          if (body.success && body.data) {
            setItems(body.data.items || []);
            setTotalPages(body.data.totalPages || 1);
            setTotalElements(body.data.totalElements || 0);
          }
        }
      } catch (err) {
        console.error('Failed to fetch AUM ranking:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentPage, pageSize, appliedBranch, appliedSearch, tierPct]);

  const applyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAppliedBranch(branchInput);
    setAppliedSearch(searchInput.trim());
    setCurrentPage(1);
  };

  const startIndex = totalElements === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalElements);

  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-[#8A6534]" />
          TRB (Total Relationship Balance) Ranking
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Customers ranked by Total Relationship Balance.
        </p>
      </div>

      {/* Filter bar */}
      <form onSubmit={applyFilters} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap shadow-2xs">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs text-slate-500 font-medium whitespace-nowrap">{isEn ? 'Branch:' : 'Cabang:'}</label>
          <select
            value={branchInput}
            onChange={(e) => setBranchInput(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#6B4E2E]"
          >
            <option value="all">{isEn ? 'All Branches' : 'Semua Cabang'}</option>
            {branches.map((b) => <option key={b} value={b}>{stripBranchPrefix(b)}</option>)}
          </select>
        </div>
        <div className="relative flex-1 max-w-sm min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={isEn ? 'Search CIF...' : 'Cari CIF...'}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#6B4E2E] transition"
          />
        </div>
        <button type="submit" className="px-4 py-1.5 text-xs font-bold text-white bg-[#8A6534] hover:bg-[#6f5029] rounded-lg transition">
          {isEn ? 'Submit' : 'Terapkan'}
        </button>
      </form>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#8A6534]" />
            TRB Ranking
          </h3>
          {loading && <Loader2 className="w-4 h-4 text-[#6B4E2E] animate-spin" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">#</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">CIF</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">{isEn ? 'Branch' : 'Cabang'}</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase text-right">{isEn ? 'TRB (million)' : 'TRB (juta)'}</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase text-center">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400 italic text-xs">
                  {loading ? (isEn ? 'Loading...' : 'Memuat...') : (isEn ? 'No data' : 'Tidak ada data')}
                </td></tr>
              )}
              {items.map((c, idx) => (
                <tr key={c.cif + idx} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-4 text-xs text-slate-400">{(currentPage - 1) * pageSize + idx + 1}</td>
                  <td className="py-2.5 px-4 font-mono text-xs text-slate-600">{c.cif}</td>
                  <td className="py-2.5 px-4 text-xs text-slate-600">{stripBranchPrefix(c.branch)}</td>
                  <td className="py-2.5 px-4 text-right font-medium text-slate-900 text-xs">
                    {(c.aum / 1000000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-4 text-center"><TierBadge tier={c.tier} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {items.length > 0 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3 bg-slate-50/50">
            <div className="text-xs text-slate-500 font-medium">
              {isEn ? 'Showing' : 'Menampilkan'} {startIndex} - {endIndex} {isEn ? 'of' : 'dari'} {totalElements.toLocaleString('id-ID')} {isEn ? 'customers' : 'nasabah'}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">«</button>
              <span className="text-xs font-semibold text-slate-700">{isEn ? 'Page' : 'Hal'} {currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">»</button>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="ml-2 px-2 py-1 text-xs border border-slate-300 rounded bg-white">
                <option value={10}>10 / {isEn ? 'page' : 'hal'}</option>
                <option value={25}>25 / {isEn ? 'page' : 'hal'}</option>
                <option value={50}>50 / {isEn ? 'page' : 'hal'}</option>
                <option value={100}>100 / {isEn ? 'page' : 'hal'}</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
