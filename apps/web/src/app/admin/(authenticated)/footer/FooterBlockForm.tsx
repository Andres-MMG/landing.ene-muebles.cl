"use client";

import { useState, useTransition } from "react";
import { adminPut } from "@/lib/admin/client";

export type FooterBlockFormValues = {
  copyrightText: string;
  tagline: string;
  legalSnippet: string;
  productCountSuffix: string;
  catalogHeading: string;
  contactHeading: string;
  legalHeading: string;
  socialHeading: string;
  catalogCtaLabel: string;
  officeLineLabel: string;
  schoolLineLabel: string;
  aboutLinkLabel: string;
  termsLinkLabel: string;
  privacyLinkLabel: string;
  rutLabel: string;
  catalogStampLabel: string;
  writtenBackingLabel: string;
};

type FieldKey = keyof FooterBlockFormValues;

type FieldDef = {
  key: FieldKey;
  label: string;
  maxLength: number;
  type?: "text" | "textarea";
  rows?: number;
  required?: boolean;
};

type FieldGroup = {
  legend: string;
  description: string;
  fields: FieldDef[];
};

const FIELD_GROUPS: FieldGroup[] = [
  {
    legend: "Promesa y marca",
    description:
      "El conteo de productos y el año son automáticos. Si la tienda no tiene productos activos, se muestra la frase de apoyo.",
    fields: [
      {
        key: "copyrightText",
        label: "Línea de copyright personalizada",
        maxLength: 200,
        required: true,
      },
      {
        key: "tagline",
        label: "Frase de apoyo cuando no hay productos activos",
        maxLength: 300,
        type: "textarea",
        rows: 2,
      },
      {
        key: "productCountSuffix",
        label: "Texto después del conteo de productos",
        maxLength: 160,
        type: "textarea",
        rows: 2,
      },
      { key: "rutLabel", label: "Etiqueta del RUT", maxLength: 30 },
    ],
  },
  {
    legend: "Columnas del pie de página",
    description:
      "Los destinos y el orden de navegación permanecen fijos. Aquí solo se administran sus textos visibles.",
    fields: [
      { key: "catalogHeading", label: "Encabezado de catálogo", maxLength: 60 },
      { key: "contactHeading", label: "Encabezado de contacto", maxLength: 60 },
      { key: "legalHeading", label: "Encabezado legal", maxLength: 60 },
      { key: "socialHeading", label: "Encabezado de redes", maxLength: 60 },
      { key: "catalogCtaLabel", label: "Enlace para ver catálogo", maxLength: 80 },
      { key: "officeLineLabel", label: "Enlace de línea oficina", maxLength: 80 },
      { key: "schoolLineLabel", label: "Enlace de línea escolar", maxLength: 80 },
      { key: "aboutLinkLabel", label: "Enlace sobre nosotros", maxLength: 80 },
      { key: "termsLinkLabel", label: "Enlace de términos y condiciones", maxLength: 120 },
      { key: "privacyLinkLabel", label: "Enlace de política de privacidad", maxLength: 120 },
      {
        key: "legalSnippet",
        label: "Texto legal complementario",
        maxLength: 300,
        type: "textarea",
        rows: 2,
      },
    ],
  },
  {
    legend: "Franja inferior",
    description:
      "El año y la garantía se obtienen automáticamente desde el sitio. Administra solo las etiquetas.",
    fields: [
      { key: "catalogStampLabel", label: "Etiqueta del catálogo institucional", maxLength: 120 },
      { key: "writtenBackingLabel", label: "Etiqueta de respaldo escrito", maxLength: 120 },
    ],
  },
];

const OPTIONAL_KEYS = [
  "tagline",
  "legalSnippet",
  "productCountSuffix",
  "catalogHeading",
  "contactHeading",
  "legalHeading",
  "socialHeading",
  "catalogCtaLabel",
  "officeLineLabel",
  "schoolLineLabel",
  "aboutLinkLabel",
  "termsLinkLabel",
  "privacyLinkLabel",
  "rutLabel",
  "catalogStampLabel",
  "writtenBackingLabel",
] as const satisfies readonly FieldKey[];

const inputClass =
  "w-full border-0 border-b border-ink-line bg-transparent px-0 py-3 text-base text-ink placeholder:text-ink-soft focus:border-ink focus:outline-none";

const labelClass = "t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute";

function normalizeSaveError(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const response = body as {
    error?: unknown;
    details?: { issues?: Array<{ path?: Array<string | number>; message?: string }> };
  };
  const proxyIssues = (response.details?.issues ?? [])
    .map((issue) => {
      const path = Array.isArray(issue.path) ? issue.path.join(".") : "";
      return path && issue.message ? path + ": " + issue.message : (issue.message ?? "");
    })
    .filter(Boolean)
    .join("; ");

  if (typeof response.error === "string") {
    return proxyIssues ? response.error + " (" + proxyIssues + ")" : response.error;
  }
  if (!response.error || typeof response.error !== "object") return proxyIssues;

  const upstream = response.error as {
    name?: string;
    message?: string;
    details?: { errors?: Array<{ path?: string[]; message?: string }> };
  };
  const heading = [upstream.name, upstream.message].filter(Boolean).join(": ");
  const details = (upstream.details?.errors ?? [])
    .map((issue) => {
      const path = Array.isArray(issue.path) ? issue.path.join(".") : "";
      return path && issue.message ? path + ": " + issue.message : (issue.message ?? "");
    })
    .filter(Boolean)
    .join("; ");

  if (details) return (heading || "No se pudieron guardar los ajustes.") + " (" + details + ")";
  return heading || proxyIssues || "No se pudieron guardar los ajustes.";
}

export function buildSubmitPayload(values: FooterBlockFormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    copyrightText: values.copyrightText.trim(),
  };

  for (const key of OPTIONAL_KEYS) {
    payload[key] = values[key].trim() || null;
  }

  return payload;
}

export function FooterBlockForm({ initial }: { initial: FooterBlockFormValues }) {
  const [values, setValues] = useState<FooterBlockFormValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function update(key: FieldKey, value: string) {
    setValues((previous) => ({ ...previous, [key]: value }));
    setSuccess(false);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        const body = await adminPut<unknown>("/api/admin/footer-block", buildSubmitPayload(values));
        const message = normalizeSaveError(body);
        if (message) {
          setError(message);
          return;
        }
        setSuccess(true);
      } catch (saveError) {
        setError(
          saveError instanceof Error ? saveError.message : "No se pudieron guardar los ajustes.",
        );
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10" noValidate>
      {FIELD_GROUPS.map((group) => (
        <fieldset
          key={group.legend}
          className="space-y-6 border-t border-ink-line pt-6 first:border-0 first:pt-0"
        >
          <legend className="t-display text-2xl text-ink">{group.legend}</legend>
          <p className="mt-2 max-w-[80ch] text-sm text-ink-mute">{group.description}</p>
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
            {group.fields.map((field) => (
              <label
                key={field.key}
                className={field.type === "textarea" ? "block md:col-span-2" : "block"}
              >
                <span className={labelClass}>
                  {field.label}
                  {field.required ? (
                    <span aria-hidden className="ml-2 text-taupe-deep">
                      *
                    </span>
                  ) : null}
                </span>
                {field.type === "textarea" ? (
                  <textarea
                    value={values[field.key]}
                    onChange={(event) => update(field.key, event.target.value)}
                    rows={field.rows ?? 3}
                    maxLength={field.maxLength}
                    required={field.required}
                    className={inputClass + " resize-y"}
                  />
                ) : (
                  <input
                    type="text"
                    value={values[field.key]}
                    onChange={(event) => update(field.key, event.target.value)}
                    maxLength={field.maxLength}
                    required={field.required}
                    className={inputClass}
                  />
                )}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <p className="text-sm text-ink-mute">
        Al dejar vacío un campo opcional se elimina su valor guardado y el sitio usa el texto
        predeterminado.
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
          Marcados con <span className="text-taupe-deep">*</span> son obligatorios.
        </p>
      </div>
    </form>
  );
}
