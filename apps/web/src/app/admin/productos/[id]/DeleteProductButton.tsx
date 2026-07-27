'use client';

import { useState } from 'react';

export function DeleteProductButton({ id }: { id: string }) {
  const [pending, setPending] = useState(false);

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
        const res = await fetch(`/api/admin/products/${id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          window.location.href = '/admin';
        } else {
          setPending(false);
          alert('No se pudo eliminar el producto.');
        }
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className="t-label text-paper underline-offset-[6px] hover:text-taupe hover:underline disabled:opacity-50"
      >
        {pending ? 'Eliminando…' : 'Eliminar producto'}
      </button>
    </form>
  );
}
