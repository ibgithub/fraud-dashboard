import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import {
  Lock,
  User,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Activity,
  ArrowLeftRight,
  Database,
  Layers,
  CheckCircle2,
  Phone,
  MessageSquare,
  Shield,
  Server,
} from 'lucide-react';
import { useI18n, resolveMessage } from '../i18n';
import { AnvAILogo } from '../components/AnvAILogo';

// Flag SVG components
function IndonesiaFlag() {
  return (
    <svg width="20" height="14" viewBox="0 0 24 16" className="rounded-2xs shrink-0 border border-black/10 shadow-2xs">
      <rect width="24" height="8" fill="#FF0000" />
      <rect y="8" width="24" height="8" fill="#FFFFFF" />
    </svg>
  );
}

function GBFlag() {
  return (
    <svg width="20" height="14" viewBox="0 0 60 30" className="rounded-2xs shrink-0 border border-black/10 shadow-2xs">
      <clipPath id="gb-flag-clip"><rect width="60" height="30"/></clipPath>
      <g clipPath="url(#gb-flag-clip)">
        <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/>
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
      </g>
    </svg>
  );
}

export function Login() {
  const navigate = useNavigate();
  const { lang, t, setLang } = useI18n();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If the user was redirected here because their session expired, show a notice.
  useEffect(() => {
    try {
      if (sessionStorage.getItem('session_expired')) {
        sessionStorage.removeItem('session_expired');
        setErrorMsg(lang === 'id'
          ? 'Session Anda sudah habis, silakan login kembali'
          : 'Your session has expired, please log in again');
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Type helper for dynamic translation keys
  const tr = t as any;

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      // Step 1: Login API
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => null);
        if (errData?.data?.remainingAttempts !== undefined) {
          const remaining = errData.data.remainingAttempts;
          const msg = lang === 'id'
            ? `Password Anda salah, Anda punya ${remaining} kali kesempatan lagi`
            : `Wrong password, you have ${remaining} attempts remaining`;
          throw new Error(msg);
        }
        throw new Error(resolveMessage(errData?.message || '', lang) || (lang === 'id' ? 'Login gagal. Periksa username & password.' : 'Login failed. Check username & password.'));
      }

      const res = await resp.json();
      if (!res.success) {
        throw new Error(resolveMessage(res.message || '', lang) || 'Login gagal.');
      }

      const token = res.data?.token || '';
      if (!token) throw new Error('Token autentikasi tidak ditemukan.');

      localStorage.setItem('auth_token', token);
      // Seed auth_user with the username; first/last name are filled in below
      // from the profile endpoint so the header can show the real name.
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          username: username,
          role: res.data?.role || 'ADMIN',
          name: username.toUpperCase(),
        })
      );

      // Fetch the current user's profile to get first/last name for the header.
      try {
        const meRes = await fetch('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meRes.ok) {
          const meBody = await meRes.json();
          const u = meBody?.data;
          if (u) {
            localStorage.setItem(
              'auth_user',
              JSON.stringify({
                username: u.username || username,
                role: res.data?.role || 'ADMIN',
                firstName: u.firstName || '',
                lastName: u.lastName || '',
                fullName: u.fullName || '',
                name: username.toUpperCase(),
              })
            );
          }
        }
      } catch (e) { /* keep the seeded auth_user on failure */ }

      // Decode JWT payload for appLang
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.appLang) {
          const jwtLang = payload.appLang.toLowerCase() as 'id' | 'en';
          setLang(jwtLang);
        }
      } catch (e) {}

      // Step 2: Fetch menu permissions
      const menuRes = await fetch('/api/users/me/menus', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (menuRes.ok) {
        const menuData = await menuRes.json();
        const menus = menuData.data || [];
        localStorage.setItem('auth_menus', JSON.stringify(menus));
      }

      navigate('/', { replace: true });
    } catch (err: any) {
      setErrorMsg(err.message || (lang === 'id' ? 'Gagal terhubung ke server auth-service.' : 'Failed to connect to auth-service server.'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#2A2018] flex flex-col justify-between font-sans selection:bg-[#6B4E2E]/20 selection:text-[#6B4E2E] relative overflow-hidden">
      {/* Dynamic Ambient Background Accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#6B4E2E]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-[#3FB4C0]/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Corporate Utility Bar (Matches Bank Artha Graha official website header style) */}
      <div className="w-full bg-white/80 backdrop-blur-md border-b border-[#E2D8C9] px-4 sm:px-8 py-2 text-[11px] text-[#7A6A55] z-30 flex items-center justify-between">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="hidden md:flex items-center gap-6">
            <span className="flex items-center gap-1.5 hover:text-[#3D2C18] transition-colors cursor-pointer font-medium">
              <Phone className="w-3.5 h-3.5 text-[#3FB4C0]" />
              <span>GrahaCall: <strong className="text-[#3D2C18]">0-800-191-888-0</strong></span>
            </span>
            <span className="flex items-center gap-1.5 hover:text-[#3D2C18] transition-colors cursor-pointer font-medium">
              <MessageSquare className="w-3.5 h-3.5 text-[#3FB4C0]" />
              <span>GrahaChat: <strong className="text-[#3D2C18]">0-811-191-888-80</strong></span>
            </span>
            <span className="flex items-center gap-1.5 hover:text-[#3D2C18] transition-colors cursor-pointer font-medium">
              <Shield className="w-3.5 h-3.5 text-[#6B4E2E]" />
              <span>E-Graha Corporate Banking</span>
            </span>
          </div>

          <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4">
            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-lg border border-[#E2D8C9]">
              <button
                type="button"
                onClick={() => setLang('id')}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 text-[11px] font-bold transition-all ${
                  lang === 'id'
                    ? 'bg-[#3D2C18] text-white shadow-xs'
                    : 'text-[#7A6A55] hover:text-[#3D2C18] hover:bg-white'
                }`}
                title="Bahasa Indonesia"
              >
                <IndonesiaFlag />
                <span>ID</span>
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 text-[11px] font-bold transition-all ${
                  lang === 'en'
                    ? 'bg-[#3D2C18] text-white shadow-xs'
                    : 'text-[#7A6A55] hover:text-[#3D2C18] hover:bg-white'
                }`}
                title="English (UK)"
              >
                <GBFlag />
                <span>EN</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Brand Header Navigation */}
      <header className="w-full bg-white/90 backdrop-blur-xl border-b border-[#E2D8C9] px-4 sm:px-8 py-3.5 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <AnvAILogo size="md" theme="light" />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center relative z-10">
        <div className="w-full bg-white rounded-3xl border border-[#E2D8C9] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
          
          {/* Left Panel: Corporate Dark Brown Executive AI Showcase (Matches Dashboard Sidebar #3D2C18) */}
          <div className="lg:col-span-7 bg-gradient-to-br from-[#3D2C18] via-[#2E2011] to-[#24190D] p-8 sm:p-12 text-white flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-[#5A4327]">
            
            {/* Ambient Background Accents inside left panel */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#C9A24B]/15 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#3FB4C0]/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 space-y-7">
              {/* Badge & agi Brand Integration */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-white shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-[#E0B458]" />
                  <span className="text-[#E0B458] font-bold">agi</span>
                  <span className="text-white/40">|</span>
                  <span>{tr.login_hero_badge || 'Bank Artha Graha Analytics Portal'}</span>
                </div>
              </div>

              {/* Title & Subtitle */}
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-[2.5rem] font-black tracking-tight leading-tight text-white">
                  {tr.login_hero_title || 'AnvAIa Analytics'} <br />
                  <span className="bg-gradient-to-r from-[#E0B458] via-[#F3D78A] to-[#4CC3CE] bg-clip-text text-transparent">
                    {tr.login_hero_title_highlight || 'Machine Learning Portal'}
                  </span>
                </h1>
                <p className="mt-3 text-sm text-[#E2D8C9]/90 max-w-xl leading-relaxed font-normal">
                  {tr.login_hero_desc || 'Portal analitik kecerdasan portofolio nasabah berbasis Machine Learning & AI untuk Customer Segmentation, prediksi churn, dan rekomendasi personalisasi.'}
                </p>
              </div>

              {/* Glassmorphic Pipeline Flow Card */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl max-w-xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#E0B458] to-[#4CC3CE]"></div>
                
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="text-xs font-bold tracking-wider uppercase text-[#E0B458] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#E0B458]" />
                    <span>{tr.login_pipeline_title || 'ALUR ANALISIS PORTOFOLIO'}</span>
                  </div>
                  <span className="text-[10px] text-[#4CC3CE] font-mono bg-[#4CC3CE]/10 border border-[#4CC3CE]/30 px-2.5 py-0.5 rounded-full font-semibold">
                    {tr.login_pipeline_tag || 'Real-time Pipeline'}
                  </span>
                </div>

                {/* Pipeline Flow Steps */}
                <div className="mt-4 grid grid-cols-3 gap-2.5 text-center relative">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                    <Server className="w-5 h-5 text-white/70 mx-auto mb-1.5" />
                    <div className="text-xs font-bold text-white">{tr.login_step_data || 'Data Core'}</div>
                    <div className="text-[10px] text-white/60 mt-0.5">{tr.login_step_data_sub || 'Transaksi Nasabah'}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                    <ArrowLeftRight className="w-5 h-5 text-white/70 mx-auto mb-1.5" />
                    <div className="text-xs font-bold text-white">{tr.login_step_engine || 'ML Engine'}</div>
                    <div className="text-[10px] text-white/60 mt-0.5">{tr.login_step_engine_sub || 'Profiling & AI'}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-gradient-to-br from-[#8A6534] to-[#5C4321] border border-[#C9A24B]/40 text-white shadow-lg shadow-black/20 relative">
                    <div className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E0B458] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#E0B458]"></span>
                    </div>
                    <Database className="w-5 h-5 text-[#E0B458] mx-auto mb-1.5" />
                    <div className="text-xs font-bold text-white">{tr.login_step_web || 'Analytics Web'}</div>
                    <div className="text-[10px] text-amber-100/90 mt-0.5">{tr.login_step_web_sub || 'Dashboard Executive'}</div>
                  </div>
                </div>
              </div>

              {/* 3 Core Value Pillars Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#E0B458]/40 transition-all">
                  <CheckCircle2 className="w-4 h-4 text-[#E0B458] mb-2" />
                  <div className="text-xs font-bold text-white">{tr.login_pillar_churn || 'Prediksi Churn'}</div>
                  <p className="text-[11px] text-white/60 mt-0.5">{tr.login_pillar_churn_sub || 'Skor Churn Index 0–100'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#4CC3CE]/40 transition-all">
                  <ShieldCheck className="w-4 h-4 text-[#4CC3CE] mb-2" />
                  <div className="text-xs font-bold text-white">{tr.login_pillar_segment || 'Customer Segmentation'}</div>
                  <p className="text-[11px] text-white/60 mt-0.5">{tr.login_pillar_segment_sub || 'Pengelompokan Persona'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#E0B458]/40 transition-all">
                  <Layers className="w-4 h-4 text-[#E0B458] mb-2" />
                  <div className="text-xs font-bold text-white">{tr.login_pillar_priority || 'Matriks Prioritas'}</div>
                  <p className="text-[11px] text-white/60 mt-0.5">{tr.login_pillar_priority_sub || '9 Kluster Hot Target'}</p>
                </div>
              </div>
            </div>

            {/* Left Panel Security Footer */}
            <div className="relative z-10 pt-6 mt-6 border-t border-white/10 flex items-center justify-end text-[11px] text-white/60">
              <span className="font-semibold text-white/80">PT Bank Artha Graha Internasional</span>
            </div>
          </div>

          {/* Right Panel: Login Form */}
          <div className="lg:col-span-5 p-8 sm:p-12 flex flex-col justify-between bg-white text-[#2A2018]">
            <div>
              {/* Form Title & agi Digital Tag */}
              <div className="mb-8">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3D2C18]/10 text-[#5C4321] text-[11px] font-bold uppercase tracking-wider mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-[#8A6534]" />
                  <span>{tr.login_portal_badge || 'PORTAL MASUK PETUGAS'}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#2A2018] tracking-tight">
                  {tr.login_portal_title || (lang === 'id' ? 'Halaman Login' : 'Login Page')}
                </h2>
                <p className="text-xs text-[#7A6A55] mt-1.5 leading-relaxed font-normal">
                  {tr.login_portal_desc || 'Masuk menggunakan akun terdaftar untuk mengelola analitik Machine Learning.'}
                </p>
              </div>

              {/* Error Message Alert Box */}
              {errorMsg && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-3 shadow-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
                  <span className="font-medium leading-relaxed">{errorMsg}</span>
                </div>
              )}

              {/* Form Controls */}
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-[#2A2018] mb-2">
                    {tr.login_username || 'Username'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7A6A55]">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={tr.login_placeholder_username || 'Masukkan username Anda'}
                      className="w-full pl-10 pr-4 py-3 text-xs bg-[#FAF7F2] rounded-xl border border-[#E2D8C9] text-[#2A2018] placeholder:text-[#7A6A55]/60 focus:outline-none focus:border-[#6B4E2E] focus:ring-4 focus:ring-[#6B4E2E]/15 focus:bg-white transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2A2018] mb-2">
                    {tr.login_password || 'Password'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7A6A55]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={tr.login_placeholder_password || 'Masukkan password Anda'}
                      className="w-full pl-10 pr-11 py-3 text-xs bg-[#FAF7F2] rounded-xl border border-[#E2D8C9] text-[#2A2018] placeholder:text-[#7A6A55]/60 focus:outline-none focus:border-[#6B4E2E] focus:ring-4 focus:ring-[#6B4E2E]/15 focus:bg-white transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#7A6A55] hover:text-[#3D2C18] transition"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Primary Action Button (BAG Corporate Dark Brown & Gold Palette) */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full group mt-3 py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#3D2C18] via-[#5C4321] to-[#3D2C18] hover:from-[#4E3820] hover:to-[#4E3820] text-white text-xs font-bold shadow-lg shadow-[#3D2C18]/25 hover:shadow-xl hover:shadow-[#3D2C18]/35 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {tr.login_verifying || 'Memverifikasi Akun...'}
                    </span>
                  ) : (
                    <>
                      <span>{tr.login_submit_button || 'Masuk ke Dashboard'}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-[#E0B458]" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Help & Support Section */}
            <div className="text-center text-[11px] text-[#7A6A55] pt-6 border-t border-[#E2D8C9] mt-8 space-y-1">
              <div>
                {tr.login_help_text || 'Butuh bantuan teknis? Hubungi'} <a href="mailto:it-support@arthagraha.com" className="font-semibold text-[#6B4E2E] hover:underline">it-support@arthagraha.com</a>
              </div>
              <div className="text-[10px] text-[#7A6A55]/80">
                GrahaCall 24 Jam: <strong>0-800-191-888-0</strong>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Corporate Page Bottom Footer */}
      <footer className="w-full text-center py-3.5 text-[11px] text-[#7A6A55] border-t border-[#E2D8C9] bg-white/80 backdrop-blur-md relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{tr.login_footer_text || 'PT Bank Artha Graha Internasional — Kantor Pusat Gedung Artha Graha, SCBD, Jl. Jend. Sudirman Kav. 52-53, Jakarta'}</span>
          <span className="text-[10px] text-[#7A6A55]">{lang === 'id' ? 'Terdaftar dan diawasi oleh OJK & Bank Indonesia' : 'Licensed and supervised by OJK & Bank Indonesia'}</span>
        </div>
      </footer>
    </div>
  );
}
