"use client";

import { useState, useTransition } from "react";
import { adminPut } from "@/lib/admin/client";

export type CatalogPageFormValues = {
  seoTitle?: string;
  seoDescription?: string;
  eyebrow: string;
  productCountSuffix: string;
  documentationText: string;
  printCtaLabel: string;
  printCoverTitle: string;
  printCoverBody: string;
  printIndexTitle: string;
  printCategorySubtitle: string;
  printPublishedProductsSuffix: string;
};

type FieldKey = keyof CatalogPageFormValues;

type FieldDefinition = {
  key: FieldKey;
  label: string;
  maxLength: number;
  rows?: number;
  required?: boolean;
  help?: string;
};

const SEO_FIELDS: FieldDefinition[] = [
  {
    key: "seoTitle",
    label: "Título SEO",
    maxLength: 60,
    required: false,
    help: "Opcional. Si queda vacío, se usa “Catálogo”.",
  },
  {
    key: "seoDescription",
    label: "Descripción SEO",
    maxLength: 160,
    rows: 3,
    required: false,
    help: "Opcional. Se usa en buscadores y al compartir esta página.",
  },
];

const PUBLIC_FIELDS: FieldDefinition[] = [
  { key: "eyebrow", label: "Etiqueta superior", maxLength: 120 },
  {
    key: "productCountSuffix",
    label: "Texto después de la cantidad de productos",
    maxLength: 180,
  },
  { key: "documentationText", label: "Texto de documentación", maxLength: 600, rows: 4 },
  { key: "printCtaLabel", label: "Texto del botón de impresión", maxLength: 80 },
];

const PRINT_FIELDS: FieldDefinition[] = [
  { key: "printCoverTitle", label: "Título de portada", maxLength: 180 },
  { key: "printCoverBody", label: "Descripción de portada", maxLength: 600, rows: 4 },
  { key: "printIndexTitle", label: "Título del índice", maxLength: 180 },
  { key: "printCategorySubtitle", label: "Subtítulo de páginas de categoría", maxLength: 180 },
  {
    key: "printPublishedProductsSuffix",
    label: "Texto después del total de productos publicados",
    maxLength: 120,
  },
];

const inputClass =
  "w-full border-0 border-b border-ink-line bg-transparent px-0 py-3 text-base text-ink placeholder:text-ink-soft focus:border-ink focus:outline-none";
const labelClass = "t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute";

export function buildSubmitPayload(values: CatalogPageFormValues): Record<string, string | null> {
  return {
    seoTitle: (values.seoTitle ?? "").trim() || null,
    seoDescription: (values.seoDescription ?? "").trim() || null,
    eyebrow: values.eyebrow.trim(),
    productCountSuffix: values.productCountSuffix.trim(),
    documentationText: values.documentationText.trim(),
    printCtaLabel: values.printCtaLabel.trim(),
    printCoverTitle: values.printCoverTitle.trim(),
    printCoverBody: values.printCoverBody.trim(),
    printIndexTitle: values.printIndexTitle.trim(),
    printCategorySubtitle: values.printCategorySubtitle.trim(),
    printPublishedProductsSuffix: values.printPublishedProductsSuffix.trim(),
  };
}

function normalizeSaveError(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const response = body as {
    error?: unknown;
    details?: { issues?: Array<{ path?: Array<string | number>; message?: string }> };
  };
  const issueText = (response.details?.issues ?? [])
    .map((issue) => {
      const path = Array.isArray(issue.path) ? issue.path.join(".") : "";
      return path && issue.message ? path + ": " + issue.message : (issue.message ?? "");
    })
    .filter(Boolean)
    .join("; ");

  if (typeof response.error === "string") {
    return issueText ? response.error + " (" + issueText + ")" : response.error;
  }
  if (response.error && typeof response.error === "object") {
    const error = response.error as { message?: string; name?: string };
    return [error.name, error.message].filter(Boolean).join(": ");
  }
  return issueText;
}

function Fields({
  definitions,
  values,
  onChange,
}: {
  definitions: FieldDefinition[];
  values: CatalogPageFormValues;
  onChange: (key: FieldKey, value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
      {definitions.map((field) => (
        <label
          key={field.key}
          htmlFor={field.key}
          className={field.rows ? "block sm:col-span-2" : "block"}
        >
          <span className={labelClass}>
            {field.label}
            {field.required !== false ? (
              <span aria-hidden className="ml-2 text-taupe-deep">
                *
              </span>
            ) : null}
          </span>
          <textarea
            id={field.key}
            value={values[field.key] ?? ""}
            onChange={(event) => onChange(field.key, event.target.value)}
            rows={field.rows ?? 2}
            required={field.required !== false}
            maxLength={field.maxLength}
            className={inputClass + " resize-y"}
          />
          {field.help ? (
            <span className="t-mono mt-2 block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              {field.help}
            </span>
          ) : null}
        </label>
      ))}
    </div>
  );
}

export function CatalogPageForm({ initial }: { initial: CatalogPageFormValues }) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function update(key: FieldKey, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setSuccess(false);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        const response = await adminPut<unknown>(
          "/api/admin/catalog-page",
          buildSubmitPayload(values),
        );
        const message = normalizeSaveError(response);
        if (message) {
          setError(message);
          return;
        }
        setSuccess(true);
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "No se pudieron guardar los textos del catálogo.",
        );
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10" noValidate>
      <fieldset className="space-y-6">
        <legend className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
          SEO del catálogo
        </legend>
        <Fields definitions={SEO_FIELDS} values={values} onChange={update} />
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
          Catálogo público
        </legend>
        <Fields definitions={PUBLIC_FIELDS} values={values} onChange={update} />
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
          Catálogo imprimible
        </legend>
        <Fields definitions={PRINT_FIELDS} values={values} onChange={update} />
      </fieldset>

      <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
        Las cantidades, categorías, productos, datos de contacto y fechas se administran desde sus
        fuentes correspondientes.
      </p>

      {error ? (
        <p role="alert" className="border-l-2 border-ink bg-cream-soft px-4 py-3 text-sm text-ink">
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          role="status"
          className="border-l-2 border-taupe-deep bg-cream-soft px-4 py-3 text-sm text-ink"
        >
          Cambios guardados.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 border-t border-ink-line pt-6">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-3 bg-ink px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-paper transition-colors duration-500 hover:bg-taupe-deep disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
        <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
          Todos los campos son obligatorios.
        </p>
      </div>
    </form>
  );
}
