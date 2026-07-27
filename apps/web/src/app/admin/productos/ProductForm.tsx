'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Category = { documentId: string; name: string };
type Initial = {
  documentId: string | null;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: string;
  currency: string;
  category: string;
  active: boolean;
  featured: boolean;
};

/**
 * Form for both create and edit. The server component that
 * renders this passes the initial state. The submit handler
 * dispatches to /api/admin/products (POST) for new, or
 * /api/admin/products/[id] (PUT) for edit, then redirects to the
 * dashboard on success.
 */
export function ProductForm({
  initial,
  categories,
  mode,
}: {
  initial: Initial;
  categories: Category[];
  mode: 'create' | 'edit';
}) {
  const router = useRouter();
  const [form, setForm] = useState<Initial>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof Initial>(key: K, value: Initial[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function autoSlugFromName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        shortDescription: form.shortDescription.trim() || undefined,
        price: Number(form.price),
        currency: form.currency.trim() || 'CLP',
        category: form.category || undefined,
        active: form.active,
        featured: form.featured,
      };
      const url =
        mode === 'create'
          ? '/api/admin/products'
          : `/api/admin/products/${initial.documentId}`;
      const method = mode === 'create' ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          (data as { error?: string }).error ?? 'No se pudo guardar el producto.'
        );
        return;
      }
      router.push('/admin' as never);
    });
  }

  const inputClass =
    'w-full border-0 border-b border-ink-line bg-transparent px-0 py-3 text-base text-ink placeholder:text-ink-soft focus:border-ink focus:outline-none';

  return (
    <form onSubmit={onSubmit} className="space-y-10">
      <fieldset className="space-y-6">
        <legend className="t-mono mb-4 text-[10px] uppercase tracking-[0.22em] text-taupe-deep">
          Identidad
        </legend>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <label className="block">
            <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Nombre
            </span>
            <input
              required
              value={form.name}
              onChange={(e) => {
                const next = e.target.value;
                update('name', next);
                if (mode === 'create') {
                  update('slug', autoSlugFromName(next));
                }
              }}
              className={inputClass}
              placeholder="Escritorio ejecutivo 1.50 m"
            />
          </label>
          <label className="block">
            <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Slug
            </span>
            <input
              required
              value={form.slug}
              onChange={(e) => update('slug', e.target.value)}
              className={`${inputClass} font-mono`}
              placeholder="escritorio-ejecutivo-150-m"
            />
          </label>
        </div>
        <label className="block">
          <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            Descripción corta (máx 280)
          </span>
          <textarea
            value={form.shortDescription}
            onChange={(e) => update('shortDescription', e.target.value)}
            rows={2}
            maxLength={280}
            className={inputClass}
            placeholder="Una línea que resume el producto para el catálogo."
          />
        </label>
        <label className="block">
          <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            Descripción completa
          </span>
          <textarea
            required
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            rows={5}
            className={inputClass}
            placeholder="Descripción técnica del producto, materiales, terminaciones, etc."
          />
        </label>
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="t-mono mb-4 text-[10px] uppercase tracking-[0.22em] text-taupe-deep">
          Comercial
        </legend>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <label className="block">
            <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Precio (CLP)
            </span>
            <input
              required
              type="number"
              inputMode="numeric"
              min="0"
              value={form.price}
              onChange={(e) => update('price', e.target.value)}
              className={`${inputClass} font-mono`}
              placeholder="199000"
            />
          </label>
          <label className="block">
            <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Moneda
            </span>
            <select
              value={form.currency}
              onChange={(e) => update('currency', e.target.value)}
              className={inputClass}
            >
              <option value="CLP">CLP</option>
              <option value="USD">USD</option>
              <option value="UF">UF</option>
            </select>
          </label>
          <label className="block">
            <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Categoría
            </span>
            <select
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              className={inputClass}
            >
              <option value="">— Sin categoría —</option>
              {categories.map((c) => (
                <option key={c.documentId} value={c.documentId}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-6 pt-2">
          <label className="inline-flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => update('active', e.target.checked)}
              className="h-4 w-4 accent-ink"
            />
            <span className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink">
              Activo
            </span>
          </label>
          <label className="inline-flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => update('featured', e.target.checked)}
              className="h-4 w-4 accent-ink"
            />
            <span className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink">
              Destacado
            </span>
          </label>
        </div>
      </fieldset>

      {error ? (
        <p
          role="alert"
          className="border-l-2 border-ink bg-cream-soft px-4 py-3 text-sm text-ink"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 border-t border-ink-line pt-6">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-3 bg-ink px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-paper transition-colors duration-500 hover:bg-taupe-deep disabled:opacity-50"
        >
          {pending
            ? 'Guardando…'
            : mode === 'create'
            ? 'Crear producto'
            : 'Guardar cambios'}
        </button>
        <a
          href={'/admin' as never}
          className="t-label text-ink underline-offset-[6px] hover:text-taupe-deep hover:underline"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
