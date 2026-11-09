// Halaman: Edit Profile (edit profil user yang sedang login)
// Endpoint: GET /api/users/{id}, PUT /api/users/{id}

import { useState, useEffect } from 'react';
import { useI18n, resolveMessage } from '../i18n';
import { toast } from 'sonner';

export function EditProfile() {
  const { t, lang, setLang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [appLang, setAppLang] = useState('id');

  function getToken() { return localStorage.getItem('auth_token') || ''; }

  // Decode userId from JWT — no longer needed, using /me endpoint
  async function fetchProfile() {
    try {
      const res = await fetch('/api/users/me', { headers: { 'Authorization': `Bearer ${getToken()}` } });
      const json = await res.json();
      if (json.success) {
        const u = json.data;
        setFirstName(u.firstName || '');
        setLastName(u.lastName || '');
        setEmail(u.email || '');
        setPhone(u.phoneNumber || '');
        setAppLang(u.appLang || 'id');
      } else setError(json.message || 'Error');
    } catch (err: any) { setError(err.message || 'Error'); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchProfile(); }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ firstName, lastName, email, phoneNumber: phone, appLang }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(resolveMessage(json.message, lang));
        // Update bahasa UI sesuai pilihan
        setLang(appLang as 'id' | 'en');
      } else toast.error(resolveMessage(json.message, lang));
    } catch (err: any) { toast.error(err.message || 'Error'); }
    finally { setSaving(false); }
  }

  const title = (t as any).lang === 'id' ? 'Edit Profil' : 'Edit Profile';
  const subtitle = (t as any).lang === 'id' ? 'Ubah informasi profil Anda' : 'Update your profile information';
  const btnSave = (t as any).lang === 'id' ? 'Simpan' : 'Save';
  const labelFirstName = (t as any).lang === 'id' ? 'Nama Depan' : 'First Name';
  const labelLastName = (t as any).lang === 'id' ? 'Nama Belakang' : 'Last Name';
  const labelEmail = 'Email';
  const labelPhone = (t as any).lang === 'id' ? 'No. Telepon' : 'Phone Number';
  const labelLang = (t as any).lang === 'id' ? 'Bahasa Aplikasi' : 'App Language';

  if (loading) {
    return <div className="p-5 text-center text-slate-400 text-sm">Loading...</div>;
  }

  if (error) {
    return <div className="p-5"><div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-xs">{error}</div></div>;
  }

  return (
    <div className="px-5 pt-3 pb-5 flex flex-col min-h-full">
      {/* Title */}
      <div className="mb-1">
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      {/* Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-lg mt-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">{labelFirstName}</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">{labelLastName}</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">{labelEmail}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">{labelPhone}</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" />
            </div>
          </div>
          <div className="max-w-xs">
            <label className="block text-xs font-medium text-slate-700 mb-1">{labelLang}</label>
            <select value={appLang} onChange={(e) => setAppLang(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white">
              <option value="id">🇮🇩 Indonesia</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium rounded transition"
          >
            {saving ? '...' : btnSave}
          </button>
        </div>
      </div>

    </div>
  );
}
