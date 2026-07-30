'use client';

import { useState, useTransition } from 'react';
import { adminPut } from '@/lib/admin/client';

type Values = {
  title: string;
  body: string;
  buttonLabel: string;
  buttonHref: string;
};

type FieldKey = keyof Values;

type FieldDef = {
  key: FieldKey;
  label: string;
  type: 'text' | 'textarea';
  rows?: number;
  required?: boolean;
  span?: 'half' | 'full';
};

const FIELDS: FieldDef[] = [
  { key: 'title', label: 'Título', type: 'text', required: true, span: 'half' },
  { key: 'buttonLabel', label: 'Etiqueta del botón', type: 'text', required: true, span: 'half' },
  { key: 'body', label: 'Cuerpo / bajada', type: 'textarea', rows: 4, span: 'full' },
  { key: 'buttonHref', label: 'URL del botón (opcional — vacío usa WhatsApp)', type: 'text', span: 'full' },
];

const inputClass =
  'w-full border-0 border-b border-ink-line bg-transparent px-0 py-3 text-base text-ink placeholder:text-ink-soft focus:border-ink focus:outline-none';

const labelClass =
  't-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute';

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

export function buildSubmitPayload(values: Values): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    title: values.title.trim(),
    buttonLabel: values.buttonLabel.trim(),
  };
  if (values.body.trim()) payload.body = values.body.trim();
  if (values.buttonHref.trim()) payload.buttonHref = values.buttonHref.trim();
  return payload;
}

export function ContactCtaSectionForm({ initial }: { initial: Values }) {
  const [values, setValues] = useState<Values>(initial);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [pending, startTransition] = useTransition();

  function update<K extends FieldKey>(key: K, value: Values[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const payload = buildSubmitPayload(values);

    startTransition(async () => {
      try {
        const body = await adminPut<unknown>('/api/admin/contact-cta-section', payload);
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
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        {FIELDS.map((field) => {
          const colSpan = field.span === 'full' ? 'sm:col-span-2' : 'sm:col-span-1';
          return (
            <label key={field.key} className={`block ${colSpan}`}>
              <span className={labelClass}>
                {field.label}
                {field.required ? (
                  <span aria-hidden className="ml-2 text-taupe-deep">*</span>
                ) : null}
              </span>
              <textarea
                value={values[field.key]}
                onChange={(e) => update(field.key, e.target.value)}
                rows={field.type === 'textarea' ? field.rows ?? 4 : 2}
                required={field.required}
                className={inputClass + ' resize-y'}
              />
            </label>
          );
        })}
      </div>

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
