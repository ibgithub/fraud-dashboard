import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, FastForward, Lightbulb, Pause, Play, Radio, RotateCcw, SkipForward } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DATA_GLANCE, HIGHLIGHTS, STREAM_TOTAL, streamTxn, type StreamTxn } from './mockData';
import { useFg } from './text';
import {
  AXIS, Badge, C, MockBanner, PageTitle, Panel, ProgressBar, SeverityBadge, StatCard, TD, TDN, TH, THN, TOOLTIP, TypeBadge, useFmt,
} from './ui';

// Client-side replay of the June 2026 stream (the real FraudGuard page reads it from a WebSocket).
const SPEEDS = [1, 2, 5, 20, 100];
const TICK_MS = 250;      // one tick processes `speed` transactions
const MAX_FEED = 60;
const MAX_ALERTS = 80;
const MAX_CHART = 160;

interface Buf {
  index: number;
  feed: StreamTxn[];
  alerts: StreamTxn[];
  chart: { i: number; pct: number; flagged: boolean; sev: string | null }[];
  stats: { processed: number; alerts: number; high: number };
  lastTs: string | null;
}
const emptyBuf = (index = 0): Buf => ({ index, feed: [], alerts: [], chart: [], stats: { processed: 0, alerts: 0, high: 0 }, lastTs: null });

export function FraudLive() {
  const { tr, lang } = useFg();
  const f = useFmt();
  const thr = DATA_GLANCE.thresholds;

  const buf = useRef<Buf>(emptyBuf());
  const [view, setView] = useState<Buf>(emptyBuf());
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [autoPause, setAutoPause] = useState(true);
  const [autoPaused, setAutoPaused] = useState(false);
  const autoPauseRef = useRef(autoPause);
  useEffect(() => { autoPauseRef.current = autoPause; }, [autoPause]);

  const flush = () => {
    const b = buf.current;
    setView({ ...b, feed: [...b.feed], alerts: [...b.alerts], chart: [...b.chart], stats: { ...b.stats } });
  };

  /** Process up to n transactions; stops early on a High alert when auto-pause is on. Returns true if stopped. */
  const step = useCallback((n: number): boolean => {
    const b = buf.current;
    for (let i = 0; i < n && b.index < STREAM_TOTAL; i++) {
      const tx = streamTxn(b.index);
      b.index += 1;
      b.feed = [tx, ...b.feed].slice(0, MAX_FEED);
      b.chart = [...b.chart, { i: tx.index, pct: tx.pct, flagged: tx.flagged, sev: tx.severity }].slice(-MAX_CHART);
      b.stats.processed += 1;
      b.lastTs = tx.ts;
      if (tx.flagged) {
        b.alerts = [tx, ...b.alerts].slice(0, MAX_ALERTS);
        b.stats.alerts += 1;
        if (tx.severity === 'high') {
          b.stats.high += 1;
          if (autoPauseRef.current) return true;
        }
      }
    }
    return b.index >= STREAM_TOTAL;
  }, []);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => {
      const stopped = step(speed);
      flush();
      if (stopped) {
        setPlaying(false);
        if (buf.current.index < STREAM_TOTAL) setAutoPaused(true);
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [playing, speed, step]);

  const play = () => { setAutoPaused(false); setPlaying(true); };
  const pause = () => setPlaying(false);
  const reset = () => { setPlaying(false); setAutoPaused(false); buf.current = emptyBuf(); flush(); };
  const nextAlert = () => {
    // fast-forward to the next flagged transaction, then keep playing
    const b = buf.current;
    let guard = 0;
    while (b.index < STREAM_TOTAL && guard < 20000) {
      guard += 1;
      if (streamTxn(b.index).flagged) break;
      step(1);
    }
    const stopped = step(1); // the flagged transaction itself
    flush();
    if (stopped && b.index < STREAM_TOTAL) {
      setPlaying(false);
      setAutoPaused(true); // landed on a High alert with auto-pause on
    } else {
      play();
    }
  };
  const playFrom = (index: number) => {
    buf.current.index = Math.max(index - 3, 0);
    flush();
    play();
  };

  const s = view.stats;
  const alertRate = s.processed ? ((s.alerts / s.processed) * 100).toFixed(2) : '0.00';
  const btn = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition disabled:opacity-50';

  return (
    <div className="px-6 pt-3 pb-6 space-y-5">
      <PageTitle icon={Radio} title={tr('ls_title')} subtitle={tr('ls_sub')} actions={<Badge tone="green" dot>{tr('ls_connected')}</Badge>} />
      <MockBanner />

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3 flex-wrap">
        {playing ? (
          <button type="button" onClick={pause} className={`${btn} bg-amber-500 border-amber-500 text-white hover:bg-amber-600`}>
            <Pause className="w-4 h-4" aria-hidden="true" /> {tr('ls_pause')}
          </button>
        ) : (
          <button type="button" onClick={play} disabled={view.index >= STREAM_TOTAL} className={`${btn} bg-[#13385E] border-[#13385E] text-white hover:bg-[#1E4B75]`}>
            <Play className="w-4 h-4" aria-hidden="true" /> {tr('ls_play')}
          </button>
        )}
        <button type="button" onClick={reset} className={`${btn} bg-white border-slate-300 text-slate-700 hover:bg-slate-50`}>
          <RotateCcw className="w-4 h-4" aria-hidden="true" /> {tr('ls_reset')}
        </button>
        <button type="button" onClick={nextAlert} className={`${btn} bg-white border-slate-300 text-slate-700 hover:bg-slate-50`}>
          <SkipForward className="w-4 h-4" aria-hidden="true" /> {tr('ls_next_alert')}
        </button>
        <div className="flex items-center gap-2">
          <FastForward className="w-4 h-4 text-slate-400" aria-hidden="true" />
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5" role="group" aria-label={tr('ls_speed')}>
            {SPEEDS.map((v) => (
              <button key={v} type="button" aria-pressed={speed === v} onClick={() => setSpeed(v)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md ${speed === v ? 'bg-[#028DAA] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {v}x
              </button>
            ))}
          </div>
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" checked={autoPause} onChange={(e) => setAutoPause(e.target.checked)} className="accent-[#028DAA]" />
          {tr('ls_autopause')}
        </label>
        {autoPaused && <span role="status" className="text-xs font-semibold text-red-600">{tr('ls_autopaused')}</span>}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Activity} label={tr('ls_processed')} value={f.int(s.processed)} sub={view.lastTs ? f.dateTime(view.lastTs) : '-'} />
        <StatCard label={tr('kpi_alerts')} value={f.int(s.alerts)} sub={tr('ls_alert_rate', { p: lang === 'en' ? alertRate : alertRate.replace('.', ',') })} />
        <StatCard label={tr('kpi_high')} value={f.int(s.high)} tone="neg" />
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{tr('ls_progress')}</div>
          <div className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{f.int(view.index)} / {f.int(STREAM_TOTAL)}</div>
          <div className="mt-3"><ProgressBar value={view.index} max={STREAM_TOTAL} label={tr('ls_progress')} /></div>
        </div>
      </div>

      <Panel title={tr('ls_chart')} desc={tr('ls_chart_desc')} icon={Activity}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={view.chart} margin={{ left: -10, right: 8 }}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="i" hide />
            <YAxis domain={[0, 100]} {...AXIS} />
            <Tooltip {...TOOLTIP} formatter={(v: number) => f.dec(v, 2)} labelFormatter={(l) => `#${l}`} />
            <ReferenceLine y={thr.flagPct} stroke={C.medium} strokeDasharray="4 3" />
            <ReferenceLine y={thr.highPct} stroke={C.high} strokeDasharray="4 3" />
            <Line
              dataKey="pct" name={tr('col_pct')} stroke={C.accent} strokeWidth={1.5} isAnimationActive={false}
              dot={(p: { cx?: number; cy?: number; index?: number; payload?: { flagged: boolean; sev: string | null } }) =>
                p.payload?.flagged
                  ? <circle key={p.index} cx={p.cx} cy={p.cy} r={4} fill={p.payload.sev === 'high' ? C.high : C.medium} />
                  : <g key={p.index} />}
            />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title={tr('ls_alerts')} desc={tr('ls_alerts_desc')} icon={Activity}>
          {view.alerts.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-semibold text-slate-700">{tr('ls_no_alerts')}</p>
              <p className="text-xs text-slate-500 mt-1">{tr('ls_no_alerts_desc')}</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[360px]">
              <table className="w-full border-collapse">
                <thead className="sticky top-0">
                  <tr>
                    <th scope="col" className={TH}>{tr('col_time')}</th>
                    <th scope="col" className={TH}>{tr('col_customer')}</th>
                    <th scope="col" className={TH}>{tr('col_type')}</th>
                    <th scope="col" className={THN}>{tr('col_amount')}</th>
                    <th scope="col" className={THN}>{tr('col_pct')}</th>
                    <th scope="col" className={TH}>{tr('col_severity')}</th>
                  </tr>
                </thead>
                <tbody>
                  {view.alerts.map((a) => (
                    <tr key={a.index} className="hover:bg-slate-50">
                      <td className={TD}>{f.time(a.ts)}</td>
                      <td className={`${TD} font-mono`}>{a.cust}</td>
                      <td className={TD}>{a.type && <TypeBadge type={a.type} />}</td>
                      <td className={TDN}>{f.rupiah(a.amount)}</td>
                      <td className={TDN}>{f.pctile(a.pct)}</td>
                      <td className={TD}>{a.severity && <SeverityBadge sev={a.severity} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <Panel title={tr('ls_feed')} icon={Radio}>
          {view.feed.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">{tr('ls_feed_empty')}</p>
          ) : (
            <div className="overflow-auto max-h-[360px]">
              <table className="w-full border-collapse">
                <thead className="sticky top-0">
                  <tr>
                    <th scope="col" className={TH}>{tr('col_time')}</th>
                    <th scope="col" className={TH}>{tr('col_customer')}</th>
                    <th scope="col" className={TH}>{tr('col_category')}</th>
                    <th scope="col" className={THN}>{tr('col_amount')}</th>
                    <th scope="col" className={THN}>{tr('col_pct')}</th>
                  </tr>
                </thead>
                <tbody>
                  {view.feed.map((m) => (
                    <tr key={m.index} className={m.flagged ? (m.severity === 'high' ? 'bg-red-50' : 'bg-amber-50') : 'hover:bg-slate-50'}>
                      <td className={TD}>{f.time(m.ts)}</td>
                      <td className={`${TD} font-mono`}>{m.cust}</td>
                      <td className={TD}>{m.category}</td>
                      <td className={TDN}>{f.rupiah(m.amount)}</td>
                      <td className={TDN}>{f.pctile(m.pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <Panel title={tr('ls_highlights')} desc={tr('ls_highlights_desc')} icon={Lightbulb}>
        <ul className="space-y-2">
          {HIGHLIGHTS.map((h) => (
            <li key={h.type} className="flex items-center gap-3 p-3 rounded-xl border border-cyan-100 bg-cyan-50/50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <TypeBadge type={h.type} />
                  <span className="text-[11px] text-slate-400">{tr('ls_hl_count', { n: h.count })}</span>
                </div>
                <p className="text-xs text-slate-700 mt-1">{lang === 'en' ? h.reasonEn : h.reasonId}</p>
                <p className="text-[11px] text-slate-400">{f.rupiah(h.amount)} · {h.category} · pct {f.pctile(h.pct)}</p>
              </div>
              <button type="button" onClick={() => playFrom(h.index)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shrink-0">
                <Play className="w-3.5 h-3.5" aria-hidden="true" /> {tr('ls_play_from')}
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
