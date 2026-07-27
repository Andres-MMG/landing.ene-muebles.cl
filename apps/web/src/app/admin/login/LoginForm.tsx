'use client';

import { useState, useTransition } from 'react';
import { assertAdminAuth } from '@/lib/admin/client';

type LoginResponse = {
  user?: { email: string; name: string; role: 'owner' | 'client' };
  error?: string;
};

/**
 * Login form (client component).
 *
 * Posts to /api/admin/login. On success, the server sets the
 * session cookie and we navigate to the ?from=… target (or /admin).
 * On failure, the inline error slot shows the message from the
 * server — no client-side string construction that could drift
 * from the source of truth.
 *
 * When the page mounts with `?expired=1` (a session expiry
 * redirect from `assertAdminAuth`), we render an informational
 * banner above the form so the user knows why they're being asked
 * to sign in again.
 */
export function LoginForm({
  from,
  expired,
}: {
  from: string;
  expired?: boolean;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const checked = assertAdminAuth(res);
      if (checked.ok) {
        window.location.href = from || '/admin';
        return;
      }
      const data = (await checked.json().catch(() => ({}))) as LoginResponse;
      setError(data.error ?? 'No se pudo iniciar sesión.');
    });
  }

  return (
    <div className="space-y-6">
      {expired ? (
        <div
          role="status"
          className="border-l-2 border-taupe-deep bg-cream-soft px-4 py-3 text-sm text-ink"
        >
          Tu sesión expiró. Vuelve a iniciar sesión para continuar.
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute"
          >
            Correo
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border-0 border-b border-ink-line bg-transparent px-0 py-3 text-base text-ink placeholder:text-ink-soft focus:border-ink focus:outline-none"
            placeholder="cliente@ene-muebles.cl"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute"
          >
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border-0 border-b border-ink-line bg-transparent px-0 py-3 text-base text-ink placeholder:text-ink-soft focus:border-ink focus:outline-none"
            placeholder="••••••••"
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="border-l-2 border-ink bg-cream-soft px-4 py-3 text-sm text-ink"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || !email || !password}
          className="inline-flex w-full items-center justify-center gap-3 bg-ink px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-paper transition-colors duration-500 hover:bg-taupe-deep disabled:opacity-50"
        >
          {pending ? 'Verificando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}