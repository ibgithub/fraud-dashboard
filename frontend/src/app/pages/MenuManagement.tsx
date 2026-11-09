// Halaman: Menu Management (M8.6)
// CRUD menu dengan paging

import { useState, useEffect } from 'react';
import { Eye, Pencil, Trash2, Plus, X, Search } from 'lucide-react';
import { useI18n, resolveMessage } from '../i18n';
import { toast } from 'sonner';

interface MenuItem {
  id: number;
  code: string;
  parentCode: string | null;
  menuKey: string;
  path: string;
  icon: string | null;
  sortOrder: number;
  children: MenuItem[] | null;
}

interface PageData {
  content: MenuItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

type ModalMode = 'detail' | 'add' | 'edit' | null;

export function MenuManagement() {
  const { t, lang } = useI18n();
  const [pageData, setPageData] = useState<PageData>({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);

  // Form
  const [formCode, setFormCode] = useState('');
  const [formParentCode, setFormParentCode] = useState('');
  const [formMenuKey, setFormMenuKey] = useState('');
  const [formPath, setFormPath] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [formSortOrder, setFormSortOrder] = useState('1');

  function getToken() { return localStorage.getItem('auth_token') || ''; }

  const title = (t as any).lang === 'id' ? 'Manajemen Menu' : 'Menu Management';
  const subtitle = (t as any).lang === 'id' ? 'Daftar menu yang tersedia dalam sistem' : 'List of menus available in the system';
  const searchPlaceholder = (t as any).lang === 'id' ? 'Cari menu...' : 'Search menus...';
  const pageLabel = (t as any).lang === 'id' ? 'Halaman' : 'Page';
  const btnAdd = (t as any).lang === 'id' ? 'Tambah Menu' : 'Add Menu';
  const btnSave = (t as any).lang === 'id' ? 'Simpan' : 'Save';
  const btnCancel = (t as any).lang === 'id' ? 'Batal' : 'Cancel';
  const btnClose = (t as any).lang === 'id' ? 'Tutup' : 'Close';
  const confirmDelete = (t as any).lang === 'id' ? 'Yakin ingin menghapus menu ini?' : 'Are you sure you want to delete this menu?';

  async function fetchMenus(page = 0, size = 10, search = '') {
    setLoading(true);
    try {
      let url = `/api/menus?page=${page}&size=${size}`;
      if (search) url += `&keyword=${encodeURIComponent(search)}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      if (res.status === 403 || res.status === 401) { setError('Access denied'); return; }
      const json = await res.json();
      if (json.success) { setPageData(json.data); setError(''); }
      else setError(json.message || 'Error');
    } catch (err: any) { setError(err.message || 'Error'); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchMenus(currentPage, pageSize, keyword); }, [currentPage, pageSize]);

  function handleSearch() { setCurrentPage(0); fetchMenus(0, pageSize, keyword); }
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

  function openDetail(menu: MenuItem) { setSelectedMenu(menu); setModalMode('detail'); setModalOpen(true); }
  function openEdit(menu: MenuItem) {
    setSelectedMenu(menu);
    setFormCode(menu.code); setFormParentCode(menu.parentCode || '');
    setFormMenuKey(menu.menuKey); setFormPath(menu.path);
    setFormIcon(menu.icon || ''); setFormSortOrder(String(menu.sortOrder));
    setModalMode('edit'); setModalOpen(true);
  }
  function openAdd() {
    setSelectedMenu(null);
    setFormCode(''); setFormParentCode('');
    setFormMenuKey(''); setFormPath('');
    setFormIcon(''); setFormSortOrder('1');
    setModalMode('add'); setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setModalMode(null); setSelectedMenu(null); }

  async function handleSave() {
    const body = {
      code: formCode,
      parentCode: formParentCode || null,
      menuKey: formMenuKey,
      path: formPath,
      icon: formIcon || null,
      sortOrder: Number(formSortOrder) || 1,
    };
    const url = modalMode === 'add' ? '/api/menus' : `/api/menus/${selectedMenu?.id}`;
    const method = modalMode === 'add' ? 'POST' : 'PUT';
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) { toast.success(resolveMessage(json.message, lang)); closeModal(); fetchMenus(currentPage, pageSize, keyword); }
      else toast.error(resolveMessage(json.message, lang));
    } catch (err: any) { toast.error(err.message || 'Error'); }
  }

  async function handleDelete(menu: MenuItem) {
    if (!confirm(confirmDelete)) return;
    try {
      const res = await fetch(`/api/menus/${menu.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
      const json = await res.json();
      if (json.success) { toast.success(resolveMessage(json.message, lang)); fetchMenus(currentPage, pageSize, keyword); }
      else toast.error(resolveMessage(json.message, lang));
    } catch (err: any) { toast.error(err.message || 'Error'); }
  }

  if (error) {
    return (<div className="p-5"><div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-xs">{error}</div></div>);
  }

  return (
    <div className="px-5 pt-3 pb-5 flex flex-col min-h-full">
      {/* Title */}
      <div className="mb-1">
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      {/* Search + Add */}
      <div className="flex items-center justify-between mb-4 mt-3">
        <div className="flex items-stretch">
          <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={searchPlaceholder}
            className="px-3 py-1.5 border border-slate-300 border-r-0 rounded-l text-xs focus:outline-none focus:border-slate-400 bg-white w-64 h-8" />
          <button onClick={handleSearch} className="px-2.5 bg-slate-600 hover:bg-slate-700 text-white rounded-r border border-slate-600 flex items-center justify-center h-8">
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition">
          <Plus className="w-3.5 h-3.5" />
          {btnAdd}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide">Code</th>
              <th className="text-left py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide">Parent</th>
              <th className="text-left py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide">Menu Key</th>
              <th className="text-left py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide">Path</th>
              <th className="text-left py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide">Icon</th>
              <th className="text-center py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide w-16">Order</th>
              <th className="text-center py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide w-28">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-6 text-center text-slate-400 text-xs">Loading...</td></tr>
            ) : pageData.content.length === 0 ? (
              <tr><td colSpan={7} className="py-6 text-center text-slate-400 text-xs">No data</td></tr>
            ) : (
              pageData.content.map((menu) => (
                <tr key={menu.id} className="border-b border-slate-100 hover:bg-blue-50/40">
                  <td className="py-2 px-4 text-slate-800 font-medium">{menu.code}</td>
                  <td className="py-2 px-4 text-slate-500">{menu.parentCode || '-'}</td>
                  <td className="py-2 px-4 text-slate-600">{menu.menuKey}</td>
                  <td className="py-2 px-4 text-slate-600">{menu.path}</td>
                  <td className="py-2 px-4 text-slate-500">{menu.icon || '-'}</td>
                  <td className="py-2 px-4 text-center text-slate-500">{menu.sortOrder}</td>
                  <td className="py-2 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openDetail(menu)} className="p-1.5 rounded-full border border-blue-200 text-blue-500 hover:bg-blue-100 transition" title="Detail">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openEdit(menu)} className="p-1.5 rounded-full border border-amber-200 text-amber-500 hover:bg-amber-100 transition" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(menu)} className="p-1.5 rounded-full border border-red-200 text-red-500 hover:bg-red-100 transition" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
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
          <option value={5}>5 / {pageLabel}</option>
          <option value={10}>10 / {pageLabel}</option>
          <option value={25}>25 / {pageLabel}</option>
          <option value={50}>50 / {pageLabel}</option>
        </select>
        <span className="ml-3 text-xs text-slate-500">Total {pageData.totalElements} Data</span>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal}></div>
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-900">
                {modalMode === 'detail' && 'Detail Menu'}
                {modalMode === 'add' && btnAdd}
                {modalMode === 'edit' && 'Edit Menu'}
              </h2>
              <button onClick={closeModal} className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
              {modalMode === 'detail' && selectedMenu && (
                <div className="space-y-3">
                  <div><label className="text-xs text-slate-500">Code</label><p className="text-sm text-slate-900 font-medium mt-0.5">{selectedMenu.code}</p></div>
                  <div><label className="text-xs text-slate-500">Parent Code</label><p className="text-sm text-slate-900 mt-0.5">{selectedMenu.parentCode || '-'}</p></div>
                  <div><label className="text-xs text-slate-500">Menu Key</label><p className="text-sm text-slate-900 mt-0.5">{selectedMenu.menuKey}</p></div>
                  <div><label className="text-xs text-slate-500">Path</label><p className="text-sm text-slate-900 mt-0.5">{selectedMenu.path}</p></div>
                  <div><label className="text-xs text-slate-500">Icon</label><p className="text-sm text-slate-900 mt-0.5">{selectedMenu.icon || '-'}</p></div>
                  <div><label className="text-xs text-slate-500">Sort Order</label><p className="text-sm text-slate-900 mt-0.5">{selectedMenu.sortOrder}</p></div>
                </div>
              )}

              {(modalMode === 'add' || modalMode === 'edit') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Code</label>
                    <input type="text" value={formCode} onChange={(e) => setFormCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Parent Code</label>
                    <input type="text" value={formParentCode} onChange={(e) => setFormParentCode(e.target.value)} placeholder="(kosong jika parent)"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Menu Key</label>
                    <input type="text" value={formMenuKey} onChange={(e) => setFormMenuKey(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Path</label>
                    <input type="text" value={formPath} onChange={(e) => setFormPath(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Icon</label>
                    <input type="text" value={formIcon} onChange={(e) => setFormIcon(e.target.value)} placeholder="(opsional)"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Sort Order</label>
                    <input type="number" value={formSortOrder} onChange={(e) => setFormSortOrder(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex gap-2">
              {(modalMode === 'add' || modalMode === 'edit') && (
                <>
                  <button onClick={handleSave} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition">{btnSave}</button>
                  <button onClick={closeModal} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition">{btnCancel}</button>
                </>
              )}
              {modalMode === 'detail' && (
                <button onClick={closeModal} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition">{btnClose}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
