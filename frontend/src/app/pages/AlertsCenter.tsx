import { useI18n } from '../i18n';
import { Bell, AlertTriangle, TrendingDown, UserX, CheckCircle2 } from 'lucide-react';
import { PageHeader, StatusBanner, KpiCard, Badge, InProgressBadge, THEME } from './_inProgressKit';

const ALERTS = [
  { icon: TrendingDown, title: 'Churn spike terdeteksi', desc: '18 nasabah C3 melewati ambang churn 85%', time: '5 menit lalu', sev: 'Critical', tone: 'red' as const, color: '#C0392B' },
  { icon: UserX, title: 'Nasabah high-value pasif', desc: 'PT Global Niaga tanpa transaksi 45 hari', time: '1 jam lalu', sev: 'High', tone: 'amber' as const, color: '#B45309' },
  { icon: AlertTriangle, title: 'Deposito jatuh tempo', desc: '42 deposito jatuh tempo minggu ini, risiko tidak diperpanjang', time: '3 jam lalu', sev: 'Medium', tone: 'amber' as const, color: '#B45309' },
  { icon: CheckCircle2, title: 'Kampanye retensi berhasil', desc: 'Retensi Deposito Q1 mencapai 67% konversi', time: '1 hari lalu', sev: 'Info', tone: 'green' as const, color: '#059669' },
  { icon: TrendingDown, title: 'Penurunan saldo signifikan', desc: 'Hendra Wijaya menarik 60% saldo tabungan', time: '1 hari lalu', sev: 'High', tone: 'amber' as const, color: '#B45309' },
];

export function AlertsCenter() {
  const { lang } = useI18n();
  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      <PageHeader
        crumb="NOT-01"
        title={lang === 'id' ? 'Pusat Notifikasi & Peringatan' : 'Alert & Notification Center'}
        subtitle={lang === 'id'
          ? 'Peringatan otomatis atas perubahan risiko, aktivitas nasabah, dan hasil kampanye.'
          : 'Automated alerts on risk changes, customer activity, and campaign outcomes.'}
      />
      <StatusBanner
        title={lang === 'id' ? 'Modul Pusat Notifikasi' : 'Notification Center Module'}
        desc={lang === 'id'
          ? 'Mesin peringatan berbasis aturan sedang diintegrasikan dengan backend. Notifikasi di bawah adalah pratinjau [In Progress].'
          : 'Rule-based alerting engine is being integrated with the backend. Notifications below are an [In Progress] preview.'}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={lang === 'id' ? 'PERINGATAN AKTIF' : 'ACTIVE ALERTS'} value="37" sub={lang === 'id' ? 'Belum ditangani' : 'Unhandled'} icon={Bell} color={THEME.red} />
        <KpiCard label="Critical" value="6" sub={lang === 'id' ? 'Perlu tindakan segera' : 'Immediate action'} icon={AlertTriangle} color={THEME.red} />
        <KpiCard label="High" value="14" sub={lang === 'id' ? 'Prioritas tinggi' : 'High priority'} icon={TrendingDown} color={THEME.amber} />
        <KpiCard label={lang === 'id' ? 'TERSELESAIKAN' : 'RESOLVED'} value="128" sub={lang === 'id' ? 'Bulan ini' : 'This month'} icon={CheckCircle2} color={THEME.emerald} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Bell className="w-4 h-4 text-[#8A6534]" /> {lang === 'id' ? 'Peringatan Terbaru' : 'Latest Alerts'}</h3>
          <InProgressBadge />
        </div>
        <div className="divide-y divide-slate-100">
          {ALERTS.map((a, i) => (
            <div key={i} className="flex items-start gap-3 p-4 hover:bg-slate-50 transition">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${a.color}1A` }}>
                <a.icon className="w-4.5 h-4.5" style={{ color: a.color, width: 18, height: 18 }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                  <Badge text={a.sev} tone={a.tone} />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{a.desc}</p>
              </div>
              <span className="text-[11px] text-slate-400 whitespace-nowrap">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
