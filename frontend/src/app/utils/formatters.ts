/**
 * Utility functions for formatting numbers in Indonesian locale.
 * All functions are pure with no side effects.
 */

/**
 * Format angka dengan pemisah ribuan (titik).
 * 82450 → "82.450"
 * 1000000 → "1.000.000"
 * 999 → "999"
 * 0 → "0"
 */
export function formatThousands(value: number): string {
  const str = Math.round(value).toString();
  const result: string[] = [];
  let count = 0;

  for (let i = str.length - 1; i >= 0; i--) {
    result.unshift(str[i]);
    count++;
    if (count % 3 === 0 && i > 0) {
      result.unshift('.');
    }
  }

  return result.join('');
}

/**
 * Format angka ke singkatan rupiah juta.
 * 18500000 → "Rp 18.5jt"
 * 1000000 → "Rp 1.0jt"
 */
export function formatRupiahJuta(value: number): string {
  const juta = value / 1_000_000;
  return `Rp ${juta.toFixed(1)}jt`;
}

/**
 * Format angka ke singkatan rupiah miliar/triliun.
 * >= 1T (1.000.000.000.000): "Rp X.XXT"
 * >= 1M (1.000.000.000): "Rp X.XXM"
 *
 * 1520000000000 → "Rp 1.52T"
 * 1520000000 → "Rp 1.52M"
 */
export function formatRupiahBesar(value: number): string {
  if (value >= 1_000_000_000_000) {
    const triliun = value / 1_000_000_000_000;
    return `Rp ${triliun.toFixed(2)}T`;
  }
  const miliar = value / 1_000_000_000;
  return `Rp ${miliar.toFixed(2)}M`;
}

/**
 * Format persentase perubahan.
 * 2.4 → "+2.4%"
 * -1.2 → "-1.2%"
 * 0 → "+0.0%"
 */
export function formatPercentChange(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

/**
 * Format angka ke ribuan singkat.
 * 48200 → "48.2rb"
 * 1000 → "1.0rb"
 */
export function formatShortNumber(value: number): string {
  const ribu = value / 1000;
  return `${ribu.toFixed(1)}rb`;
}
