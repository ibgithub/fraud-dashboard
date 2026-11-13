import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Briefcase, Check, ListPlus, Repeat, Sunrise } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DAILY, type AnomalyType } from './mockData';
import { ALERTS, toCases, useReviewQueue } from './mockAlerts';
import { useFg } from './text';
import {
  AXIS, Badge, C, MockBanner, Note, PageTitle, Panel, PeriodBar, SeverityBadge, StatCard, TD, TDN, TH, THN, TOOLTIP, TypeBadge,
  periodDays, useFmt, type PeriodKey,
} from './ui';

const flaggedOf = (i: number) => DAILY[i].high + DAILY[i].medium;

/** Alerts on day i versus the average of the 7 days before it (null when there is no full baseline). */
function baseline(i: number) {
  if (i < 7) return { avg: null as number | null, x: null as number | null };
  let s = 0;
  for (let j = i - 7; j < i; j++) s += flaggedOf(j);
  const avg = s / 7;
  return { avg, x: avg > 0 ? flaggedOf(i) / avg : null };
}

function DayDetail({ date }: { date: string }) {
  const { tr, reason } = useFg();
  const f = useFmt();
  const queue = useReviewQueue();

  const d = useMemo(() => {
    const idx = DAILY.findIndex((x) => x.date === date);
    const day = DAILY[idx];
    const alerts = ALERTS.filter((a) => a.date === date);
    const cases = toCases(alerts).sort((a, b) => b.maxPct - a.maxPct);
    const typeCount = new Map<AnomalyType, number>();
    alerts.forEach((a) => typeCount.set(a.type, (typeCount.get(a.type) || 0) + 1));
    const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, flagged: alerts.filter((a) => a.hour === h).length }));

    // repeat customers: flagged today and on earlier days within the previous 7 days
    const fromPrev = DAILY[Math.max(idx - 7, 0)].date;
    const prev = ALERTS.filter((a) => a.date >= fromPrev && a.date < date);
    const repeat = [...new Set(alerts.map((a) => a.cust))]
      .map((cust) => {
        const today = alerts.filter((a) => a.cust === cust);
        const prevDays = new Set(prev.filter((a) => a.cust === cust).map((a) => a.date)).size;
        return { cust, today: today.length, prevDays, maxPct: Math.max(...today.map((a) => a.pct)) };
      })
      .filter((r) => r.prevDays > 0)
      .sort((a, b) => b.prevDays - a.prevDays || b.maxPct - a.maxPct);

    return {
      day,
      base: baseline(idx),
      nAlerts: alerts.length,
      nCustomers: new Set(alerts.map((a) => a.cust)).size,
      amount: alerts.reduce((s, a) => s + a.amount, 0),
      cases,
      types: [...typeCount.entries()].sort((a, b) => b[1] - a[1]),
      hourly,
      repeat,
    };
  }, [date]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label={tr('kpi_txn')} value={f.int(d.day.txn)} />
        <StatCard
          icon={AlertTriangle}
          label={tr('kpi_alerts')}
          value={f.int(d.nAlerts)}
          sub={d.base.avg != null ? tr('dr_vs_avg', { avg: f.dec(d.base.avg), x: d.base.x != null ? f.dec(d.base.x) : '-' }) : tr('dr_no_baseline')}
        />
        <StatCard icon={Briefcase} label={tr('kpi_cases')} value={f.int(d.cases.length)} sub={tr('dr_customers', { n: d.nCustomers })} />
        <StatCard label={tr('kpi_amount')} value={f.rupiahShort(d.amount)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title={tr('dr_types')} icon={Activity}>
          {d.types.length === 0 ? <p className="text-xs text-slate-500">{tr('dr_no_alerts')}</p> : (
            <ul className="flex flex-wrap gap-2">
              {d.types.map(([type, n]) => (
                <li key={type} className="inline-flex items-center gap-1.5"><TypeBadge type={type} /><b className="text-xs text-slate-800">{n}</b></li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title={tr('dr_hourly')} icon={Activity}>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={d.hourly} margin={{ left: -20, right: 8 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="hour" {...AXIS} />
              <YAxis {...AXIS} allowDecimals={false} />
              <Tooltip {...TOOLTIP} />
              <Bar isAnimationActive={false} dataKey="flagged" name={tr('kpi_alerts')} fill={C.accent} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title={tr('dr_cases')} desc={tr('dr_cases_desc')} icon={Briefcase}>
        {d.cases.length === 0 ? <p className="text-xs text-slate-500 py-4 text-center">{tr('dr_no_alerts')}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={TH}>{tr('col_customer')}</th>
                  <th scope="col" className={TH}>{tr('col_type')}</th>
                  <th scope="col" className={TH}>{tr('col_reason')}</th>
                  <th scope="col" className={THN}>{tr('col_rows')}</th>
                  <th scope="col" className={THN}>{tr('col_amount')}</th>
                  <th scope="col" className={THN}>{tr('col_pct')}</th>
                  <th scope="col" className={TH}>{tr('col_severity')}</th>
                  <th scope="col" className={TH}><span className="sr-only">{tr('dr_follow_up')}</span></th>
                </tr>
              </thead>
              <tbody>
                {d.cases.map((c) => {
                  const queued = c.ids.every((i) => queue.has(i));
                  return (
                    <tr key={c.caseId} className="hover:bg-slate-50">
                      <td className={`${TD} font-mono`}>{c.cust}</td>
                      <td className={TD}><TypeBadge type={c.type} /></td>
                      <td className={`${TD} whitespace-normal min-w-[240px] max-w-[320px] text-slate-500`}>{reason(c.reason)}</td>
                      <td className={TDN}>{c.rows}</td>
                      <td className={TDN}>{f.rupiahShort(c.amount)}</td>
                      <td className={TDN}>{f.dec(c.maxPct, 2)}</td>
                      <td className={TD}><SeverityBadge sev={c.severity} /></td>
                      <td className={TD}>
                        <button
                          type="button"
                          disabled={queued}
                          onClick={() => queue.add(c.ids)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          {queued
                            ? <><Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" /> {tr('dr_queued')}</>
                            : <><ListPlus className="w-3.5 h-3.5" aria-hidden="true" /> {tr('dr_follow_up')}</>}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title={tr('dr_repeat')} desc={tr('dr_repeat_desc')} icon={Repeat}>
        {d.repeat.length === 0 ? <p className="text-xs text-slate-500">{tr('dr_no_repeat')}</p> : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th scope="col" className={TH}>{tr('col_customer')}</th>
                <th scope="col" className={THN}>{tr('dr_today')}</th>
                <th scope="col" className={THN}>{tr('dr_prev_days')}</th>
                <th scope="col" className={THN}>{tr('col_pct')}</th>
              </tr>
            </thead>
            <tbody>
              {d.repeat.map((r) => (
                <tr key={r.cust} className="hover:bg-slate-50">
                  <td className={`${TD} font-mono`}>{r.cust}</td>
                  <td className={TDN}>{r.today}</td>
                  <td className={TDN}>{r.prevDays}</td>
                  <td className={TDN}>{f.dec(r.maxPct, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

export function FraudDailyReview() {
  const { tr } = useFg();
  const f = useFmt();
  const [period, setPeriod] = useState<PeriodKey>('all');

  const days = useMemo(() => periodDays(period).map((d) => {
    const i = DAILY.indexOf(d);
    return { date: d.date, flagged: d.high + d.medium, x: baseline(i).x };
  }), [period]);

  // default/selected day: keep it if still in the period, otherwise the busiest day
  const [date, setDate] = useState<string>(() => days.reduce((a, b) => (b.flagged > a.flagged ? b : a)).date);
  useEffect(() => {
    if (!days.some((d) => d.date === date)) setDate(days.reduce((a, b) => (b.flagged > a.flagged ? b : a)).date);
  }, [days, date]);

  return (
    <div className="px-6 pt-3 pb-6 space-y-5">
      <PageTitle icon={Sunrise} title={tr('dr_title')} subtitle={tr('dr_sub')} />
      <MockBanner />
      <PeriodBar value={period} onChange={setPeriod} />
      <Note tone="neutral">{tr('scope_note')}</Note>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
        <nav aria-label={tr('dr_days')} className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm max-h-[75vh] overflow-auto">
          <ul className="space-y-0.5">
            {[...days].reverse().map((d) => {
              const active = d.date === date;
              const hot = d.x != null && d.x >= 2;
              return (
                <li key={d.date}>
                  <button
                    type="button"
                    aria-current={active ? 'date' : undefined}
                    onClick={() => setDate(d.date)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs border-l-4 transition ${active ? 'border-[#028DAA] bg-[#E7F4F6] text-slate-900 font-semibold' : 'border-transparent text-slate-600 hover:bg-slate-50'}`}
                  >
                    <span>{f.day(d.date)}</span>
                    <span className="flex items-center gap-2">
                      {hot && <Badge tone="medium">{f.dec(d.x as number)}x</Badge>}
                      <b className="text-slate-900">{d.flagged}</b>
                      <span className="text-[11px] text-slate-400">{tr('dr_alerts_short')}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <div>
          <h2 className="text-sm font-bold text-slate-900 mb-3">{f.day(date)} · {date}</h2>
          <DayDetail date={date} />
        </div>
      </div>
    </div>
  );
}
