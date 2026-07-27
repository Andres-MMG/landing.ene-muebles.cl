'use client';

import { useState } from 'react';
import { assertAdminAuth } from '@/lib/admin/client';

type DeleteError = { error?: string };

export function DeleteProductButton({ id }: { id: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (
          !confirm(
            '¿Eliminar este producto? Esta acción no se puede deshacer.'
          )
        ) {
          return;
        }
        setPending(true);
        setError(null);
        const res = assertAdminAuth(
          await fetch(`/api/admin/products/${id}`, {
            method: 'DELETE',
          })
        );
        if (res.ok) {
          window.location.href = '/admin';
          return;
        }
        const data = (await res.json().catch(() => ({}))) as DeleteError;
        setError(
          data.error ?? 'No se pudo eliminar el producto.'
        );
        setPending(false);
      }}
      className="flex flex-col items-end gap-2"
    >
      <button
        type="submit"
        disabled={pending}
        className="t-label text-paper underline-offset-[6px] hover:text-taupe hover:underline disabled:opacity-50"
      >
        {pending ? 'Eliminando…' : 'Eliminar producto'}
      </button>
      {error ? (
        <p
          role="alert"
          className="border-l-2 border-paper-line-on-ink bg-ink px-3 py-2 text-xs text-paper"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}