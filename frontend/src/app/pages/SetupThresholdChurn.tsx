import { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '../i18n';
import { Sliders, Save, Activity, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';

const THEME = { brand: '#8A6534', emerald: '#059669', amber: '#D97706', red: '#C0392B' };

const P = {
  churn: 'CHURN_TIER_DISTRIBUTION',
  aum: 'TRB_TIER_DISTRIBUTION',
};

function authHeaders() {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// parse "Hi|Med|Lo" -> [hi, med, lo]; default 33|33|34
// Percentages are stored with up to 2 decimals (e.g. "25.68|32.01|42.31") so
// the customer-count boxes can be set precisely.
function parsePct(v: string | undefined): [number, number, number] {
  if (!v) return [33, 33, 34];
  const parts = v.split('|').map((x) => parseFloat(x.trim()));
  if (parts.length === 3 && parts.every((n) => !isNaN(n))) return [parts[0], parts[1], parts[2]];
  return [33, 33, 34];
}

// Round to 2 decimals (percent precision).
const round2 = (n: number) => Math.round(n * 100) / 100;

export function SetupThresholdChurn() {
  const { lang } = useI18n();
  const L = (id: string, en: string) => (lang === 'id' ? id : en);

  // total churned customers (population for both churn & AUM tiering)
  const [total, setTotal] = useState(2053);

  // percentages [hi, med, lo]
  const [churnPct, setChurnPct] = useState<[number, number, number]>([33, 33, 34]);
  const [aumPct, setAumPct] = useState<[number, number, number]>([33, 33, 34]);

  const [settingIds, setSettingIds] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // total churned customers
        const tr = await fetch('/api/v1/executive/churn/threshold-tiers', { headers: authHeaders() });
        if (tr.ok) {
          const b = await tr.json();
          if (b.success && b.data) setTotal(b.data.totalNasabah ?? 2053);
        }
        // distribution settings
        const ids: Record<string, number> = {};
        await Promise.all(
          [P.churn, P.aum].map(async (name) => {
            try {
              const r = await fetch(`/api/settings/by-name/${name}`, { headers: authHeaders() });
              if (r.ok) {
                const b = await r.json();
                if (b.data) {
                  ids[name] = b.data.id;
                  const p = parsePct(b.data.value);
                  if (name === P.churn) setChurnPct(p);
                  else setAumPct(p);
                }
              }
            } catch { /* ignore */ }
          })
        );
        setSettingIds(ids);
      } catch (err) {
        console.error('load thresholds', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function saveSetting(name: string, pct: [number, number, number]) {
    const id = settingIds[name];
    if (!id) return;
    await fetch(`/api/settings/${id}`, {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, value: `${round2(pct[0])}|${round2(pct[1])}|${round2(pct[2])}` }),
    });
  }

  // per-section save state: 'churn' | 'aum'
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const saveSection = async (key: 'churn' | 'aum') => {
    setSavingKey(key);
    try {
      // The legacy materialise endpoints (altair churn.churn_data_matrix) take
      // integer percents; round for those. The setting itself + the bag_demo
      // rebuild below keep the precise 2-decimal percentages.
      if (key === 'churn') {
        await saveSetting(P.churn, churnPct);
        // materialise churn_category + matrix_classification in churn.churn_data_matrix
        await fetch(
          `/api/v1/executive/matrix/materialise-churn?hiPct=${Math.round(churnPct[0])}&medPct=${Math.round(churnPct[1])}`,
          { method: 'POST', headers: authHeaders() }
        );
      } else {
        await saveSetting(P.aum, aumPct);
        // materialise aum_category + matrix_classification
        await fetch(
          `/api/v1/executive/matrix/materialise-aum?hiPct=${Math.round(aumPct[0])}&medPct=${Math.round(aumPct[1])}`,
          { method: 'POST', headers: authHeaders() }
        );
      }
      // Rebuild the bag_demo ods.churn_data_matrix (predicted-churn population)
      // using BOTH current distributions, since each matrix cell = churn tier x
      // TRB tier. Either section's save triggers a full rebuild. This endpoint
      // accepts decimal percents, so the counts stay precise.
      await fetch(
        `/api/v1/executive/bag-matrix/rebuild?churnHiPct=${churnPct[0]}&churnMedPct=${churnPct[1]}&trbHiPct=${aumPct[0]}&trbMedPct=${aumPct[1]}`,
        { method: 'POST', headers: authHeaders() }
      );
      setSavedKey(key);
      setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 3000);
    } catch (err) {
      console.error('save', err);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="px-6 pt-3 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{L('Threshold Tiering', 'Threshold Tiering')}</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            {L(
              'Atur distribusi persentase tier Tinggi, Sedang, dan Rendah. Jumlah nasabah = persentase × total nasabah churn.',
              'Configure the percentage distribution for High, Medium, and Low tiers. Customer count = percentage × total churned customers.'
            )}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 rounded-xl bg-[#8A6534]/5 border border-[#8A6534]/20 text-xs flex items-center gap-3 shadow-2xs">
        <Activity className="w-4 h-4 text-[#8A6534] shrink-0" />
        <p className="text-slate-700">
          {L('Total nasabah churn: ', 'Total churned customers: ')}
          <span className="font-extrabold text-slate-900 text-sm">{total.toLocaleString('id-ID')}</span>
          {loading && <span className="ml-2 text-slate-400 italic">{L('memuat...', 'loading...')}</span>}
        </p>
      </div>

      {/* CHURN */}
      <PctTierEditor
        title={L('Distribusi Tier Churn', 'Churn Tier Distribution')}
        total={total}
        pct={churnPct}
        onPct={setChurnPct}
        subHigh={L('Risiko Churn Tinggi', 'High Churn Risk')}
        subMed={L('Risiko Churn Sedang', 'Medium Churn Risk')}
        subLow={L('Risiko Churn Rendah', 'Low Churn Risk')}
        lang={lang}
        onSave={() => saveSection('churn')}
        saving={savingKey === 'churn'}
        saved={savedKey === 'churn'}
      />

      {/* AUM */}
      <PctTierEditor
        title={L('Distribusi Tier TRB', 'TRB Tier Distribution')}
        total={total}
        pct={aumPct}
        onPct={setAumPct}
        subHigh={L('TRB Tinggi', 'High TRB')}
        subMed={L('TRB Sedang', 'Medium TRB')}
        subLow={L('TRB Rendah', 'Low TRB')}
        lang={lang}
        bg="bg-slate-50"
        onSave={() => saveSection('aum')}
        saving={savingKey === 'aum'}
        saved={savedKey === 'aum'}
      />

      {/* Notice */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 shadow-2xs">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">
          {L(
            'Mengubah distribusi persen akan mengubah jumlah nasabah tiap tier dan memengaruhi setiap kotak pada Matriks Nasabah (Churn × TRB).',
            'Changing the percentage distribution changes the customer count per tier and every cell of the Customer Matrix (Churn × TRB).'
          )}
        </p>
      </div>
    </div>
  );
}

// Left: vertical bar (Hi/Med/Lo %). Right: editable percentage boxes (Lo = balancer),
// with resulting customer count shown. Percentages must sum to 100 (Lo auto).
function PctTierEditor({
  title, total, pct, onPct, subHigh, subMed, subLow, lang, onSave, saving, saved, bg,
}: {
  title: string; total: number; pct: [number, number, number];
  onPct: (p: [number, number, number]) => void;
  subHigh: string; subMed: string; subLow: string; lang: string;
  onSave: () => void; saving: boolean; saved: boolean; bg?: string;
}) {
  const L = (id: string, en: string) => (lang === 'id' ? id : en);
  const [hi, med, lo] = pct;

  // Percentages keep 2 decimals; Lo is the balancer so the three always sum to 100.
  const setHi = (v: number) => { const nv = Math.max(0, Math.min(100 - med, round2(v))); onPct([nv, med, round2(100 - nv - med)]); };
  const setMed = (v: number) => { const nv = Math.max(0, Math.min(100 - hi, round2(v))); onPct([hi, nv, round2(100 - hi - nv)]); };
  const setLo = (v: number) => { const nv = Math.max(0, Math.min(100 - hi, round2(v))); onPct([hi, round2(100 - hi - nv), nv]); };

  // count -> percent conversion (2-decimal precision) so a typed count maps back
  // to (almost) the same count when re-displayed.
  const toPct = (c: number) => (total > 0 ? round2((Math.max(0, c) / total) * 100) : 0);
  const setHiCount = (c: number) => setHi(toPct(c));
  const setMedCount = (c: number) => setMed(toPct(c));
  const setLoCount = (c: number) => setLo(toPct(c));

  const cnt = (p: number) => Math.round(total * (p / 100));
  // exact counts with lo balancer
  const hiCnt = cnt(hi);
  const medCnt = cnt(med);
  const loCnt = Math.max(0, total - hiCnt - medCnt);

  const barRef = useRef<HTMLDivElement>(null);
  const BAR_HEIGHT = 340;
  const [dragging, setDragging] = useState<'top' | 'bottom' | null>(null);
  const fracFromTop = useCallback((clientY: number) => {
    if (!barRef.current) return 0;
    const rect = barRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(rect.height, clientY - rect.top)) / rect.height;
  }, []);
  const down = (t: 'top' | 'bottom') => (e: React.MouseEvent | React.TouchEvent) => { e.stopPropagation(); setDragging(t); };
  useEffect(() => {
    if (!dragging) return;
    const move = (e: MouseEvent | TouchEvent) => {
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const frac = fracFromTop(clientY);
      if (dragging === 'top') setHi(Math.round(frac * 100));
      else setLo(Math.round((1 - frac) * 100));
    };
    const up = () => setDragging(null);
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move); window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, fracFromTop, hi, med, lo]);

  const highH = (hi / 100) * BAR_HEIGHT;
  const medH = (med / 100) * BAR_HEIGHT;
  const lowH = Math.max(0, BAR_HEIGHT - highH - medH);
  const yTop = highH;
  const yBottom = highH + medH;

  return (
    <div className={`${bg ?? 'bg-white'} border border-slate-200 rounded-xl p-6 shadow-2xs`}>
      <div className="flex items-center justify-between gap-2 mb-6 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#8A6534]" />
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5" /> {L('Tersimpan!', 'Saved!')}
            </span>
          )}
          <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#8A6534] hover:bg-[#6B4E2E] text-white text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {L('Simpan', 'Save')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* LEFT: bar */}
        <div className="flex items-center justify-center gap-6 select-none">
          <div className="flex flex-col justify-between py-1 text-right w-24" style={{ height: BAR_HEIGHT }}>
            <span className="text-xs font-bold text-red-600 uppercase">{L('Tinggi', 'High')}</span>
            <span className="text-xs font-bold text-amber-600 uppercase">{L('Sedang', 'Medium')}</span>
            <span className="text-xs font-bold text-emerald-600 uppercase">{L('Rendah', 'Low')}</span>
          </div>
          <div ref={barRef} className="relative w-20 rounded-2xl overflow-hidden border border-slate-300 shadow-inner bg-slate-100" style={{ height: BAR_HEIGHT }}>
            <div className="absolute left-0 right-0 top-0 bg-red-600 flex items-center justify-center text-white text-xs font-black" style={{ height: highH }}>{highH > 26 && `${Math.round(hi)}%`}</div>
            <div className="absolute left-0 right-0 bg-amber-500 flex items-center justify-center text-white text-xs font-black" style={{ top: yTop, height: medH }}>{medH > 26 && `${Math.round(med)}%`}</div>
            <div className="absolute left-0 right-0 bottom-0 bg-emerald-600 flex items-center justify-center text-white text-xs font-black" style={{ top: yBottom, height: lowH }}>{lowH > 26 && `${Math.round(lo)}%`}</div>
            <div onMouseDown={down('top')} onTouchStart={down('top')} className={`absolute left-0 right-0 flex items-center justify-center cursor-ns-resize z-20 ${dragging === 'top' ? 'scale-110' : ''}`} style={{ top: yTop - 13, height: 26 }}>
              <div className="w-full h-1 bg-white/90 shadow-xs" />
              <div className="absolute w-7 h-7 rounded-full bg-white border-2 border-red-600 shadow-md flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-red-600" /></div>
            </div>
            <div onMouseDown={down('bottom')} onTouchStart={down('bottom')} className={`absolute left-0 right-0 flex items-center justify-center cursor-ns-resize z-20 ${dragging === 'bottom' ? 'scale-110' : ''}`} style={{ top: yBottom - 13, height: 26 }}>
              <div className="w-full h-1 bg-white/90 shadow-xs" />
              <div className="absolute w-7 h-7 rounded-full bg-white border-2 border-emerald-600 shadow-md flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-emerald-600" /></div>
            </div>
          </div>
        </div>

        {/* RIGHT: editable customer-count boxes (converted to percent internally) */}
        <div className="flex flex-col gap-4">
          <CountBox label={L('Tinggi', 'High')} sub={subHigh} count={hiCnt} lang={lang} color={THEME.red} bl="border-l-red-600" bg="bg-red-50/50" onChangeCount={setHiCount} />
          <CountBox label={L('Sedang', 'Medium')} sub={subMed} count={medCnt} lang={lang} color={THEME.amber} bl="border-l-amber-500" bg="bg-amber-50/50" onChangeCount={setMedCount} />
          <CountBox label={L('Rendah', 'Low')} sub={subLow} count={loCnt} lang={lang} color={THEME.emerald} bl="border-l-emerald-600" bg="bg-emerald-50/50" onChangeCount={setLoCount} />
        </div>
      </div>
    </div>
  );
}

// Editable box holding the CUSTOMER COUNT (jumlah nasabah). The count is
// converted to a percentage upstream so the bar/state stays percentage-based.
function CountBox({
  label, sub, count, color, bl, bg, onChangeCount, lang,
}: {
  label: string; sub: string; count: number; color: string; bl: string; bg: string;
  onChangeCount: (v: number) => void; lang: string;
}) {
  const fmt = (n: number) => n.toLocaleString('id-ID');
  const [text, setText] = useState(fmt(count));
  useEffect(() => { setText(fmt(count)); }, [count]);
  const commit = () => {
    const n = parseInt(text.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(n)) onChangeCount(n);
    else setText(fmt(count));
  };
  return (
    <div className={`border border-slate-200 rounded-xl p-4 border-l-4 ${bl} ${bg} shadow-2xs`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color }}>{label} ({sub})</span>
      </div>
      <div className="relative">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          className="w-full text-xl font-black rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8A6534]/50 shadow-2xs"
        />
      </div>
      <p className="text-[11px] text-slate-400 mt-1 font-medium">{lang === 'id' ? 'jumlah nasabah' : 'customer count'}</p>
    </div>
  );
}
