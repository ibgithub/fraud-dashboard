import { useMemo, useState } from 'react';
import { ArrowUpRight, CheckCircle2, ClipboardCheck, Download, Hourglass, Info, ListChecks, XCircle } from 'lucide-react';
import { TYPE_SHARE, type AnomalyType } from './mockData';
import { ALERTS, inPeriod, useReviewQueue, type AlertRow } from './mockAlerts';
import { useFg } from './text';
import {
  C, DecisionBadge, MockBanner, Note, PageTitle, Panel, PeriodBar, ProgressBar, SeverityBadge, StatCard, TD, TDN, TH, THN, TypeBadge,
  periodDays, useFmt, type PeriodKey,
} from './ui';

function stats(rows: AlertRow[]) {
  const confirmed = rows.filter((a) => a.decision === 'confirmed').length;
  const dismissed = rows.filter((a) => a.decision === 'dismissed').length;
  const escalate = rows.filter((a) => a.decision === 'escalate').length;
  const reviewed = confirmed + dismissed + escalate;
  return {
    alerts: rows.length,
    reviewed,
    confirmed,
    dismissed,
    escalate,
    pending: rows.length - reviewed,
    confirmRate: confirmed + dismissed > 0 ? confirmed / (confirmed + dismissed) : null,
  };
}

function RateCell({ r }: { r: number | null }) {
  const f = useFmt();
  if (r == null) return <span className="text-slate-400">-</span>;
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="w-14"><ProgressBar value={r} max={1} color={C.high} /></div>
      {f.pct(r, 0)}
    </div>
  );
}

/** Client-side CSV of the decisions in the period (mock data only). */
function downloadCsv(rows: AlertRow[]) {
  const head = ['id', 'ts', 'customer', 'category', 'amount', 'anomaly_type', 'severity', 'percentile', 'decision', 'analyst', 'decided_at', 'note'];
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.filter((a) => a.decision).map((a) =>
    [a.id, a.ts, a.cust, a.category, a.amount, a.type, a.severity, a.pct.toFixed(4), a.decision, a.analyst, a.decidedAt, a.note].map(esc).join(','));
  const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'keputusan_analis_mockup.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export function FraudReviewAnalyst() {
  const { tr } = useFg();
  const f = useFmt();
  const queue = useReviewQueue();
  const [period, setPeriod] = useState<PeriodKey>('all');

  const d = useMemo(() => {
    const rows = inPeriod(ALERTS, periodDays(period));
    const byType = TYPE_SHARE.map((x) => x.type as AnomalyType)
      .map((type) => ({ type, ...stats(rows.filter((a) => a.type === type)) }))
      .filter((x) => x.alerts > 0)
      .sort((a, b) => b.alerts - a.alerts);
    const bySev = (['high', 'medium'] as const).map((sev) => ({ sev, ...stats(rows.filter((a) => a.severity === sev)) }));
    const recent = rows.filter((a) => a.decidedAt).sort((a, b) => (b.decidedAt! > a.decidedAt! ? 1 : -1)).slice(0, 12);
    return { rows, total: stats(rows), byType, bySev, recent };
  }, [period]);

  const k = d.total;

  return (
    <div className="px-6 pt-3 pb-6 space-y-5">
      <PageTitle icon={ClipboardCheck} title={tr('ra_title')} subtitle={tr('ra_sub')} />
      <MockBanner />
      <PeriodBar value={period} onChange={setPeriod} />
      <Note tone="neutral">{tr('scope_note')}</Note>
      <Note>
        <span className="inline-flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
          <span><b>{tr('ra_how_t')}</b> {tr('ra_how_b')}</span>
        </span>
      </Note>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={ListChecks} label={tr('kpi_alerts')} value={f.int(k.alerts)} />
        <StatCard icon={ClipboardCheck} label={tr('ra_reviewed')} value={f.int(k.reviewed)} sub={tr('ra_reviewed_sub', { p: f.pct(k.reviewed / Math.max(k.alerts, 1), 1) })} />
        <StatCard icon={XCircle} label={tr('dec_confirmed')} value={f.int(k.confirmed)} tone="neg" />
        <StatCard icon={CheckCircle2} label={tr('dec_dismissed')} value={f.int(k.dismissed)} tone="pos" />
        <StatCard icon={ArrowUpRight} label={tr('dec_escalate')} value={f.int(k.escalate)} />
        <StatCard icon={Hourglass} label={tr('ra_pending')} value={f.int(k.pending)} sub={tr('ra_queue', { n: queue.size() })} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
        <Panel title={tr('ra_by_type')} desc={tr('ra_by_type_desc')} icon={ClipboardCheck}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={TH}>{tr('col_type')}</th>
                  <th scope="col" className={THN}>{tr('kpi_alerts')}</th>
                  <th scope="col" className={THN}>{tr('ra_reviewed')}</th>
                  <th scope="col" className={THN}>{tr('dec_confirmed')}</th>
                  <th scope="col" className={THN}>{tr('dec_dismissed')}</th>
                  <th scope="col" className={THN}>{tr('ra_confirm_rate')}</th>
                </tr>
              </thead>
              <tbody>
                {d.byType.map((x) => (
                  <tr key={x.type} className="hover:bg-slate-50">
                    <td className={TD}><TypeBadge type={x.type} /></td>
                    <td className={TDN}>{f.int(x.alerts)}</td>
                    <td className={TDN}>{f.int(x.reviewed)}</td>
                    <td className={TDN}>{f.int(x.confirmed)}</td>
                    <td className={TDN}>{f.int(x.dismissed)}</td>
                    <td className={TDN}><RateCell r={x.confirmRate} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">{tr('ra_rate_note')}</p>
        </Panel>
        <Panel title={tr('ra_by_sev')} icon={ClipboardCheck}>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th scope="col" className={TH}>{tr('col_severity')}</th>
                <th scope="col" className={THN}>{tr('kpi_alerts')}</th>
                <th scope="col" className={THN}>{tr('ra_reviewed')}</th>
                <th scope="col" className={THN}>{tr('ra_confirm_rate')}</th>
              </tr>
            </thead>
            <tbody>
              {d.bySev.map((x) => (
                <tr key={x.sev} className="hover:bg-slate-50">
                  <td className={TD}><SeverityBadge sev={x.sev} /></td>
                  <td className={TDN}>{f.int(x.alerts)}</td>
                  <td className={TDN}>{f.int(x.reviewed)}</td>
                  <td className={TDN}><RateCell r={x.confirmRate} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Panel
        title={tr('ra_recent')}
        icon={ListChecks}
        actions={(
          <button type="button" onClick={() => downloadCsv(d.rows)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">
            <Download className="w-3.5 h-3.5" aria-hidden="true" /> {tr('ra_export')}
          </button>
        )}
      >
        {d.recent.length === 0 ? <p className="text-xs text-slate-500 py-4 text-center">{tr('ra_empty')}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={TH}>ID</th>
                  <th scope="col" className={TH}>{tr('col_type')}</th>
                  <th scope="col" className={TH}>{tr('col_severity')}</th>
                  <th scope="col" className={TH}>{tr('col_review')}</th>
                  <th scope="col" className={TH}>{tr('ra_analyst')}</th>
                  <th scope="col" className={TH}>{tr('ra_when')}</th>
                  <th scope="col" className={TH}>{tr('ra_note')}</th>
                </tr>
              </thead>
              <tbody>
                {d.recent.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className={`${TD} font-mono text-[#028DAA]`}>{r.id}</td>
                    <td className={TD}><TypeBadge type={r.type} /></td>
                    <td className={TD}><SeverityBadge sev={r.severity} /></td>
                    <td className={TD}><DecisionBadge d={r.decision} /></td>
                    <td className={TD}>{r.analyst}</td>
                    <td className={TD}>{r.decidedAt}</td>
                    <td className={`${TD} whitespace-normal text-slate-500`}>{r.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
