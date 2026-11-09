// Currency formatting that follows the UI language.
//   ID:  "Rp"  + T (triliun 10^12) / M (milyar 10^9) / Jt (juta 10^6)
//   EN:  "IDR" + T (trillion 10^12) / B (billion 10^9) / M (million 10^6)
// Note the ID→EN scale-letter shift: Milyar(10^9) → B, Juta(10^6) → M.
//
// `v` is a RAW IDR amount (not pre-scaled).

import type { LangKey } from '../i18n';

export function formatIdr(v: number, lang: LangKey, decimals = 2): string {
  const isEn = lang === 'en';
  const cur = isEn ? 'IDR' : 'Rp';
  const locale = isEn ? 'en-US' : 'id-ID';
  const fmt = (n: number) => n.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  if (v >= 1_000_000_000_000) return `${cur} ${fmt(v / 1_000_000_000_000)} T`;
  if (v >= 1_000_000_000) return `${cur} ${fmt(v / 1_000_000_000)} ${isEn ? 'B' : 'M'}`;
  if (v >= 1_000_000) return `${cur} ${fmt(v / 1_000_000)} ${isEn ? 'M' : 'Jt'}`;
  return `${cur} ${Math.round(v).toLocaleString(locale)}`;
}
