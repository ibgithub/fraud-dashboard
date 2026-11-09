import { useState } from 'react';
import { useI18n } from '../i18n';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, Percent, DollarSign, Target } from 'lucide-react';
import { PageHeader, StatusBanner, KpiCard, InProgressBadge, BranchFilter, ALL_BRANCHES, THEME } from './_inProgressKit';

const CONVERSION = [
  { campaign: 'Retensi Deposito', target: 320, converted: 214 },
  { campaign: 'Cross-Sell MB', target: 480, converted: 301 },
  { campaign: 'Upgrade CC', target: 210, converted: 98 },
  { campaign: 'Loyalitas Senior', target: 150, converted: 121 },
  { campaign: 'Winback Pasif', target: 260, converted: 88 },
];

const TREND = [
  { month: 'Sep', roi: 1.8 }, { month: 'Oct', roi: 2.1 }, { month: 'Nov', roi: 2.4 },
  { month: 'Dec', roi: 2.2 }, { month: 'Jan', roi: 2.9 }, { month: 'Feb', roi: 3.3 },
];

// Deterministic per-branch scaling so charts respond to the branch filter.
// "Semua Cabang" shows the aggregate (factor 1). A specific branch scales the
// values by a stable factor derived from its name.
function branchFactor(branch: string): number {
  if (branch === ALL_BRANCHES) return 1;
  let h = 0;
  for (let i = 0; i < branch.length; i++) h = (h * 31 + branch.charCodeAt(i)) % 1000;
  return 0.25 + (h / 1000) * 0.6; // 0.25 .. 0.85
}

export function CampaignEffectiveness() {
  const { lang } = useI18n();
  const [branch, setBranch] = useState<string>(ALL_BRANCHES);
  const f = branchFactor(branch);
  const conversion = CONVERSION.map((c) => ({
    ...c,
    target: Math.round(c.target * f),
    converted: Math.round(c.converted * f),
  }));
  const trend = TREND.map((t) => ({ ...t, roi: Math.round(t.roi * (branch === ALL_BRANCHES ? 1 : 0.7 + f * 0.4) * 10) / 10 }));
  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      <PageHeader
        crumb="CAM-03"
        title={lang === 'id' ? 'Efektivitas Kampanye' : 'Campaign Effectiveness'}
        subtitle={lang === 'id'
          ? 'Analisis konversi, ROI, dan retensi hasil dari kampanye yang berjalan.'
          : 'Conversion, ROI, and retention analysis from running campaigns.'}
      />
      <StatusBanner
        title={lang === 'id' ? 'Modul Efektivitas Kampanye' : 'Campaign Effectiveness Module'}
        desc={lang === 'id'
          ? 'Pengukuran hasil kampanye sedang diintegrasikan dengan backend. Grafik di bawah adalah pratinjau [In Progress].'
          : 'Campaign outcome measurement is being integrated with the backend. Charts below are an [In Progress] preview.'}
      />

      <div className="flex justify-end">
        <BranchFilter value={branch} onChange={setBranch} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={lang === 'id' ? 'TINGKAT KONVERSI' : 'CONVERSION RATE'} value="61.4%" sub={lang === 'id' ? 'Rata-rata semua' : 'All campaigns avg'} icon={Percent} color={THEME.emerald} />
        <KpiCard label="ROI" value="3.3x" sub={lang === 'id' ? 'Tren naik' : 'Trending up'} icon={TrendingUp} color={THEME.brand} />
        <KpiCard label={lang === 'id' ? 'NILAI DISELAMATKAN' : 'VALUE SAVED'} value="Rp 92 M" sub={lang === 'id' ? 'Retensi berhasil' : 'Successful retention'} icon={DollarSign} color={THEME.teal} />
        <KpiCard label={lang === 'id' ? 'NASABAH KONVERSI' : 'CONVERTED'} value="822" sub={lang === 'id' ? 'Dari 1.420 target' : 'Of 1,420 targeted'} icon={Target} color={THEME.violet} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">{lang === 'id' ? 'Target vs Konversi per Kampanye' : 'Target vs Converted per Campaign'}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{lang === 'id' ? 'Jumlah nasabah' : 'Customer count'}</p>
            </div>
            <InProgressBadge />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={conversion}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="campaign" fontSize={10} stroke="#64748B" />
              <YAxis fontSize={11} stroke="#64748B" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="target" name={lang === 'id' ? 'Target' : 'Target'} fill="#CBD5E1" radius={[4, 4, 0, 0]} barSize={18} />
              <Bar dataKey="converted" name={lang === 'id' ? 'Konversi' : 'Converted'} fill={THEME.brand} radius={[4, 4, 0, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">{lang === 'id' ? 'Tren ROI Bulanan' : 'Monthly ROI Trend'}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{lang === 'id' ? 'Pengganda pengembalian' : 'Return multiplier'}</p>
            </div>
            <InProgressBadge />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="month" fontSize={11} stroke="#64748B" />
              <YAxis fontSize={11} stroke="#64748B" tickFormatter={(v) => `${v}x`} />
              <Tooltip formatter={(v: number) => `${v}x`} />
              <Line type="monotone" dataKey="roi" stroke={THEME.emerald} strokeWidth={2.5} dot={{ r: 3, fill: THEME.emerald }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
