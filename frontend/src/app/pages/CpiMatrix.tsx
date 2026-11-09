import { useState, useEffect, useRef, Fragment } from 'react';
import { useNavigate } from 'react-router';
import { useI18n } from '../i18n';
import { Grid3x3, ArrowRight, CheckCircle2, Loader2, TrendingDown, Activity } from 'lucide-react';
import { saveMatrixSelection } from '../lib/matrixSelection';

// 3x3 Churn × TRB matrix.
// Y axis (rows, top→bottom): TRB Hi, TRB Med, TRB Lo.
// X axis (cols, left→right): Churn Lo, Churn Med, Churn Hi.
// `key` matches backend distribution keys "<trbTier>_<churnTier>".
// HOT TARGET (C9 = Churn Hi × TRB Hi) sits top-right.
const MATRIX_CLUSTERS = [
  // TRB Hi row -> C7 C8 C9 (C9 = HOT TARGET, top-right). Name reads Churn then TRB.
  [
    { code: 'C7', name: 'Churn Lo · TRB Hi', key: 'hi_lo' },
    { code: 'C8', name: 'Churn Med · TRB Hi', key: 'hi_med' },
    { code: 'C9', name: 'Churn Hi · TRB Hi', key: 'hi_hi', hot: true },
  ],
  // TRB Med row -> C4 C5 C6
  [
    { code: 'C4', name: 'Churn Lo · TRB Med', key: 'med_lo' },
    { code: 'C5', name: 'Churn Med · TRB Med', key: 'med_med' },
    { code: 'C6', name: 'Churn Hi · TRB Med', key: 'med_hi' },
  ],
  // TRB Lo row -> C1 C2 C3
  [
    { code: 'C1', name: 'Churn Lo · TRB Lo', key: 'lo_lo' },
    { code: 'C2', name: 'Churn Med · TRB Lo', key: 'lo_med' },
    { code: 'C3', name: 'Churn Hi · TRB Lo', key: 'lo_hi' },
  ],
];

// Activity × TRB matrix (3x3).
// Y axis (rows, top→bottom): TRB Hi, TRB Med, TRB Lo.
// X axis (cols, left→right): three activity-risk segments.
// Counts come live from bag_demo (ods.mv_h). `key` = "<segment>_<trbTier>".
const ACTIVITY_SEGMENTS = [
  { seg: 'inactiveCust', label: { id: 'Nasabah Tidak Aktif', en: 'Inactive Customer' } },
  { seg: 'unregMb', label: { id: 'Belum Terdaftar MB', en: 'Unregistered Mobile Banking' } },
  { seg: 'inactiveMb', label: { id: 'MB Tidak Aktif', en: 'Inactive Mobile Banking' } },
];
// TRB tiers top→bottom.
const ACTIVITY_TRB_ROWS = [
  { trb: 'Hi', tier: 'hi' },
  { trb: 'Med', tier: 'med' },
  { trb: 'Lo', tier: 'lo' },
];
// Flattened cells (code A1..A9), row-major: TRB Hi first, segments left→right.
// HOT TARGET on the Activity matrix = Inactive Mobile Banking x TRB Hi (A3):
// dormant MB users with high TRB are the top priority to re-activate.
const ACTIVITY_MATRIX = ACTIVITY_TRB_ROWS.flatMap((row, rIdx) =>
  ACTIVITY_SEGMENTS.map((s, cIdx) => ({
    code: `A${rIdx * 3 + cIdx + 1}`,
    seg: s.seg,
    trb: row.trb,
    tier: row.tier,
    key: `${s.seg}_${row.tier}`,
    hot: s.seg === 'inactiveMb' && row.tier === 'hi',
  }))
);

// Distribution settings (percentage "Hi|Med|Lo", pipe-separated). Tier counts =
// pct × total churned customers; matrix cell = total × aumPct × churnPct.
const SETTING_NAMES = {
  churn: 'CHURN_TIER_DISTRIBUTION',
  aum: 'TRB_TIER_DISTRIBUTION',
};

function authHeaders() {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// parse "Hi|Med|Lo" -> [hi, med, lo]; default 33|33|34
function parsePct(v: string | undefined): [number, number, number] {
  if (!v) return [33, 33, 34];
  const parts = v.split('|').map((x) => parseFloat(x.trim()));
  if (parts.length === 3 && parts.every((n) => !isNaN(n))) return [parts[0], parts[1], parts[2]];
  return [33, 33, 34];
}

export function CpiMatrix() {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [dist, setDist] = useState<Record<string, number>>({});
  // Activity (inactive) × TRB counts from bag_demo, keyed by TRB tier: lo/med/hi.
  const [activityDist, setActivityDist] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [matrixReady, setMatrixReady] = useState<boolean | null>(null); // null = still checking
  // selected cluster codes (multi-select via click toggle)
  const [selected, setSelected] = useState<string[]>([]);
  const toggleSelect = (code: string) =>
    setSelected((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));

  const [submitting, setSubmitting] = useState(false);
  // Design A (tabbed box at the top): which matrix tab is active.
  const [activeTab, setActiveTab] = useState<'churn' | 'activity'>('churn');
  // Unique selected-customer count (distinct cif across BOTH matrices), computed
  // server-side so overlapping cif between Churn and Activity is counted once.
  const [selectedCustomerCount, setSelectedCustomerCount] = useState(0);
  // True while a select/de-select is being persisted and the unique customer
  // count is being recomputed server-side (shows a spinner by the total).
  const [countLoading, setCountLoading] = useState(false);

  // Submit: persist selected clusters to DB and navigate to Hot Target
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const churnKeys = MATRIX_CLUSTERS.flat()
        .filter((c) => selected.includes(c.code))
        .map((c) => c.key);
      const activityKeys = ACTIVITY_MATRIX
        .filter((c) => selected.includes(c.code))
        .map((c) => c.key);
      // Persist both matrices (is_selected=true) in bag_demo.
      await fetch('/api/v1/executive/bag-matrix/select', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: churnKeys }),
      });
      await fetch('/api/v1/executive/bag-matrix/select-activity', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: activityKeys }),
      });
      // Rebuild the Action Plan Detail list MV so it reflects this selection
      // right away. We WAIT for it to finish (the spinner on the button covers
      // the ~15s), so the next page is guaranteed fresh.
      await fetch('/api/v1/executive/bag-matrix/refresh-selected-list', {
        method: 'POST',
        headers: authHeaders(),
      });
      // Navigate to Hot Target page after successful save + refresh.
      navigate('/cpi-matrix/hot-target');
    } catch (err) {
      console.error('submit selection', err);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // read tier distribution percentages (defaults 33|33|34)
        let churnP: [number, number, number] = [33, 33, 34];
        let aumP: [number, number, number] = [33, 33, 34];
        await Promise.all([
          (async () => {
            try {
              const r = await fetch(`/api/settings/by-name/${SETTING_NAMES.churn}`, { headers: authHeaders() });
              if (r.ok) { const b = await r.json(); if (b.data && b.data.value != null) churnP = parsePct(b.data.value); }
            } catch { /* ignore */ }
          })(),
          (async () => {
            try {
              const r = await fetch(`/api/settings/by-name/${SETTING_NAMES.aum}`, { headers: authHeaders() });
              if (r.ok) { const b = await r.json(); if (b.data && b.data.value != null) aumP = parsePct(b.data.value); }
            } catch { /* ignore */ }
          })(),
        ]);

        // Customer Matrix pilot: data comes from bag_demo (ods.mv_h + ods.trb_score).
        const qs =
          `churnHiPct=${churnP[0]}&churnMedPct=${churnP[1]}` +
          `&trbHiPct=${aumP[0]}&trbMedPct=${aumP[1]}`;
        const res = await fetch(`/api/v1/executive/bag-matrix?${qs}`, { headers: authHeaders() });
        if (!res.ok) { setMatrixReady(false); setLoading(false); return; }
        const body = await res.json();
        const data = body?.data;
        const ready = data?.ready === true;
        setMatrixReady(ready);
        if (!ready) { setLoading(false); return; }

        const churnTrb: Record<string, number> = data.churnTrb || {};
        setDist(churnTrb);
        setTotal(Object.values(churnTrb).reduce((a, b) => a + b, 0));
        setActivityDist(data.activityTrb || {});

        // Restore the previously-persisted selection from the DB (is_selected).
        // Churn selectedKeys are "<trb>_<churn>"; activity selectedActivityKeys
        // are "<segment>_<trb>". Map both back to grid cell codes. The count is
        // stateless (computed below), so restoring here cannot cause runaway
        // accumulation; the auto-save it triggers just re-writes the same cells.
        const selectedKeys: string[] = Array.isArray(data.selectedKeys) ? data.selectedKeys : [];
        const selectedActivityKeys: string[] = Array.isArray(data.selectedActivityKeys) ? data.selectedActivityKeys : [];
        const restoredCodes = [
          ...MATRIX_CLUSTERS.flat().filter((c) => selectedKeys.includes(c.key)).map((c) => c.code),
          ...ACTIVITY_MATRIX.filter((c) => selectedActivityKeys.includes(c.key)).map((c) => c.code),
        ];
        setSelected(restoredCodes);

        // Initial unique selected-customer count from the stateless endpoint.
        if (restoredCodes.length > 0) {
          try {
            const cr = await fetch('/api/v1/executive/bag-matrix/selected-count', {
              method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
              body: JSON.stringify({ churnKeys: selectedKeys, activityKeys: selectedActivityKeys }),
            });
            if (cr.ok) {
              const cb = await cr.json();
              if (cb?.data?.selectedCustomerCount != null) setSelectedCustomerCount(Number(cb.data.selectedCustomerCount));
            }
          } catch { /* ignore */ }
        } else {
          setSelectedCustomerCount(0);
        }
      } catch (err) {
        console.error('Failed to load bag-matrix distribution:', err);
        setMatrixReady(false);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const cellPct = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(1) : '0.0');

  // Selected churn clusters (used by the localStorage selection save).
  const selectedClusters = MATRIX_CLUSTERS.flat().filter((c) => selected.includes(c.code));

  // Short label for an activity segment in the current language.
  const segLabel = (seg: string): string => {
    const s = ACTIVITY_SEGMENTS.find((x) => x.seg === seg);
    return s ? (lang === 'id' ? s.label.id : s.label.en) : seg;
  };

  // Display label for any selected code (Churn cluster or Activity cell).
  const labelForCode = (code: string): string => {
    const churn = MATRIX_CLUSTERS.flat().find((c) => c.code === code);
    if (churn) return churn.name;
    const act = ACTIVITY_MATRIX.find((c) => c.code === code);
    if (act) return `${segLabel(act.seg)} · TRB ${act.trb}`;
    return code;
  };

  // All selected codes in a stable order (Churn clusters first, then Activity).
  const orderedSelected = [
    ...MATRIX_CLUSTERS.flat().map((c) => c.code),
    ...ACTIVITY_MATRIX.map((c) => c.code),
  ].filter((code) => selected.includes(code));

  // Persist the selection so other pages (Hot Target) can consume it.
  useEffect(() => {
    saveMatrixSelection(
      selectedClusters.map((c) => ({ code: c.code, name: c.name, key: c.key, count: dist[c.key] || 0 }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, dist]);

  // Auto-persist the churn-matrix selection to the DB (is_selected) as soon as
  // it changes, so clicking a cell is saved immediately (no need to press
  // "Continue"). Skips the very first run so the initial restore-from-DB does
  // not re-POST, and so an empty initial selection doesn't clobber the DB.
  const didAutoSaveInit = useRef(false);
  useEffect(() => {
    if (!didAutoSaveInit.current) { didAutoSaveInit.current = true; return; }
    const churnKeys = MATRIX_CLUSTERS.flat()
      .filter((c) => selected.includes(c.code))
      .map((c) => c.key);
    const activityKeys = ACTIVITY_MATRIX
      .filter((c) => selected.includes(c.code))
      .map((c) => c.key);

    // Persist both matrices (is_selected for Hot Target), and compute the unique
    // selected-customer count via a STATELESS endpoint from the exact current
    // keys (not from is_selected), so the number can't be corrupted by stale
    // persisted state or request races.
    (async () => {
      setCountLoading(true);
      try {
        await fetch('/api/v1/executive/bag-matrix/select', {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ keys: churnKeys }),
        });
        await fetch('/api/v1/executive/bag-matrix/select-activity', {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ keys: activityKeys }),
        });
        const r = await fetch('/api/v1/executive/bag-matrix/selected-count', {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ churnKeys, activityKeys }),
        });
        if (r.ok) {
          const b = await r.json();
          if (b?.data?.selectedCustomerCount != null) {
            setSelectedCustomerCount(Number(b.data.selectedCustomerCount));
          }
        }
      } catch (err) {
        console.error('auto-save matrix selection', err);
      } finally {
        setCountLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // ----- Reusable grid renderers (shared by the tab box and the stacked box) -----

  // Churn × TRB grid (3×3). Y = TRB Hi/Med/Lo, X = Churn Lo/Med/Hi.
  const renderChurnGrid = () => (
    <div className="grid gap-2" style={{ gridTemplateColumns: '84px repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr) auto' }}>
      {MATRIX_CLUSTERS.map((row, rIdx) => {
        const trbLabel = rIdx === 0 ? 'TRB Hi' : rIdx === 1 ? 'TRB Med' : 'TRB Lo';
        return (
          <Fragment key={`row-${rIdx}`}>
            <div className="flex items-center justify-center text-xs font-bold text-slate-500 text-center">{trbLabel}</div>
            {row.map((cell) => (
              <div
                key={cell.code}
                onClick={() => toggleSelect(cell.code)}
                className={`rounded-xl p-3 min-h-[104px] border transition cursor-pointer hover:shadow-md ${
                  cell.hot
                    ? 'bg-[#B4522E] border-[#B4522E] text-white shadow-md'
                    : selected.includes(cell.code)
                    ? 'bg-[#EBD9C6] border-[#C9A27A]'
                    : 'bg-slate-50 border-slate-200'
                } ${selected.includes(cell.code) ? 'ring-2 ring-offset-1 ring-[#8A6534]' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-mono text-[11px] font-bold ${cell.hot ? 'text-white/90' : 'text-slate-500'}`}>{cell.code}</span>
                  {cell.hot && (
                    <span className="text-[9px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">HOT TARGET</span>
                  )}
                </div>
                <div className={`font-bold text-[13px] mt-1 ${cell.hot ? 'text-white' : 'text-slate-800'}`}>{cell.name}</div>
                <div className={`text-lg font-extrabold mt-1.5 ${cell.hot ? 'text-white' : 'text-slate-800'}`}>
                  {loading ? '…' : (dist[cell.key] || 0).toLocaleString('id-ID')}
                  <span className={`ml-1.5 text-[11px] font-semibold ${cell.hot ? 'text-white/80' : 'text-slate-400'}`}>{loading ? '' : `${cellPct(dist[cell.key] || 0)}%`}</span>
                </div>
              </div>
            ))}
          </Fragment>
        );
      })}
      <div />
      <div className="flex items-center justify-center text-xs font-bold text-slate-500 pt-1">Churn Lo</div>
      <div className="flex items-center justify-center text-xs font-bold text-slate-500 pt-1">Churn Med</div>
      <div className="flex items-center justify-center text-xs font-bold text-slate-500 pt-1">Churn Hi</div>
    </div>
  );

  // Activity × TRB grid (3×3). Y = TRB Hi/Med/Lo, X = 3 activity segments.
  // Live from bag_demo (ods.mv_h). A customer may appear in multiple columns.
  const renderActivityGrid = () => {
    // Column header labels wrap onto 2 lines nicely for the longer segment names.
    const colHeader = (seg: string) => segLabel(seg);
    return (
      <div className="grid gap-2" style={{ gridTemplateColumns: '84px repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr) auto' }}>
        {ACTIVITY_TRB_ROWS.map((row, rIdx) => (
          <Fragment key={`actrow-${row.tier}`}>
            <div className="flex items-center justify-center text-xs font-bold text-slate-500 text-center">
              {`TRB ${row.trb}`}
            </div>
            {ACTIVITY_SEGMENTS.map((s) => {
              const cell = ACTIVITY_MATRIX.find((c) => c.seg === s.seg && c.tier === row.tier)!;
              const isSel = selected.includes(cell.code);
              return (
                <div
                  key={cell.code}
                  onClick={() => toggleSelect(cell.code)}
                  className={`rounded-xl p-3 min-h-[96px] border transition cursor-pointer hover:shadow-md ${
                    cell.hot
                      ? 'bg-[#B4522E] border-[#B4522E] text-white shadow-md'
                      : isSel
                      ? 'bg-[#EBD9C6] border-[#C9A27A]'
                      : 'bg-slate-50 border-slate-200'
                  } ${isSel ? 'ring-2 ring-offset-1 ring-[#8A6534]' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-mono text-[11px] font-bold ${cell.hot ? 'text-white/90' : 'text-slate-500'}`}>{cell.code}</span>
                    {cell.hot && (
                      <span className="text-[9px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">HOT TARGET</span>
                    )}
                  </div>
                  <div className={`font-bold text-[12px] mt-1 leading-tight ${cell.hot ? 'text-white' : 'text-slate-800'}`}>
                    {segLabel(s.seg)} · TRB {row.trb}
                  </div>
                  <div className={`text-lg font-extrabold mt-1.5 ${cell.hot ? 'text-white' : 'text-slate-800'}`}>
                    {loading ? '…' : (activityDist[cell.key] || 0).toLocaleString('id-ID')}
                  </div>
                </div>
              );
            })}
          </Fragment>
        ))}
        <div />
        {ACTIVITY_SEGMENTS.map((s) => (
          <div key={`h-${s.seg}`} className="flex items-center justify-center text-xs font-bold text-slate-500 pt-1 text-center leading-tight px-1">
            {colHeader(s.seg)}
          </div>
        ))}
      </div>
    );
  };

  // Shared "Selected + action" footer. `mode` controls the primary button:
  //   'continue' (default) -> submit selection and go to Hot Target.
  //   'next'                -> jump to the Activity tab (no submit).
  const renderSelectedBar = (mode: 'continue' | 'next' = 'continue') => (
    <div className="mt-8 pt-4 border-t border-slate-200 flex items-start gap-3 flex-wrap text-xs">
      <div className="flex-1 flex items-start gap-2 flex-wrap">
        <span className="font-bold text-slate-700 shrink-0">{lang === 'id' ? 'Terpilih:' : 'Selected:'}</span>
        {selected.length === 0 ? (
          <span className="text-slate-400 italic">{lang === 'id' ? 'klik kotak di matriks mana pun untuk memilih (bisa lebih dari satu)' : 'click a cell in either matrix to select (multiple allowed)'}</span>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap">
            {orderedSelected.map((code) => (
              <span key={code} className="inline-flex items-center gap-1 bg-[#8A6534]/10 border border-[#8A6534]/30 text-[#6B4E2E] font-semibold px-2 py-0.5 rounded-full">
                <span className="font-mono font-bold">{code}</span> {labelForCode(code)}
                <button onClick={(e) => { e.stopPropagation(); toggleSelect(code); }} className="ml-0.5 text-[#8A6534] hover:text-red-600 font-bold cursor-pointer">×</button>
              </span>
            ))}
            <button onClick={() => setSelected([])} className="ml-1 text-slate-400 hover:text-red-600 underline cursor-pointer">{lang === 'id' ? 'bersihkan' : 'clear'}</button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {mode === 'next' ? (
          <button
            onClick={() => setActiveTab('activity')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#8A6534] hover:bg-[#6B4E2E] text-white text-xs font-bold transition shadow-2xs cursor-pointer"
          >
            {lang === 'id' ? 'Berikutnya' : 'Next'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || selected.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#8A6534] hover:bg-[#6B4E2E] text-white text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
            {lang === 'id' ? 'Lanjutkan' : 'Continue'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'id' ? 'Pilih Matriks Nasabah' : 'Select Customer Matrix'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {lang === 'id'
              ? 'Distribusi nasabah pada matriks Churn dan Activity terhadap TRB.'
              : 'Customer distribution across the Churn and Activity matrices against TRB.'}
          </p>
        </div>
        {/* Small spinner at top-right while matrix data loads (like Corporate Insight). */}
        {loading && <Loader2 className="w-5 h-5 animate-spin text-[#6B4E2E] mt-1 shrink-0" />}
      </div>

      {/* Not-ready state */}
      {matrixReady === false && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <Grid3x3 className="w-10 h-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">
              {lang === 'id'
                ? 'Data matriks belum tersedia. Silakan setting Threshold Tiering terlebih dahulu.'
                : 'Matrix data is not available yet. Please configure Threshold Tiering first.'}
            </p>
            <a
              href="/setup/threshold-churn"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#8A6534] hover:bg-[#6B4E2E] text-white text-xs font-bold transition shadow-2xs"
            >
              {lang === 'id' ? 'Buka Threshold Tiering' : 'Open Threshold Tiering'}
            </a>
          </div>
        </div>
      )}

      {matrixReady === true && (<>
        {/* ===== Design A: Chrome-style tabbed box (Churn x TRB / Activity x TRB).
             The wrapper is transparent so only the tabs carry colour; the active
             tab merges into the white card below. (Reused from the old Hot Target
             tab design.) ===== */}
        <div>
          {/* Tab headers - Chrome-style: active tab white with rounded top + border
              (no bottom border) so it merges into the card; inactive tabs tinted. */}
          <div className="flex items-end">
            {([
              { k: 'churn', label: lang === 'id' ? 'Churn Matrix' : 'Churn Matrix', Icon: TrendingDown },
              { k: 'activity', label: lang === 'id' ? 'Activity Matrix' : 'Activity Matrix', Icon: Activity },
            ] as const).map((t) => (
              <button
                key={t.k}
                type="button"
                onClick={() => setActiveTab(t.k)}
                className={`relative flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-t-lg whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === t.k
                    ? 'bg-white text-[#8A6534] border border-b-0 border-slate-200 -mb-px z-10'
                    : 'bg-[#8A6534]/10 text-slate-600 hover:bg-[#8A6534]/15 hover:text-slate-800'
                }`}
              >
                <t.Icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content - the white card. */}
          <div className="bg-white border border-slate-200 rounded-xl rounded-tl-none shadow-2xs p-6">
            <div className="flex items-center justify-end mb-3">
              <span className="text-xs font-semibold text-slate-500 inline-flex items-center gap-1.5">
                {lang === 'id' ? 'Nasabah Terpilih: ' : 'Selected Customer: '}
                {countLoading ? (
                  <Loader2 className="w-3.5 h-3.5 text-[#8A6534] animate-spin" aria-label={lang === 'id' ? 'Memperbarui...' : 'Updating...'} />
                ) : (
                  <span className="font-bold text-slate-800">{selectedCustomerCount.toLocaleString('id-ID')}</span>
                )}
              </span>
            </div>

            {activeTab === 'churn' ? (
              <div>
                {renderChurnGrid()}
                <div className="flex items-center gap-4 flex-wrap mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm inline-block bg-[#B4522E]" /> HOT TARGET ({lang === 'id' ? 'prioritas utama' : 'top priority'})</span>
                </div>
              </div>
            ) : (
              <div>
                {renderActivityGrid()}
                <div className="flex items-center gap-4 flex-wrap mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm inline-block bg-[#B4522E]" /> HOT TARGET ({lang === 'id' ? 'prioritas utama' : 'top priority'})</span>
                </div>
              </div>
            )}

            {/* Footer: Churn tab shows "Next" (-> Activity tab); Activity tab
                shows "Continue" (submit). Selection is shared across both tabs. */}
            {renderSelectedBar(activeTab === 'churn' ? 'next' : 'continue')}
          </div>
        </div>
      </>)}

    </div>
  );
}




