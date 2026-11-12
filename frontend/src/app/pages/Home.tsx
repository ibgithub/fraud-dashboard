import { ShieldAlert, LayoutDashboard, ListChecks, Sunrise, Activity, Brain, Radio } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useI18n } from '../i18n';

// Landing page after login. Lists the fraud modules that are being built, so
// users know what is coming while the legacy CPI menus are gone.
const MODULES: { icon: LucideIcon; titleKey: string; descKey: string }[] = [
  { icon: LayoutDashboard, titleKey: 'home_mod_overview', descKey: 'home_mod_overview_desc' },
  { icon: Radio, titleKey: 'home_mod_live', descKey: 'home_mod_live_desc' },
  { icon: ListChecks, titleKey: 'home_mod_alerts', descKey: 'home_mod_alerts_desc' },
  { icon: Sunrise, titleKey: 'home_mod_daily', descKey: 'home_mod_daily_desc' },
  { icon: Activity, titleKey: 'home_mod_data', descKey: 'home_mod_data_desc' },
  { icon: Brain, titleKey: 'home_mod_model', descKey: 'home_mod_model_desc' },
];

export function Home() {
  const { t } = useI18n();
  const msg = t as unknown as Record<string, string>;
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('auth_user') || '{}');
    } catch {
      return {};
    }
  })();
  const name = user.firstName || user.username || '';

  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-[#13385E] via-[#1E4B75] to-[#028DAA] text-white p-6 shadow-md">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {t.home_title}
              {name ? `, ${name}` : ''}
            </h1>
            <p className="text-sm text-[#CFE8EE] mt-1 max-w-3xl">{t.home_subtitle}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="home-modules-title" className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 id="home-modules-title" className="text-sm font-bold uppercase tracking-wider text-[#13385E]">
            {t.home_modules_title}
          </h2>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-xs font-semibold text-amber-800">
            {t.home_modules_status}
          </span>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {MODULES.map(({ icon: Icon, titleKey, descKey }) => (
            <li key={titleKey} className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#E7F4F6] text-[#028DAA] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{msg[titleKey]}</h3>
                <p className="text-xs text-slate-500 mt-1">{msg[descKey]}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
