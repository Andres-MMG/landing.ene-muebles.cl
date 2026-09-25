"use client";

import { useState, useTransition } from "react";
import { adminPut } from "@/lib/admin/client";
import type { ContactPage } from "@/lib/strapi";

export type ContactPageFormValues = Omit<
  ContactPage,
  "id" | "documentId" | "seoTitle" | "seoDescription"
> & { seoTitle?: string; seoDescription?: string };
type FieldKey = keyof ContactPageFormValues;

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
    help: "Opcional. Si queda vacío, se usa “Contacto”.",
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

const HERO_FIELDS: FieldDefinition[] = [
  { key: "heroEyebrow", label: "Etiqueta superior", maxLength: 80 },
  { key: "heroTitle", label: "Título principal", maxLength: 180 },
  { key: "heroBody", label: "Descripción principal", maxLength: 600, rows: 4 },
  { key: "whatsappCtaLabel", label: "Botón de WhatsApp", maxLength: 80 },
  { key: "emailCtaLabel", label: "Etiqueta del correo", maxLength: 60 },
];

const CONTACT_FIELDS: FieldDefinition[] = [
  { key: "alternateContactEyebrow", label: "Etiqueta de contacto alternativo", maxLength: 80 },
  { key: "phoneContactLabel", label: "Etiqueta del teléfono", maxLength: 60 },
  { key: "whatsappContactLabel", label: "Etiqueta de WhatsApp", maxLength: 60 },
  { key: "businessHoursLabel", label: "Etiqueta del horario", maxLength: 60 },
  { key: "addressLabel", label: "Etiqueta de la dirección", maxLength: 60 },
];

const FORM_INTRO_FIELDS: FieldDefinition[] = [
  { key: "formEyebrow", label: "Etiqueta del formulario", maxLength: 80 },
  { key: "formTitle", label: "Título del formulario", maxLength: 180 },
  { key: "formBody", label: "Texto de apoyo del formulario", maxLength: 600, rows: 4 },
];

const FORM_FIELDS: FieldDefinition[] = [
  { key: "nameFieldLabel", label: "Campo: nombre", maxLength: 80 },
  { key: "institutionFieldLabel", label: "Campo: institución o empresa", maxLength: 120 },
  { key: "emailFieldLabel", label: "Campo: correo", maxLength: 80 },
  { key: "phoneFieldLabel", label: "Campo: teléfono", maxLength: 80 },
  { key: "productFieldLabel", label: "Campo: producto", maxLength: 180 },
  { key: "generalInquiryLabel", label: "Opción: pregunta general", maxLength: 120 },
  { key: "regionFieldLabel", label: "Campo: región", maxLength: 80 },
  { key: "regionPlaceholder", label: "Opción inicial de región", maxLength: 120 },
  { key: "messageFieldLabel", label: "Campo: mensaje", maxLength: 180 },
  { key: "consentBeforeLink", label: "Consentimiento antes del enlace", maxLength: 120 },
  { key: "consentPrivacyLinkLabel", label: "Texto del enlace de privacidad", maxLength: 120 },
  { key: "consentAfterLink", label: "Consentimiento después del enlace", maxLength: 300, rows: 3 },
  { key: "responseTimeText", label: "Plazo de respuesta", maxLength: 160 },
  { key: "submitLabel", label: "Botón de envío", maxLength: 80 },
];

const inputClass =
  "w-full border-0 border-b border-ink-line bg-transparent px-0 py-3 text-base text-ink placeholder:text-ink-soft focus:border-ink focus:outline-none";
const labelClass = "t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute";

export function buildSubmitPayload(values: ContactPageFormValues): Record<string, string | null> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => {
      const normalized = (value ?? "").trim();
      return [
        key,
        key === "seoTitle" || key === "seoDescription" ? normalized || null : normalized,
      ];
    }),
  );
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
  values: ContactPageFormValues;
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
          {field.rows ? (
            <textarea
              id={field.key}
              value={values[field.key] ?? ""}
              onChange={(event) => onChange(field.key, event.target.value)}
              rows={field.rows}
              required={field.required !== false}
              maxLength={field.maxLength}
              className={inputClass + " resize-y"}
            />
          ) : (
            <input
              id={field.key}
              value={values[field.key] ?? ""}
              onChange={(event) => onChange(field.key, event.target.value)}
              required={field.required !== false}
              maxLength={field.maxLength}
              className={inputClass}
            />
          )}
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

export function ContactPageForm({ initial }: { initial: ContactPageFormValues }) {
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
          "/api/admin/contact-page",
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
            : "No se pudieron guardar los textos de contacto.",
        );
      }
    });
  }

  const groups = [
    ["SEO de la página", SEO_FIELDS],
    ["Cabecera pública", HERO_FIELDS],
    ["Datos de contacto", CONTACT_FIELDS],
    ["Introducción del formulario", FORM_INTRO_FIELDS],
    ["Campos y consentimiento", FORM_FIELDS],
  ] as const;

  return (
    <form onSubmit={onSubmit} className="space-y-10" noValidate>
      {groups.map(([legend, definitions]) => (
        <fieldset key={legend} className="space-y-6">
          <legend className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
            {legend}
          </legend>
          <Fields definitions={[...definitions]} values={values} onChange={update} />
        </fieldset>
      ))}

      <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
        El correo, teléfono, WhatsApp, horario y dirección se administran en Ajustes.
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
