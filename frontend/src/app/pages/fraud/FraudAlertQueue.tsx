import { useEffect, useMemo, useState } from 'react';
import { ListChecks, Search, Trash2 } from 'lucide-react';
import { SEGMENTS, TYPE_SHARE } from './mockData';
import { ALERTS, WATCH, inPeriod, toCases, useReviewQueue, type AlertRow } from './mockAlerts';
import { useFg } from './text';
import {
  DecisionBadge, MockBanner, Note, PageTitle, Pager, Panel, PeriodBar, Segmented, SelectBox, SeverityBadge, TD, TDN, TH, THN, TypeBadge,
  periodDays, useFmt, type PeriodKey,
} from './ui';

type Source = 'all' | 'pending' | 'queue' | 'reviewed' | 'watch';
type View = 'row' | 'case';
type SortKey = 'ts' | 'amount' | 'pct' | 'rows';
const PAGE_SIZE = 20;

export function FraudAlertQueue() {
  const { tr, typeName, reason } = useFg();
  const f = useFmt();
  const queue = useReviewQueue();
  const [period, setPeriod] = useState<PeriodKey>('all');
  const [source, setSource] = useState<Source>('all');
  const [view, setView] = useState<View>('row');
  const [severity, setSeverity] = useState('all');
  const [type, setType] = useState('all');
  const [category, setCategory] = useState('all');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; order: 'asc' | 'desc' }>({ key: 'pct', order: 'desc' });
  const [page, setPage] = useState(1);

  // debounce the search box; any filter change goes back to page 1
  useEffect(() => { const h = setTimeout(() => setSearch(q.trim().toLowerCase()), 300); return () => clearTimeout(h); }, [q]);
  useEffect(() => { setPage(1); }, [period, source, view, severity, type, category, search, sort]);
  useEffect(() => { if (source === 'watch' && view === 'case') setView('row'); }, [source, view]);

  const rows = useMemo(() => {
    let list: AlertRow[];
    if (source === 'watch') list = inPeriod(WATCH, periodDays(period));
    else if (source === 'queue') list = ALERTS.filter((a) => queue.has(a.id)); // queue ignores the period
    else {
      list = inPeriod(ALERTS, periodDays(period));
      if (source === 'pending') list = list.filter((a) => !a.decision);
      if (source === 'reviewed') list = list.filter((a) => a.decision);
    }
    if (severity !== 'all') list = list.filter((a) => a.severity === severity);
    if (type !== 'all') list = list.filter((a) => a.type === type);
    if (category !== 'all') list = list.filter((a) => a.category === category);
    if (search) list = list.filter((a) => String(a.id).includes(search) || a.cust.toLowerCase().includes(search));
    return list;
    // queue.has reads the shared store; useReviewQueue re-renders on change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, source, severity, type, category, search, queue.size()]);

  const items = useMemo(() => {
    const dir = sort.order === 'desc' ? -1 : 1;
    if (view === 'case') {
      let cases = toCases(rows);
      if (search) cases = cases.filter((c) => c.caseId.toLowerCase().includes(search) || c.cust.toLowerCase().includes(search) || c.ids.some((i) => String(i).includes(search)));
      const val = (c: (typeof cases)[number]) => (sort.key === 'ts' ? c.date : sort.key === 'amount' ? c.amount : sort.key === 'rows' ? c.rows : c.maxPct);
      return { kind: 'case' as const, list: cases.sort((a, b) => (val(a) > val(b) ? dir : val(a) < val(b) ? -dir : 0)) };
    }
    const val = (a: AlertRow) => (sort.key === 'ts' ? a.ts : sort.key === 'amount' ? a.amount : a.pct);
    return { kind: 'row' as const, list: [...rows].sort((a, b) => (val(a) > val(b) ? dir : val(a) < val(b) ? -dir : 0)) };
  }, [rows, view, sort, search]);

  const total = items.list.length;
  const pages = Math.ceil(total / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE;

  const sortHead = (key: SortKey, label: string, numeric = false) => {
    const active = sort.key === key;
    return (
      <th scope="col" className={numeric ? THN : TH} aria-sort={active ? (sort.order === 'desc' ? 'descending' : 'ascending') : 'none'}>
        <button type="button" className="uppercase tracking-wider font-semibold hover:text-slate-800"
                onClick={() => setSort({ key, order: active && sort.order === 'desc' ? 'asc' : 'desc' })}>
          {label}{active ? (sort.order === 'desc' ? ' ▼' : ' ▲') : ''}
        </button>
      </th>
    );
  };

  const sources: { key: Source; label: string }[] = [
    { key: 'all', label: tr('aq_src_all') },
    { key: 'pending', label: tr('aq_src_pending') },
    { key: 'queue', label: `${tr('aq_src_queue')} (${queue.size()})` },
    { key: 'reviewed', label: tr('aq_src_reviewed') },
    { key: 'watch', label: tr('aq_src_watch') },
  ];

  return (
    <div className="px-6 pt-3 pb-6 space-y-5">
      <PageTitle icon={ListChecks} title={tr('aq_title')} subtitle={tr('aq_sub')} />
      <MockBanner />
      {source !== 'queue' && <PeriodBar value={period} onChange={setPeriod} />}
      {source !== 'queue' ? <Note tone="neutral">{tr('scope_note')}</Note> : <Note tone="neutral">{tr('aq_queue_note')}</Note>}

      <Segmented value={source} onChange={setSource} label={tr('aq_source')} options={sources} />

      <div className="flex items-center gap-2 flex-wrap">
        <Segmented
          value={view}
          onChange={setView}
          label={tr('aq_view')}
          disabled={source === 'watch' ? ['case'] : []}
          options={[{ key: 'row', label: tr('aq_view_row') }, { key: 'case', label: tr('aq_view_case') }]}
        />
        <SelectBox value={severity} onChange={setSeverity} label={tr('col_severity')}>
          <option value="all">{tr('aq_all_sev')}</option>
          <option value="high">{tr('sev_high')}</option>
          <option value="medium">{tr('sev_medium')}</option>
          <option value="low">{tr('sev_low')}</option>
        </SelectBox>
        <SelectBox value={type} onChange={setType} label={tr('col_type')}>
          <option value="all">{tr('aq_all_types')}</option>
          {TYPE_SHARE.map((x) => <option key={x.type} value={x.type}>{typeName(x.type)}</option>)}
        </SelectBox>
        <SelectBox value={category} onChange={setCategory} label={tr('col_category')}>
          <option value="all">{tr('aq_all_categories')}</option>
          {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </SelectBox>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tr('aq_search')}
            aria-label={tr('aq_search')}
            className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white w-64 focus:outline-none focus:ring-2 focus:ring-[#028DAA]/40"
          />
        </div>
      </div>

      <Panel title={tr('aq_title')} desc={tr('aq_total', { n: f.int(total) })}>
        {total === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-semibold text-slate-700">{tr('aq_empty')}</p>
            <p className="text-xs text-slate-500 mt-1">{source === 'queue' ? tr('aq_empty_queue') : tr('aq_empty_desc')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              {items.kind === 'case' ? (
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th scope="col" className={TH}>{tr('col_customer')}</th>
                      {sortHead('ts', tr('col_date'))}
                      <th scope="col" className={TH}>{tr('col_type')}</th>
                      <th scope="col" className={TH}>{tr('col_reason')}</th>
                      {sortHead('rows', tr('col_rows'), true)}
                      {sortHead('amount', tr('col_amount'), true)}
                      {sortHead('pct', tr('col_pct'), true)}
                      <th scope="col" className={TH}>{tr('col_severity')}</th>
                      <th scope="col" className={THN}>{tr('aq_reviewed')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.list.slice(start, start + PAGE_SIZE).map((c) => (
                      <tr key={c.caseId} className="hover:bg-slate-50">
                        <td className={`${TD} font-mono`}>{c.cust}</td>
                        <td className={TD}>{f.day(c.date)}</td>
                        <td className={TD}><TypeBadge type={c.type} /></td>
                        <td className={`${TD} whitespace-normal min-w-[240px] max-w-[320px] text-slate-500`}>{reason(c.reason)}</td>
                        <td className={TDN}>{c.rows}</td>
                        <td className={TDN}>{f.rupiahShort(c.amount)}</td>
                        <td className={TDN}>{f.dec(c.maxPct, 2)}</td>
                        <td className={TD}><SeverityBadge sev={c.severity} /></td>
                        <td className={TDN}>{c.decided}/{c.rows}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th scope="col" className={TH}>ID</th>
                      {sortHead('ts', tr('col_time'))}
                      <th scope="col" className={TH}>{tr('col_customer')}</th>
                      <th scope="col" className={TH}>{tr('col_category')}</th>
                      {sortHead('amount', tr('col_amount'), true)}
                      <th scope="col" className={TH}>{tr('col_type')}</th>
                      <th scope="col" className={TH}>{tr('col_reason')}</th>
                      {sortHead('pct', tr('col_pct'), true)}
                      <th scope="col" className={TH}>{tr('col_severity')}</th>
                      <th scope="col" className={TH}>{tr('col_review')}</th>
                      {source === 'queue' && <th scope="col" className={TH}><span className="sr-only">{tr('aq_dequeue')}</span></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.list.slice(start, start + PAGE_SIZE).map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className={`${TD} font-mono`}>{a.id}</td>
                        <td className={TD}>{f.dateTime(a.ts)}</td>
                        <td className={`${TD} font-mono`}>{a.cust}</td>
                        <td className={TD}>{a.category}</td>
                        <td className={TDN}>{f.rupiah(a.amount)}</td>
                        <td className={TD}><TypeBadge type={a.type} /></td>
                        <td className={`${TD} whitespace-normal min-w-[240px] max-w-[320px] text-slate-500`}>{reason(a.reason)}</td>
                        <td className={TDN}>{f.pctile(a.pct)}</td>
                        <td className={TD}><SeverityBadge sev={a.severity} /></td>
                        <td className={TD}><DecisionBadge d={a.decision} /></td>
                        {source === 'queue' && (
                          <td className={TD}>
                            <button type="button" onClick={() => queue.remove(a.id)} title={tr('aq_dequeue')} aria-label={`${tr('aq_dequeue')} ${a.id}`}
                                    className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <Pager page={page} pages={pages} onChange={setPage} />
          </>
        )}
      </Panel>
    </div>
  );
}
