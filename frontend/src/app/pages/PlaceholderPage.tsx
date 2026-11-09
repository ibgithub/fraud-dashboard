import { useI18n } from '../i18n';
import { Clock, AlertCircle, Layers, Cpu, CheckCircle2 } from 'lucide-react';

interface PlaceholderPageProps {
  menuKey: string;
}

export function PlaceholderPage({ menuKey }: PlaceholderPageProps) {
  const { t, lang } = useI18n();
  const title = (t as any)[menuKey] || menuKey;

  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {lang === 'id'
              ? `Modul ${title} perbankan.`
              : `${title} banking module.`}
          </p>
        </div>

        {/* Global In Progress Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-600 shadow-2xs">
          <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
          <span>{lang === 'id' ? 'Status: In Progress (Integrasi Backend Schema)' : 'Status: In Progress (Backend Schema Integration)'}</span>
        </div>
      </div>

      {/* System Status Alert Banner */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-start gap-3 shadow-2xs">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-slate-500" />
        <div>
          <span className="font-bold text-slate-800">
            {title}
          </span>
          <p className="mt-0.5 leading-relaxed text-slate-500">
            {lang === 'id'
              ? `Skema database dan modul backend untuk ${title} saat ini sedang dalam tahap perancangan & integrasi. Halaman ini disajikan dalam format pratinjau [In Progress].`
              : `Database schema and backend module for ${title} is currently under design & integration. This page is presented in [In Progress] preview format.`}
          </p>
        </div>
      </div>

      {/* KPI Cards Preview (Grayed Out) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiInProgressCard label={lang === 'id' ? 'TOTAL ENTITAS' : 'TOTAL ENTITIES'} value="1,250" sub={lang === 'id' ? 'Schema awal' : 'Initial schema'} icon={Layers} />
        <KpiInProgressCard label={lang === 'id' ? 'STATUS INTEGRASI' : 'INTEGRATION STATUS'} value="In Progress" sub={lang === 'id' ? 'Pipeline backend' : 'Backend pipeline'} icon={Cpu} />
        <KpiInProgressCard label={lang === 'id' ? 'TINGKAT KESIAPAN' : 'READINESS RATE'} value="85%" sub={lang === 'id' ? 'Pengujian awal' : 'Initial testing'} icon={CheckCircle2} />
        <KpiInProgressCard label={lang === 'id' ? 'VERSI MODEL' : 'MODEL VERSION'} value="v1.0-beta" sub={lang === 'id' ? 'Pratinjau POC' : 'POC preview'} icon={Clock} />
      </div>

      {/* Main Preview Card */}
      <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[220px]">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-slate-200 text-slate-700 border border-slate-300 mb-3">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          {lang === 'id' ? 'Dalam Pengembangan (In Progress)' : 'Under Development (In Progress)'}
        </span>
        <h3 className="text-base font-bold text-slate-700 mb-1">{title}</h3>
        <p className="text-xs text-slate-500 max-w-md leading-relaxed">
          {lang === 'id'
            ? `Fitur dan analisis pada halaman "${title}" siap ditampilkan secara otomatis setelah integrasi backend schema selesai.`
            : `Features and analysis on "${title}" will display automatically once backend schema integration is complete.`}
        </p>
      </div>
    </div>
  );
}

function KpiInProgressCard({ label, value, sub, icon: Icon }: { label: string; value: string; sub: string; icon: any }) {
  return (
    <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-4 border-l-4 border-l-slate-400 shadow-2xs relative">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <p className="text-2xl font-bold text-slate-700">{value}</p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-[11px] text-slate-400">{sub}</p>
        <span className="text-[10px] font-semibold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">In Progress</span>
      </div>
    </div>
  );
}
