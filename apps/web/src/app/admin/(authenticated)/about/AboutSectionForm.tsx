"use client";

import { useState, useTransition } from "react";
import { adminPut } from "@/lib/admin/client";

type ValueRow = { title: string; body: string };

type Values = {
  seoTitle?: string;
  seoDescription?: string;
  eyebrow: string;
  title: string;
  intro: string;
  body: string;
  missionLabel: string;
  missionHeading: string;
  missionBody: string;
  visionLabel: string;
  visionHeading: string;
  visionBody: string;
  valuesLabel: string;
  valuesHeading: string;
  pageEyebrow: string;
  pageTitle: string;
  yearsInBusinessLabel: string;
  productCountLabel: string;
  productLineCountLabel: string;
  coverageLabel: string;
  warrantyLabel: string;
  projectCtaTitle: string;
  projectCtaBody: string;
  projectCtaLabel: string;
  values: ValueRow[];
};

type FieldKey = Exclude<keyof Values, "values">;

type FieldDef = {
  key: FieldKey;
  label: string;
  maxLength: number;
  rows?: number;
  required?: boolean;
  span?: "half" | "full";
};

const SEO_FIELDS: FieldDef[] = [
  { key: "seoTitle", label: "Título SEO", maxLength: 60, span: "half" },
  { key: "seoDescription", label: "Descripción SEO", maxLength: 160, rows: 3, span: "full" },
];

const HOME_FIELDS: FieldDef[] = [
  {
    key: "eyebrow",
    label: "Etiqueta superior del bloque de inicio",
    maxLength: 80,
    required: true,
    span: "half",
  },
  {
    key: "title",
    label: "Título del bloque de inicio",
    maxLength: 200,
    required: true,
    span: "half",
  },
  { key: "intro", label: "Intro / bajada", maxLength: 600, rows: 4, span: "full" },
  { key: "body", label: "Cuerpo (párrafos)", maxLength: 4000, rows: 8, span: "full" },
];

const PAGE_HEADER_FIELDS: FieldDef[] = [
  {
    key: "pageEyebrow",
    label: "Etiqueta superior de la página Nosotros",
    maxLength: 80,
    span: "half",
  },
  {
    key: "pageTitle",
    label: "Título principal de la página Nosotros",
    maxLength: 200,
    span: "half",
  },
];

const PAGE_METRIC_FIELDS: FieldDef[] = [
  { key: "yearsInBusinessLabel", label: "Etiqueta: años en el rubro", maxLength: 80 },
  { key: "productCountLabel", label: "Etiqueta: productos", maxLength: 80 },
  { key: "productLineCountLabel", label: "Etiqueta: líneas de producto", maxLength: 80 },
  { key: "coverageLabel", label: "Etiqueta: cobertura", maxLength: 80 },
  { key: "warrantyLabel", label: "Etiqueta: garantía (inicio)", maxLength: 80 },
];

const PROJECT_CTA_FIELDS: FieldDef[] = [
  {
    key: "projectCtaTitle",
    label: "Título del llamado final",
    maxLength: 200,
    span: "full",
  },
  {
    key: "projectCtaBody",
    label: "Texto del llamado final",
    maxLength: 600,
    rows: 4,
    span: "full",
  },
  {
    key: "projectCtaLabel",
    label: "Texto del enlace a contacto",
    maxLength: 80,
    span: "half",
  },
];

const MISSION_FIELDS: FieldDef[] = [
  { key: "missionLabel", label: "Etiqueta (kicker)", maxLength: 40, span: "half" },
  { key: "missionHeading", label: "Título misión (h2)", maxLength: 200, span: "half" },
  { key: "missionBody", label: "Cuerpo misión", maxLength: 1000, rows: 4, span: "full" },
];

const VISION_FIELDS: FieldDef[] = [
  { key: "visionLabel", label: "Etiqueta (kicker)", maxLength: 40, span: "half" },
  { key: "visionHeading", label: "Título visión (h2)", maxLength: 200, span: "half" },
  { key: "visionBody", label: "Cuerpo visión", maxLength: 1000, rows: 4, span: "full" },
];

const VALUES_FIELDS: FieldDef[] = [
  { key: "valuesLabel", label: "Etiqueta valores (kicker)", maxLength: 40, span: "half" },
  { key: "valuesHeading", label: "Título valores (h2)", maxLength: 200, span: "half" },
];

const PAGE_COPY_KEYS = [
  "seoTitle",
  "seoDescription",
  "pageEyebrow",
  "pageTitle",
  "yearsInBusinessLabel",
  "productCountLabel",
  "productLineCountLabel",
  "coverageLabel",
  "warrantyLabel",
  "projectCtaTitle",
  "projectCtaBody",
  "projectCtaLabel",
] as const satisfies readonly FieldKey[];

const inputClass =
  "w-full border-0 border-b border-ink-line bg-transparent px-0 py-3 text-base text-ink placeholder:text-ink-soft focus:border-ink focus:outline-none";

const labelClass = "t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute";

function normalizeSaveError(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const parsed = body as {
    error?: unknown;
    details?: { issues?: Array<{ path?: Array<string | number>; message?: string }> };
  };
  if (!parsed.error && !parsed.details?.issues?.length) return "";

  const proxyIssues = (parsed.details?.issues ?? [])
    .map((issue) => {
      const path = Array.isArray(issue.path) ? issue.path.join(".") : "";
      return path && issue.message ? `${path}: ${issue.message}` : (issue.message ?? "");
    })
    .filter(Boolean)
    .join("; ");

  if (typeof parsed.error === "string") {
    return proxyIssues ? `${parsed.error} (${proxyIssues})` : parsed.error;
  }
  if (!parsed.error || typeof parsed.error !== "object") return "";

  const error = parsed.error as {
    name?: string;
    message?: string;
    details?: { errors?: Array<{ path?: string[]; message?: string }> };
  };
  const heading: string[] = [];
  if (error.name && error.name !== "ApplicationError") heading.push(error.name);
  if (error.message) heading.push(error.message);

  const detail = (error.details?.errors ?? [])
    .map((item) => {
      const path = Array.isArray(item.path) ? item.path.join(".") : "";
      return path && item.message ? `${path}: ${item.message}` : (item.message ?? "");
    })
    .filter(Boolean)
    .join("; ");

  if (detail) return `${heading.join(": ")} (${detail})`;
  if (heading.length > 0) {
    return proxyIssues ? `${heading.join(": ")} (${proxyIssues})` : heading.join(": ");
  }
  return "No se pudieron guardar los ajustes.";
}

export function buildSubmitPayload(values: Values): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    eyebrow: values.eyebrow.trim(),
    title: values.title.trim(),
  };

  const existingOptionalKeys = [
    "intro",
    "body",
    "missionLabel",
    "missionHeading",
    "missionBody",
    "visionLabel",
    "visionHeading",
    "visionBody",
    "valuesLabel",
    "valuesHeading",
  ] as const satisfies readonly FieldKey[];

  for (const key of existingOptionalKeys) {
    const value = values[key].trim();
    if (value) payload[key] = value;
  }

  for (const key of PAGE_COPY_KEYS) {
    payload[key] = (values[key] ?? "").trim() || null;
  }

  payload.values = values.values
    .map((value) => ({ title: value.title.trim(), body: value.body.trim() }))
    .filter((value) => value.title.length > 0 || value.body.length > 0);

  return payload;
}

function renderField(
  field: FieldDef,
  values: Values,
  update: <K extends FieldKey>(key: K, value: Values[K]) => void,
) {
  const id = field.key;
  const colSpan = field.span === "full" ? "sm:col-span-2" : "sm:col-span-1";

  return (
    <label key={field.key} className={`block ${colSpan}`} htmlFor={id}>
      <span className={labelClass}>
        {field.label}
        {field.required ? (
          <span aria-hidden className="ml-2 text-taupe-deep">
            *
          </span>
        ) : null}
      </span>
      <textarea
        id={id}
        value={values[field.key] ?? ""}
        onChange={(event) => update(field.key, event.target.value)}
        rows={field.rows ?? 2}
        required={field.required}
        maxLength={field.maxLength}
        className={inputClass + (field.rows ? " resize-y" : "")}
      />
    </label>
  );
}

function FieldGroup({
  legend,
  fields,
  values,
  update,
}: {
  legend: string;
  fields: FieldDef[];
  values: Values;
  update: <K extends FieldKey>(key: K, value: Values[K]) => void;
}) {
  return (
    <fieldset className="space-y-6">
      <legend className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
        {legend}
      </legend>
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        {fields.map((field) => renderField(field, values, update))}
      </div>
    </fieldset>
  );
}

export function AboutSectionForm({ initial }: { initial: Values }) {
  const [values, setValues] = useState<Values>(initial);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function update<K extends FieldKey>(key: K, value: Values[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
    setSuccess(false);
  }

  function updateValue(index: number, partial: Partial<ValueRow>) {
    setValues((previous) => ({
      ...previous,
      values: previous.values.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...partial } : row,
      ),
    }));
    setSuccess(false);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        const body = await adminPut<unknown>(
          "/api/admin/about-section",
          buildSubmitPayload(values),
        );
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
      <FieldGroup
        legend="SEO de la página Nosotros"
        fields={SEO_FIELDS}
        values={values}
        update={update}
      />
      <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
        Los campos SEO son opcionales; al dejarlos vacíos se usa el valor público predeterminado.
      </p>
      <FieldGroup
        legend="Bloque Nosotros en inicio"
        fields={HOME_FIELDS}
        values={values}
        update={update}
      />
      <FieldGroup
        legend="Cabecera de la página Nosotros"
        fields={PAGE_HEADER_FIELDS}
        values={values}
        update={update}
      />
      <FieldGroup
        legend="Etiquetas de métricas"
        fields={PAGE_METRIC_FIELDS}
        values={values}
        update={update}
      />
      <FieldGroup
        legend="Llamado final de la página Nosotros"
        fields={PROJECT_CTA_FIELDS}
        values={values}
        update={update}
      />
      <FieldGroup legend="Misión" fields={MISSION_FIELDS} values={values} update={update} />
      <FieldGroup legend="Visión" fields={VISION_FIELDS} values={values} update={update} />
      <FieldGroup legend="Valores" fields={VALUES_FIELDS} values={values} update={update} />

      <fieldset className="space-y-6">
        <legend className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
          Cuatro compromisos (valores)
        </legend>
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          {values.values.map((value, index) => {
            const titleId = `value-title-${index}`;
            const bodyId = `value-body-${index}`;
            return (
              <div key={index} className="space-y-3 sm:col-span-2 lg:col-span-1">
                <label className="block" htmlFor={titleId}>
                  <span className={labelClass}>Título #{index + 1}</span>
                  <input
                    id={titleId}
                    type="text"
                    value={value.title}
                    onChange={(event) => updateValue(index, { title: event.target.value })}
                    maxLength={80}
                    className={inputClass}
                  />
                </label>
                <label className="block" htmlFor={bodyId}>
                  <span className={labelClass}>Cuerpo #{index + 1}</span>
                  <textarea
                    id={bodyId}
                    value={value.body}
                    onChange={(event) => updateValue(index, { body: event.target.value })}
                    rows={3}
                    maxLength={400}
                    className={inputClass + " resize-y"}
                  />
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>

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
          Los campos nuevos opcionales se pueden limpiar dejando su contenido vacío.
        </p>
      </div>
    </form>
  );
}
