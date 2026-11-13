import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, Banknote, Briefcase, CheckCircle2, Database, Info, Printer, ShieldCheck, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DATA_GLANCE, HEALTH, INSIGHT_TONE, SEGMENT_RATE, TYPE_COLOR, type DayRow } from './mockData';
import { useFg, type TextKey } from './text';
import {
  AXIS, C, DriftBadge, MockBanner, Note, PageTitle, Panel, PeriodBar, ProgressBar, StatCard, TD, TDN, TH, THN, TOOLTIP, TypeBadge,
  periodDays, useFmt, type PeriodKey,
} from './ui';
import { CaseTable, casesInPeriod, summarize, typeBreakdown } from './FraudOverview';

const TONE_ICON: Record<'info' | 'ok' | 'warn' | 'danger', LucideIcon> = { info: Info, ok: CheckCircle2, warn: AlertTriangle, danger: AlertTriangle };
const TONE_CLS: Record<'info' | 'ok' | 'warn' | 'danger', string> = {
  info: 'bg-cyan-50 border-cyan-200 text-cyan-900',
  ok: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  warn: 'bg-amber-50 border-amber-200 text-amber-900',
  danger: 'bg-red-50 border-red-200 text-red-900',
};

function weekly(days: DayRow[]) {
  const map = new Map<string, { week: string; high: number; medium: number }>();
  for (const d of days) {
    const dt = new Date(`${d.date}T00:00:00`);
    const monday = new Date(dt.getTime() - ((dt.getDay() + 6) % 7) * 86400000);
    const key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    const w = map.get(key) || { week: key, high: 0, medium: 0 };
    w.high += d.high;
    w.medium += d.medium;
    map.set(key, w);
  }
  return [...map.values()];
}

function DataGlance() {
  const { tr } = useFg();
  const f = useFmt();
  const g = DATA_GLANCE;
  const cells: [string, string][] = [
    [tr('dg_txn'), f.int(g.nTxn)],
    [tr('dg_customers'), f.int(g.nCustomers)],
    [tr('dg_range'), `${g.start} → ${g.end}`],
    [tr('dg_columns'), f.int(g.nColumns)],
    [tr('dg_train'), `${g.train[0]} → ${g.train[1]}`],
    [tr('dg_test'), `${g.test[0]} → ${g.test[1]}`],
  ];
  return (
    <Panel title={tr('dg_title')} icon={Database}>
      <dl className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {cells.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11px] text-slate-500">{k}</dt>
            <dd className="text-sm font-semibold text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-slate-400 mt-3">{tr('dg_note')} {tr('dg_val', { r: `${g.val[0]} → ${g.val[1]}` })}</p>
    </Panel>
  );
}

export function FraudExecutive() {
  const { tr, typeName, lang } = useFg();
  const f = useFmt();
  const [period, setPeriod] = useState<PeriodKey>('all');

  const d = useMemo(() => {
    const days = periodDays(period);
    const k = summarize(days);
    const types = typeBreakdown(k.nAlerts);
    const weeks = weekly(days).map((w) => ({ ...w, label: f.day(w.week) }));
    const peak = days.reduce((a, b) => (b.high + b.medium > a.high + a.medium ? b : a));
    const target = DATA_GLANCE.thresholds.targetAlertRate * 100;
    const over = SEGMENT_RATE.filter((s) => s.rate > target * 2);
    const top = types[0];
    const params: Record<string, Record<string, string | number>> = {
      workload: { cases: f.dec(k.casesPerDay), alerts: f.dec(k.alertsPerDay), high: f.dec(k.highPerDay) },
      top_type: { label: typeName(top.type), share: f.dec(top.share * 100, 1) },
      concentration: { share: f.dec(4.8, 1), n: f.int(k.nCustomers) },
      peak_day: { date: peak.date, n: peak.high + peak.medium },
      segment_over: { segments: over.map((s) => s.segment).join(', '), rate: over.map((s) => f.dec(s.rate, 2)).join(' / '), target: f.dec(target, 2) },
      drift: { status: tr(`drift_${HEALTH.driftStatus}` as TextKey) },
    };
    const insights = Object.keys(INSIGHT_TONE)
      .filter((key) => key !== 'segment_over' || over.length > 0)
      .map((key) => ({ key, tone: INSIGHT_TONE[key], params: params[key] }));
    return { k, types, weeks, insights, cases: casesInPeriod(days).slice(0, 5) };
    // f/typeName/tr are recreated every render; their output only depends on lang.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, lang]);

  const { k } = d;
  const highW = (k.nHigh / Math.max(k.nAlerts, 1)) * 100;

  return (
    <div className="px-6 pt-3 pb-6 space-y-5">
      <PageTitle
        icon={Briefcase}
        title={tr('exec_title')}
        subtitle={tr('exec_sub')}
        actions={(
          <button type="button" onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 print:hidden">
            <Printer className="w-3.5 h-3.5" aria-hidden="true" /> {tr('print')}
          </button>
        )}
      />
      <MockBanner />
      <DataGlance />
      <PeriodBar value={period} onChange={setPeriod} />
      <Note tone="neutral">{tr('scope_note')}</Note>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1.6fr_1fr_1fr_1fr] gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{tr('exec_hero_label')}</div>
          <div className="text-3xl font-bold text-[#028DAA] mt-1">
            {f.dec(k.casesPerDay)} <span className="text-sm font-medium text-slate-500">{tr('exec_cases_day')}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{tr('exec_hero_sub', { alerts: f.dec(k.alertsPerDay), high: f.dec(k.highPerDay) })}</p>
          <div className="flex h-6 mt-3 rounded-lg overflow-hidden text-[11px] font-semibold text-white" aria-label={`${k.nHigh} high, ${k.nMedium} medium`}>
            <span className="flex items-center justify-center bg-red-600" style={{ width: `${highW}%` }}>{k.nHigh} high</span>
            <span className="flex items-center justify-center bg-amber-500" style={{ width: `${100 - highW}%` }}>{k.nMedium} medium</span>
          </div>
        </div>
        <StatCard icon={AlertTriangle} label={tr('kpi_alerts')} value={f.int(k.nAlerts)} sub={tr('kpi_alerts_sub', { p: f.pct(k.alertRate) })} hint={tr('kpi_alerts_hint')} />
        <StatCard icon={Banknote} label={tr('kpi_amount')} value={f.rupiahShort(k.amountFlagged)} sub={tr('exec_amount_sub')} hint={tr('kpi_amount_hint')} />
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{tr('exec_health')}</div>
          <div className="my-3"><DriftBadge status={HEALTH.driftStatus} /></div>
          <p className="text-xs text-slate-500">{tr('exec_health_sub')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-4">
        <Panel title={tr('exec_weekly')} desc={tr('exec_weekly_desc')} icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d.weeks} margin={{ left: -10, right: 8 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="label" {...AXIS} />
              <YAxis {...AXIS} allowDecimals={false} />
              <Tooltip {...TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar isAnimationActive={false} dataKey="high" stackId="a" name={tr('sev_high')} fill={C.high} />
              <Bar isAnimationActive={false} dataKey="medium" stackId="a" name={tr('sev_medium')} fill={C.medium} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title={tr('exec_insights')} icon={Info}>
          <ul className="space-y-2">
            {d.insights.map((it) => {
              const Icon = TONE_ICON[it.tone];
              return (
                <li key={it.key} className={`flex gap-2.5 p-3 rounded-xl border ${TONE_CLS[it.tone]}`}>
                  <Icon className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <div className="text-xs font-bold">{tr(`ins_${it.key}_t` as TextKey, it.params)}</div>
                    <div className="text-xs mt-0.5 opacity-90">{tr(`ins_${it.key}_b` as TextKey, it.params)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title={tr('exec_types')} desc={tr('exec_types_desc')} icon={Activity}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={TH}>{tr('col_type')}</th>
                  <th scope="col" className={THN}>{tr('kpi_alerts')}</th>
                  <th scope="col" className={THN}>{tr('exec_share')}</th>
                  <th scope="col" className={THN}>{tr('col_amount')}</th>
                </tr>
              </thead>
              <tbody>
                {d.types.map((x) => (
                  <tr key={x.type} className="hover:bg-slate-50">
                    <td className={TD}><TypeBadge type={x.type} /></td>
                    <td className={TDN}>{f.int(x.count)}</td>
                    <td className={TDN}>
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16"><ProgressBar value={x.share} max={1} color={TYPE_COLOR[x.type]} /></div>
                        {f.pct(x.share, 1)}
                      </div>
                    </td>
                    <td className={TDN}>{f.rupiahShort(x.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title={tr('exec_top_cases')} desc={tr('exec_top_cases_desc')} icon={Briefcase}>
          <CaseTable cases={d.cases} />
        </Panel>
      </div>

      <Note tone="neutral">
        <span className="inline-flex items-start gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
          <span><b>{tr('exec_limits_t')}</b> {tr('exec_limits_b')}</span>
        </span>
      </Note>
    </div>
  );
}
