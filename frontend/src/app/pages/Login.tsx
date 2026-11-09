import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import {
  Lock,
  User,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  Phone,
  Mail,
  Activity,
  Server,
  KeyRound,
  FileCheck2,
  Shield,
  Smartphone,
  CreditCard,
  Layers,
  Cpu,
} from 'lucide-react';
import { useI18n, resolveMessage } from '../i18n';

// Flag SVG components
function IndonesiaFlag() {
  return (
    <svg width="18" height="12" viewBox="0 0 24 16" className="rounded-2xs shrink-0 border border-black/10 shadow-2xs">
      <rect width="24" height="8" fill="#FF0000" />
      <rect y="8" width="24" height="8" fill="#FFFFFF" />
    </svg>
  );
}

function GBFlag() {
  return (
    <svg width="18" height="12" viewBox="0 0 60 30" className="rounded-2xs shrink-0 border border-black/10 shadow-2xs">
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

  // If session expired notice
  useEffect(() => {
    try {
      if (sessionStorage.getItem('session_expired')) {
        sessionStorage.removeItem('session_expired');
        setErrorMsg(
          lang === 'id'
            ? 'Session Anda sudah habis, silakan login kembali'
            : 'Your session has expired, please log in again'
        );
      }
    } catch {}
  }, [lang]);

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
          const msg =
            lang === 'id'
              ? `Password salah, Anda memiliki ${remaining} kali kesempatan lagi`
              : `Wrong password, you have ${remaining} attempts remaining`;
          throw new Error(msg);
        }
        throw new Error(
          resolveMessage(errData?.message || '', lang) ||
            (lang === 'id'
              ? 'Login gagal. Periksa username & password.'
              : 'Login failed. Check username & password.')
        );
      }

      const res = await resp.json();
      if (!res.success) {
        throw new Error(resolveMessage(res.message || '', lang) || 'Login gagal.');
      }

      const token = res.data?.token || '';
      if (!token) throw new Error('Token autentikasi tidak ditemukan.');

      localStorage.setItem('auth_token', token);
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          username: username,
          role: res.data?.role || 'ADMIN',
          name: username.toUpperCase(),
        })
      );

      // Fetch user profile
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
      } catch (e) {
        /* keep seeded auth_user */
      }

      // Decode JWT payload for appLang
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.appLang) {
          const jwtLang = payload.appLang.toLowerCase() as 'id' | 'en';
          setLang(jwtLang);
        }
      } catch (e) {}

      // Fetch user menu permissions
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
      setErrorMsg(
        err.message ||
          (lang === 'id'
            ? 'Gagal terhubung ke server auth-service.'
            : 'Failed to connect to auth-service server.')
      );
    } finally {
      setIsLoading(false);
    }
  }

  const isId = lang === 'id';

  return (
    <div className="min-h-screen bg-[#F4F8FA] text-[#0F172A] flex flex-col justify-between font-sans selection:bg-[#028DAA]/20 selection:text-[#028DAA]">
      
      {/* Top Academic/Institutional Header (Deep Ocean Navy #1E4B75) */}
      <header className="bg-[#1E4B75] text-white shadow-md border-b border-[#163B5E] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Left: Brand Emblem & Title */}
          <div className="flex items-center gap-3">
            <div className="bg-white px-2.5 py-1 rounded-lg shadow-sm flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-[#1E4B75]" />
              <div className="flex items-center gap-1 pl-1.5 text-[#1E4B75] font-black text-xs tracking-tight">
                <span>FRAUD</span>
                <span className="text-[#028DAA]">DETECTION</span>
              </div>
            </div>

            <div className="hidden sm:block border-l border-white/20 pl-3">
              <div className="text-xs font-black tracking-wide text-white uppercase flex items-center gap-2">
                <span>FRAUD DETECTION SYSTEM</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#028DAA] text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                  LIVE v1.0
                </span>
              </div>
              <div className="text-[10px] text-cyan-100 font-medium tracking-normal">
                {isId
                  ? 'Sistem Manajemen Risiko & Deteksi Fraud Perbankan • Standar BI & OJK'
                  : 'Banking Risk Management & Fraud Detection System • BI & OJK Standard'}
              </div>
            </div>
          </div>

          {/* Right: Quick Help & Language Switcher */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4 text-xs text-cyan-100/90 font-medium pr-3 border-r border-white/20">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>
                  {isId ? 'Hotline Fraud' : 'Helpdesk'}: <strong className="text-white">(021) 1500-888</strong>
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>fraud-ops@bank.co.id</span>
              </span>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm p-1 rounded-lg border border-white/20">
              <button
                type="button"
                onClick={() => setLang('id')}
                className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] font-bold transition-all ${
                  isId
                    ? 'bg-white text-[#1E4B75] shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
                title="Bahasa Indonesia"
              >
                <IndonesiaFlag />
                <span>ID</span>
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] font-bold transition-all ${
                  !isId
                    ? 'bg-white text-[#1E4B75] shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
                title="English (UK)"
              >
                <GBFlag />
                <span>EN</span>
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Main Body: Fresh Split Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column (7 cols): Information, Monitored Channels & Security Standards */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* System Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E0F2FE] border border-[#BAE6FD] text-[#0369A1] text-xs font-bold shadow-2xs">
              <ShieldAlert className="w-4 h-4 text-[#028DAA]" />
              <span>
                {isId
                  ? 'Banking Fraud Management & Early Warning System'
                  : 'Banking Fraud Management & Early Warning System'}
              </span>
            </div>

            {/* Main Title & Subtitle */}
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold text-[#0F172A] tracking-tight leading-tight">
                {isId ? 'Portal Monitoring & Deteksi ' : 'Monitoring & Detection Portal '}
                <span className="text-[#1E4B75] border-b-4 border-[#028DAA]">
                  Fraud Detection
                </span>
              </h1>
              <p className="mt-4 text-sm sm:text-base text-[#475569] leading-relaxed max-w-xl font-normal">
                {isId
                  ? 'Platform intelijen transaksi perbankan terintegrasi berbasis Machine Learning & Rule Engine untuk deteksi anomali real-time, mitigasi risiko kejahatan finansial, dan investigasi fraud komprehensif.'
                  : 'Integrated banking transaction intelligence platform powered by Machine Learning & Rule Engine for real-time anomaly detection, financial crime mitigation, and comprehensive fraud investigation.'}
              </p>
            </div>

            {/* 4 Monitored Channels Live Grid */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-3 max-w-xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1E4B75] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#028DAA]" />
                  {isId
                    ? 'Status Monitoring Channel Transaksi (Real-time)'
                    : 'Transaction Channel Monitoring Status (Real-time)'}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {isId ? '4 Channel Aktif' : '4 Channels Active'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Channel 1: ATM & EDC */}
                <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:border-[#028DAA]/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0F172A]">ATM &amp; EDC Channel</span>
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Online</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {isId ? 'Kartu Debit & Merchant POS' : 'Debit Card & POS Merchant'}
                  </div>
                  <div className="text-[10px] text-[#028DAA] font-medium mt-0.5">
                    {isId ? 'Skimming & Card Cloned Alert' : 'Skimming & Card Cloned Alert'}
                  </div>
                </div>

                {/* Channel 2: Mobile & Internet Banking */}
                <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:border-[#028DAA]/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0F172A]">Mobile &amp; Web Banking</span>
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Online</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {isId ? 'Aplikasi Mobile & Internet Banking' : 'Mobile App & Internet Banking'}
                  </div>
                  <div className="text-[10px] text-[#028DAA] font-medium mt-0.5">
                    {isId ? 'Deteksi ATO & Anomali Device' : 'ATO & Device Anomaly Detection'}
                  </div>
                </div>

                {/* Channel 3: BI-FAST & RTGS */}
                <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:border-[#028DAA]/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0F172A]">BI-FAST &amp; RTGS</span>
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Online</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {isId ? 'Transfer Antar Bank & Kliring' : 'Interbank Transfer & Clearing'}
                  </div>
                  <div className="text-[10px] text-[#028DAA] font-medium mt-0.5">
                    {isId ? 'AML & Suspicious Flow Alert' : 'AML & Suspicious Flow Alert'}
                  </div>
                </div>

                {/* Channel 4: ML Scoring Engine */}
                <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:border-[#028DAA]/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0F172A]">ML Scoring Engine</span>
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Online</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {isId ? 'AI Anomaly & Risk Index' : 'AI Anomaly & Risk Index'}
                  </div>
                  <div className="text-[10px] text-[#028DAA] font-medium mt-0.5">
                    {isId ? 'Analisis Risiko Sub-Detik' : 'Sub-second Risk Scoring'}
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Core Security & Compliance Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl pt-1">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <ShieldCheck className="w-5 h-5 text-[#028DAA] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-[#0F172A]">
                    {isId ? 'Standar OJK & BI' : 'OJK & BI Standards'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {isId ? 'Kepatuhan Regulasi APU-PPT' : 'AML/CFT & Cyber Compliance'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <KeyRound className="w-5 h-5 text-[#1E4B75] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-[#0F172A]">
                    {isId ? 'Keamanan RSA-256' : 'RSA-256 Security'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {isId ? 'Asymmetric Token & HMAC' : 'Asymmetric Token & HMAC'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <FileCheck2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-[#0F172A]">
                    {isId ? 'Deteksi Perilaku AI' : 'Behavioral AI'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {isId ? 'Early Warning Profiling' : 'Early Warning Profiling'}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column (5 cols): Focused & Dignified Login Card */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden relative">
              
              {/* Card Top Border Accent */}
              <div className="h-1.5 w-full bg-gradient-to-r from-[#1E4B75] via-[#028DAA] to-[#38BDF8]"></div>

              <div className="p-8 sm:p-10 space-y-6">
                
                {/* Form Header */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#1E4B75] to-[#028DAA] text-white flex items-center justify-center font-bold shadow-md shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">
                      {isId ? 'Masuk ke Sistem' : 'Sign In to System'}
                    </h2>
                    <p className="text-xs text-[#64748B] mt-0.5 font-medium">
                      {isId
                        ? 'Gunakan akun petugas atau analis Fraud Detection'
                        : 'Use your Fraud Detection officer or analyst account'}
                    </p>
                  </div>
                </div>

                {/* Error Alert Box */}
                {errorMsg && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 shadow-2xs animate-in fade-in">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                    <span className="font-medium leading-relaxed">{errorMsg}</span>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-4">
                  
                  {/* Username Field */}
                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                      {isId ? 'Username / NIP / ID Petugas' : 'Username / Staff ID'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={
                          isId
                            ? 'Masukkan username Anda (misal: admin)'
                            : 'Enter your username (e.g. admin)'
                        }
                        className="w-full pl-10 pr-4 py-3 text-xs bg-slate-50/80 rounded-xl border border-slate-200 text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-[#1E4B75] focus:ring-4 focus:ring-[#1E4B75]/10 focus:bg-white transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-[#0F172A]">
                        {isId ? 'Kata Sandi (Password)' : 'Password'}
                      </label>
                      <span className="text-[11px] text-[#028DAA] hover:underline cursor-pointer">
                        {isId ? 'Lupa kata sandi?' : 'Forgot password?'}
                      </span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={
                          isId ? 'Masukkan kata sandi Anda' : 'Enter your password'
                        }
                        className="w-full pl-10 pr-11 py-3 text-xs bg-slate-50/80 rounded-xl border border-slate-200 text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-[#1E4B75] focus:ring-4 focus:ring-[#1E4B75]/10 focus:bg-white transition-all font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-[#1E4B75] transition"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-3.5 px-5 rounded-xl bg-[#1E4B75] hover:bg-[#163B5E] text-white text-xs font-bold shadow-md shadow-[#1E4B75]/25 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span>{isId ? 'Memverifikasi Akun...' : 'Verifying Account...'}</span>
                      </span>
                    ) : (
                      <>
                        <span>{isId ? 'Masuk ke Dashboard' : 'Sign In to Dashboard'}</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-[#38BDF8]" />
                      </>
                    )}
                  </button>

                </form>

                {/* Security Assurance */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{isId ? 'Enkripsi TLS 1.3 & Asimetris' : 'TLS 1.3 & Asymmetric Encrypted'}</span>
                  </span>
                  <span>{isId ? 'Hak Akses Terproteksi RBAC' : 'RBAC Protected Access'}</span>
                </div>

              </div>

              {/* Card Footer Helpdesk */}
              <div className="bg-slate-50 px-8 py-3.5 border-t border-slate-100 text-center text-[11px] text-slate-500">
                {isId ? 'Butuh bantuan akses? Hubungi Tim Fraud Ops di ' : 'Need access assistance? Contact Fraud Ops at '}
                <a href="mailto:fraud-ops@bank.co.id" className="font-semibold text-[#028DAA] hover:underline">
                  fraud-ops@bank.co.id
                </a>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Institutional Global Footer */}
      <footer className="bg-white border-t border-slate-200 py-5 text-[11px] text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1E4B75]">
              {isId ? 'Banking Fraud Detection System' : 'Banking Fraud Detection System'}
            </span>
            <span className="text-slate-300">•</span>
            <span>
              {isId
                ? 'Divisi Operasional & Manajemen Risiko Kejahatan Finansial'
                : 'Financial Crime & Risk Management Operations Division'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <span>
              {isId ? 'Standar Manajemen Risiko Siber Perbankan' : 'Banking Cyber Risk Management Standard'}
            </span>
            <span className="text-slate-300">•</span>
            <span>
              {isId ? 'Terintegrasi Regulasi OJK & BI' : 'OJK & Bank Indonesia Compliant'}
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
