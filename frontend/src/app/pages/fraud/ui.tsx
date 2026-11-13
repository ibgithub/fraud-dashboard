// Shared UI building blocks for the FraudGuard pages (styled with the app theme).
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { FlaskConical, Info } from 'lucide-react';
import { TYPE_COLOR, DAILY, type AnomalyType, type Severity } from './mockData';
import { useFg, type TextKey } from './text';

// ---- theme ---------------------------------------------------------------------
export const C = {
  brand: '#13385E',
  accent: '#028DAA',
  high: '#DC2626',
  medium: '#F59E0B',
  green: '#059669',
  grid: '#E2E8F0',
  muted: '#64748B',
};
export const AXIS = { tick: { fill: C.muted, fontSize: 11 }, axisLine: { stroke: C.grid }, tickLine: false } as const;
export const TOOLTIP = {
  contentStyle: { borderRadius: 10, border: `1px solid ${C.grid}`, fontSize: 12 },
  labelStyle: { color: C.brand, fontWeight: 600 },
} as const;

// ---- formatters --------------------------------------------------------------------
export function useFmt() {
  const { locale, lang } = useFg();
  const int = (n: number) => new Intl.NumberFormat(locale).format(Math.round(n || 0));
  const pct = (x: number, d = 2) => `${new Intl.NumberFormat(locale, { minimumFractionDigits: d, maximumFractionDigits: d }).format(x * 100)}%`;
  const dec = (x: number, d = 1) => new Intl.NumberFormat(locale, { minimumFractionDigits: d, maximumFractionDigits: d }).format(x);
  const rupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
  const rupiahShort = (n: number) => {
    const v = Math.abs(n || 0);
    const s = n < 0 ? '-' : '';
    const u = lang === 'en' ? ['T', 'B', 'M', 'K'] : ['T', 'M', 'jt', 'rb'];
    if (v >= 1e12) return `${s}Rp${dec(v / 1e12, 2)} ${u[0]}`;
    if (v >= 1e9) return `${s}Rp${dec(v / 1e9, 2)} ${u[1]}`;
    if (v >= 1e6) return `${s}Rp${dec(v / 1e6, 1)} ${u[2]}`;
    if (v >= 1e3) return `${s}Rp${dec(v / 1e3, 0)} ${u[3]}`;
    return `${s}Rp${int(v)}`;
  };
  const day = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(locale, { day: '2-digit', month: 'short' });
  const dateTime = (s: string) => new Date(s.replace(' ', 'T')).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
  const time = (s: string) => new Date(s.replace(' ', 'T')).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const pctile = (x: number) => (x >= 99.995 ? '100' : dec(x, 2));
  return { int, pct, dec, rupiah, rupiahShort, day, dateTime, time, pctile };
}

// ---- layout pieces ---------------------------------------------------------------------
export function PageTitle({ icon: Icon, title, subtitle, actions }: { icon: LucideIcon; title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Icon className="w-6 h-6 text-[#028DAA]" aria-hidden="true" />
          {title}
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl">{subtitle}</p>
      </div>
      {actions && <div className="flex items-center gap-3 flex-wrap">{actions}</div>}
    </div>
  );
}

export function MockBanner() {
  const { tr } = useFg();
  return (
    <div role="note" className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
      <FlaskConical className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>{tr('mock_banner')}</span>
    </div>
  );
}

export function Note({ children, tone = 'accent' }: { children: ReactNode; tone?: 'accent' | 'neutral' }) {
  const cls = tone === 'accent' ? 'bg-[#E7F4F6] border-[#A5D8EA] text-[#0F2B48]' : 'bg-slate-50 border-slate-200 text-slate-700';
  return (
    <div role="note" className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${cls}`}>
      <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#028DAA]" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function Panel({ title, desc, icon: Icon, actions, children, className = '' }: {
  title: string; desc?: string; icon?: LucideIcon; actions?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-[#028DAA]" aria-hidden="true" />}
            {title}
          </h2>
          {desc && <p className="text-xs text-slate-500 mt-1">{desc}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function StatCard({ icon: Icon, label, value, sub, hint, tone }: {
  icon?: LucideIcon; label: string; value: string; sub?: string; hint?: string; tone?: 'neg' | 'pos';
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm" title={hint}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" aria-hidden="true" />}
        {label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${tone === 'neg' ? 'text-red-600' : tone === 'pos' ? 'text-emerald-600' : 'text-slate-900'}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export function ProgressBar({ value, max = 1, color = C.accent, label }: { value: number; max?: number; color?: string; label?: string }) {
  const w = Math.max(0, Math.min(100, (value / Math.max(max, 1e-9)) * 100));
  return (
    <div className="h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(w)} aria-label={label}>
      <div className="h-full rounded-full" style={{ width: `${w}%`, background: color }} />
    </div>
  );
}

// ---- badges -----------------------------------------------------------------------------
type Tone = 'high' | 'medium' | 'green' | 'neutral' | 'accent';
const TONE: Record<Tone, string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  neutral: 'bg-slate-50 text-slate-600 border-slate-200',
  accent: 'bg-cyan-50 text-cyan-800 border-cyan-200',
};
const DOT: Record<Tone, string> = { high: 'bg-red-500', medium: 'bg-amber-500', green: 'bg-emerald-500', neutral: 'bg-slate-400', accent: 'bg-cyan-500' };

export function Badge({ tone = 'neutral', dot, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap ${TONE[tone]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${DOT[tone]}`} aria-hidden="true" />}
      {children}
    </span>
  );
}

export function SeverityBadge({ sev }: { sev: Severity | 'low' }) {
  const { tr } = useFg();
  if (sev === 'low') return <Badge tone="accent" dot>{tr('sev_low')}</Badge>;
  return <Badge tone={sev} dot>{tr(sev === 'high' ? 'sev_high' : 'sev_medium')}</Badge>;
}

export function DecisionBadge({ d }: { d: 'confirmed' | 'dismissed' | 'escalate' | null }) {
  const { tr } = useFg();
  if (!d) return <span className="text-[11px] text-slate-400">{tr('aq_undecided')}</span>;
  const tone: Tone = d === 'confirmed' ? 'high' : d === 'dismissed' ? 'green' : 'accent';
  return <Badge tone={tone}>{tr(`dec_${d}` as TextKey)}</Badge>;
}

// ---- form controls ------------------------------------------------------------------------
export function Segmented<K extends string>({ value, options, onChange, label, disabled }: {
  value: K; options: { key: K; label: string }[]; onChange: (k: K) => void; label: string; disabled?: K[];
}) {
  return (
    <div className="inline-flex flex-wrap rounded-xl bg-white border border-slate-200 p-1 shadow-sm" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === o.key}
          disabled={disabled?.includes(o.key)}
          onClick={() => onChange(o.key)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition disabled:opacity-40 ${value === o.key ? 'bg-[#13385E] text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SelectBox({ value, onChange, label, children }: { value: string; onChange: (v: string) => void; label: string; children: ReactNode }) {
  return (
    <select
      value={value}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#028DAA]/40"
    >
      {children}
    </select>
  );
}

export function Pager({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  const { tr } = useFg();
  const btn = 'px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40';
  return (
    <nav className="flex items-center justify-end gap-3 mt-3" aria-label="pagination">
      <button type="button" className={btn} disabled={page <= 1} onClick={() => onChange(page - 1)}>{tr('prev')}</button>
      <span className="text-xs text-slate-500">{tr('page', { p: page, n: Math.max(pages, 1) })}</span>
      <button type="button" className={btn} disabled={page >= pages} onClick={() => onChange(page + 1)}>{tr('next')}</button>
    </nav>
  );
}

export function TypeBadge({ type }: { type: AnomalyType }) {
  const { typeName } = useFg();
  const c = TYPE_COLOR[type];
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap" style={{ background: `${c}1F`, color: c }}>
      {typeName(type)}
    </span>
  );
}

export function DriftBadge({ status }: { status: 'stable' | 'warning' | 'drifted' }) {
  const { tr } = useFg();
  const tone: Tone = status === 'drifted' ? 'high' : status === 'warning' ? 'medium' : 'green';
  return <Badge tone={tone} dot>{tr(`drift_${status}` as TextKey)}</Badge>;
}

// ---- period selection (presets over the mock daily series) ------------------------------
export type PeriodKey = 'all' | 'may' | 'jun' | 'd30' | 'd7';
const PERIOD_LABEL: Record<PeriodKey, TextKey> = { all: 'period_all', may: 'period_may', jun: 'period_jun', d30: 'period_30', d7: 'period_7' };

export function periodDays(p: PeriodKey) {
  switch (p) {
    case 'may': return DAILY.filter((d) => d.date < '2026-06-01');
    case 'jun': return DAILY.filter((d) => d.date >= '2026-06-01');
    case 'd30': return DAILY.slice(-30);
    case 'd7': return DAILY.slice(-7);
    default: return DAILY;
  }
}

export function PeriodBar({ value, onChange }: { value: PeriodKey; onChange: (p: PeriodKey) => void }) {
  const { tr } = useFg();
  const days = periodDays(value);
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Segmented
        value={value}
        onChange={onChange}
        label={tr('period_label')}
        options={(Object.keys(PERIOD_LABEL) as PeriodKey[]).map((k) => ({ key: k, label: tr(PERIOD_LABEL[k]) }))}
      />
      <span className="text-xs text-slate-500">{days[0].date} → {days[days.length - 1].date}</span>
    </div>
  );
}

// ---- simple table helpers ------------------------------------------------------------------
const TH_BASE = 'px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200 whitespace-nowrap';
export const TH = `${TH_BASE} text-left`;
export const THN = `${TH_BASE} text-right`;
const TD_BASE = 'px-3 py-2 text-xs text-slate-700 border-b border-slate-100 whitespace-nowrap';
export const TD = `${TD_BASE} text-left`;
export const TDN = `${TD_BASE} text-right tabular-nums`;
