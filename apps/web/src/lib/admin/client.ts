'use client';

/**
 * Client-side helpers for the admin panel.
 *
 * `assertAdminAuth(res)` is wired into every admin `fetch` call so
 * that a 401 (expired session, revoked token) sends the user to
 * `/admin/login?expired=1` with a hard reload — not a Next router
 * push, which can re-fire the failing fetch on the way to the login
 * page and create a redirect loop.
 *
 * The thin `adminPost` / `adminPut` / `adminDelete` / `adminUpload`
 * wrappers exist so the assertion is impossible to forget at a
 * call site; pass the path and body, get the parsed JSON (or
 * `Response` for DELETE) back.
 */

export function assertAdminAuth(res: Response): Response {
  if (res.status === 401 && typeof window !== 'undefined') {
    window.location.assign('/admin/login?expired=1');
  }
  return res;
}

export function adminPost<T>(path: string, body: unknown): Promise<T> {
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
  })
    .then(assertAdminAuth)
    .then((r) => r.json() as Promise<T>);
}

export function adminPut<T>(path: string, body: unknown): Promise<T> {
  return fetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
  })
    .then(assertAdminAuth)
    .then((r) => r.json() as Promise<T>);
}

export function adminDelete(path: string): Promise<Response> {
  return fetch(path, { method: 'DELETE', credentials: 'same-origin' }).then(
    assertAdminAuth
  );
}

export async function adminUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    body: formData,
    credentials: 'same-origin',
  });
  assertAdminAuth(res);
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Upload failed');
  }
  return (await res.json()) as T;
}