/**
 * PII resolver — resolves customer PII (name, address, title, ...) from a LOCAL
 * agent running on the user's own machine, never from the application server.
 *
 * Why: for regulatory reasons the server (RDS) must not store or serve customer
 * names. Instead, a small local HTTP service on the user's laptop holds the
 * CIF -> PII mapping. The web sends a batch of CIFs and renders the returned
 * fields in memory only (nothing is persisted to localStorage or the server).
 *
 * Agent contract (default http://127.0.0.1:7777):
 *   GET  /health            -> 200 when the agent is up
 *   POST /resolve           -> body { "cifs": ["123","456"] }
 *                              resp { "data": { "123": { "name": "...",
 *                                                        "address": "...",
 *                                                        "title": "..." }, ... } }
 *
 * Fallback: if the agent is unreachable / times out / a CIF is missing, the
 * caller shows the CIF instead of a name.
 */

export interface CustomerPii {
  name?: string;
  address?: string;
  title?: string;
  // Extensible: more fields (phone, etc.) can be added later without API change.
  [key: string]: string | undefined;
}

// Base URL of the local agent. Override at build time via VITE_LOCAL_AGENT_URL
// (legacy VITE_PII_AGENT_URL still accepted as a fallback).
const AGENT_BASE_URL =
  (import.meta as any).env?.VITE_LOCAL_AGENT_URL ||
  (import.meta as any).env?.VITE_PII_AGENT_URL ||
  'http://127.0.0.1:7777';

const RESOLVE_TIMEOUT_MS = 2000;

/**
 * Resolve PII for a batch of CIFs. Returns a map keyed by CIF. On any failure
 * (agent down, timeout, bad response) returns an empty map so callers fall back
 * to showing the CIF. Never throws.
 *
 * The result is intentionally NOT cached/persisted — callers hold it in React
 * state for the current render only.
 */
export async function resolveCustomers(cifs: string[]): Promise<Record<string, CustomerPii>> {
  const unique = Array.from(new Set((cifs || []).filter(Boolean).map(String)));
  if (unique.length === 0) return {};

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RESOLVE_TIMEOUT_MS);
  try {
    const res = await fetch(`${AGENT_BASE_URL}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cifs: unique }),
      signal: controller.signal,
      // The agent is a different origin (localhost); it must send permissive CORS.
      mode: 'cors',
      // No credentials — this is a local trusted agent, not the app server.
      credentials: 'omit',
    });
    if (!res.ok) return {};
    const body = await res.json();
    const data = body && typeof body === 'object' ? body.data : null;
    return data && typeof data === 'object' ? (data as Record<string, CustomerPii>) : {};
  } catch {
    // Agent not running / blocked / timed out -> callers fall back to CIF.
    return {};
  } finally {
    clearTimeout(timer);
  }
}

/** Lightweight check whether the local agent is reachable. Never throws. */
export async function isAgentAvailable(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1000);
  try {
    const res = await fetch(`${AGENT_BASE_URL}/health`, { signal: controller.signal, mode: 'cors' });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
