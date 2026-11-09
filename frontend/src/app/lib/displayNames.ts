// Display-name translation helpers for values that come from the database in
// Indonesian. Persona/segment names are translated at the source (the backend
// returns persona_name + persona_name_en from segmentation.customer_analytics),
// so only branch/office names — which have no English column — are translated
// here, for display only (the underlying data is unchanged).

import type { LangKey } from '../i18n';

/**
 * Translate a branch/office name for display. Branch names are location proper
 * nouns prefixed with an Indonesian office-type word; in English we translate
 * only the prefix and keep the location. Examples:
 *   "Cabang Jakarta Sudirman" -> "Jakarta Sudirman Branch"
 *   "Kantor Pusat Jakarta"    -> "Jakarta Head Office"
 *   "Lainnya"                 -> "Others"
 */
/**
 * Drop the leading office-type word from a branch name for a cleaner display,
 * keeping the location. Language-agnostic (used where we only want the place).
 *   "Cabang Jakarta Sudirman" -> "Jakarta Sudirman"
 *   "Kantor Pusat Jakarta"    -> "Jakarta"
 *   "Lainnya"                 -> "Lainnya" (unchanged)
 * The underlying value (e.g. for API filtering) should NOT use this — display only.
 */
export function stripBranchPrefix(name: string | null | undefined): string {
  if (!name) return '';
  return name.trim()
    .replace(/^Kantor Pusat\s+/i, '')
    .replace(/^Cabang\s+/i, '');
}

export function displayBranchName(name: string | null | undefined, lang: LangKey): string {
  if (!name) return '';
  if (lang === 'id') return name;
  const trimmed = name.trim();
  if (/^Lainnya$/i.test(trimmed)) return 'Others';
  // "Kantor Pusat <location>" -> "<location> Head Office"
  const hoMatch = trimmed.match(/^Kantor Pusat\s+(.+)$/i);
  if (hoMatch) return `${hoMatch[1]} Head Office`;
  // "Cabang <location>" -> "<location> Branch"
  const brMatch = trimmed.match(/^Cabang\s+(.+)$/i);
  if (brMatch) return `${brMatch[1]} Branch`;
  return trimmed;
}
