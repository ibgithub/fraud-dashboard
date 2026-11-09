// Halaman: System Parameter (M8.11)
// CRUD settings/parameter

import { useState, useEffect } from 'react';
import { Eye, Pencil, Trash2, Plus, X, Search } from 'lucide-react';
import { useI18n, resolveMessage } from '../i18n';
import { toast } from 'sonner';

interface Setting {
  id: number;
  name: string;
  value: string;
  description: string;
}

interface PageData {
  content: Setting[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

type ModalMode = 'detail' | 'add' | 'edit' | null;

export function SystemParameter() {
  const { t, lang } = useI18n();
  const [pageData, setPageData] = useState<PageData>({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedSetting, setSelectedSetting] = useState<Setting | null>(null);

  // Form
  const [formName, setFormName] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formDescription, setFormDescription] = useState('');

  function getToken() { return localStorage.getItem('auth_token') || ''; }

  const title = (t as any).lang === 'id' ? 'Parameter Sistem' : 'System Parameter';
  const subtitle = (t as any).lang === 'id' ? 'Konfigurasi parameter aplikasi' : 'Application parameter configuration';
  const searchPlaceholder = (t as any).lang === 'id' ? 'Cari parameter...' : 'Search parameter...';
  const btnAdd = (t as any).lang === 'id' ? 'Tambah Parameter' : 'Add Parameter';
  const btnSave = (t as any).lang === 'id' ? 'Simpan' : 'Save';
  const btnCancel = (t as any).lang === 'id' ? 'Batal' : 'Cancel';
  const btnClose = (t as any).lang === 'id' ? 'Tutup' : 'Close';
  const pageLabel = (t as any).lang === 'id' ? 'Halaman' : 'Page';
  const confirmDelete = (t as any).lang === 'id' ? 'Yakin ingin menghapus parameter ini?' : 'Are you sure you want to delete this parameter?';

  async function fetchSettings(page = 0, size = 10, search = '') {
    setLoading(true);
    try {
      let url = `/api/settings?page=${page}&size=${size}`;
      if (search) url += `&keyword=${encodeURIComponent(search)}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      if (res.status === 403 || res.status === 401) { setError('Access denied'); return; }
      const json = await res.json();
      if (json.success) {
        const data = json.data;
        // Handle both paged and array response
        if (Array.isArray(data)) {
          setPageData({ content: data, page: 0, size: data.length, totalElements: data.length, totalPages: 1 });
        } else {
          setPageData(data);
        }
        setError('');
      } else setError(json.message || 'Error');
    } catch (err: any) { setError(err.message || 'Error'); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchSettings(currentPage, pageSize, keyword); }, [currentPage, pageSize]);

  function handleSearch() { setCurrentPage(0); fetchSettings(0, pageSize, keyword); }
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

  function openDetail(s: Setting) { setSelectedSetting(s); setModalMode('detail'); setModalOpen(true); }
  function openEdit(s: Setting) {
    setSelectedSetting(s);
    setFormName(s.name); setFormValue(s.value); setFormDescription(s.description);
    setModalMode('edit'); setModalOpen(true);
  }
  function openAdd() {
    setSelectedSetting(null);
    setFormName(''); setFormValue(''); setFormDescription('');
    setModalMode('add'); setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setModalMode(null); setSelectedSetting(null); }

  async function handleSave() {
    const body = { name: formName, value: formValue, description: formDescription };
    const url = modalMode === 'add' ? '/api/settings' : `/api/settings/${selectedSetting?.id}`;
    const method = modalMode === 'add' ? 'POST' : 'PUT';
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) { toast.success(resolveMessage(json.message, lang)); closeModal(); fetchSettings(currentPage, pageSize, keyword); }
      else toast.error(resolveMessage(json.message, lang));
    } catch (err: any) { toast.error(err.message || 'Error'); }
  }

  async function handleDelete(s: Setting) {
    if (!confirm(confirmDelete)) return;
    try {
      const res = await fetch(`/api/settings/${s.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
      const json = await res.json();
      if (json.success) { toast.success(resolveMessage(json.message, lang)); fetchSettings(currentPage, pageSize, keyword); }
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
              <th className="text-left py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide">Name</th>
              <th className="text-left py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide">Value</th>
              <th className="text-left py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide">Description</th>
              <th className="text-center py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide w-28">{(t as any).lang === 'id' ? 'Aksi' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="py-6 text-center text-slate-400 text-xs">Loading...</td></tr>
            ) : pageData.content.length === 0 ? (
              <tr><td colSpan={4} className="py-6 text-center text-slate-400 text-xs">No data</td></tr>
            ) : (
              pageData.content.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-blue-50/40">
                  <td className="py-2 px-4 text-slate-800 font-medium">{s.name}</td>
                  <td className="py-2 px-4 text-slate-700">{s.value}</td>
                  <td className="py-2 px-4 text-slate-600">{s.description}</td>
                  <td className="py-2 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openDetail(s)} className="p-1.5 rounded-full border border-blue-200 text-blue-500 hover:bg-blue-100 transition" title="Detail">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded-full border border-amber-200 text-amber-500 hover:bg-amber-100 transition" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(s)} className="p-1.5 rounded-full border border-red-200 text-red-500 hover:bg-red-100 transition" title="Delete">
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
                {modalMode === 'detail' && 'Detail Parameter'}
                {modalMode === 'add' && btnAdd}
                {modalMode === 'edit' && 'Edit Parameter'}
              </h2>
              <button onClick={closeModal} className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
              {modalMode === 'detail' && selectedSetting && (
                <div className="space-y-3">
                  <div><label className="text-xs text-slate-500">Name</label><p className="text-sm text-slate-900 font-medium mt-0.5">{selectedSetting.name}</p></div>
                  <div><label className="text-xs text-slate-500">Value</label><p className="text-sm text-slate-900 mt-0.5">{selectedSetting.value}</p></div>
                  <div><label className="text-xs text-slate-500">Description</label><p className="text-sm text-slate-900 mt-0.5">{selectedSetting.description}</p></div>
                </div>
              )}

              {(modalMode === 'add' || modalMode === 'edit') && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Name</label>
                    <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Value</label>
                    <input type="text" value={formValue} onChange={(e) => setFormValue(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                    <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white resize-none" />
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
