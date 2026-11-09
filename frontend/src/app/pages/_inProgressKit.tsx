import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { Clock, AlertCircle, Building2 } from 'lucide-react';

export const ALL_BRANCHES = 'Semua Cabang';

// Reusable branch filter dropdown. Fetches the branch list from the executive
// service and defaults to all branches. Emits the selected branch upward.
export function BranchFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (branch: string) => void;
}) {
  const { lang } = useI18n();
  const [branches, setBranches] = useState<string[]>([]);

  useEffect(() => {
    async function fetchBranches() {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch('/api/v1/executive/churn/branches', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const body = await res.json();
          if (body.success && Array.isArray(body.data)) setBranches(body.data);
        }
      } catch (err) {
        console.error('Failed to fetch branches:', err);
      }
    }
    fetchBranches();
  }, []);

  return (
    <div className="flex items-center gap-2 bg-white p-2.5 border border-slate-200 rounded-xl shadow-2xs">
      <Building2 className="w-4 h-4 text-[#8A6534] shrink-0" />
      <label className="text-xs text-slate-500 font-medium whitespace-nowrap">
        {lang === 'id' ? 'Cabang:' : 'Branch:'}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#6B4E2E]"
      >
        <option value={ALL_BRANCHES}>{lang === 'id' ? 'Semua Cabang' : 'All Branches'}</option>
        {branches.map((b) => (
          <option key={b} value={b}>{b}</option>
        ))}
      </select>
    </div>
  );
}

// Shared theme palette for the "In Progress" preview pages
export const THEME = {
  brand: '#8A6534',
  brandDark: '#6B4E2E',
  teal: '#0E7490',
  violet: '#7C3AED',
  emerald: '#059669',
  amber: '#B45309',
  red: '#C0392B',
  navy: '#1F3864',
};

export function InProgressBadge() {
  const { lang } = useI18n();
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
      <Clock className="w-3 h-3 text-amber-600" />
      {lang === 'id' ? 'In Progress' : 'In Progress'}
    </span>
  );
}

export function PageHeader({
  crumb,
  title,
  subtitle,
  actions,
}: {
  crumb: string;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  const { lang } = useI18n();
  return (
    <div className="flex items-start justify-between flex-wrap gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {actions}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-xs font-semibold text-amber-800 shadow-2xs">
          <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
          <span>{lang === 'id' ? 'Status: In Progress (Integrasi Backend Schema)' : 'Status: In Progress (Backend Schema Integration)'}</span>
        </div>
      </div>
    </div>
  );
}

export function StatusBanner({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-3 shadow-2xs">
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
      <div>
        <span className="font-bold text-amber-900">{title}</span>
        <p className="mt-0.5 leading-relaxed text-amber-700">{desc}</p>
      </div>
    </div>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  icon: any;
  color: string;
}) {
  return (
    <div
      className="bg-white border border-slate-200 rounded-xl p-4 border-l-4 shadow-2xs relative transition hover:shadow-md"
      style={{ borderLeftColor: color }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-[11px] text-slate-500">{sub}</p>
        <InProgressBadge />
      </div>
    </div>
  );
}

export function Badge({ text, tone }: { text: string; tone: 'green' | 'amber' | 'red' | 'gray' | 'navy' | 'terra' | 'violet' | 'teal' }) {
  const map: Record<string, string> = {
    green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-100 text-amber-800 border-amber-300',
    red: 'bg-red-100 text-red-700 border-red-200',
    gray: 'bg-slate-100 text-slate-600 border-slate-300',
    navy: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    terra: 'bg-[#8A6534]/10 text-[#6B4E2E] border-[#8A6534]/30',
    violet: 'bg-violet-100 text-violet-800 border-violet-200',
    teal: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  };
  return <span className={`inline-block text-[10.5px] font-semibold px-2 py-0.5 rounded-full border ${map[tone]}`}>{text}</span>;
}
