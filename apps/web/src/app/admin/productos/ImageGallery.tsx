'use client';

import { useRef, useState } from 'react';
import { adminDelete, adminPut, adminUpload } from '@/lib/admin/client';

export type ImageRecord = {
  id: number;
  documentId: string;
  url: string;
  thumbnailUrl?: string;
  name: string;
};

type Props = {
  productDocumentId: string;
  initialImages: ImageRecord[];
  maxImages?: number;
};

type UploadImage = ImageRecord & {
  formats?: { thumbnail?: { url?: string } };
};

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function uploadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message !== 'Upload failed') {
    return error.message;
  }
  return 'No se pudieron subir las imágenes.';
}

export function ImageGallery({
  productDocumentId,
  initialImages,
  maxImages = 8,
}: Props) {
  const [images, setImages] = useState<ImageRecord[]>(initialImages);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onUpload(files: FileList | null) {
    if (!files?.length || pending) return;

    const selected = Array.from(files);
    if (selected.some((file) => !ACCEPTED_TYPES.has(file.type))) {
      setError('Solo se aceptan imágenes.');
      return;
    }
    if (selected.some((file) => file.size > MAX_FILE_SIZE)) {
      setError('Archivo demasiado grande.');
      return;
    }
    if (images.length + selected.length > maxImages) {
      setError(`Máximo ${maxImages} imágenes por producto.`);
      return;
    }

    setPending(true);
    setError(null);
    const formData = new FormData();
    selected.forEach((file) => formData.append('files', file));

    try {
      const uploaded = await adminUpload<UploadImage[]>(
        `/api/admin/products/${productDocumentId}/images`,
        formData
      );
      const records = uploaded.map((image) => ({
        id: image.id,
        documentId: image.documentId,
        url: image.url,
        thumbnailUrl: image.formats?.thumbnail?.url ?? image.thumbnailUrl ?? image.url,
        name: image.name,
      }));
      setImages((current) => [...current, ...records]);
    } catch (uploadError) {
      setError(uploadErrorMessage(uploadError));
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function onDelete(id: number) {
    if (pending || !window.confirm('¿Eliminar esta imagen?')) return;

    const snapshot = images;
    setImages((current) => current.filter((image) => image.id !== id));
    setPending(true);
    setError(null);

    try {
      const response = await adminDelete(`/api/admin/media/${id}`);
      if (!response.ok) throw new Error('No se pudo eliminar la imagen.');
    } catch {
      setImages(snapshot);
      setError('No se pudo eliminar la imagen.');
    } finally {
      setPending(false);
    }
  }

  async function onMove(id: number, direction: 'up' | 'down') {
    if (pending) return;

    const snapshot = images;
    const index = snapshot.findIndex((image) => image.id === id);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= snapshot.length) return;

    const reordered = [...snapshot];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setImages(reordered);
    setPending(true);
    setError(null);

    try {
      const result = await adminPut<{ data?: unknown; error?: unknown }>(
        `/api/admin/products/${productDocumentId}/images/order`,
        { ids: reordered.map((image) => image.id) }
      );
      if (result.error || !result.data) throw new Error('Reorder failed');
    } catch {
      setImages(snapshot);
      setError('No se pudo cambiar el orden de las imágenes.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="product-images-title" className="space-y-5 border-t border-ink-line pt-8">
      {error ? (
        <div
          role="alert"
          className="flex items-start justify-between gap-4 border border-ink-line bg-cream-soft px-4 py-3 text-sm text-ink"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="t-mono text-xs text-ink-mute hover:text-ink"
            aria-label="Cerrar mensaje"
          >
            ×
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="product-images-title" className="t-label text-xl text-ink">
          Imágenes del producto
        </h2>
        <span className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          ({images.length} / {maxImages})
        </span>
      </div>

      {images.length === 0 ? (
        <p className="border border-dashed border-ink-line bg-paper-pure px-5 py-8 text-sm text-ink-mute">
          Aún no hay imágenes para este producto. Subí la primera abajo.
        </p>
      ) : (
        <ul role="list" className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <li key={image.id} className="relative border border-ink-line bg-paper-pure p-3">
              <div className="aspect-square overflow-hidden bg-cream-soft">
                {/* Strapi media URLs are dynamic; use a plain image element intentionally. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.thumbnailUrl ?? image.url}
                  alt={image.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <p title={image.name} className="t-mono mt-3 truncate text-[10px] text-ink-mute">
                {image.name.length > 24 ? `${image.name.slice(0, 24)}…` : image.name}
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-ink-line pt-2">
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={pending || index === 0}
                    onClick={() => onMove(image.id, 'up')}
                    className="text-ink-mute hover:text-ink disabled:cursor-not-allowed disabled:opacity-25"
                    aria-label={`Mover ${image.name} hacia arriba`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={pending || index === images.length - 1}
                    onClick={() => onMove(image.id, 'down')}
                    className="text-ink-mute hover:text-ink disabled:cursor-not-allowed disabled:opacity-25"
                    aria-label={`Mover ${image.name} hacia abajo`}
                  >
                    ↓
                  </button>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onDelete(image.id)}
                  className="text-ink-mute hover:text-ink disabled:opacity-25"
                  aria-label={`Eliminar ${image.name}`}
                >
                  ×
                </button>
              </div>
              {pending ? (
                <div className="absolute inset-0 grid place-items-center bg-paper-pure/70" aria-hidden="true">
                  <span className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink">Procesando…</span>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {images.length >= maxImages ? (
        <p className="t-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
          Máximo {maxImages} imágenes por producto.
        </p>
      ) : (
        <label className="inline-flex cursor-pointer items-center bg-ink px-5 py-3 text-xs font-medium uppercase tracking-[0.18em] text-paper transition-colors hover:bg-taupe-deep has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
          Subir imágenes
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            disabled={pending}
            onChange={(event) => onUpload(event.target.files)}
            className="sr-only"
          />
        </label>
      )}
    </section>
  );
}
