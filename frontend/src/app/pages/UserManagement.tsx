// Halaman: User Management (M8.4)

import { useState, useEffect } from 'react';
import { Eye, Pencil, Trash2, Plus, X, Search, EyeOff, KeyRound } from 'lucide-react';
import { useI18n, resolveMessage } from '../i18n';
import { toast } from 'sonner';

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber: string;
  appLang: string | null;
  status: number | null;
  roles?: { id: number; roleName: string }[];
}

interface Role {
  id: number;
  roleName: string;
  description: string;
}

interface PageData {
  content: User[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

type ModalMode = 'detail' | 'add' | 'edit' | 'resetpw' | null;

export function UserManagement() {
  const { t, lang } = useI18n();
  const [pageData, setPageData] = useState<PageData>({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formConfirmPassword, setFormConfirmPassword] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAppLang, setFormAppLang] = useState('id');
  const [formStatus, setFormStatus] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');
  // Reset password form
  const [resetNewPw, setResetNewPw] = useState('');
  const [resetConfirmPw, setResetConfirmPw] = useState('');
  const [showResetPw, setShowResetPw] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  // Role assignment
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [assignedRoleIds, setAssignedRoleIds] = useState<number[]>([]);

  function getToken() { return localStorage.getItem('auth_token') || ''; }

  async function fetchUsers(page = 0, size = 10, search = '') {
    setLoading(true);
    try {
      let url = `/api/users?page=${page}&size=${size}`;
      if (search) url += `&keyword=${encodeURIComponent(search)}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      if (res.status === 403 || res.status === 401) { setError('Access denied'); return; }
      const json = await res.json();
      if (json.success) { setPageData(json.data); setError(''); }
      else setError(json.message || 'Error');
    } catch (err: any) { setError(err.message || 'Error'); }
    finally { setLoading(false); }
  }

  async function fetchAllRoles() {
    try {
      const res = await fetch('/api/roles/all', { headers: { 'Authorization': `Bearer ${getToken()}` } });
      const json = await res.json();
      if (json.success) {
        setAllRoles(json.data || []);
      }
    } catch (err) {}
  }

  useEffect(() => { fetchUsers(currentPage, pageSize, keyword); fetchAllRoles(); }, [currentPage, pageSize]);

  function handleSearch() { setCurrentPage(0); fetchUsers(0, pageSize, keyword); }
  function handleKeyDown(e: React.KeyboardEvent) { if (e.key === 'Enter') handleSearch(); }
  function handlePageSizeChange(newSize: number) { setPageSize(newSize); setCurrentPage(0); }

  const pageLabel = (t as any).lang === 'id' ? 'Halaman' : 'Page';

  function getPageNumbers(): number[] {
    const total = pageData.totalPages;
    if (total <= 5) return Array.from({ length: total }, (_, i) => i);
    let start = Math.max(0, currentPage - 2);
    let end = start + 5;
    if (end > total) { end = total; start = end - 5; }
    return Array.from({ length: end - start }, (_, i) => start + i);
  }

  function openDetail(user: User) { setSelectedUser(user); setModalMode('detail'); setModalOpen(true); }
  function openEdit(user: User) {
    setSelectedUser(user);
    setFormUsername(user.username); setFormPassword(''); setFormConfirmPassword('');
    setFormFirstName(user.firstName); setFormLastName(user.lastName);
    setFormEmail(user.email); setFormPhone(user.phoneNumber || '');
    setFormAppLang(user.appLang || 'id');
    setFormStatus(user.status || 1);
    setAssignedRoleIds(user.roles?.map(r => r.id) || []);
    setFormError('');
    setModalMode('edit'); setModalOpen(true);
  }
  function openAdd() {
    setSelectedUser(null);
    setFormUsername(''); setFormPassword(''); setFormConfirmPassword('');
    setFormFirstName(''); setFormLastName('');
    setFormEmail(''); setFormPhone(''); setFormAppLang('id'); setFormStatus(1);
    setAssignedRoleIds([]);
    setFormError('');
    setModalMode('add'); setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setModalMode(null); setSelectedUser(null); setFormError(''); }

  function openResetPw(user: User) {
    setSelectedUser(user);
    setResetNewPw(''); setResetConfirmPw('');
    setFormError('');
    setModalMode('resetpw'); setModalOpen(true);
  }

  async function handleResetPw() {
    if (!resetNewPw) { setFormError('Password baru wajib diisi'); return; }
    if (resetNewPw !== resetConfirmPw) { setFormError('Password baru dan konfirmasi tidak sama'); return; }
    try {
      const res = await fetch(`/api/users/${selectedUser?.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ newPassword: resetNewPw, confirmPassword: resetConfirmPw }),
      });
      const json = await res.json();
      if (json.success) { toast.success(resolveMessage(json.message, lang)); closeModal(); }
      else setFormError(json.message || 'Gagal mengubah password');
    } catch (err: any) { setFormError(err.message || 'Error'); }
  }

  // Role assignment toggle
  function toggleRole(roleId: number) {
    setAssignedRoleIds(prev =>
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  }

  async function handleSave() {
    // Validasi password (hanya untuk Add)
    if (modalMode === 'add') {
      if (!formPassword) { setFormError('Password wajib diisi'); return; }
      if (formPassword !== formConfirmPassword) { setFormError('Password dan konfirmasi tidak sama'); return; }
    }
    // Validasi role mandatory
    if (assignedRoleIds.length === 0) { setFormError('Role wajib dipilih minimal satu'); return; }

    let url: string, method: string, body: any;
    if (modalMode === 'add') {
      url = '/api/users';
      method = 'POST';
      body = { username: formUsername, password: formPassword, firstName: formFirstName, lastName: formLastName, email: formEmail, phoneNumber: formPhone, appLang: formAppLang, status: formStatus, roleIds: assignedRoleIds };
    } else {
      url = `/api/users/${selectedUser?.id}`;
      method = 'PUT';
      body = { firstName: formFirstName, lastName: formLastName, email: formEmail, phoneNumber: formPhone, appLang: formAppLang, status: formStatus, roleIds: assignedRoleIds };
    }
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) { toast.success(resolveMessage(json.message, lang)); closeModal(); fetchUsers(currentPage, pageSize, keyword); }
      else setFormError(json.message || 'Gagal menyimpan');
    } catch (err: any) { setFormError(err.message || 'Error'); }
  }

  async function handleDelete(user: User) {
    if (!confirm((t as any).user_delete_confirm)) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
      const json = await res.json();
      if (json.success) { toast.success(resolveMessage(json.message, lang)); fetchUsers(currentPage, pageSize, keyword); }
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
        <h1 className="text-xl font-bold text-slate-800">{(t as any).user_title}</h1>
        <p className="text-sm text-slate-500">{(t as any).user_subtitle}</p>
      </div>

      {/* Search + Add */}
      <div className="flex items-center justify-between mb-4 mt-3">
        <div className="flex items-stretch">
          <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={(t as any).user_search}
            className="px-3 py-1.5 border border-slate-300 border-r-0 rounded-l text-xs focus:outline-none focus:border-slate-400 bg-white w-64 h-8" />
          <button onClick={handleSearch} className="px-2.5 bg-slate-600 hover:bg-slate-700 text-white rounded-r border border-slate-600 flex items-center justify-center h-8">
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition">
          <Plus className="w-3.5 h-3.5" />
          {(t as any).user_add}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide">{(t as any).user_username}</th>
              <th className="text-left py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide">{(t as any).user_fullname}</th>
              <th className="text-left py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide">{(t as any).user_email}</th>
              <th className="text-left py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide">{(t as any).user_phone}</th>
              <th className="text-center py-2.5 px-4 font-semibold text-slate-500 uppercase tracking-wide w-36">{(t as any).user_actions}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-6 text-center text-slate-400 text-xs">{(t as any).user_loading}</td></tr>
            ) : pageData.content.length === 0 ? (
              <tr><td colSpan={5} className="py-6 text-center text-slate-400 text-xs">No data</td></tr>
            ) : (
              pageData.content.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 hover:bg-blue-50/40">
                  <td className="py-2 px-4 text-slate-800">{user.username}</td>
                  <td className="py-2 px-4 text-slate-800">{user.fullName}</td>
                  <td className="py-2 px-4 text-slate-600">{user.email}</td>
                  <td className="py-2 px-4 text-slate-600">{user.phoneNumber}</td>
                  <td className="py-2 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openDetail(user)} className="p-1.5 rounded-full border border-blue-200 text-blue-500 hover:bg-blue-100 transition" title={(t as any).user_detail}>
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openEdit(user)} className="p-1.5 rounded-full border border-amber-200 text-amber-500 hover:bg-amber-100 transition" title={(t as any).user_edit}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(user)} className="p-1.5 rounded-full border border-red-200 text-red-500 hover:bg-red-100 transition" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openResetPw(user)} className="p-1.5 rounded-full border border-purple-200 text-purple-500 hover:bg-purple-100 transition" title="Reset Password">
                        <KeyRound className="w-3.5 h-3.5" />
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
          className="ml-3 px-2.5 py-1 text-xs border border-slate-300 rounded bg-white">
          <option value={5}>5 / {pageLabel}</option>
          <option value={10}>10 / {pageLabel}</option>
          <option value={25}>25 / {pageLabel}</option>
          <option value={50}>50 / {pageLabel}</option>
        </select>
        <span className="ml-3 text-xs text-slate-500">Total {pageData.totalElements} Data</span>
      </div>

      {/* Modal popup */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal}></div>
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-900">
                {modalMode === 'detail' && (t as any).user_detail}
                {modalMode === 'add' && (t as any).user_add}
                {modalMode === 'edit' && (t as any).user_edit}
                {modalMode === 'resetpw' && 'Reset Password'}
              </h2>
              <button onClick={closeModal} className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              {formError && (
                <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">{formError}</div>
              )}

              {modalMode === 'detail' && selectedUser && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-sm text-slate-500">{(t as any).user_username}</label><p className="text-sm text-slate-900 font-medium mt-0.5">{selectedUser.username}</p></div>
                    <div><label className="text-sm text-slate-500">{(t as any).user_fullname}</label><p className="text-sm text-slate-900 mt-0.5">{selectedUser.fullName}</p></div>
                    <div><label className="text-sm text-slate-500">{(t as any).user_email}</label><p className="text-sm text-slate-900 mt-0.5">{selectedUser.email}</p></div>
                    <div><label className="text-sm text-slate-500">{(t as any).user_phone}</label><p className="text-sm text-slate-900 mt-0.5">{selectedUser.phoneNumber || '-'}</p></div>
                    <div><label className="text-sm text-slate-500">{(t as any).lang === 'id' ? 'Bahasa Aplikasi' : 'App Language'}</label><p className="text-sm text-slate-900 mt-0.5">{selectedUser.appLang === 'en' ? '🇬🇧 English' : '🇮🇩 Indonesia'}</p></div>
                    <div><label className="text-sm text-slate-500">Status</label><p className="text-sm mt-0.5">{selectedUser.status === 2 ? <span className="text-red-600 font-medium">Blocked</span> : <span className="text-green-600 font-medium">Active</span>}</p></div>
                  </div>
                  {/* Roles */}
                  <div>
                    <label className="text-xs text-slate-500">Role</label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selectedUser.roles && selectedUser.roles.length > 0 ? (
                        selectedUser.roles.map(r => (
                          <span key={r.id} className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded">{r.roleName}</span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {(modalMode === 'add' || modalMode === 'edit') && (
                <div className="space-y-4">
                  {/* 2 column form */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Left column */}
                    <div className="space-y-3">
                      {modalMode === 'add' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">{(t as any).user_username}</label>
                            <input type="text" value={formUsername} onChange={(e) => setFormUsername(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">{(t as any).user_password}</label>
                            <div className="relative">
                              <input type={showPassword ? 'text' : 'password'} value={formPassword} onChange={(e) => setFormPassword(e.target.value)}
                                className="w-full px-3 py-2 pr-9 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Konfirmasi Password</label>
                            <div className="relative">
                              <input type={showConfirmPassword ? 'text' : 'password'} value={formConfirmPassword} onChange={(e) => setFormConfirmPassword(e.target.value)}
                                className="w-full px-3 py-2 pr-9 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">{(t as any).user_email}</label>
                            <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                          </div>
                        </>
                      )}
                      {modalMode === 'edit' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">{(t as any).user_firstname}</label>
                            <input type="text" value={formFirstName} onChange={(e) => setFormFirstName(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">{(t as any).user_lastname}</label>
                            <input type="text" value={formLastName} onChange={(e) => setFormLastName(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Right column */}
                    <div className="space-y-3">
                      {modalMode === 'add' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">{(t as any).user_firstname}</label>
                            <input type="text" value={formFirstName} onChange={(e) => setFormFirstName(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">{(t as any).user_lastname}</label>
                            <input type="text" value={formLastName} onChange={(e) => setFormLastName(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">{(t as any).user_phone}</label>
                            <input type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">{(t as any).lang === 'id' ? 'Bahasa Aplikasi' : 'App Language'}</label>
                            <select value={formAppLang} onChange={(e) => setFormAppLang(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white">
                              <option value="id">🇮🇩 Indonesia</option>
                              <option value="en">🇬🇧 English</option>
                            </select>
                          </div>
                        </>
                      )}
                      {modalMode === 'edit' && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">{(t as any).user_firstname}</label>
                            <input type="text" value={formFirstName} onChange={(e) => setFormFirstName(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">{(t as any).user_email}</label>
                            <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">{(t as any).user_lastname}</label>
                            <input type="text" value={formLastName} onChange={(e) => setFormLastName(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">{(t as any).user_phone}</label>
                            <input type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">{(t as any).lang === 'id' ? 'Bahasa Aplikasi' : 'App Language'}</label>
                            <select value={formAppLang} onChange={(e) => setFormAppLang(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white">
                              <option value="id">🇮🇩 Indonesia</option>
                              <option value="en">🇬🇧 English</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                            <select value={formStatus} onChange={(e) => setFormStatus(Number(e.target.value))}
                              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white">
                              <option value={1}>Active</option>
                              <option value={2}>Blocked</option>
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Role assignment */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">Assign Role</label>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Available roles (kiri) */}
                      <div className="border border-slate-200 rounded p-2 max-h-32 overflow-y-auto">
                        <p className="text-[10px] text-slate-400 mb-1 uppercase">Semua Role</p>
                        {allRoles.filter(r => !assignedRoleIds.includes(r.id)).map(role => (
                          <button key={role.id} onClick={() => toggleRole(role.id)}
                            className="block w-full text-left px-2 py-1 text-xs text-slate-600 hover:bg-blue-50 rounded transition">
                            + {role.roleName}
                          </button>
                        ))}
                        {allRoles.filter(r => !assignedRoleIds.includes(r.id)).length === 0 && (
                          <p className="text-[10px] text-slate-400 italic">Semua role sudah di-assign</p>
                        )}
                      </div>
                      {/* Assigned roles (kanan) */}
                      <div className="border border-blue-200 bg-blue-50/30 rounded p-2 max-h-32 overflow-y-auto">
                        <p className="text-[10px] text-blue-500 mb-1 uppercase">Role Terpilih</p>
                        {allRoles.filter(r => assignedRoleIds.includes(r.id)).map(role => (
                          <button key={role.id} onClick={() => toggleRole(role.id)}
                            className="block w-full text-left px-2 py-1 text-xs text-blue-700 hover:bg-red-50 hover:text-red-600 rounded transition">
                            ✕ {role.roleName}
                          </button>
                        ))}
                        {assignedRoleIds.length === 0 && (
                          <p className="text-[10px] text-slate-400 italic">Belum ada role</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalMode === 'resetpw' && selectedUser && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500">{(t as any).user_username}</label>
                    <p className="text-sm text-slate-900 font-medium mt-0.5">{selectedUser.username}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">New Password</label>
                    <div className="relative">
                      <input type={showResetPw ? 'text' : 'password'} value={resetNewPw} onChange={(e) => setResetNewPw(e.target.value)}
                        className="w-full px-3 py-2 pr-9 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                      <button type="button" onClick={() => setShowResetPw(!showResetPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showResetPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Confirm New Password</label>
                    <div className="relative">
                      <input type={showResetConfirm ? 'text' : 'password'} value={resetConfirmPw} onChange={(e) => setResetConfirmPw(e.target.value)}
                        className="w-full px-3 py-2 pr-9 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
                      <button type="button" onClick={() => setShowResetConfirm(!showResetConfirm)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showResetConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 flex gap-2">
              {(modalMode === 'add' || modalMode === 'edit') && (
                <>
                  <button onClick={handleSave} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition">{(t as any).user_save}</button>
                  <button onClick={closeModal} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition">{(t as any).user_cancel}</button>
                </>
              )}
              {modalMode === 'resetpw' && (
                <>
                  <button onClick={handleResetPw} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition">{(t as any).user_save}</button>
                  <button onClick={closeModal} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition">{(t as any).user_cancel}</button>
                </>
              )}
              {modalMode === 'detail' && (
                <button onClick={closeModal} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition">{(t as any).user_close}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
