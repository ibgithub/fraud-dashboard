/**
 * Global fetch wrapper that handles 401 & 403 (session expired) responses
 */

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);

  // If 401 or 403 Forbidden/Unauthorized, redirect to login
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('auth_token');
    alert('Session habis, silakan ke halaman login');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  return response;
}

/**
 * Helper to get auth headers with JWT token
 */
export function authHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

