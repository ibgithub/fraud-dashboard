import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { Wallet, TrendingUp, Users, Building2, Loader2 } from 'lucide-react';

interface BranchAum {
  branch: string;
  customers: number;
  totalAum: number;
}

interface OverviewData {
  totalCustomers: number;
  totalAum: number;
  avgAum: number;
  maxAum: number;
  minAum: number;
  highCount: number;
  medCount: number;
  lowCount: number;
  branchDistribution: BranchAum[];
}

// Format an IDR amount with a scale suffix that follows the UI language.
//   ID:  "Rp"  + T (triliun) / M (milyar) / Jt (juta)
//   EN:  "IDR" + T (trillion) / B (billion) / M (million)
// Note the ID→EN scale-letter shift: Milyar(10^9) → B, Juta(10^6) → M.
function formatRp(v: number, isEn: boolean): string {
  const cur = isEn ? 'IDR' : 'Rp';
  const locale = isEn ? 'en-US' : 'id-ID';
  if (v >= 1_000_000_000_000) return `${cur} ${(v / 1_000_000_000_000).toFixed(2)} T`;
  if (v >= 1_000_000_000) return `${cur} ${(v / 1_000_000_000).toFixed(2)} ${isEn ? 'B' : 'M'}`;
  if (v >= 1_000_000) return `${cur} ${(v / 1_000_000).toFixed(2)} ${isEn ? 'M' : 'Jt'}`;
  return `${cur} ${Math.round(v).toLocaleString(locale)}`;
}

export function AumOverview() {
  const { lang } = useI18n();
  const isEn = lang === 'en';
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

        // Read the configured TRB tier distribution "Hi|Med|Lo" (default 20|30|50).
        let hiPct = 20, medPct = 30;
        try {
          const settingRes = await fetch('/api/settings/by-name/TRB_TIER_DISTRIBUTION', { headers: authHeaders });
          if (settingRes.ok) {
            const sb = await settingRes.json();
            const val: string | undefined = sb?.data?.value;
            if (val) {
              const parts = val.split('|').map((x: string) => parseFloat(x.trim()));
              if (parts.length === 3 && parts.every((n: number) => !isNaN(n))) {
                hiPct = parts[0];
                medPct = parts[1];
              }
            }
          }
        } catch { /* fall back to defaults */ }

        const res = await fetch(`/api/v1/executive/aum/overview?hiPct=${Math.round(hiPct)}&medPct=${Math.round(medPct)}`, {
          headers: authHeaders,
        });
        if (res.ok) {
          const body = await res.json();
          if (body.success && body.data) setData(body.data);
        }
      } catch (err) {
        console.error('Failed to fetch TRB overview:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalCustomers = data?.totalCustomers ?? 0;
  const totalAum = data?.totalAum ?? 0;
  const avgAum = data?.avgAum ?? 0;
  const highCount = data?.highCount ?? 0;
  const medCount = data?.medCount ?? 0;
  const lowCount = data?.lowCount ?? 0;
  const tierTotal = highCount + medCount + lowCount;
  const pct = (n: number) => (tierTotal > 0 ? ((n / tierTotal) * 100).toFixed(1) : '0');

  return (
    <div className="px-6 pt-3 pb-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            TRB (Total Relationship Balance) Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Total Relationship Balance distribution across customers &amp; branches.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 text-[#6B4E2E] animate-spin" />}
        </div>
      </div>

      {/* KPI Cards — Churn Overview style (white, left color border) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Customers */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 border-l-4 border-l-[#6B4E2E] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              {isEn ? 'TOTAL CUSTOMERS' : 'TOTAL NASABAH'}
            </p>
            <Users className="w-4 h-4 text-[#6B4E2E]" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalCustomers.toLocaleString('id-ID')}</p>
          <p className="text-xs text-slate-400 mt-1">
            {isEn ? 'Customers with TRB' : 'Nasabah dengan TRB'}
          </p>
        </div>

        {/* Total AUM */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 border-l-4 border-l-emerald-500 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              {isEn ? 'TOTAL TRB' : 'TOTAL TRB'}
            </p>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">{formatRp(totalAum, isEn)}</p>
          <p className="text-xs text-slate-400 mt-1">
            {isEn ? 'Total relationship balance' : 'Total saldo relasi nasabah'}
          </p>
        </div>

        {/* Average AUM */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 border-l-4 border-l-blue-500 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              {isEn ? 'AVERAGE TRB' : 'RATA-RATA TRB'}
            </p>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600">{formatRp(avgAum, isEn)}</p>
          <p className="text-xs text-slate-400 mt-1">
            {isEn ? 'Average per customer' : 'Rata-rata per nasabah'}
          </p>
        </div>
      </div>

      {/* AUM Tier Summary Cards — Churn Overview style, Low → Med → High */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            key: 'Low',
            name: isEn ? 'Low TRB Tier (Bottom 50%)' : 'Tier TRB Rendah (50%)',
            count: lowCount, color: '#10B981', borderColor: 'border-emerald-200',
            strategy: isEn
              ? 'Basic engagement & savings growth programs'
              : 'Engagement dasar & program pertumbuhan tabungan',
          },
          {
            key: 'Medium',
            name: isEn ? 'Medium TRB Tier (30%)' : 'Tier TRB Sedang (30%)',
            count: medCount, color: '#F59E0B', borderColor: 'border-amber-200',
            strategy: isEn
              ? 'Cross-sell investment & upgrade offers'
              : 'Cross-sell investasi & penawaran upgrade',
          },
          {
            key: 'High',
            name: isEn ? 'High TRB Tier (Top 20%)' : 'Tier TRB Tinggi (Top 20%)',
            count: highCount, color: '#4F46E5', borderColor: 'border-slate-200',
            strategy: isEn
              ? 'Priority banking & dedicated RM service'
              : 'Priority banking & layanan RM khusus',
          },
        ].map((item) => (
          <div key={item.key} className={`p-5 rounded-xl border ${item.borderColor} bg-white text-slate-800`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">{item.name}</span>
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-extrabold text-slate-900">{item.count.toLocaleString('id-ID')}</span>
              <span className="text-sm font-bold text-slate-500">
                {pct(item.count)}% {isEn ? 'portfolio' : 'portofolio'}
              </span>
            </div>
            <p className="text-xs mt-3 leading-relaxed text-slate-500">
              <strong className="text-slate-700">{isEn ? 'Strategy: ' : 'Strategi: '}</strong>
              {item.strategy}
            </p>
          </div>
        ))}
      </div>

      {/* Branch distribution table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-slate-200">
          <Building2 className="w-4 h-4 text-[#8A6534]" />
          <h3 className="text-sm font-bold text-slate-800">{isEn ? 'Top Branches by TRB' : 'Cabang Teratas berdasarkan TRB'}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase">{isEn ? 'Branch' : 'Cabang'}</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase text-right">{isEn ? 'Customers' : 'Nasabah'}</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase text-right">Total TRB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(!data || (data.branchDistribution || []).length === 0) && (
                <tr><td colSpan={3} className="text-center py-8 text-slate-400 italic text-xs">
                  {loading ? (isEn ? 'Loading...' : 'Memuat...') : (isEn ? 'No data' : 'Tidak ada data')}
                </td></tr>
              )}
              {(data?.branchDistribution || []).map((b) => (
                <tr key={b.branch} className="hover:bg-slate-50 transition">
                  {/* b.branch is the branch CODE (backend returns code, not name). */}
                  <td className="py-3 px-4 font-semibold text-slate-800">{b.branch}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{b.customers.toLocaleString('id-ID')}</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">{formatRp(b.totalAum, isEn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
