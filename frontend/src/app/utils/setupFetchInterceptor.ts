/**
 * Global fetch interceptor to automatically detect 401 (session expired /
 * invalid token) responses across all API calls and redirect to /login.
 *
 * NOTE: 403 (Forbidden) is intentionally NOT treated as session expiry. A 403
 * means the session is valid but the user's role lacks permission for that
 * endpoint (e.g. a "cabang" user hitting the ADMIN-only /api/roles). Those are
 * left for the calling page to handle (e.g. show an "access denied" message),
 * so a legitimate permission error no longer logs the user out.
 */

let isRedirecting = false;

export function initFetchInterceptor() {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const response = await originalFetch(...args);

    if (response.status === 401) {
      let urlString = '';
      if (typeof args[0] === 'string') {
        urlString = args[0];
      } else if (args[0] instanceof URL) {
        urlString = args[0].toString();
      } else if (args[0] && typeof args[0] === 'object' && 'url' in (args[0] as Request)) {
        urlString = (args[0] as Request).url;
      }

      const isLoginEndpoint = urlString.includes('/api/auth/login');
      const isLoginPage = window.location.pathname === '/login';

      if (!isLoginEndpoint && !isLoginPage && !isRedirecting) {
        isRedirecting = true;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        // Flag the reason so the login page can show it (no blocking alert).
        try { sessionStorage.setItem('session_expired', '1'); } catch {}
        window.location.href = '/login';
      }
    }

    return response;
  };
}
