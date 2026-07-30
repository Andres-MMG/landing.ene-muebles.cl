'use client';

import { useState, useTransition } from 'react';
import { adminPut } from '@/lib/admin/client';

type ValueRow = { title: string; body: string };

type Values = {
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
  values: ValueRow[];
};

type FieldKey =
  | 'eyebrow'
  | 'title'
  | 'intro'
  | 'body'
  | 'missionLabel'
  | 'missionHeading'
  | 'missionBody'
  | 'visionLabel'
  | 'visionHeading'
  | 'visionBody'
  | 'valuesLabel'
  | 'valuesHeading';

type FieldDef = {
  key: FieldKey;
  label: string;
  rows?: number;
  required?: boolean;
  span?: 'half' | 'full';
};

const TEXT_FIELDS: FieldDef[] = [
  { key: 'eyebrow', label: 'Etiqueta superior (eyebrow)', required: true, span: 'half' },
  { key: 'title', label: 'Título', required: true, span: 'half' },
  { key: 'intro', label: 'Intro / bajada', rows: 4, span: 'full' },
  { key: 'body', label: 'Cuerpo (párrafos)', rows: 8, span: 'full' },
];

// B2 batch 2 fix: label and heading are now separate fields. The label
// is the small mono kicker (e.g. "Misión"), the heading is the h2 that
// renders the meaningful statement.
const MISSION_FIELDS: FieldDef[] = [
  { key: 'missionLabel', label: 'Etiqueta (kicker)', span: 'half' },
  { key: 'missionHeading', label: 'Título misión (h2)', span: 'half' },
  { key: 'missionBody', label: 'Cuerpo misión', rows: 4, span: 'full' },
];

const VISION_FIELDS: FieldDef[] = [
  { key: 'visionLabel', label: 'Etiqueta (kicker)', span: 'half' },
  { key: 'visionHeading', label: 'Título visión (h2)', span: 'half' },
  { key: 'visionBody', label: 'Cuerpo visión', rows: 4, span: 'full' },
];

const VALUES_FIELDS: FieldDef[] = [
  { key: 'valuesLabel', label: 'Etiqueta valores (kicker)', span: 'half' },
  { key: 'valuesHeading', label: 'Título valores (h2)', span: 'half' },
];

const inputClass =
  'w-full border-0 border-b border-ink-line bg-transparent px-0 py-3 text-base text-ink placeholder:text-ink-soft focus:border-ink focus:outline-none';

const labelClass =
  't-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute';

/**
 * Same shape normalization used by SiteSettingForm — see its long
 * docblock for the rationale. Strapi returns validation errors in
 * `{ error: { name, message, details } }`; our proxy returns Zod
 * issues as `details.issues`. Both shapes collapse to one string.
 */
function normalizeSaveError(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const b = body as {
    error?: unknown;
    details?: { issues?: Array<{ path?: Array<string | number>; message?: string }> };
  };
  const err = b.error;
  if (!err && !b.details?.issues?.length) return '';

  const proxyIssueLines = (b.details?.issues ?? [])
    .map((i) => {
      const path = Array.isArray(i.path) ? i.path.join('.') : '';
      return path && i.message ? `${path}: ${i.message}` : i.message ?? '';
    })
    .filter(Boolean)
    .join('; ');

  if (typeof err === 'string') {
    return proxyIssueLines ? `${err} (${proxyIssueLines})` : err;
  }
  if (typeof err !== 'object') return '';
  const e = err as {
    name?: string;
    message?: string;
    details?: { errors?: Array<{ path?: string[]; message?: string }> };
  };
  const head: string[] = [];
  if (e.name && e.name !== 'ApplicationError') head.push(e.name);
  if (e.message) head.push(e.message);
  const fieldErrors = Array.isArray(e.details?.errors) ? e.details.errors : [];
  const detail = fieldErrors
    .map((d) => {
      const path = Array.isArray(d.path) ? d.path.join('.') : '';
      return path && d.message ? `${path}: ${d.message}` : d.message ?? '';
    })
    .filter(Boolean)
    .join('; ');
  if (detail) return `${head.join(': ')} (${detail})`;
  if (head.length > 0) return proxyIssueLines ? `${head.join(': ')} (${proxyIssueLines})` : head.join(': ');
  return 'No se pudieron guardar los ajustes.';
}

/**
 * Trim every scalar and drop fields the form intentionally cleared.
 * Required-by-domain fields are always sent (trimmed) so the backend
 * Zod validation always sees them.
 *
 * `values` is forwarded as a JSON array of `{ title, body }` pairs.
 * Empty-title rows are dropped so the rendered list stays concise.
 */
export function buildSubmitPayload(values: Values): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    eyebrow: values.eyebrow.trim(),
    title: values.title.trim(),
  };
  if (values.intro.trim()) payload.intro = values.intro.trim();
  if (values.body.trim()) payload.body = values.body.trim();
  if (values.missionLabel.trim()) payload.missionLabel = values.missionLabel.trim();
  if (values.missionHeading.trim()) payload.missionHeading = values.missionHeading.trim();
  if (values.missionBody.trim()) payload.missionBody = values.missionBody.trim();
  if (values.visionLabel.trim()) payload.visionLabel = values.visionLabel.trim();
  if (values.visionHeading.trim()) payload.visionHeading = values.visionHeading.trim();
  if (values.visionBody.trim()) payload.visionBody = values.visionBody.trim();
  if (values.valuesLabel.trim()) payload.valuesLabel = values.valuesLabel.trim();
  if (values.valuesHeading.trim()) payload.valuesHeading = values.valuesHeading.trim();

  const cleanedValues = values.values
    .map((v) => ({ title: v.title.trim(), body: v.body.trim() }))
    .filter((v) => v.title.length > 0 || v.body.length > 0);
  payload.values = cleanedValues;
  return payload;
}

function renderField(
  field: FieldDef,
  values: Values,
  update: <K extends FieldKey>(key: K, value: Values[K]) => void,
  prefix = ''
) {
  const value = values[field.key];
  const id = `${prefix}${field.key}`;
  const colSpan = field.span === 'full' ? 'sm:col-span-2' : 'sm:col-span-1';
  return (
    <label key={field.key} className={`block ${colSpan}`} htmlFor={id}>
      <span className={labelClass}>
        {field.label}
        {field.required ? (
          <span aria-hidden className="ml-2 text-taupe-deep">*</span>
        ) : null}
      </span>
      <textarea
        id={id}
        value={value}
        onChange={(e) => update(field.key, e.target.value)}
        rows={field.rows ?? 2}
        required={field.required}
        className={inputClass + (field.rows ? ' resize-y' : '')}
      />
    </label>
  );
}

export function AboutSectionForm({ initial }: { initial: Values }) {
  const [values, setValues] = useState<Values>(initial);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [pending, startTransition] = useTransition();

  function update<K extends FieldKey>(key: K, value: Values[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
  }

  function updateValue(index: number, partial: Partial<ValueRow>) {
    setValues((prev) => {
      const next = prev.values.map((row, i) =>
        i === index ? { ...row, ...partial } : row
      );
      return { ...prev, values: next };
    });
    setSuccess(false);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const payload = buildSubmitPayload(values);

    startTransition(async () => {
      try {
        const body = await adminPut<unknown>('/api/admin/about-section', payload);
        const message = normalizeSaveError(body);
        if (message) {
          setError(message);
          return;
        }
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron guardar los ajustes.');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10" noValidate>
      <fieldset className="space-y-6">
        <legend className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
          Bloque principal
        </legend>
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          {TEXT_FIELDS.map((f) => renderField(f, values, update))}
        </div>
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
          Misión
        </legend>
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          {MISSION_FIELDS.map((f) => renderField(f, values, update))}
        </div>
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
          Visión
        </legend>
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          {VISION_FIELDS.map((f) => renderField(f, values, update))}
        </div>
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
          Valores
        </legend>
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          {VALUES_FIELDS.map((f) => renderField(f, values, update))}
        </div>
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
          Cuatro compromisos (valores)
        </legend>
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          {values.values.map((v, index) => {
            const titleId = `value-title-${index}`;
            const bodyId = `value-body-${index}`;
            return (
              <div key={index} className="space-y-3 sm:col-span-2 lg:col-span-1">
                <label className="block" htmlFor={titleId}>
                  <span className={labelClass}>Título #{index + 1}</span>
                  <input
                    id={titleId}
                    type="text"
                    value={v.title}
                    onChange={(e) => updateValue(index, { title: e.target.value })}
                    maxLength={80}
                    className={inputClass}
                  />
                </label>
                <label className="block" htmlFor={bodyId}>
                  <span className={labelClass}>Cuerpo #{index + 1}</span>
                  <textarea
                    id={bodyId}
                    value={v.body}
                    onChange={(e) => updateValue(index, { body: e.target.value })}
                    rows={3}
                    maxLength={400}
                    className={inputClass + ' resize-y'}
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
        <p role="status" className="border-l-2 border-taupe-deep bg-cream-soft px-4 py-3 text-sm text-ink">
          Cambios guardados.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 border-t border-ink-line pt-6">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-3 bg-ink px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-paper transition-colors duration-500 hover:bg-taupe-deep disabled:opacity-50"
        >
          {pending ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
          Marcados con <span className="text-taupe-deep">*</span> son obligatorios.
        </p>
      </div>
    </form>
  );
}
