import { useState } from 'react';
import { useI18n } from '../i18n';
import { UserCheck, ClipboardList, Briefcase, CheckCircle2 } from 'lucide-react';
import { PageHeader, StatusBanner, KpiCard, Badge, InProgressBadge, BranchFilter, ALL_BRANCHES, THEME } from './_inProgressKit';

const ASSIGNMENTS = [
  { rm: 'Andi Pratama', branch: 'Kantor Pusat Jakarta', assigned: 42, done: 31, campaign: 'Retensi Deposito Q1', load: 'High', tone: 'red' as const },
  { rm: 'Siti Nurhaliza', branch: 'Cabang Surabaya Darmo', assigned: 28, done: 24, campaign: 'Cross-Sell Mobile Banking', load: 'Medium', tone: 'amber' as const },
  { rm: 'Budi Hartono', branch: 'Cabang Bandung Asia Afrika', assigned: 35, done: 20, campaign: 'Retensi Deposito Q1', load: 'High', tone: 'red' as const },
  { rm: 'Maya Sari', branch: 'Cabang Medan Gatot Subroto', assigned: 18, done: 17, campaign: 'Program Loyalitas Senior', load: 'Low', tone: 'green' as const },
  { rm: 'Rizal Effendi', branch: 'Kantor Pusat Jakarta', assigned: 24, done: 12, campaign: 'Upgrade Kartu Kredit', load: 'Medium', tone: 'amber' as const },
];

export function CampaignAssignment() {
  const { lang } = useI18n();
  const [branch, setBranch] = useState<string>(ALL_BRANCHES);
  const rows = branch === ALL_BRANCHES ? ASSIGNMENTS : ASSIGNMENTS.filter((a) => a.branch === branch);
  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      <PageHeader
        crumb="CAM-02"
        title={lang === 'id' ? 'Penugasan Kampanye' : 'Campaign Assignment'}
        subtitle={lang === 'id'
          ? 'Distribusi nasabah target ke Relationship Manager beserta beban kerja dan progres tindak lanjut.'
          : 'Distribution of target customers to Relationship Managers with workload and follow-up progress.'}
      />
      <StatusBanner
        title={lang === 'id' ? 'Modul Penugasan RM' : 'RM Assignment Module'}
        desc={lang === 'id'
          ? 'Alokasi otomatis nasabah ke RM sedang diintegrasikan dengan backend. Data di bawah adalah pratinjau [In Progress].'
          : 'Automated customer-to-RM allocation is being integrated with the backend. Data below is an [In Progress] preview.'}
      />

      <div className="flex justify-end">
        <BranchFilter value={branch} onChange={setBranch} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={lang === 'id' ? 'TOTAL RM AKTIF' : 'ACTIVE RMs'} value="48" sub={lang === 'id' ? '12 cabang' : '12 branches'} icon={Briefcase} color={THEME.navy} />
        <KpiCard label={lang === 'id' ? 'NASABAH DITUGASKAN' : 'ASSIGNED CUSTOMERS'} value="1,247" sub={lang === 'id' ? 'Periode ini' : 'This period'} icon={ClipboardList} color={THEME.brand} />
        <KpiCard label={lang === 'id' ? 'SELESAI' : 'COMPLETED'} value="812" sub={lang === 'id' ? '65% dari target' : '65% of target'} icon={CheckCircle2} color={THEME.emerald} />
        <KpiCard label={lang === 'id' ? 'BEBAN TINGGI' : 'HIGH LOAD'} value="9" sub={lang === 'id' ? 'RM perlu bantuan' : 'RMs need support'} icon={UserCheck} color={THEME.red} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#8A6534]" />
            {lang === 'id' ? 'Beban Kerja per RM' : 'Workload per RM'}
          </h3>
          <InProgressBadge />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">RM</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">{lang === 'id' ? 'Cabang' : 'Branch'}</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">{lang === 'id' ? 'Kampanye' : 'Campaign'}</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase w-48">{lang === 'id' ? 'Progres' : 'Progress'}</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase text-center">{lang === 'id' ? 'Beban' : 'Load'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const pct = Math.round((a.done / a.assigned) * 100);
                return (
                  <tr key={a.rm} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{a.rm}</td>
                    <td className="py-2.5 px-4 text-slate-600 text-xs">{a.branch}</td>
                    <td className="py-2.5 px-4 text-slate-600 text-xs">{a.campaign}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: THEME.emerald }} />
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono w-16 text-right">{a.done}/{a.assigned}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-center"><Badge text={a.load} tone={a.tone} /></td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-slate-400 italic">
                    {lang === 'id' ? 'Tidak ada data untuk cabang ini.' : 'No data for this branch.'}
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
