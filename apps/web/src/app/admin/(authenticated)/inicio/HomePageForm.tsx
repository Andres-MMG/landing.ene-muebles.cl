"use client";

import { useState, useTransition } from "react";
import { adminPut } from "@/lib/admin/client";

export type HomePageFormValues = {
  seoTitle?: string;
  seoDescription?: string;
  catalogEyebrow: string;
  catalogTitle: string;
  catalogBody: string;
  catalogCtaLabel: string;
  featuredEyebrow: string;
  featuredTitle: string;
  featuredBody: string;
  featuredCtaLabel: string;
};

type FieldKey = keyof HomePageFormValues;

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
    help: "Opcional. Se usa en buscadores y al compartir la portada.",
  },
  {
    key: "seoDescription",
    label: "Descripción SEO",
    maxLength: 160,
    rows: 3,
    required: false,
    help: "Opcional. Si queda vacío, se usa el texto global o el valor predeterminado.",
  },
];

const CATALOG_FIELDS: FieldDefinition[] = [
  { key: "catalogEyebrow", label: "Etiqueta superior", maxLength: 120 },
  { key: "catalogTitle", label: "Título", maxLength: 240 },
  { key: "catalogBody", label: "Descripción", maxLength: 800, rows: 4 },
  { key: "catalogCtaLabel", label: "Texto del botón", maxLength: 80 },
];

const FEATURED_FIELDS: FieldDefinition[] = [
  { key: "featuredEyebrow", label: "Etiqueta superior", maxLength: 120 },
  { key: "featuredTitle", label: "Título", maxLength: 240 },
  { key: "featuredBody", label: "Descripción", maxLength: 800, rows: 4 },
  { key: "featuredCtaLabel", label: "Texto del botón", maxLength: 80 },
];

const inputClass =
  "w-full border-0 border-b border-ink-line bg-transparent px-0 py-3 text-base text-ink placeholder:text-ink-soft focus:border-ink focus:outline-none";

const labelClass = "t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute";

export function buildSubmitPayload(values: HomePageFormValues): Record<string, string | null> {
  return {
    seoTitle: (values.seoTitle ?? "").trim() || null,
    seoDescription: (values.seoDescription ?? "").trim() || null,
    catalogEyebrow: values.catalogEyebrow.trim(),
    catalogTitle: values.catalogTitle.trim(),
    catalogBody: values.catalogBody.trim(),
    catalogCtaLabel: values.catalogCtaLabel.trim(),
    featuredEyebrow: values.featuredEyebrow.trim(),
    featuredTitle: values.featuredTitle.trim(),
    featuredBody: values.featuredBody.trim(),
    featuredCtaLabel: values.featuredCtaLabel.trim(),
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
  values: HomePageFormValues;
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

export function HomePageForm({ initial }: { initial: HomePageFormValues }) {
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
          "/api/admin/home-page",
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
            : "No se pudieron guardar los textos de inicio.",
        );
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10" noValidate>
      <fieldset className="space-y-6">
        <legend className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
          SEO de la portada
        </legend>
        <Fields definitions={SEO_FIELDS} values={values} onChange={update} />
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
          Líneas del catálogo
        </legend>
        <Fields definitions={CATALOG_FIELDS} values={values} onChange={update} />
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
          Productos destacados
        </legend>
        <Fields definitions={FEATURED_FIELDS} values={values} onChange={update} />
      </fieldset>

      <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
        Los enlaces de ambos botones siguen apuntando al catálogo. Aquí se administra sólo su texto.
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
