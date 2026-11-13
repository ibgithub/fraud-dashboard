import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ALERTS, inPeriod, toCases } from './mockAlerts';
import {
  Activity, AlertTriangle, Banknote, Briefcase, CalendarClock, Flame, LayoutDashboard, Layers, ListChecks, ShieldCheck, Users,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  CHANNEL_SHARE, DATA_GLANCE, HEALTH, HOUR_PROFILE, LAST_DAY, SEGMENT_RATE, TOP_CASES, TYPE_COLOR, TYPE_SHARE,
  type CaseRow, type DayRow,
} from './mockData';
import { useFg } from './text';
import {
  AXIS, Badge, C, DriftBadge, MockBanner, Note, PageTitle, Panel, PeriodBar, ProgressBar, SeverityBadge, StatCard, TD, TDN, TH, THN,
  TOOLTIP, TypeBadge, periodDays, useFmt, type PeriodKey,
} from './ui';

// ---- aggregation over the selected period (shared with the Executive page) ----------------
export function summarize(days: DayRow[]) {
  const sum = (f: (d: DayRow) => number) => days.reduce((a, d) => a + f(d), 0);
  const nTxn = sum((d) => d.txn);
  const nHigh = sum((d) => d.high);
  const nMedium = sum((d) => d.medium);
  const nAlerts = nHigh + nMedium;
  // Cases and customers come from the alert rows, so every page counts them the same way.
  const rows = inPeriod(ALERTS, days);
  const nCases = toCases(rows).length;
  const n = days.length;
  return {
    nDays: n,
    nTxn,
    nAlerts,
    nHigh,
    nMedium,
    nCases,
    nCustomers: new Set(rows.map((a) => a.cust)).size,
    alertRate: nAlerts / Math.max(nTxn, 1),
    amountFlagged: sum((d) => d.amountFlagged),
    amountTotal: sum((d) => d.amountTotal),
    alertsPerDay: nAlerts / n,
    highPerDay: nHigh / n,
    casesPerDay: nCases / n,
  };
}

export function typeBreakdown(nAlerts: number) {
  return TYPE_SHARE.map((x) => {
    const count = Math.round(nAlerts * x.share);
    return { type: x.type, share: x.share, count, amount: count * x.avgAmount };
  });
}

export function casesInPeriod(days: DayRow[]): CaseRow[] {
  const from = days[0].date;
  const to = days[days.length - 1].date;
  return TOP_CASES.filter((c) => c.date >= from && c.date <= to);
}

// ---- top cases table (also used by the Executive page) -------------------------------------
export function CaseTable({ cases }: { cases: CaseRow[] }) {
  const { tr } = useFg();
  const f = useFmt();
  if (cases.length === 0) return <p className="text-xs text-slate-500 py-4 text-center">-</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th scope="col" className={TH}>{tr('col_customer')}</th>
            <th scope="col" className={TH}>{tr('col_date')}</th>
            <th scope="col" className={TH}>{tr('col_type')}</th>
            <th scope="col" className={THN}>{tr('col_rows')}</th>
            <th scope="col" className={THN}>{tr('col_amount')}</th>
            <th scope="col" className={THN}>{tr('col_pct')}</th>
            <th scope="col" className={TH}>{tr('col_severity')}</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.caseId} className="hover:bg-slate-50">
              <td className={`${TD} font-mono`}>{c.cust}</td>
              <td className={TD}>{f.day(c.date)}</td>
              <td className={TD}><TypeBadge type={c.type} /></td>
              <td className={TDN}>{c.rows}</td>
              <td className={TDN}>{f.rupiahShort(c.amount)}</td>
              <td className={TDN}>{f.pctile(c.maxPct)}</td>
              <td className={TD}><SeverityBadge sev={c.severity} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- latest day card ------------------------------------------------------------------------
function Delta({ cur, base, muted }: { cur: number; base: number; muted?: boolean }) {
  const { tr } = useFg();
  if (muted) return <span className="text-xs text-slate-400">-</span>;
  const p = ((cur - base) / base) * 100;
  const up = p >= 20;
  return (
    <span className={`text-xs font-semibold ${up ? 'text-amber-600' : 'text-slate-500'}`}>
      {p > 0 ? '+' : ''}{p.toFixed(0)}% {tr('ld_vs_avg')}
    </span>
  );
}

function DayBlock({ data }: { data: typeof LAST_DAY.complete }) {
  const { tr, weekday } = useFg();
  const f = useFmt();
  const s = data.stats;
  const b = data.base;
  const lowVolume = data.partial && s.txn < 0.5 * b.txn;
  const items: [string, string, number, number][] = [
    [tr('kpi_txn'), f.int(s.txn), s.txn, b.txn],
    [tr('kpi_alerts'), f.int(s.alerts), s.alerts, b.alerts],
    [tr('kpi_high'), f.int(s.high), s.high, b.high],
    [tr('kpi_cases'), f.int(s.cases), s.cases, b.cases],
    [tr('kpi_amount'), f.rupiahShort(s.amount), s.amount, b.amount],
  ];
  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <b className="text-sm text-slate-900">{weekday(data.weekday)}, {data.date}</b>
        {data.partial
          ? <Badge tone="medium">{tr('ld_partial', { h: String(data.uptoHour).padStart(2, '0') })}</Badge>
          : <Badge tone="green">{tr('ld_complete')}</Badge>}
        <span className="text-xs text-slate-400">{tr('ld_base_note', { n: data.baselineWeeks })}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {items.map(([label, txt, cur, base], i) => (
          <div key={label} className="border border-slate-200 rounded-xl p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{txt}</div>
            <Delta cur={cur} base={base} muted={lowVolume && i > 0} />
          </div>
        ))}
      </div>
      {lowVolume && <p className="text-xs text-slate-400 mt-2">{tr('ld_low_volume')}</p>}
    </div>
  );
}

// The latest complete day uses the case count derived from the alert rows (same as Daily Review).
const LAST_COMPLETE = {
  ...LAST_DAY.complete,
  stats: { ...LAST_DAY.complete.stats, cases: toCases(ALERTS.filter((a) => a.date === LAST_DAY.complete.date)).length },
};

function LastDayCard() {
  const { tr } = useFg();
  return (
    <Panel title={tr('ld_title')} desc={tr('ld_desc')} icon={CalendarClock}>
      <div className="space-y-4">
        <DayBlock data={LAST_COMPLETE} />
        <DayBlock data={LAST_DAY.partial} />
      </div>
    </Panel>
  );
}

// ---- page -----------------------------------------------------------------------------------
export function FraudOverview() {
  const { tr, typeName, lang } = useFg();
  const f = useFmt();
  const [period, setPeriod] = useState<PeriodKey>('all');

  const d = useMemo(() => {
    const days = periodDays(period);
    const k = summarize(days);
    const types = typeBreakdown(k.nAlerts).map((x) => ({ ...x, name: typeName(x.type) }));
    const daily = days.map((x) => ({ label: f.day(x.date), high: x.high, medium: x.medium }));

    const hw = HOUR_PROFILE.reduce((a, h) => a + h.txnShare * h.rateMult, 0);
    const hs = HOUR_PROFILE.reduce((a, h) => a + h.txnShare, 0);
    const hourly = HOUR_PROFILE.map((h) => {
      const flagged = Math.round((k.nAlerts * h.txnShare * h.rateMult) / hw);
      const n = (k.nTxn * h.txnShare) / hs;
      return { hour: h.hour, flagged, rate: (flagged / Math.max(n, 1)) * 100 };
    });

    const segN = SEGMENT_RATE.reduce((a, s) => a + s.n, 0);
    const categories = SEGMENT_RATE.map((s) => {
      const n = Math.round((k.nTxn * s.n) / segN);
      return { name: s.segment, n, flagged: Math.round((n * s.rate) / 100), rate: s.rate };
    }).sort((a, b) => b.rate - a.rate);

    const cw = CHANNEL_SHARE.reduce((a, c) => a + c.txnShare * c.rateMult, 0);
    const channels = CHANNEL_SHARE.map((c) => {
      const n = Math.round(k.nTxn * c.txnShare);
      const flagged = Math.round((k.nAlerts * c.txnShare * c.rateMult) / cw);
      return { name: c.channel, n, flagged, rate: flagged / Math.max(n, 1) };
    });

    const reviewed = inPeriod(ALERTS, days).filter((a) => a.decision).length;
    return { k, types, daily, hourly, categories, channels, cases: casesInPeriod(days), reviewed };
    // f/typeName are recreated every render; their output only depends on lang.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, lang]);

  const { k } = d;
  const target = DATA_GLANCE.thresholds.targetAlertRate * 100;
  const maxCatRate = Math.max(...d.categories.map((x) => x.rate));
  const maxChRate = Math.max(...d.channels.map((x) => x.rate));

  return (
    <div className="px-6 pt-3 pb-6 space-y-5">
      <PageTitle icon={LayoutDashboard} title={tr('ov_title')} subtitle={tr('ov_sub')} />
      <MockBanner />
      <LastDayCard />
      <PeriodBar value={period} onChange={setPeriod} />
      <Note tone="neutral">{tr('scope_note')}</Note>
      <Note><span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />{tr('ov_nolabel')}</span></Note>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={Layers} label={tr('kpi_txn')} value={f.int(k.nTxn)} sub={tr('kpi_txn_sub', { n: k.nDays })} />
        <StatCard icon={AlertTriangle} label={tr('kpi_alerts')} value={f.int(k.nAlerts)} sub={tr('kpi_alerts_sub', { p: f.pct(k.alertRate) })} hint={tr('kpi_alerts_hint')} />
        <StatCard icon={Flame} label={tr('kpi_high')} value={f.int(k.nHigh)} tone="neg" sub={tr('kpi_high_sub', { n: f.dec(k.highPerDay) })} />
        <StatCard icon={Briefcase} label={tr('kpi_cases')} value={f.int(k.nCases)} sub={tr('kpi_cases_sub', { n: f.dec(k.casesPerDay) })} hint={tr('kpi_cases_hint')} />
        <StatCard icon={Users} label={tr('kpi_customers')} value={f.int(k.nCustomers)} sub={tr('kpi_customers_sub')} />
        <StatCard icon={Banknote} label={tr('kpi_amount')} value={f.rupiahShort(k.amountFlagged)} sub={tr('kpi_amount_sub', { p: f.pct(k.amountFlagged / Math.max(k.amountTotal, 1)) })} hint={tr('kpi_amount_hint')} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title={tr('ov_trend')} desc={tr('ov_trend_desc')} icon={Activity}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d.daily} margin={{ left: -10, right: 8 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="label" {...AXIS} interval="preserveStartEnd" minTickGap={24} />
              <YAxis {...AXIS} allowDecimals={false} />
              <Tooltip {...TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar isAnimationActive={false} dataKey="high" stackId="a" name={tr('sev_high')} fill={C.high} />
              <Bar isAnimationActive={false} dataKey="medium" stackId="a" name={tr('sev_medium')} fill={C.medium} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title={tr('ov_types')} desc={tr('ov_types_desc')} icon={Layers}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d.types} layout="vertical" margin={{ left: 10, right: 16 }}>
              <CartesianGrid stroke={C.grid} horizontal={false} />
              <XAxis type="number" {...AXIS} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={180} interval={0} {...AXIS} />
              <Tooltip {...TOOLTIP} />
              <Bar isAnimationActive={false} dataKey="count" name={tr('kpi_alerts')} radius={[0, 4, 4, 0]}>
                {d.types.map((x) => <Cell key={x.type} fill={TYPE_COLOR[x.type]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title={tr('ov_segments')} desc={tr('ov_segments_desc', { t: f.dec(target, 2) })} icon={Layers}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={d.categories} margin={{ left: -10, right: 8 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="name" interval={0} {...AXIS} tick={{ fill: C.muted, fontSize: 9 }} angle={-18} textAnchor="end" height={56} />
              <YAxis {...AXIS} unit="%" />
              <Tooltip {...TOOLTIP} formatter={(v: number) => `${f.dec(v, 2)}%`} />
              <ReferenceLine y={target} stroke={C.green} strokeDasharray="4 3" label={{ value: tr('ov_target'), fill: C.green, fontSize: 11, position: 'right' }} />
              <Bar isAnimationActive={false} dataKey="rate" name={tr('ov_alert_rate')} fill={C.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-500 mt-1">{tr('ov_segments_note')}</p>
        </Panel>
        <Panel title={tr('ov_hours')} desc={tr('ov_hours_desc')} icon={Activity}>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={d.hourly} margin={{ left: -10, right: 8 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="hour" {...AXIS} />
              <YAxis yAxisId="l" {...AXIS} allowDecimals={false} />
              <YAxis yAxisId="r" orientation="right" {...AXIS} unit="%" />
              <Tooltip {...TOOLTIP} formatter={(v: number, name: string) => (name === tr('ov_alert_rate') ? `${f.dec(v, 2)}%` : f.int(v))} />
              <Bar isAnimationActive={false} yAxisId="l" dataKey="flagged" name={tr('kpi_alerts')} fill={C.accent} radius={[3, 3, 0, 0]} />
              <Line isAnimationActive={false} yAxisId="r" dataKey="rate" name={tr('ov_alert_rate')} stroke={C.medium} dot={false} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title={tr('ov_categories')} desc={tr('ov_categories_desc')} icon={Layers}>
          <ul className="space-y-2.5">
            {d.categories.map((c) => (
              <li key={c.name} className="grid grid-cols-[150px_1fr_110px] items-center gap-3 text-xs">
                <span className="text-slate-700 truncate">{c.name}</span>
                <ProgressBar value={c.rate} max={maxCatRate} label={c.name} />
                <span className="text-right tabular-nums text-slate-800">{f.int(c.flagged)} <span className="text-slate-400">/ {f.int(c.n)}</span></span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={tr('ov_channels')} desc={tr('ov_channels_desc')} icon={Layers}>
          <ul className="space-y-2.5">
            {d.channels.map((c) => (
              <li key={c.name} className="grid grid-cols-[150px_1fr_110px] items-center gap-3 text-xs">
                <span className="text-slate-700 font-mono">{c.name}</span>
                <ProgressBar value={c.rate} max={maxChRate} label={c.name} />
                <span className="text-right tabular-nums text-slate-800">{f.int(c.flagged)} <span className="text-slate-400">/ {f.int(c.n)}</span></span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel className="xl:col-span-2" title={tr('ov_top_cases')} desc={tr('ov_top_cases_desc')} icon={ListChecks}
               actions={<Link to="/fraud/alerts" className="text-xs font-semibold text-[#028DAA] hover:underline">{tr('see_all')}</Link>}>
          <CaseTable cases={d.cases} />
        </Panel>
        <div className="space-y-4">
          <Panel title={tr('ov_health')} icon={Activity}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">{tr('ov_health_status')}</span>
              <DriftBadge status={HEALTH.driftStatus} />
            </div>
            <p className="text-xs text-slate-500 mt-3">{tr('ov_health_desc')}</p>
            <p className="text-[11px] text-slate-400 mt-2">Drift Monitor · {tr('coming_soon')}</p>
          </Panel>
          <Panel title={tr('ov_review')} icon={ListChecks}>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-500">{tr('ov_review_done')}</span>
              <b className="text-slate-900 tabular-nums">{f.int(d.reviewed)} / {f.int(k.nAlerts)}</b>
            </div>
            <div className="mt-3"><ProgressBar value={d.reviewed} max={k.nAlerts} color={C.green} label={tr('ov_review_done')} /></div>
            <Link to="/fraud/review" className="inline-block text-xs font-semibold text-[#028DAA] hover:underline mt-2">{tr('ra_title')} →</Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}
