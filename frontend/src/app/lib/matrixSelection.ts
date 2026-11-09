// Shared store for the Customer Matrix cell selection.
// Persisted to localStorage so other pages (e.g. Hot Target) can read which
// clusters the user picked on /cpi-matrix/overview and their total count.

export interface SelectedCluster {
  code: string;   // e.g. "C9"
  name: string;   // e.g. "Burning Bridge"
  key: string;    // matrix key, e.g. "Hi_Hi"
  count: number;  // customer count for that cell
}

export interface MatrixSelection {
  clusters: SelectedCluster[];
  total: number;      // sum of selected cell counts
  updatedAt: number;  // epoch ms
}

const STORAGE_KEY = 'cpi_matrix_selection';

export function saveMatrixSelection(clusters: SelectedCluster[]): void {
  const total = clusters.reduce((sum, c) => sum + (c.count || 0), 0);
  const payload: MatrixSelection = { clusters, total, updatedAt: Date.now() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    // notify same-tab listeners (storage event only fires cross-tab)
    window.dispatchEvent(new CustomEvent('cpi-matrix-selection', { detail: payload }));
  } catch {
    /* ignore quota / serialization errors */
  }
}

export function loadMatrixSelection(): MatrixSelection {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MatrixSelection;
      if (parsed && Array.isArray(parsed.clusters)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return { clusters: [], total: 0, updatedAt: 0 };
}

// --- Persona (persona cluster) selection carried from the Hot Target page ---
// The Hot Target page lets the user pick a persona (cluster_0..3). We persist it
// so the Detail Action Plan page can default its cluster combo box to the same
// value. Stored separately from the matrix cell selection above.
const PERSONA_KEY = 'cpi_hot_target_persona';

export function saveHotTargetPersona(cluster: string): void {
  try {
    localStorage.setItem(PERSONA_KEY, cluster);
    window.dispatchEvent(new CustomEvent('cpi-hot-target-persona', { detail: cluster }));
  } catch {
    /* ignore */
  }
}

export function loadHotTargetPersona(): string | null {
  try {
    return localStorage.getItem(PERSONA_KEY);
  } catch {
    return null;
  }
}
