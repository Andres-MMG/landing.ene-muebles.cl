'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminDelete, adminPost, adminPut } from '@/lib/admin/client';

type Initial = {
  name: string;
  slug: string;
  description: string;
  order: number;
  active: boolean;
};

type Props = {
  mode: 'create' | 'edit';
  documentId?: string;
  initial: Initial;
};

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

type ErrorResponse = { error?: string };

/**
 * Form for both create and edit of a category. The server component
 * that renders this passes the initial state.
 *
 * For `create`, it POSTs to `/api/admin/categories` and on 201 the
 * client navigates to `/admin/categorias/<documentId>`.
 *
 * For `edit`, it PUTs to `/api/admin/categories/<documentId>`.
 *
 * Image handling:
 *   - The page fetches the current image URL (if any) and passes it as
 *     `currentImageUrl` so we can preview it before upload.
 *   - Uploading a new image calls POST `/api/admin/categories/[id]/image`
 *     which both uploads and binds in one request.
 *   - The `Sin imagen` checkbox clears the relation via DELETE
 *     `/api/admin/categories/[id]/image`.
 */
export function CategoryForm({
  mode,
  documentId,
  initial,
  currentImageUrl,
  currentImageAlt,
}: Props & {
  currentImageUrl?: string | null;
  currentImageAlt?: string | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Initial>(initial);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [imagePending, setImagePending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentImageUrl ?? null
  );

  function update<K extends keyof Initial>(key: K, value: Initial[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    startTransition(async () => {
      try {
        const payload = {
          name: form.name.trim(),
          slug: slugify(form.name),
          description: form.description.trim() || undefined,
          order: Number(form.order) || 0,
          active: form.active,
        };
        if (mode === 'create') {
          const data = await adminPost<{ data?: { documentId?: string } }>(
            '/api/admin/categories',
            payload
          );
          const newId = data?.data?.documentId;
          if (!newId) {
            setError('La categoría se creó, pero no se pudo abrir el editor.');
            return;
          }
          router.push(`/admin/categorias/${newId}` as never);
          return;
        }
        if (!documentId) {
          setError('Falta el identificador de la categoría.');
          return;
        }
        await adminPut(`/api/admin/categories/${documentId}`, payload);
        setInfo('Cambios guardados.');
        router.refresh();
      } catch (err) {
        const message =
          (err as { error?: string }).error ?? 'No se pudo guardar la categoría.';
        setError(message);
      }
    });
  }

  async function onImageChange(file: File) {
    if (!documentId) return;
    if (!ACCEPTED_TYPES.has(file.type)) {
      setError('Solo se aceptan imágenes (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('La imagen excede 2 MB.');
      return;
    }
    setImagePending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await adminPost(`/api/admin/categories/${documentId}/image`, fd);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setInfo('Imagen actualizada.');
      router.refresh();
    } catch (err) {
      const message =
        (err as ErrorResponse).error ?? 'No se pudo subir la imagen.';
      setError(message);
    } finally {
      setImagePending(false);
    }
  }

  async function onImageRemove() {
    if (!documentId) return;
    setImagePending(true);
    setError(null);
    try {
      const res = await adminDelete(`/api/admin/categories/${documentId}/image`);
      if (!res.ok) throw new Error('No se pudo eliminar la imagen.');
      setPreviewUrl(null);
      setInfo('Imagen eliminada.');
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo eliminar la imagen.';
      setError(message);
    } finally {
      setImagePending(false);
    }
  }

  async function onDelete() {
    if (!documentId) return;
    if (
      !window.confirm(
        '¿Eliminar esta categoría? Esta acción no se puede deshacer.'
      )
    ) {
      return;
    }
    setError(null);
    setInfo(null);
    startTransition(async () => {
      try {
        const res = await adminDelete(`/api/admin/categories/${documentId}`);
        if (res.status === 409) {
          const data = (await res.json().catch(() => ({}))) as ErrorResponse;
          setError(
            data.error ??
              'Esta categoría tiene productos asociados. Reasignalos antes de eliminar.'
          );
          return;
        }
        if (!res.ok) {
          throw new Error('No se pudo eliminar la categoría.');
        }
        router.push('/admin/categorias' as never);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No se pudo eliminar la categoría.';
        setError(message);
      }
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
                  update('slug', slugify(next));
                }
              }}
              className={inputClass}
              placeholder="Escritorios"
            />
          </label>
          <label className="block">
            <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Slug (se genera del nombre)
            </span>
            <input
              required
              value={form.slug}
              onChange={(e) => update('slug', e.target.value)}
              className={`${inputClass} font-mono`}
              placeholder="escritorios"
            />
          </label>
        </div>
        <label className="block">
          <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            Descripción
          </span>
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            rows={3}
            className={inputClass}
            placeholder="Una línea que resume esta categoría para el catálogo."
          />
        </label>
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="t-mono mb-4 text-[10px] uppercase tracking-[0.22em] text-taupe-deep">
          Configuración
        </legend>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <label className="block">
            <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Orden
            </span>
            <input
              type="number"
              min="0"
              value={form.order}
              onChange={(e) => update('order', Number(e.target.value))}
              className={`${inputClass} font-mono`}
              placeholder="0"
            />
          </label>
          <label className="inline-flex items-center gap-3 self-end pb-3">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => update('active', e.target.checked)}
              className="h-4 w-4 accent-ink"
            />
            <span className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink">
              Activa
            </span>
          </label>
        </div>
      </fieldset>

      {mode === 'edit' ? (
        <fieldset className="space-y-4">
          <legend className="t-mono mb-4 text-[10px] uppercase tracking-[0.22em] text-taupe-deep">
            Imagen
          </legend>
          {previewUrl ? (
            <div className="flex items-center gap-4">
              <div className="img-zoom relative aspect-square w-32 overflow-hidden bg-cream-soft">
                {/* Strapi media URLs are dynamic; use a plain image element intentionally. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={currentImageAlt ?? form.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="inline-flex cursor-pointer items-center bg-ink px-5 py-3 text-xs font-medium uppercase tracking-[0.18em] text-paper transition-colors hover:bg-taupe-deep has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                  Reemplazar imagen
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={imagePending || pending}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onImageChange(f);
                    }}
                    className="sr-only"
                  />
                </label>
                <button
                  type="button"
                  disabled={imagePending || pending}
                  onClick={onImageRemove}
                  className="t-label text-ink underline-offset-[6px] hover:text-taupe-deep hover:underline disabled:opacity-50"
                >
                  Quitar imagen
                </button>
              </div>
            </div>
          ) : (
            <label className="inline-flex cursor-pointer items-center bg-ink px-5 py-3 text-xs font-medium uppercase tracking-[0.18em] text-paper transition-colors hover:bg-taupe-deep has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
              Subir imagen
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={imagePending || pending}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImageChange(f);
                }}
                className="sr-only"
              />
            </label>
          )}
          <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            JPEG, PNG o WebP · máximo 2 MB
          </p>
        </fieldset>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="border-l-2 border-ink bg-cream-soft px-4 py-3 text-sm text-ink"
        >
          {error}
        </p>
      ) : null}

      {info ? (
        <p
          role="status"
          className="border-l-2 border-taupe-deep bg-cream-soft px-4 py-3 text-sm text-ink"
        >
          {info}
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
            ? 'Crear categoría'
            : 'Guardar cambios'}
        </button>
        <a
          href={'/admin/categorias' as never}
          className="t-label text-ink underline-offset-[6px] hover:text-taupe-deep hover:underline"
        >
          Volver al listado
        </a>
      </div>

      {mode === 'edit' && documentId ? (
        <div className="border-t border-ink-line pt-6">
          <button
            type="button"
            disabled={pending}
            onClick={onDelete}
            className="t-label text-ink underline-offset-[6px] hover:text-taupe-deep hover:underline disabled:opacity-50"
          >
            Eliminar categoría
          </button>
        </div>
      ) : null}
    </form>
  );
}