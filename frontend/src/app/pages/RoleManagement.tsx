// Halaman: Role Management (M8.5)
// CRUD role + assign menus

import { useState, useEffect } from 'react';
import { Eye, Pencil, Trash2, Plus, X, Search } from 'lucide-react';
import { useI18n, resolveMessage } from '../i18n';
import { toast } from 'sonner';

interface MenuRef {
  id: number;
  code: string;
  parentCode: string | null;
  menuKey: string;
  path: string;
  icon: string | null;
  sortOrder: number;
}

interface Role {
  id: number;
  roleName: string;
  description: string;
  canViewCustomerName?: boolean;
  scopeType?: string;   // 'PUSAT' | 'CABANG'
  branchCode?: string | null;
  menus?: MenuRef[];
}

interface Branch {
  code: string;
  name: string;
}

interface PageData {
  content: Role[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

type ModalMode = 'detail' | 'add' | 'edit' | null;

export function RoleManagement() {
  const { t, lang } = useI18n();
  const [pageData, setPageData] = useState<PageData>({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Form
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCanViewName, setFormCanViewName] = useState(false);
  const [formScopeType, setFormScopeType] = useState<'PUSAT' | 'CABANG'>('PUSAT');
  const [formBranchCode, setFormBranchCode] = useState('');

  // Branch master (for Cabang scope combo)
  const [branches, setBranches] = useState<Branch[]>([]);

  // Table filters (client-side, applied to the current page)
  const [filterScope, setFilterScope] = useState<'ALL' | 'PUSAT' | 'CABANG'>('ALL');
  const [filterBranch, setFilterBranch] = useState('');

  // Menu assignment
  const [allMenus, setAllMenus] = useState<MenuRef[]>([]);
  const [assignedMenuIds, setAssignedMenuIds] = useState<number[]>([]);

  const pageLabel = (t as any).lang === 'id' ? 'Halaman' : 'Page';

  function getToken() { return localStorage.getItem('auth_token') || ''; }

  async function fetchRoles(page = 0, size = 10, search = '') {
    setLoading(true);
    try {
      let url = `/api/roles?page=${page}&size=${size}`;
      if (search) url += `&keyword=${encodeURIComponent(search)}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      if (res.status === 403) { setError((t as any).role_access_denied); return; }
      if (res.status === 401) { setError((t as any).role_session_expired); return; }
      const json = await res.json();
      if (json.success) { setPageData(json.data); setError(''); }
      else setError(json.message || 'Error');
    } catch (err: any) { setError(err.message || 'Error'); }
    finally { setLoading(false); }
  }

  async function fetchAllMenus() {
    try {
      const res = await fetch('/api/menus/all', { headers: { 'Authorization': `Bearer ${getToken()}` } });
      const json = await res.json();
      if (json.success) setAllMenus(json.data || []);
    } catch (err) {}
  }

  async function fetchBranches() {
    try {
      const res = await fetch('/api/v1/executive/branches', { headers: { 'Authorization': `Bearer ${getToken()}` } });
      const json = await res.json();
      if (json.success) setBranches(json.data || []);
    } catch (err) {}
  }

  async function fetchRoleDetail(id: number): Promise<Role | null> {
    try {
      const res = await fetch(`/api/roles/${id}`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      const json = await res.json();
      if (json.success) return json.data;
    } catch (err) {}
    return null;
  }

  useEffect(() => { fetchRoles(currentPage, pageSize, keyword); fetchAllMenus(); fetchBranches(); }, [currentPage, pageSize]);

  function handleSearch() { setCurrentPage(0); fetchRoles(0, pageSize, keyword); }
  function handleKeyDown(e: React.KeyboardEvent) { if (e.key === 'Enter') handleSearch(); }
  function handlePageSizeChange(newSize: number) { setPageSize(newSize); setCurrentPage(0); }

  function getPageNumbers(): number[] {
    const total = pageData.totalPages;
    if (total <= 5) return Array.from({ length: total }, (_, i) => i);
    let start = Math.max(0, currentPage - 2);
    let end = start + 5;
    if (end > total) { end = total; start = end - 5; }
    return Array.from({ length: end - start }, (_, i) => start + i);
  }

  async function openDetail(role: Role) {
    const detail = await fetchRoleDetail(role.id);
    setSelectedRole(detail || role);
    setModalMode('detail');
    setModalOpen(true);
  }

  async function openEdit(role: Role) {
    const detail = await fetchRoleDetail(role.id);
    const r = detail || role;
    setSelectedRole(r);
    setFormName(r.roleName);
    setFormDescription(r.description);
    setFormCanViewName(!!r.canViewCustomerName);
    setFormScopeType(r.scopeType === 'CABANG' ? 'CABANG' : 'PUSAT');
    setFormBranchCode(r.branchCode || '');
    setAssignedMenuIds(r.menus?.map(m => m.id) || []);
    setModalMode('edit');
    setModalOpen(true);
  }

  function openAdd() {
    setSelectedRole(null);
    setFormName(''); setFormDescription('');
    setFormCanViewName(false);
    setFormScopeType('PUSAT');
    setFormBranchCode('');
    setAssignedMenuIds([]);
    setModalMode('add');
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setModalMode(null); setSelectedRole(null); }

  function toggleMenu(menuId: number) {
    setAssignedMenuIds(prev =>
      prev.includes(menuId) ? prev.filter(id => id !== menuId) : [...prev, menuId]
    );
  }

  async function handleSave() {
    if (formScopeType === 'CABANG' && !formBranchCode) {
      toast.error(lang === 'id' ? 'Silakan pilih cabang terlebih dahulu.' : 'Please select a branch first.');
      return;
    }
    const body = {
      roleName: formName,
      description: formDescription,
      canViewCustomerName: formCanViewName,
      scopeType: formScopeType,
      branchCode: formScopeType === 'CABANG' ? formBranchCode : null,
      menuIds: assignedMenuIds,
    };
    const url = modalMode === 'add' ? '/api/roles' : `/api/roles/${selectedRole?.id}`;
    const method = modalMode === 'add' ? 'POST' : 'PUT';
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) { toast.success(resolveMessage(json.message, lang)); closeModal(); fetchRoles(currentPage, pageSize, keyword); }
      else toast.error(resolveMessage(json.message, lang));
    } catch (err: any) { toast.error(err.message || 'Error'); }
  }

  async function handleDelete(role: Role) {
    if (!confirm((t as any).role_delete_confirm)) return;
    try {
      const res = await fetch(`/api/roles/${role.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
      const json = await res.json();
      if (json.success) { toast.success(resolveMessage(json.message, lang)); fetchRoles(currentPage, pageSize, keyword); }
      else toast.error(resolveMessage(json.message, lang));
    } catch (err: any) { toast.error(err.message || 'Error'); }
  }

  function branchName(code?: string | null): string {
    if (!code) return '-';
    return branches.find(b => b.code === code)?.name || code;
  }

  // Apply Scope/Branch filters to the current page's rows (client-side).
  const filteredRoles = pageData.content.filter((r) => {
    const scope = r.scopeType === 'CABANG' ? 'CABANG' : 'PUSAT';
    if (filterScope !== 'ALL' && scope !== filterScope) return false;
    if (filterBranch && r.branchCode !== filterBranch) return false;
    return true;
  });

  if (error) {
    return (<div className="p-5"><div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-xs">{error}</div></div>);
  }

  return (
    <div className="px-5 pt-3 pb-5 flex flex-col min-h-full">
      {/* Title */}
      <div className="mb-1">
        <h1 className="text-xl font-bold text-slate-800">{(t as any).role_title}</h1>
        <p className="text-sm text-slate-500">{(t as any).role_subtitle}</p>
      </div>

      {/* Search + Filters + Add */}
      <div className="flex items-center justify-between mb-4 mt-3 gap-3">
        <div className="flex items-stretch gap-2 flex-wrap">
          <div className="flex items-stretch">
            <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={(t as any).role_search}
              className="px-3 py-1.5 border border-slate-300 border-r-0 rounded-l text-xs focus:outline-none focus:border-slate-400 bg-white w-64 h-8" />
            <button onClick={handleSearch} className="px-2.5 bg-slate-600 hover:bg-slate-700 text-white rounded-r border border-slate-600 flex items-center justify-center h-8">
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Filter: Scope */}
          <select
            value={filterScope}
            onChange={(e) => { setFilterScope(e.target.value as 'ALL' | 'PUSAT' | 'CABANG'); if (e.target.value !== 'CABANG') setFilterBranch(''); }}
            className="px-2.5 h-8 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:border-slate-400"
            title={lang === 'id' ? 'Filter Lingkup' : 'Filter Scope'}
          >
            <option value="ALL">{lang === 'id' ? 'Semua Lingkup' : 'All Scopes'}</option>
            <option value="PUSAT">Pusat</option>
            <option value="CABANG">{lang === 'id' ? 'Cabang' : 'Branch'}</option>
          </select>

          {/* Filter: Branch (only meaningful when not filtering to PUSAT) */}
          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            disabled={filterScope === 'PUSAT'}
            className="px-2.5 h-8 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:border-slate-400 disabled:bg-slate-100 disabled:text-slate-400"
            title={lang === 'id' ? 'Filter Cabang' : 'Filter Branch'}
          >
            <option value="">{lang === 'id' ? 'Semua Cabang' : 'All Branches'}</option>
            {branches.map((b) => (
              <option key={b.code} value={b.code}>{b.name}</option>
            ))}
          </select>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition shrink-0">
          <Plus className="w-3.5 h-3.5" />
          {(t as any).role_add}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide">{(t as any).role_name}</th>
              <th className="text-left py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide">{(t as any).role_description}</th>
              <th className="text-left py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide w-24">{lang === 'id' ? 'Lingkup' : 'Scope'}</th>
              <th className="text-left py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide">{lang === 'id' ? 'Cabang' : 'Branch'}</th>
              <th className="text-center py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide w-28">{(t as any).role_actions}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-6 text-center text-slate-400 text-xs">{(t as any).role_loading}</td></tr>
            ) : filteredRoles.length === 0 ? (
              <tr><td colSpan={5} className="py-6 text-center text-slate-400 text-xs">No data</td></tr>
            ) : (
              filteredRoles.map((role) => {
                const scope = role.scopeType === 'CABANG' ? 'CABANG' : 'PUSAT';
                return (
                <tr key={role.id} className="border-b border-slate-100 hover:bg-blue-50/40">
                  <td className="py-2 px-4 text-slate-800 font-medium">{role.roleName}</td>
                  <td className="py-2 px-4 text-slate-600">{role.description}</td>
                  <td className="py-2 px-4">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${scope === 'CABANG' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {scope === 'CABANG' ? (lang === 'id' ? 'Cabang' : 'Branch') : 'Pusat'}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-slate-600">{scope === 'CABANG' ? branchName(role.branchCode) : '-'}</td>
                  <td className="py-2 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openDetail(role)} className="p-1.5 rounded-full border border-blue-200 text-blue-500 hover:bg-blue-100 transition" title={(t as any).role_detail}>
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openEdit(role)} className="p-1.5 rounded-full border border-amber-200 text-amber-500 hover:bg-amber-100 transition" title={(t as any).role_edit}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(role)} className="p-1.5 rounded-full border border-red-200 text-red-500 hover:bg-red-100 transition" title={(t as any).role_delete}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })
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
          <option value={5}>5 / {pageLabel}</option>
          <option value={10}>10 / {pageLabel}</option>
          <option value={25}>25 / {pageLabel}</option>
          <option value={50}>50 / {pageLabel}</option>
        </select>
        <span className="ml-3 text-xs text-slate-500">Total {pageData.totalElements} Data</span>
      </div>

      {/* Modal — full page overlay */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal}></div>
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 shrink-0">
              <h2 className="text-sm font-semibold text-slate-900">
                {modalMode === 'detail' && (t as any).role_detail}
                {modalMode === 'add' && (t as any).role_add}
                {modalMode === 'edit' && (t as any).role_edit}
              </h2>
              <button onClick={closeModal} className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {modalMode === 'detail' && selectedRole && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs text-slate-500">{(t as any).role_name}</label><p className="text-sm text-slate-900 font-medium mt-0.5">{selectedRole.roleName}</p></div>
                    <div><label className="text-xs text-slate-500">{(t as any).role_description}</label><p className="text-sm text-slate-900 mt-0.5">{selectedRole.description}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-500">{lang === 'id' ? 'Akses Nama Nasabah' : 'Customer Name Access'}</label>
                      <p className="text-sm text-slate-900 mt-0.5">
                        {selectedRole.canViewCustomerName
                          ? (lang === 'id' ? 'Nama penuh (tanpa masking)' : 'Full name (unmasked)')
                          : (lang === 'id' ? 'Tersamar (masking)' : 'Masked')}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">{lang === 'id' ? 'Lingkup' : 'Scope'}</label>
                      <p className="text-sm text-slate-900 mt-0.5">
                        {selectedRole.scopeType === 'CABANG'
                          ? (lang === 'id' ? 'Cabang' : 'Branch') + ' — ' +
                            (branches.find(b => b.code === selectedRole.branchCode)?.name || selectedRole.branchCode || '-')
                          : 'Pusat'}
                      </p>
                    </div>
                  </div>
                  {/* Menu list */}
                  <div>
                    <label className="text-xs text-slate-500">Menu yang diizinkan</label>
                    <div className="mt-1.5 border border-slate-200 rounded p-2 max-h-48 overflow-y-auto">
                      {selectedRole.menus && selectedRole.menus.length > 0 ? (
                        <div className="space-y-0.5">
                          {selectedRole.menus.sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code)).map(m => (
                            <div key={m.id} className="flex items-center gap-2 px-2 py-1 text-xs">
                              <span className="text-slate-500 w-12">{m.code}</span>
                              <span className="text-slate-700">{m.path}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Tidak ada menu</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {(modalMode === 'add' || modalMode === 'edit') && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">{(t as any).role_name}</label>
                      <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">{(t as any).role_description}</label>
                      <input type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                    </div>
                  </div>

                  {/* PII privilege: allow viewing unmasked customer names */}
                  <label className="flex items-start gap-2.5 p-3 rounded border border-slate-200 bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formCanViewName}
                      onChange={(e) => setFormCanViewName(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-700">
                      <span className="font-semibold text-slate-800">
                        {lang === 'id' ? 'Boleh melihat nama nasabah (tanpa masking)' : 'May view customer names (unmasked)'}
                      </span>
                      <br />
                      <span className="text-slate-500">
                        {lang === 'id'
                          ? 'Jika tidak dicentang, nama nasabah ditampilkan tersamar (mis. P**** S****).'
                          : 'If unchecked, customer names are shown masked (e.g. P**** S****).'}
                      </span>
                    </span>
                  </label>

                  {/* Scope: Pusat / Cabang */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">{lang === 'id' ? 'Lingkup' : 'Scope'}</label>
                      <select
                        value={formScopeType}
                        onChange={(e) => {
                          const v = e.target.value as 'PUSAT' | 'CABANG';
                          setFormScopeType(v);
                          if (v === 'PUSAT') setFormBranchCode('');
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white"
                      >
                        <option value="PUSAT">Pusat</option>
                        <option value="CABANG">{lang === 'id' ? 'Cabang' : 'Branch'}</option>
                      </select>
                    </div>
                    {formScopeType === 'CABANG' && (
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          {lang === 'id' ? 'Cabang' : 'Branch'} <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formBranchCode}
                          onChange={(e) => setFormBranchCode(e.target.value)}
                          className={`w-full px-3 py-2 border rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white ${formBranchCode ? 'border-slate-300' : 'border-red-300'}`}
                        >
                          <option value="">{lang === 'id' ? '— Pilih Cabang —' : '— Select Branch —'}</option>
                          {branches.map((b) => (
                            <option key={b.code} value={b.code}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Menu assignment — table with checkboxes */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">Assign Menu</label>
                    <div className="border border-slate-200 rounded max-h-[60vh] overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr className="border-b border-slate-200">
                            <th className="py-2 px-3 w-8"></th>
                            <th className="text-left py-2 px-3 font-semibold text-slate-500 uppercase">Code</th>
                            <th className="text-left py-2 px-3 font-semibold text-slate-500 uppercase">Parent</th>
                            <th className="text-left py-2 px-3 font-semibold text-slate-500 uppercase">Menu Key</th>
                            <th className="text-left py-2 px-3 font-semibold text-slate-500 uppercase">Path</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            // Sort: parents first by sortOrder, then children under each parent
                            const parents = allMenus.filter(m => m.parentCode === null).sort((a, b) => a.sortOrder - b.sortOrder);
                            const sorted: typeof allMenus = [];
                            parents.forEach(parent => {
                              sorted.push(parent);
                              const children = allMenus.filter(m => m.parentCode === parent.code).sort((a, b) => a.sortOrder - b.sortOrder);
                              sorted.push(...children);
                            });
                            return sorted;
                          })().map(menu => {
                            const isChecked = assignedMenuIds.includes(menu.id);
                            const isParent = menu.parentCode === null;
                            return (
                              <tr key={menu.id} className={`border-b border-slate-100 hover:bg-blue-50/30 ${isParent ? 'bg-slate-50/50' : ''}`}>
                                <td className="py-1.5 px-3">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      if (isParent) {
                                        // Get all children of this parent
                                        const childIds = allMenus.filter(m => m.parentCode === menu.code).map(m => m.id);
                                        const allIds = [menu.id, ...childIds];
                                        if (isChecked) {
                                          // Uncheck parent + all children
                                          setAssignedMenuIds(prev => prev.filter(id => !allIds.includes(id)));
                                        } else {
                                          // Check parent + all children
                                          setAssignedMenuIds(prev => {
                                            const newSet = new Set([...prev, ...allIds]);
                                            return Array.from(newSet);
                                          });
                                        }
                                      } else {
                                        toggleMenu(menu.id);
                                      }
                                    }}
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                </td>
                                <td className={`py-1.5 px-3 ${isParent ? 'font-medium text-slate-800' : 'text-slate-600 pl-6'}`}>{menu.code}</td>
                                <td className="py-1.5 px-3 text-slate-500">{menu.parentCode || '-'}</td>
                                <td className="py-1.5 px-3 text-slate-600">{menu.menuKey}</td>
                                <td className="py-1.5 px-3 text-slate-600">{menu.path}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{assignedMenuIds.length} menu terpilih</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex gap-2 shrink-0">
              {(modalMode === 'add' || modalMode === 'edit') && (
                <>
                  <button
                    onClick={handleSave}
                    disabled={formScopeType === 'CABANG' && !formBranchCode}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >{(t as any).role_save}</button>
                  <button onClick={closeModal} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition">{(t as any).role_cancel}</button>
                </>
              )}
              {modalMode === 'detail' && (
                <button onClick={closeModal} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition">{(t as any).role_close}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
