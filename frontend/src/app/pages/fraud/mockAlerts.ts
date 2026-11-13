// =============================================================================
// MOCK alert rows, cases, analyst decisions and review queue for the
// "Action & Retention" pages (Alert Queue, Daily Review, Analyst Review).
// Generated from the same daily series as the Overview page (mockData.DAILY), so
// High/Medium counts per day match across pages. Fixed seed => stable numbers.
// =============================================================================
import { useSyncExternalStore } from 'react';
import { DAILY, SEGMENTS, TYPE_SHARE, type AnomalyType, type DayRow } from './mockData';

export type AlertSeverity = 'high' | 'medium' | 'low';
export type Decision = 'confirmed' | 'dismissed' | 'escalate';

export interface AlertRow {
  id: number;
  ts: string;          // 'YYYY-MM-DD HH:mm:ss'
  date: string;
  hour: number;
  cust: string;
  category: string;
  amount: number;
  type: AnomalyType;
  reason: { type: AnomalyType; a: number; b: number };  // numbers for the reason template
  pct: number;
  severity: AlertSeverity;
  decision: Decision | null;
  analyst: string | null;
  decidedAt: string | null;
  note: string | null;
}

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

// Customer pool small enough that the same customer shows up on several days (repeat customers).
const CUSTOMERS = Array.from({ length: 320 }, (_, i) => `C${(((i + 7) * 2246822519) >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 7)}`);
const ANALYSTS = ['analis_01', 'analis_02', 'analis_03'];

// Share of reviewed alerts that the analyst confirmed, per anomaly type (illustrative).
const CONFIRM_RATE: Record<AnomalyType, number> = {
  SOCIAL_ENGINEERING: 0.62, PENAMPUNG_FANIN: 0.55, PERANGKAT_BERBAGI: 0.41, NOMINAL_TIDAK_WAJAR: 0.38, PENERIMA_BARU: 0.34,
  LONJAKAN_FREKUENSI: 0.31, NOMINAL_BERULANG: 0.29, KEGAGALAN_BERULANG: 0.27, PENYIMPANGAN_KEBIASAAN: 0.22, WAKTU_TIDAK_BIASA: 0.18,
  CAMPURAN: 0.12, KONDISI_SISTEM: 0.1, AKTIVITAS_NON_FINANSIAL: 0.1, DATA_TIDAK_VALID: 0.05,
};
const NOTES_ID = ['Nasabah dihubungi, transaksi diakui.', 'Pola mirip kasus pekan lalu.', 'Menunggu konfirmasi cabang.', 'Penerima terdaftar di daftar hitam internal.', 'Gaji masuk, transaksi wajar.'];

function pickType(r: () => number): AnomalyType {
  const total = TYPE_SHARE.reduce((a, x) => a + x.share, 0);
  let u = r() * total;
  for (const x of TYPE_SHARE) {
    u -= x.share;
    if (u <= 0) return x.type;
  }
  return 'CAMPURAN';
}

function hourFor(r: () => number, type: AnomalyType) {
  if (type === 'WAKTU_TIDAK_BIASA') return Math.floor(r() * 5); // 00-04
  const u = r();
  return u < 0.08 ? Math.floor(r() * 6) : 7 + Math.floor(r() * 16);
}

function buildRows(): { alerts: AlertRow[]; watch: AlertRow[] } {
  const r = rng(424242);
  const alerts: AlertRow[] = [];
  const watch: AlertRow[] = [];
  let id = 3_800_000;
  // One incident often produces several alert rows: with some probability the next alert of the
  // same day belongs to the previous customer (same pattern), which groups rows into cases.
  let prev: { date: string; cust: string; type: AnomalyType } | null = null;
  const make = (d: DayRow, severity: AlertSeverity): AlertRow => {
    const burst = prev !== null && prev.date === d.date && r() < 0.45;
    const type = burst && prev ? prev.type : pickType(r);
    const cust = burst && prev ? prev.cust : CUSTOMERS[Math.floor(r() * CUSTOMERS.length)];
    prev = { date: d.date, cust, type };
    const hour = hourFor(r, type);
    const ts = `${d.date} ${String(hour).padStart(2, '0')}:${String(Math.floor(r() * 60)).padStart(2, '0')}:${String(Math.floor(r() * 60)).padStart(2, '0')}`;
    const pct = severity === 'high' ? 99.9 + r() * 0.0999 : severity === 'medium' ? 99.5 + r() * 0.399 : 99.0 + r() * 0.499;
    const avg = TYPE_SHARE.find((x) => x.type === type)?.avgAmount ?? 400000;
    const amount = Math.max(10000, Math.round((avg * (0.3 + r() * 1.7)) / 1000) * 1000);
    id += 1 + Math.floor(r() * 180);
    return {
      id, ts, date: d.date, hour,
      cust,
      category: SEGMENTS[Math.floor(r() * SEGMENTS.length)],
      amount, type,
      reason: { type, a: 2 + Math.floor(r() * 28), b: 1 + Math.floor(r() * 6) },
      pct, severity,
      decision: null, analyst: null, decidedAt: null, note: null,
    };
  };
  for (const d of DAILY) {
    for (let i = 0; i < d.high; i++) alerts.push(make(d, 'high'));
    for (let i = 0; i < d.medium; i++) alerts.push(make(d, 'medium'));
    const nWatch = Math.round((d.high + d.medium) * (0.8 + r() * 0.4));
    for (let i = 0; i < nWatch; i++) watch.push(make(d, 'low'));
  }
  // analyst decisions: High alerts are reviewed more often than Medium; recent days less often
  for (const a of alerts) {
    const recent = a.date >= '2026-06-25';
    const pReview = (a.severity === 'high' ? 0.62 : 0.2) * (recent ? 0.45 : 1);
    if (r() >= pReview) continue;
    const u = r();
    a.decision = u < 0.08 ? 'escalate' : r() < CONFIRM_RATE[a.type] ? 'confirmed' : 'dismissed';
    a.analyst = ANALYSTS[Math.floor(r() * ANALYSTS.length)];
    // parse/format in UTC so the wall-clock string does not shift with the browser time zone
    const t = new Date(`${a.ts.replace(' ', 'T')}Z`).getTime() + (2 + r() * 40) * 3600_000;
    a.decidedAt = new Date(t).toISOString().slice(0, 16).replace('T', ' ');
    a.note = r() < 0.35 ? NOTES_ID[Math.floor(r() * NOTES_ID.length)] : null;
  }
  return { alerts, watch };
}

const BUILT = buildRows();
export const ALERTS: AlertRow[] = BUILT.alerts;
export const WATCH: AlertRow[] = BUILT.watch;

// ---- cases: one customer on one day --------------------------------------------------
export interface CaseView {
  caseId: string;
  id: number;          // representative (highest-percentile) alert id
  cust: string;
  date: string;
  type: AnomalyType;
  reason: AlertRow['reason'];
  rows: number;
  amount: number;
  maxPct: number;
  severity: AlertSeverity;
  decided: number;
  ids: number[];
}

export function toCases(rows: AlertRow[]): CaseView[] {
  const map = new Map<string, AlertRow[]>();
  for (const a of rows) {
    const k = `${a.cust}|${a.date}`;
    const list = map.get(k);
    if (list) list.push(a); else map.set(k, [a]);
  }
  return [...map.entries()].map(([k, list]) => {
    const top = list.reduce((x, y) => (y.pct > x.pct ? y : x));
    const [cust, date] = k.split('|');
    return {
      caseId: `K-${date.slice(5).replace('-', '')}-${cust.slice(1, 5)}`,
      id: top.id, cust, date, type: top.type, reason: top.reason,
      rows: list.length,
      amount: list.reduce((s, a) => s + a.amount, 0),
      maxPct: top.pct,
      severity: list.some((a) => a.severity === 'high') ? 'high' : list.some((a) => a.severity === 'medium') ? 'medium' : 'low',
      decided: list.filter((a) => a.decision).length,
      ids: list.map((a) => a.id),
    };
  });
}

// ---- review queue (session-only store shared between pages) ---------------------------------
// Seeded with a few un-reviewed High alerts from the last days so the tab is not empty.
const queue = new Set<number>(
  ALERTS.filter((a) => a.severity === 'high' && !a.decision && a.date >= '2026-06-27').slice(0, 6).map((a) => a.id),
);
const listeners = new Set<() => void>();
let version = 0;
const emit = () => { version += 1; listeners.forEach((l) => l()); };

export const reviewQueue = {
  has: (id: number) => queue.has(id),
  add: (ids: number[]) => { ids.forEach((i) => queue.add(i)); emit(); },
  remove: (id: number) => { queue.delete(id); emit(); },
  ids: () => [...queue],
  size: () => queue.size,
};

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
};
const getVersion = () => version;

/** Re-renders the caller whenever the review queue changes. */
export function useReviewQueue() {
  useSyncExternalStore(subscribe, getVersion);
  return reviewQueue;
}

export function inPeriod<T extends { date: string }>(rows: T[], days: DayRow[]) {
  const from = days[0].date;
  const to = days[days.length - 1].date;
  return rows.filter((x) => x.date >= from && x.date <= to);
}
