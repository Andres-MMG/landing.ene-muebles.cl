"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { assertAdminAuth } from "@/lib/admin/client";
import { ImageGallery, type ImageRecord } from "./ImageGallery";
import {
  CONFIDENCE_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  buildProductSubmitPayload,
  type ProductFormValues,
} from "./_lib/productFormData";
import { productListReturnTarget } from "../_lib/productListState";

type Category = { documentId: string; name: string };

/**
 * Form for both create and edit. The server component that
 * renders this passes the initial state. The submit handler
 * dispatches to /api/admin/products (POST) for new, or
 * /api/admin/products/[id] (PUT) for edit, then redirects to the
 * dashboard on success.
 *
 * Catalog-import (S4) — adds the "Atributos del catálogo" section
 * with the 10 catalog-import fields, plus a read-only badge
 * surfacing the `importSource` / `importBatch` metadata that the
 * Excel importer stamps on every imported product.
 */
export function ProductForm({
  initial,
  categories,
  mode,
  images,
  productDocumentId,
}: {
  initial: ProductFormValues;
  categories: Category[];
  mode: "create" | "edit";
  images: ImageRecord[];
  productDocumentId: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = productListReturnTarget(searchParams.get("from"));
  const [form, setForm] = useState<ProductFormValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function autoSlugFromName(name: string): string {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const body = buildProductSubmitPayload(form);
      const url =
        mode === "create" ? "/api/admin/products" : `/api/admin/products/${initial.documentId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = assertAdminAuth(
        await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "No se pudo guardar el producto.");
        return;
      }
      if (mode === "create") {
        const data = (await res.json().catch(() => null)) as {
          data?: { documentId?: string };
        } | null;
        const documentId = data?.data?.documentId;
        if (!documentId) {
          setError("El producto se creó, pero no se pudo abrir el editor.");
          return;
        }
        router.push(`/admin/productos/${documentId}?from=${encodeURIComponent(returnTo)}` as never);
        return;
      }
      router.push(returnTo as never);
    });
  }

  const inputClass =
    "w-full border-0 border-b border-ink-line bg-transparent px-0 py-3 text-base text-ink placeholder:text-ink-soft focus:border-ink focus:outline-none";

  const showImportBadge =
    form.importSource === "imported" &&
    (Boolean(form.importBatchFileName) || Boolean(form.importBatchUploadedAt));

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
                update("name", next);
                if (mode === "create") {
                  update("slug", autoSlugFromName(next));
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
              onChange={(e) => update("slug", e.target.value)}
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
            onChange={(e) => update("shortDescription", e.target.value)}
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
            onChange={(e) => update("description", e.target.value)}
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
              onChange={(e) => update("price", e.target.value)}
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
              onChange={(e) => update("currency", e.target.value)}
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
              onChange={(e) => update("category", e.target.value)}
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
              onChange={(e) => update("active", e.target.checked)}
              className="h-4 w-4 accent-ink"
            />
            <span className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink">Activo</span>
          </label>
          <label className="inline-flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => update("featured", e.target.checked)}
              className="h-4 w-4 accent-ink"
            />
            <span className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink">
              Destacado
            </span>
          </label>
        </div>
      </fieldset>

      {/* Catalog-import (S4) — "Atributos del catálogo" section. */}
      <fieldset className="space-y-6">
        <legend className="t-mono mb-4 text-[10px] uppercase tracking-[0.22em] text-taupe-deep">
          Atributos del catálogo
        </legend>
        {showImportBadge ? (
          <p
            data-testid="import-badge"
            className="inline-flex items-center gap-2 border border-taupe px-3 py-1 t-mono text-[10px] uppercase tracking-[0.22em] text-taupe-deep"
          >
            <span aria-hidden>•</span>
            Importado desde Excel
            {form.importBatchFileName ? (
              <span className="text-ink-mute">· {form.importBatchFileName}</span>
            ) : null}
            {form.importBatchUploadedAt ? (
              <span className="text-ink-soft">· {form.importBatchUploadedAt}</span>
            ) : null}
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <label className="block">
            <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              ID externo
            </span>
            <input
              value={form.externalId}
              onChange={(e) => update("externalId", e.target.value)}
              maxLength={32}
              className={`${inputClass} font-mono`}
              placeholder="CAT-2025-001"
            />
          </label>
          <label className="block">
            <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Qué es
            </span>
            <select
              value={form.productType}
              onChange={(e) => update("productType", e.target.value)}
              className={inputClass}
            >
              <option value="">— Sin definir —</option>
              {PRODUCT_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Subcategoría
            </span>
            <input
              value={form.subcategory}
              onChange={(e) => {
                // prettier-ignore
                update('subcategory', e.target.value);
              }}
              maxLength={80}
              className={inputClass}
              placeholder="Sillas y asientos"
            />
          </label>
          <label className="block">
            <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Uso / ambiente
            </span>
            <input
              value={form.usageEnvironment}
              onChange={(e) => {
                // prettier-ignore
                update('usageEnvironment', e.target.value);
              }}
              maxLength={120}
              className={inputClass}
              placeholder="Sala de clases / educación inicial"
            />
          </label>
          <label className="block">
            <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Color observable
            </span>
            <input
              value={form.observableColor}
              onChange={(e) => {
                // prettier-ignore
                update('observableColor', e.target.value);
              }}
              maxLength={120}
              className={inputClass}
              placeholder="Madera natural y blanco"
            />
          </label>
          <label className="block">
            <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Material / acabado observable
            </span>
            <input
              value={form.observableMaterial}
              onChange={(e) => {
                // prettier-ignore
                update('observableMaterial', e.target.value);
              }}
              maxLength={160}
              className={inputClass}
              placeholder="Melamina 18 mm"
            />
          </label>
          <label className="block">
            <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Página PDF
            </span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={form.catalogPage}
              onChange={(e) => update("catalogPage", e.target.value)}
              className={`${inputClass} font-mono`}
              placeholder="2"
            />
          </label>
          <label className="block">
            <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Certeza
            </span>
            <select
              value={form.confidence}
              onChange={(e) => update("confidence", e.target.value)}
              className={inputClass}
            >
              <option value="">— Sin definir —</option>
              {CONFIDENCE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Fuente
            </span>
            <input
              value={form.source}
              onChange={(e) => {
                // prettier-ignore
                update('source', e.target.value);
              }}
              maxLength={200}
              className={inputClass}
              placeholder="CATOLOGO PRODUCTOS- 2025.pdf, página 2"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Observación
            </span>
            <textarea
              value={form.observation}
              onChange={(e) => {
                // prettier-ignore
                update('observation', e.target.value);
              }}
              rows={3}
              maxLength={1000}
              className={inputClass}
              placeholder="Notas sobre la extracción, observaciones visuales, etc."
            />
          </label>
        </div>
      </fieldset>

      {productDocumentId ? (
        <ImageGallery productDocumentId={productDocumentId} initialImages={images} />
      ) : (
        <p className="border-l-2 border-ink-line px-4 py-2 text-sm text-ink-mute">
          Las imágenes se podrán cargar una vez creado el producto.
        </p>
      )}

      {error ? (
        <p role="alert" className="border-l-2 border-ink bg-cream-soft px-4 py-3 text-sm text-ink">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 border-t border-ink-line pt-6">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-3 bg-ink px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-paper transition-colors duration-500 hover:bg-taupe-deep disabled:opacity-50"
        >
          {pending ? "Guardando…" : mode === "create" ? "Crear producto" : "Guardar cambios"}
        </button>
        <a
          href={returnTo as never}
          className="t-label text-ink underline-offset-[6px] hover:text-taupe-deep hover:underline"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
