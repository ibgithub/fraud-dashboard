// =============================================================================
// MOCK DATA for the FraudGuard pages (Overview, Live Monitoring, Executive).
// Hardcoded / generated with a fixed seed so every reload shows the same numbers.
// Replace with API calls once the fraud backend exists.
//
// Anchored on real FraudGuard facts (reference/fraudguard/output_v3/report_05.json):
//   evaluation period May–Jun 2026 = val (73,315 txns) + test (71,893 txns),
//   alert rate ~0.5%, per-segment alert rates, train/val/test windows.
// Everything else (daily split, cases, amounts, customers) is illustrative.
// =============================================================================

export type Severity = 'high' | 'medium';

export type AnomalyType =
  | 'SOCIAL_ENGINEERING' | 'PENERIMA_BARU' | 'PENYIMPANGAN_KEBIASAAN' | 'NOMINAL_TIDAK_WAJAR'
  | 'LONJAKAN_FREKUENSI' | 'KEGAGALAN_BERULANG' | 'NOMINAL_BERULANG' | 'PENAMPUNG_FANIN'
  | 'WAKTU_TIDAK_BIASA' | 'PERANGKAT_BERBAGI' | 'KONDISI_SISTEM' | 'AKTIVITAS_NON_FINANSIAL'
  | 'DATA_TIDAK_VALID' | 'CAMPURAN';

// Colors from FraudGuard components.jsx (TYPE_COLOR)
export const TYPE_COLOR: Record<AnomalyType, string> = {
  SOCIAL_ENGINEERING: '#d946ef', PENERIMA_BARU: '#8b5cf6', PENYIMPANGAN_KEBIASAAN: '#3b82f6', NOMINAL_TIDAK_WAJAR: '#f59e0b',
  LONJAKAN_FREKUENSI: '#ef4444', KEGAGALAN_BERULANG: '#f97316', NOMINAL_BERULANG: '#ca8a04', PENAMPUNG_FANIN: '#10b981',
  WAKTU_TIDAK_BIASA: '#06b6d4', KONDISI_SISTEM: '#64748b', AKTIVITAS_NON_FINANSIAL: '#14b8a6', DATA_TIDAK_VALID: '#9ca3af',
  PERANGKAT_BERBAGI: '#ec4899', CAMPURAN: '#475569',
};

export const SEGMENTS = ['DIRECT_DEBIT', 'DIRECT_DEBIT_CANCEL', 'EWALLET', 'OTHER', 'QRIS', 'TOPUP'] as const;
export const CHANNELS = ['MB01', 'IB02', 'ATM03', 'EDC04', 'API05'] as const;

// ---- deterministic PRNG (mulberry32) ----------------------------------------
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(r: () => number, arr: readonly T[]) => arr[Math.floor(r() * arr.length)];

// ---- data glance / windows (real) -------------------------------------------
export const DATA_GLANCE = {
  nTxn: 530270,
  nCustomers: 25220,
  start: '2025-01-01',
  end: '2026-07-01',
  nColumns: 92,
  train: ['2026-02-01', '2026-05-01'],
  val: ['2026-05-01', '2026-06-01'],
  test: ['2026-06-01', '2026-07-01'],
  thresholds: { flagPct: 99.5, highPct: 99.9, targetAlertRate: 0.005 },
};

// ---- daily series May 1 .. Jun 30 2026 (61 days) -------------------------------
export interface DayRow {
  date: string;      // YYYY-MM-DD
  txn: number;
  high: number;
  medium: number;
  cases: number;
  amountFlagged: number;
  amountTotal: number;
}

export const DAILY: DayRow[] = (() => {
  const r = rng(20260501);
  const out: DayRow[] = [];
  const d0 = new Date('2026-05-01T00:00:00');
  for (let i = 0; i < 61; i++) {
    const d = new Date(d0.getTime() + i * 86400000);
    const dow = d.getDay();
    const weekend = dow === 0 || dow === 6;
    const payday = d.getDate() >= 25 || d.getDate() <= 2;
    const txn = Math.round((weekend ? 1900 : 2450) * (payday ? 1.12 : 1) * (0.9 + r() * 0.2));
    const alerts = Math.max(4, Math.round(txn * (0.0045 + r() * 0.0022)));
    const high = Math.max(0, Math.round(alerts * (0.14 + r() * 0.14)));
    const iso = d.toISOString().slice(0, 10);
    out.push({
      date: iso,
      txn,
      high,
      medium: alerts - high,
      cases: Math.max(2, Math.round(alerts * (0.52 + r() * 0.12))),
      amountFlagged: Math.round(alerts * (180000 + r() * 260000)),
      amountTotal: Math.round(txn * (118000 + r() * 30000)),
    });
  }
  // Last full day is fixed to the values shown by FraudGuard (2026-06-30).
  const last = out[out.length - 1];
  Object.assign(last, { txn: 2223, high: 3, medium: 15, cases: 11, amountFlagged: 4_500_000 });
  return out;
})();

// ---- Latest day card (FraudGuard values for 2026-06-30 / 2026-07-01) -----------
export const LAST_DAY = {
  complete: {
    date: '2026-06-30', weekday: 2, partial: false, uptoHour: 23, baselineWeeks: 4,
    stats: { txn: 2223, alerts: 18, high: 3, cases: 11, amount: 4_500_000 },
    base: { txn: 2416, alerts: 10.8, high: 1.25, cases: 7.25, amount: 4_410_000 },
  },
  partial: {
    date: '2026-07-01', weekday: 3, partial: true, uptoHour: 8, baselineWeeks: 4,
    stats: { txn: 11, alerts: 0, high: 0, cases: 0, amount: 0 },
    base: { txn: 2512, alerts: 11.5, high: 1.5, cases: 7.0, amount: 4_820_000 },
  },
};

// ---- distributions (share of alerts; scaled to the selected period) -----------
export const TYPE_SHARE: { type: AnomalyType; share: number; avgAmount: number }[] = [
  { type: 'PENYIMPANGAN_KEBIASAAN', share: 0.214, avgAmount: 610000 },
  { type: 'PENERIMA_BARU', share: 0.168, avgAmount: 1_250_000 },
  { type: 'LONJAKAN_FREKUENSI', share: 0.131, avgAmount: 145000 },
  { type: 'NOMINAL_TIDAK_WAJAR', share: 0.112, avgAmount: 2_800_000 },
  { type: 'WAKTU_TIDAK_BIASA', share: 0.086, avgAmount: 420000 },
  { type: 'KEGAGALAN_BERULANG', share: 0.071, avgAmount: 95000 },
  { type: 'NOMINAL_BERULANG', share: 0.058, avgAmount: 250000 },
  { type: 'SOCIAL_ENGINEERING', share: 0.047, avgAmount: 3_900_000 },
  { type: 'PENAMPUNG_FANIN', share: 0.039, avgAmount: 760000 },
  { type: 'PERANGKAT_BERBAGI', share: 0.029, avgAmount: 530000 },
  { type: 'CAMPURAN', share: 0.045, avgAmount: 380000 },
];

// alert rate per segment (real: report_05.json "vae · per-segmen", in %)
export const SEGMENT_RATE: { segment: string; rate: number; n: number }[] = [
  { segment: 'DIRECT_DEBIT', rate: 0.56, n: 61240 },
  { segment: 'DIRECT_DEBIT_CANCEL', rate: 0.45, n: 3120 },
  { segment: 'EWALLET', rate: 0.97, n: 412 },
  { segment: 'OTHER', rate: 3.21, n: 156 },
  { segment: 'QRIS', rate: 0.57, n: 38950 },
  { segment: 'TOPUP', rate: 0.43, n: 41330 },
];

// hourly profile: share of transactions and relative alert intensity per hour
export const HOUR_PROFILE: { hour: number; txnShare: number; rateMult: number }[] = Array.from({ length: 24 }, (_, h) => {
  const day = Math.exp(-((h - 12) ** 2) / 30) + 0.6 * Math.exp(-((h - 19) ** 2) / 8);
  const night = h <= 4 || h >= 23;
  return { hour: h, txnShare: night ? 0.006 : 0.012 + day * 0.05, rateMult: night ? 3.4 : h <= 6 ? 1.8 : 0.85 + (h % 5) * 0.05 };
});

export const CHANNEL_SHARE: { channel: string; txnShare: number; rateMult: number }[] = [
  { channel: 'MB01', txnShare: 0.58, rateMult: 1.05 },
  { channel: 'IB02', txnShare: 0.17, rateMult: 0.92 },
  { channel: 'ATM03', txnShare: 0.12, rateMult: 0.74 },
  { channel: 'EDC04', txnShare: 0.09, rateMult: 0.66 },
  { channel: 'API05', txnShare: 0.04, rateMult: 2.1 },
];

// ---- top cases ----------------------------------------------------------------
export interface CaseRow {
  caseId: string;
  cust: string;
  date: string;
  type: AnomalyType;
  rows: number;
  amount: number;
  maxPct: number;
  severity: Severity;
}

export const TOP_CASES: CaseRow[] = [
  { caseId: 'K-0630-01', cust: 'C7F3A91E', date: '2026-06-30', type: 'SOCIAL_ENGINEERING', rows: 4, amount: 18_750_000, maxPct: 99.99, severity: 'high' },
  { caseId: 'K-0628-03', cust: 'C1B04D27', date: '2026-06-28', type: 'PENAMPUNG_FANIN', rows: 9, amount: 7_320_000, maxPct: 99.98, severity: 'high' },
  { caseId: 'K-0627-02', cust: 'C9E21F60', date: '2026-06-27', type: 'LONJAKAN_FREKUENSI', rows: 14, amount: 2_150_000, maxPct: 99.97, severity: 'high' },
  { caseId: 'K-0625-05', cust: 'C44A8C13', date: '2026-06-25', type: 'NOMINAL_TIDAK_WAJAR', rows: 1, amount: 24_000_000, maxPct: 99.96, severity: 'high' },
  { caseId: 'K-0622-01', cust: 'C0D7E5B8', date: '2026-06-22', type: 'PENERIMA_BARU', rows: 3, amount: 9_400_000, maxPct: 99.93, severity: 'high' },
  { caseId: 'K-0619-04', cust: 'C62F19AA', date: '2026-06-19', type: 'KEGAGALAN_BERULANG', rows: 11, amount: 1_100_000, maxPct: 99.88, severity: 'medium' },
  { caseId: 'K-0614-02', cust: 'C3A5B7D0', date: '2026-06-14', type: 'WAKTU_TIDAK_BIASA', rows: 2, amount: 6_200_000, maxPct: 99.81, severity: 'medium' },
  { caseId: 'K-0609-06', cust: 'C8C2E4F1', date: '2026-06-09', type: 'NOMINAL_BERULANG', rows: 6, amount: 3_000_000, maxPct: 99.74, severity: 'medium' },
];

// ---- model health / review progress ---------------------------------------------
export const HEALTH = { driftStatus: 'warning' as 'stable' | 'warning' | 'drifted' };
export const REVIEW_SHARE = 0.28; // share of alerts already reviewed by analysts

// ---- executive insights (keys map to text in text.ts) ----------------------------
export const INSIGHT_TONE: Record<string, 'info' | 'ok' | 'warn' | 'danger'> = {
  workload: 'info',
  top_type: 'info',
  concentration: 'warn',
  peak_day: 'info',
  segment_over: 'warn',
  drift: 'warn',
};

// ---- live stream ------------------------------------------------------------------
export interface StreamTxn {
  index: number;
  id: number;
  ts: string;
  cust: string;
  category: string;
  amount: number;
  pct: number;
  flagged: boolean;
  severity: Severity | null;
  type: AnomalyType | null;
}

export const STREAM_TOTAL = 71893; // June 2026 (test window), real size
export const STREAM_START = new Date('2026-06-01T00:03:00');

const CUST_POOL = Array.from({ length: 240 }, (_, i) => `C${((i * 2654435761) >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 7)}`);

/** Deterministic transaction #index of the June replay. */
export function streamTxn(index: number): StreamTxn {
  const r = rng(910000 + index);
  const u = r();
  // ~0.5% flagged, ~0.1% high (matches flag_pct 99.5 / high_pct 99.9)
  const pct = u > 0.995 ? 99.5 + r() * 0.5 : u > 0.97 ? 97 + r() * 2.5 : Math.min(96.99, r() * 100);
  const flagged = pct >= 99.5;
  const high = pct >= 99.9;
  const category = pick(r, SEGMENTS.filter((s) => s !== 'OTHER'));
  const base = category === 'TOPUP' ? 150000 : category === 'QRIS' ? 85000 : category === 'EWALLET' ? 200000 : 450000;
  const amount = Math.round((base * (0.3 + r() * 1.8) * (flagged ? 1 + r() * 6 : 1)) / 1000) * 1000;
  const ts = new Date(STREAM_START.getTime() + index * 36_000 + Math.floor(r() * 30_000));
  const types = TYPE_SHARE.map((x) => x.type);
  return {
    index,
    id: 4_100_000 + index,
    ts: ts.toISOString().slice(0, 19).replace('T', ' '),
    cust: pick(r, CUST_POOL),
    category,
    amount,
    pct,
    flagged,
    severity: flagged ? (high ? 'high' : 'medium') : null,
    type: flagged ? pick(r, types) : null,
  };
}

// "Kasus sorotan": highest alert per anomaly type in June (illustrative)
export const HIGHLIGHTS: { type: AnomalyType; count: number; index: number; amount: number; category: string; pct: number; reasonId: string; reasonEn: string }[] = [
  { type: 'SOCIAL_ENGINEERING', count: 18, index: 1260, amount: 18_750_000, category: 'DIRECT_DEBIT', pct: 99.99,
    reasonId: 'Penerima pertama kali dengan nominal 31x rata-rata pribadi 30 hari', reasonEn: 'First-ever recipient with an amount 31x the 30-day personal average' },
  { type: 'PENAMPUNG_FANIN', count: 14, index: 5840, amount: 7_320_000, category: 'TOPUP', pct: 99.98,
    reasonId: 'Rekening tujuan menerima dari 23 pengirim berbeda dalam 24 jam', reasonEn: 'Destination account received from 23 different payers in 24 hours' },
  { type: 'LONJAKAN_FREKUENSI', count: 49, index: 12_410, amount: 150_000, category: 'QRIS', pct: 99.97,
    reasonId: '14 transaksi dalam 5 menit, biasanya 2 per hari', reasonEn: '14 transactions in 5 minutes, usually 2 per day' },
  { type: 'NOMINAL_TIDAK_WAJAR', count: 42, index: 20_995, amount: 24_000_000, category: 'DIRECT_DEBIT', pct: 99.96,
    reasonId: 'Nominal di atas persentil 99,9 nasabah selama 90 hari', reasonEn: 'Amount above the customer\'s 99.9th percentile over 90 days' },
  { type: 'KEGAGALAN_BERULANG', count: 27, index: 33_180, amount: 95_000, category: 'TOPUP', pct: 99.88,
    reasonId: '6 transaksi gagal (RC 34) lalu satu berhasil', reasonEn: '6 failed transactions (RC 34) followed by one success' },
];
