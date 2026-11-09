// Halaman: Change Password (M8.7)

import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useI18n, resolveMessage } from '../i18n';
import { toast } from 'sonner';

export function ChangePassword() {
  const { t, lang } = useI18n();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function getToken() { return localStorage.getItem('auth_token') || ''; }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validasi frontend
    if (!oldPassword) { setError('Password lama wajib diisi'); return; }
    if (!newPassword) { setError('Password baru wajib diisi'); return; }
    if (newPassword === oldPassword) { setError('Password baru tidak boleh sama dengan password lama'); return; }
    if (newPassword !== confirmPassword) { setError('Password baru dan konfirmasi tidak sama'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(resolveMessage(json.message, lang));
        setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      } else {
        setError(json.message || 'Gagal mengubah password');
      }
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  const title = (t as any).lang === 'id' ? 'Ganti Password' : 'Change Password';
  const subtitle = (t as any).lang === 'id' ? 'Ubah password akun Anda' : 'Change your account password';
  const labelOld = (t as any).lang === 'id' ? 'Password Lama' : 'Old Password';
  const labelNew = (t as any).lang === 'id' ? 'Password Baru' : 'New Password';
  const labelConfirm = (t as any).lang === 'id' ? 'Konfirmasi Password Baru' : 'Confirm New Password';
  const btnSave = (t as any).lang === 'id' ? 'Simpan' : 'Save';

  return (
    <div className="px-5 pt-3 pb-5 flex flex-col min-h-full">
      {/* Title */}
      <div className="mb-1">
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      {/* Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md mt-6">
        <form onSubmit={handleSubmit} className="space-y-4 w-full">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">{error}</div>
          )}

          {/* Old Password */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{labelOld}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white"
              />
              <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{labelNew}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{labelConfirm}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium rounded transition"
          >
            {loading ? '...' : btnSave}
          </button>
        </form>
      </div>

    </div>
  );
}
