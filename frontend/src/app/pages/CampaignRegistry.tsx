import { useState } from 'react';
import { useI18n } from '../i18n';
import { Megaphone, PlusCircle, Calendar, Users } from 'lucide-react';
import { PageHeader, StatusBanner, KpiCard, Badge, InProgressBadge, BranchFilter, ALL_BRANCHES, THEME } from './_inProgressKit';

const CAMPAIGNS = [
  { id: 'CMP-2024-01', name: 'Retensi Deposito Q1', type: 'Retention', target: 'C3 Hot Target', period: '01 Jan – 31 Mar', status: 'Active', tone: 'green' as const, branch: 'Kantor Pusat Jakarta' },
  { id: 'CMP-2024-02', name: 'Cross-Sell Mobile Banking', type: 'Product Offer', target: 'Young Professional', period: '15 Jan – 15 Apr', status: 'Active', tone: 'green' as const, branch: 'Cabang Surabaya Darmo' },
  { id: 'CMP-2024-03', name: 'Upgrade Kartu Kredit Platinum', type: 'Upsell', target: 'Mass Affluent', period: '01 Feb – 30 Apr', status: 'Draft', tone: 'gray' as const, branch: 'Cabang Bandung Asia Afrika' },
  { id: 'CMP-2024-04', name: 'Program Loyalitas Senior', type: 'Loyalty', target: 'Senior & Aman', period: '01 Mar – 31 May', status: 'Scheduled', tone: 'amber' as const, branch: 'Cabang Medan Gatot Subroto' },
  { id: 'CMP-2023-12', name: 'Winback Nasabah Pasif', type: 'Winback', target: 'Attrition Warning', period: '01 Dec – 31 Dec', status: 'Completed', tone: 'navy' as const, branch: 'Kantor Pusat Jakarta' },
];

export function CampaignRegistry() {
  const { lang } = useI18n();
  const [branch, setBranch] = useState<string>(ALL_BRANCHES);
  const rows = branch === ALL_BRANCHES ? CAMPAIGNS : CAMPAIGNS.filter((c) => c.branch === branch);
  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      <PageHeader
        crumb="CAM-01"
        title={lang === 'id' ? 'Registri Kampanye' : 'Campaign Registry'}
        subtitle={lang === 'id'
          ? 'Katalog kampanye retensi & penawaran produk beserta target segmen dan periodenya.'
          : 'Catalog of retention & product-offering campaigns with target segments and periods.'}
        actions={
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8A6534] hover:bg-[#6B4E2E] text-white text-xs font-semibold transition shadow-2xs">
            <PlusCircle className="w-3.5 h-3.5" /> {lang === 'id' ? 'Kampanye Baru' : 'New Campaign'}
          </button>
        }
      />
      <StatusBanner
        title={lang === 'id' ? 'Modul Registri Kampanye' : 'Campaign Registry Module'}
        desc={lang === 'id'
          ? 'Manajemen siklus hidup kampanye sedang diintegrasikan dengan backend. Daftar di bawah adalah pratinjau [In Progress].'
          : 'Campaign lifecycle management is being integrated with the backend. The list below is an [In Progress] preview.'}
      />

      <div className="flex justify-end">
        <BranchFilter value={branch} onChange={setBranch} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={lang === 'id' ? 'TOTAL KAMPANYE' : 'TOTAL CAMPAIGNS'} value="24" sub={lang === 'id' ? 'Semua periode' : 'All periods'} icon={Megaphone} color={THEME.brand} />
        <KpiCard label={lang === 'id' ? 'AKTIF' : 'ACTIVE'} value="7" sub={lang === 'id' ? 'Sedang berjalan' : 'Currently running'} icon={Calendar} color={THEME.emerald} />
        <KpiCard label={lang === 'id' ? 'TERJADWAL' : 'SCHEDULED'} value="3" sub={lang === 'id' ? 'Akan datang' : 'Upcoming'} icon={Calendar} color={THEME.amber} />
        <KpiCard label={lang === 'id' ? 'NASABAH TERCAKUP' : 'CUSTOMERS COVERED'} value="18,4K" sub={lang === 'id' ? 'Total target' : 'Total targeted'} icon={Users} color={THEME.teal} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#8A6534]" />
            {lang === 'id' ? 'Daftar Kampanye' : 'Campaign List'}
          </h3>
          <InProgressBadge />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">ID</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">{lang === 'id' ? 'Nama Kampanye' : 'Campaign Name'}</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">{lang === 'id' ? 'Tipe' : 'Type'}</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">{lang === 'id' ? 'Target Segmen' : 'Target Segment'}</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">{lang === 'id' ? 'Cabang' : 'Branch'}</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">{lang === 'id' ? 'Periode' : 'Period'}</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                  <td className="py-2.5 px-4 font-mono text-xs text-slate-600">{c.id}</td>
                  <td className="py-2.5 px-4 font-semibold text-slate-800">{c.name}</td>
                  <td className="py-2.5 px-4"><Badge text={c.type} tone="teal" /></td>
                  <td className="py-2.5 px-4 text-slate-600 text-xs">{c.target}</td>
                  <td className="py-2.5 px-4 text-slate-600 text-xs">{c.branch}</td>
                  <td className="py-2.5 px-4 text-slate-500 text-xs">{c.period}</td>
                  <td className="py-2.5 px-4 text-center"><Badge text={c.status} tone={c.tone} /></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-xs text-slate-400 italic">
                    {lang === 'id' ? 'Tidak ada kampanye untuk cabang ini.' : 'No campaigns for this branch.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
