import { useI18n } from '../i18n';
import { Eye, Save, CalendarClock, Database } from 'lucide-react';
import { PageHeader, StatusBanner, Badge, InProgressBadge, THEME } from './_inProgressKit';

const WINDOWS = [
  { label: 'Churn Prediction', window: '12 bulan', freq: 'Harian', tone: 'teal' as const },
  { label: 'Profitability', window: '6 bulan', freq: 'Mingguan', tone: 'terra' as const },
  { label: 'Segmentation', window: '12 bulan', freq: 'Bulanan', tone: 'violet' as const },
  { label: 'Recommendation', window: '3 bulan', freq: 'Harian', tone: 'green' as const },
];

export function SetupObservationSettings() {
  const { lang } = useI18n();
  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      <PageHeader
        crumb="SET-05"
        title={lang === 'id' ? 'Pengaturan Observasi' : 'Observation Settings'}
        subtitle={lang === 'id'
          ? 'Konfigurasi jendela data, frekuensi refresh model, dan sumber data pengamatan.'
          : 'Configure data windows, model refresh frequency, and observation data sources.'}
        actions={
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8A6534] hover:bg-[#6B4E2E] text-white text-xs font-semibold transition shadow-2xs">
            <Save className="w-3.5 h-3.5" /> {lang === 'id' ? 'Simpan' : 'Save'}
          </button>
        }
      />
      <StatusBanner
        title={lang === 'id' ? 'Modul Pengaturan Observasi' : 'Observation Settings Module'}
        desc={lang === 'id'
          ? 'Konfigurasi jendela observasi sedang diintegrasikan dengan backend. Kontrol di bawah adalah pratinjau [In Progress].'
          : 'Observation window configuration is being integrated with the backend. Controls below are an [In Progress] preview.'}
      />

      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><CalendarClock className="w-4 h-4 text-[#0E7490]" /> {lang === 'id' ? 'Jendela Data per Model' : 'Data Window per Model'}</h3>
          <InProgressBadge />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">{lang === 'id' ? 'Model' : 'Model'}</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">{lang === 'id' ? 'Jendela Observasi' : 'Observation Window'}</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase text-center">{lang === 'id' ? 'Frekuensi Refresh' : 'Refresh Frequency'}</th>
              </tr>
            </thead>
            <tbody>
              {WINDOWS.map((w) => (
                <tr key={w.label} className="border-b border-slate-100 hover:bg-slate-50 transition">
                  <td className="py-2.5 px-4 font-semibold text-slate-800">{w.label}</td>
                  <td className="py-2.5 px-4"><Badge text={w.window} tone={w.tone} /></td>
                  <td className="py-2.5 px-4 text-center text-xs text-slate-600">{w.freq}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 border-l-4 border-l-[#059669] rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Database className="w-4 h-4 text-[#059669]" /> {lang === 'id' ? 'Sumber Data' : 'Data Sources'}</h3>
            <InProgressBadge />
          </div>
          <div className="space-y-2 text-xs text-slate-600">
            <p className="flex items-center justify-between py-1.5 border-b border-slate-100"><span className="font-mono">ods.demografi</span> <Badge text="Connected" tone="green" /></p>
            <p className="flex items-center justify-between py-1.5 border-b border-slate-100"><span className="font-mono">churn.pred_result</span> <Badge text="Connected" tone="green" /></p>
            <p className="flex items-center justify-between py-1.5 border-b border-slate-100"><span className="font-mono">segmentation.customer_analytics</span> <Badge text="Connected" tone="green" /></p>
            <p className="flex items-center justify-between py-1.5"><span className="font-mono">profitability.pred_result</span> <Badge text="Syncing" tone="amber" /></p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 border-l-4 border-l-[#8A6534] rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Eye className="w-4 h-4 text-[#8A6534]" /> {lang === 'id' ? 'Ringkasan Observasi' : 'Observation Summary'}</h3>
            <InProgressBadge />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase text-slate-400 font-bold">{lang === 'id' ? 'Total Nasabah Dipantau' : 'Customers Monitored'}</p>
              <p className="text-xl font-black" style={{ color: THEME.brand }}>7,040</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400 font-bold">{lang === 'id' ? 'Refresh Terakhir' : 'Last Refresh'}</p>
              <p className="text-xl font-black text-slate-800">02:00</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
