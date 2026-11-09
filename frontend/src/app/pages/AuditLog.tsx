// Halaman: Audit Log (ADM-05)
// Read-only riwayat aksi aplikasi (login, user/role/menu/setting management)

import { useState, useEffect } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n';

interface AuditEntry {
  id: number;
  actor: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  detail: string | null;
  ipAddress: string | null;
  createdAt: string | null;
}

interface PageData {
  content: AuditEntry[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// Actions available for filtering (must match backend action codes)
const ACTION_OPTIONS = [
  'LOGIN', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'PASSWORD_RESET',
  'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_BLOCK', 'USER_UNLOCK', 'USER_ROLES_UPDATE',
  'ROLE_CREATE', 'ROLE_UPDATE', 'ROLE_DELETE', 'ROLE_MENUS_UPDATE',
  'MENU_CREATE', 'MENU_UPDATE', 'MENU_DELETE',
  'SETTING_CREATE', 'SETTING_UPDATE', 'SETTING_DELETE',
];

// Colour coding per action family for quick scanning
function actionBadgeClass(action: string): string {
  if (action === 'LOGIN') return 'bg-emerald-100 text-emerald-700';
  if (action === 'LOGIN_FAILED') return 'bg-rose-100 text-rose-700';
  if (action.includes('DELETE') || action === 'USER_BLOCK') return 'bg-red-100 text-red-700';
  if (action.includes('CREATE')) return 'bg-blue-100 text-blue-700';
  if (action.includes('PASSWORD')) return 'bg-purple-100 text-purple-700';
  if (action.includes('UPDATE') || action === 'USER_UNLOCK') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

export function AuditLog() {
  const { t } = useI18n();
  const [pageData, setPageData] = useState<PageData>({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [action, setAction] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  function getToken() { return localStorage.getItem('auth_token') || ''; }

  const isId = (t as any).lang === 'id';
  const title = isId ? 'Audit Log' : 'Audit Log';
  const subtitle = isId ? 'Riwayat aktivitas & keamanan aplikasi' : 'Application activity & security trail';
  const searchPlaceholder = isId ? 'Cari user / detail...' : 'Search actor / detail...';
  const pageLabel = isId ? 'Halaman' : 'Page';
  const allActions = isId ? 'Semua Aksi' : 'All Actions';

  async function fetchLogs(page = 0, size = 10, search = '', act = '') {
    setLoading(true);
    try {
      let url = `/api/audit-logs?page=${page}&size=${size}`;
      if (search) url += `&keyword=${encodeURIComponent(search)}`;
      if (act) url += `&action=${encodeURIComponent(act)}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      if (res.status === 403 || res.status === 401) { setError('Access denied'); return; }
      const json = await res.json();
      if (json.success) { setPageData(json.data); setError(''); }
      else setError(json.message || 'Error');
    } catch (err: any) { setError(err.message || 'Error'); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchLogs(currentPage, pageSize, keyword, action); }, [currentPage, pageSize]);

  function handleSearch() { setCurrentPage(0); fetchLogs(0, pageSize, keyword, action); }
  function handleKeyDown(e: React.KeyboardEvent) { if (e.key === 'Enter') handleSearch(); }
  function handleActionChange(v: string) { setAction(v); setCurrentPage(0); fetchLogs(0, pageSize, keyword, v); }
  function handlePageSizeChange(newSize: number) { setPageSize(newSize); setCurrentPage(0); }

  function getPageNumbers(): number[] {
    const total = pageData.totalPages;
    if (total <= 5) return Array.from({ length: total }, (_, i) => i);
    let start = Math.max(0, currentPage - 2);
    let end = start + 5;
    if (end > total) { end = total; start = end - 5; }
    return Array.from({ length: end - start }, (_, i) => start + i);
  }

  function formatDate(s: string | null): string {
    if (!s) return '-';
    // Backend sends "2026-09-29 06:17:56.639" — trim milliseconds for display.
    const dot = s.indexOf('.');
    return dot > 0 ? s.substring(0, dot) : s;
  }

  if (error) {
    return (<div className="p-5"><div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-xs">{error}</div></div>);
  }

  return (
    <div className="px-5 pt-3 pb-5 flex flex-col min-h-full">
      {/* Title */}
      <div className="mb-1 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-slate-600" />
        <div>
          <h1 className="text-xl font-bold text-slate-800">{title}</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 mt-3">
        <div className="flex items-stretch">
          <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={searchPlaceholder}
            className="px-3 py-1.5 border border-slate-300 border-r-0 rounded-l text-xs focus:outline-none focus:border-slate-400 bg-white w-64 h-8" />
          <button onClick={handleSearch} className="px-2.5 bg-slate-600 hover:bg-slate-700 text-white rounded-r border border-slate-600 flex items-center justify-center h-8">
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
        <select value={action} onChange={(e) => handleActionChange(e.target.value)}
          className="px-2 h-8 text-xs border border-slate-300 rounded bg-white">
          <option value="">{allActions}</option>
          {ACTION_OPTIONS.map((a) => (<option key={a} value={a}>{a}</option>))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide w-40">{isId ? 'Waktu' : 'Time'}</th>
              <th className="text-left py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide w-32">{isId ? 'User' : 'Actor'}</th>
              <th className="text-left py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide w-44">{isId ? 'Aksi' : 'Action'}</th>
              <th className="text-left py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide">{isId ? 'Detail' : 'Detail'}</th>
              <th className="text-left py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide w-32">IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-6 text-center text-slate-400 text-xs">Loading...</td></tr>
            ) : pageData.content.length === 0 ? (
              <tr><td colSpan={5} className="py-6 text-center text-slate-400 text-xs">No data</td></tr>
            ) : (
              pageData.content.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-blue-50/40">
                  <td className="py-2 px-4 text-slate-600 whitespace-nowrap font-mono">{formatDate(row.createdAt)}</td>
                  <td className="py-2 px-4 text-slate-800 font-medium">{row.actor || '-'}</td>
                  <td className="py-2 px-4">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${actionBadgeClass(row.action)}`}>{row.action}</span>
                  </td>
                  <td className="py-2 px-4 text-slate-600">{row.detail || '-'}</td>
                  <td className="py-2 px-4 text-slate-500 font-mono">{row.ipAddress || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paging */}
      <div className="flex items-center mt-4 gap-2">
        <button onClick={() => setCurrentPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0}
          className="px-2.5 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">«</button>
        {getPageNumbers().map((page) => (
          <button key={page} onClick={() => setCurrentPage(page)}
            className={`px-3 py-1 text-xs rounded transition ${page === currentPage ? 'bg-slate-700 text-white' : 'border border-slate-300 hover:bg-slate-50 text-slate-600'}`}
          >{page + 1}</button>
        ))}
        <button onClick={() => setCurrentPage(Math.min(pageData.totalPages - 1, currentPage + 1))} disabled={currentPage >= pageData.totalPages - 1}
          className="px-2.5 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">»</button>
        <select value={pageSize} onChange={(e) => handlePageSizeChange(Number(e.target.value))}
          className="ml-3 px-1.5 py-1 text-xs border border-slate-300 rounded bg-white">
          <option value={10}>10 / {pageLabel}</option>
          <option value={25}>25 / {pageLabel}</option>
          <option value={50}>50 / {pageLabel}</option>
          <option value={100}>100 / {pageLabel}</option>
        </select>
        <span className="ml-3 text-xs text-slate-500">Total {pageData.totalElements} Data</span>
      </div>

    </div>
  );
}
