// Every call to FastAPI now needs the logged-in user's token, or the
// backend rejects it with 401. This wrapper adds that header automatically
// and sends people back to /login if their session is missing or expired -
// so no page has to handle that by hand.

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("token");
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  return res;
}

// For the requireAuth guard on protected pages.
export function requireAuth(router) {
  if (typeof window === "undefined") return true;
  const token = getToken();
  if (!token) {
    router.replace("/login");
    return false;
  }
  return true;
}
