import { useI18n } from '../i18n';
import { BellRing, Save, PlusCircle, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { PageHeader, StatusBanner, Badge, InProgressBadge, THEME } from './_inProgressKit';

const RULES = [
  { name: 'Churn > 85%', trigger: 'Churn Index melewati 85%', channel: 'Email + Push', target: 'RM & Supervisor', active: true, tone: 'red' as const },
  { name: 'Saldo turun 50%', trigger: 'Penurunan saldo > 50% dalam 30 hari', channel: 'Push', target: 'RM', active: true, tone: 'amber' as const },
  { name: 'Deposito jatuh tempo', trigger: '7 hari sebelum jatuh tempo', channel: 'Email + SMS', target: 'RM & Nasabah', active: true, tone: 'teal' as const },
  { name: 'Nasabah pasif 60 hari', trigger: 'Tanpa transaksi 60 hari', channel: 'Push', target: 'RM', active: false, tone: 'gray' as const },
  { name: 'Kampanye selesai', trigger: 'Kampanye mencapai akhir periode', channel: 'Email', target: 'Manager', active: true, tone: 'green' as const },
];

export function SetupNotificationRules() {
  const { lang } = useI18n();
  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      <PageHeader
        crumb="SET-06"
        title={lang === 'id' ? 'Aturan Notifikasi' : 'Notification Rules'}
        subtitle={lang === 'id'
          ? 'Definisi pemicu peringatan, kanal pengiriman, dan penerima notifikasi.'
          : 'Define alert triggers, delivery channels, and notification recipients.'}
        actions={
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8A6534] hover:bg-[#6B4E2E] text-white text-xs font-semibold transition shadow-2xs">
            <PlusCircle className="w-3.5 h-3.5" /> {lang === 'id' ? 'Aturan Baru' : 'New Rule'}
          </button>
        }
      />
      <StatusBanner
        title={lang === 'id' ? 'Modul Aturan Notifikasi' : 'Notification Rules Module'}
        desc={lang === 'id'
          ? 'Mesin aturan notifikasi sedang diintegrasikan dengan backend. Aturan di bawah adalah pratinjau [In Progress].'
          : 'Notification rules engine is being integrated with the backend. Rules below are an [In Progress] preview.'}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChannelCard icon={Mail} label="Email" value={lang === 'id' ? 'Aktif' : 'Enabled'} color={THEME.brand} />
        <ChannelCard icon={Smartphone} label="Push Notification" value={lang === 'id' ? 'Aktif' : 'Enabled'} color={THEME.teal} />
        <ChannelCard icon={MessageSquare} label="SMS" value={lang === 'id' ? 'Terbatas' : 'Limited'} color={THEME.amber} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><BellRing className="w-4 h-4 text-[#8A6534]" /> {lang === 'id' ? 'Daftar Aturan' : 'Rule List'}</h3>
          <div className="flex items-center gap-2">
            <InProgressBadge />
            <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition">
              <Save className="w-3 h-3" /> {lang === 'id' ? 'Simpan' : 'Save'}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">{lang === 'id' ? 'Nama Aturan' : 'Rule Name'}</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">{lang === 'id' ? 'Pemicu' : 'Trigger'}</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">{lang === 'id' ? 'Kanal' : 'Channel'}</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">{lang === 'id' ? 'Penerima' : 'Recipient'}</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {RULES.map((r) => (
                <tr key={r.name} className="border-b border-slate-100 hover:bg-slate-50 transition">
                  <td className="py-2.5 px-4"><Badge text={r.name} tone={r.tone} /></td>
                  <td className="py-2.5 px-4 text-slate-600 text-xs">{r.trigger}</td>
                  <td className="py-2.5 px-4 text-slate-600 text-xs">{r.channel}</td>
                  <td className="py-2.5 px-4 text-slate-600 text-xs">{r.target}</td>
                  <td className="py-2.5 px-4 text-center">
                    <Badge text={r.active ? (lang === 'id' ? 'Aktif' : 'Active') : (lang === 'id' ? 'Nonaktif' : 'Inactive')} tone={r.active ? 'green' : 'gray'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ChannelCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}1A` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">{label}</p>
          <p className="text-[11px] text-slate-400">{value}</p>
        </div>
      </div>
      <InProgressBadge />
    </div>
  );
}
