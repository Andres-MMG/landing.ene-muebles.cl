'use client';

import { useState, useTransition } from 'react';
import { adminPut } from '@/lib/admin/client';

type Values = {
  siteName: string;
  tagline: string;
  rut: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  whatsappDefaultMessage: string;
  address: string;
  businessHours: string;
  aboutText: string;
  socialInstagram: string;
  socialFacebook: string;
  socialLinkedIn: string;
  socialTiktok: string;
};

type FieldKey = keyof Values;

type FieldDef = {
  key: FieldKey;
  label: string;
  type: 'text' | 'email' | 'tel' | 'url' | 'textarea';
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  required?: boolean;
  span?: 'half' | 'full';
  /**
   * Optional helper text rendered below the input in the same
   * monospace micro-label style as the field label. Reserved for
   * fields whose wire format is non-obvious (e.g. social handles).
   */
  help?: string;
};

/**
 * Networks accepted by `normalizeSocialHandle`. The order of the keys
 * mirrors the order of the `socialLinks` object Strapi v5 expects.
 */
type SocialNetwork = 'instagram' | 'facebook' | 'linkedin' | 'tiktok';

/**
 * Canonical base URL for each social network. These are prepended
 * to handle-only inputs so Strapi's URL validator stops rejecting
 * `enemuebles`, `enemuebles.cl`, `ene-muebles`, etc. Keep in sync
 * with the helper text under each social input.
 */
const SOCIAL_BASE_URL: Record<SocialNetwork, string> = {
  instagram: 'https://www.instagram.com/',
  facebook: 'https://www.facebook.com/',
  linkedin: 'https://www.linkedin.com/in/',
  tiktok: 'https://www.tiktok.com/@',
};

const FIELDS: FieldDef[] = [
  { key: 'siteName', label: 'Nombre del sitio', type: 'text', placeholder: 'Ene Muebles', maxLength: 120, required: true, span: 'half' },
  { key: 'tagline', label: 'Tagline', type: 'text', placeholder: 'Muebles a medida para oficina y hogar', maxLength: 200, span: 'half' },
  { key: 'rut', label: 'RUT', type: 'text', placeholder: '76.123.456-7', maxLength: 20, required: true, span: 'half' },
  { key: 'contactEmail', label: 'Correo de contacto', type: 'email', placeholder: 'hola@ene-muebles.cl', span: 'half' },
  { key: 'contactPhone', label: 'Teléfono de contacto', type: 'tel', placeholder: '+56 9 1234 5678', span: 'half' },
  { key: 'whatsappNumber', label: 'WhatsApp (número)', type: 'tel', placeholder: '+56912345678', span: 'half' },
  { key: 'whatsappDefaultMessage', label: 'Mensaje predeterminado WhatsApp', type: 'textarea', rows: 3, placeholder: 'Hola, me gustaría una cotización de su catálogo de mobiliario institucional.', maxLength: 1000, required: true, span: 'full' },
  { key: 'address', label: 'Dirección', type: 'textarea', rows: 2, placeholder: 'Av. Apoquindo 4000, Las Condes, Santiago', span: 'half' },
  { key: 'businessHours', label: 'Horario de atención', type: 'textarea', rows: 2, placeholder: 'Lun a Vie · 09:00–18:00', span: 'half' },
  { key: 'aboutText', label: 'Texto "sobre nosotros"', type: 'textarea', rows: 4, placeholder: 'Una o dos frases sobre la empresa para el sitio público.', maxLength: 2000, span: 'full' },
  { key: 'socialInstagram', label: 'Instagram', type: 'url', placeholder: 'https://instagram.com/enemuebles', span: 'half', help: 'Pega la URL completa o escribe solo el usuario (ej. enemuebles).' },
  { key: 'socialFacebook', label: 'Facebook', type: 'url', placeholder: 'https://facebook.com/enemuebles', span: 'half', help: 'Pega la URL completa o escribe solo el usuario (ej. enemuebles).' },
  { key: 'socialLinkedIn', label: 'LinkedIn', type: 'url', placeholder: 'https://linkedin.com/company/enemuebles', span: 'half', help: 'Pega la URL completa o escribe solo el usuario (ej. ene-muebles).' },
  { key: 'socialTiktok', label: 'TikTok', type: 'url', placeholder: 'https://tiktok.com/@enemuebles', span: 'half', help: 'Pega la URL completa o escribe solo el usuario (ej. enemuebles).' },
];

/**
 * Strapi v5 returns errors in `{ error: { status, name, message, details } }`
 * shape. Our route also returns Zod-validation failures as
 * `{ error: "Datos inválidos", details: { issues: [...] } }`. This helper
 * normalizes both shapes into a single human-friendly string, surfacing
 * field paths when available so the admin can find the offending input.
 * Returns an empty string when the body has no `error` key (success).
 */
function normalizeSaveError(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const b = body as {
    error?: unknown;
    details?: { issues?: Array<{ path?: Array<string | number>; message?: string }> };
  };
  const err = b.error;
  if (!err && !b.details?.issues?.length) return '';

  // Pull field-level issues out of either the Strapi-shaped `error.details`
  // (handled below) or the top-level `details.issues` produced by our
  // own Zod validation in the proxy.
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
 * Normalize a social-link input into the wire shape Strapi v5 expects.
 *
 * The rule is centralized here so the four networks stay consistent:
 *   - Empty / whitespace-only → `null`. The proxy interprets `null` as
 *     "clear this previously saved handle" (see `optionalClearedUrl`
 *     in the route); dropping the field would silently leave the
 *     Strapi handle in place.
 *   - Starts with `http://` or `https://` → kept verbatim. The
 *     operator pasted (or already has stored) a full URL; surface it
 *     unchanged so we don't fight URLs that came back from the
 *     singleton (e.g. existing entries with a custom vanity path).
 *   - Anything else → treated as a handle. A leading `@` is stripped
 *     (operator shorthand), then the canonical base URL for the
 *     network is prepended. The result is the full URL Strapi's URL
 *     validator accepts.
 *
 * Note this normalization only touches the **outbound payload**
 * (`buildSubmitPayload`). The `values` state and the rendered input
 * still reflect what the operator typed so the UI shows their
 * original text on the next edit. Only the wire shape is reshaped.
 */
function normalizeSocialHandle(
  network: SocialNetwork,
  value: string
): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const handle = trimmed.replace(/^@+/, '');
  return `${SOCIAL_BASE_URL[network]}${handle}`;
}

/**
 * Pack the four social input fields into the `socialLinks` object Strapi
 * expects. Every key is sent on every save — non-empty as the
 * normalized full URL, empty as `null` — so that clearing a previously
 * saved handle actually reaches Strapi instead of being silently dropped
 * by the "omit when blank" diff strategy.
 */
function buildSocialLinks(values: Values): Record<string, string | null> {
  return {
    instagram: normalizeSocialHandle('instagram', values.socialInstagram),
    facebook: normalizeSocialHandle('facebook', values.socialFacebook),
    linkedin: normalizeSocialHandle('linkedin', values.socialLinkedIn),
    tiktok: normalizeSocialHandle('tiktok', values.socialTiktok),
  };
}

/**
 * Build the JSON body sent to `PUT /api/admin/site-setting`. Required
 * fields are always sent (trimmed). Optional scalars are omitted when
 * blank so we don't accidentally wipe a saved value the admin didn't
 * intend to touch; non-blank optionals are sent as the trimmed value.
 * Social links are always sent (null when blank) — see the comment on
 * `buildSocialLinks` for the rationale.
 *
 * Exported so the matching payload test can exercise the form's
 * serialization without rendering React.
 */
export function buildSubmitPayload(
  values: Values
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    siteName: values.siteName.trim(),
    rut: values.rut.trim(),
    whatsappDefaultMessage: values.whatsappDefaultMessage.trim(),
  };
  if (values.tagline.trim()) payload.tagline = values.tagline.trim();
  if (values.contactEmail.trim()) payload.contactEmail = values.contactEmail.trim();
  if (values.contactPhone.trim()) payload.contactPhone = values.contactPhone.trim();
  if (values.whatsappNumber.trim()) payload.whatsappNumber = values.whatsappNumber.trim();
  if (values.address.trim()) payload.address = values.address.trim();
  if (values.businessHours.trim()) payload.businessHours = values.businessHours.trim();
  if (values.aboutText.trim()) payload.aboutText = values.aboutText.trim();
  payload.socialLinks = buildSocialLinks(values);
  return payload;
}

/**
 * Site-setting singleton editor. Reads initial values from the server
 * component, writes via PUT /api/admin/site-setting. One "Guardar
 * ajustes" submit button.
 *
 * `heroImage` is intentionally NOT editable here: this batch reconciles
 * the singleton with the actual schema but leaves media management to
 * a dedicated admin upload flow (same approach used for `Product.images`).
 * Editable fields mirror what `SiteSetting` exposes in the public type,
 * minus `heroImage`. Exposing the upload control here would couple
 * batch scope; a follow-up change can add it without breaking this one.
 */
export function SiteSettingForm({ initial }: { initial: Values }) {
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
        const body = await adminPut<unknown>('/api/admin/site-setting', payload);
        const message = normalizeSaveError(body);
        if (message) {
          setError(message);
          return;
        }
        setSuccess(true);
      } catch (err) {
        const fallback = 'No se pudieron guardar los ajustes.';
        setError(err instanceof Error ? err.message : fallback);
      }
    });
  }

  const inputClass =
    'w-full border-0 border-b border-ink-line bg-transparent px-0 py-3 text-base text-ink placeholder:text-ink-soft focus:border-ink focus:outline-none';

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        {FIELDS.map((field) => {
          const colSpan = field.span === 'full' ? 'sm:col-span-2' : 'sm:col-span-1';
          return (
            <label key={field.key} className={`block ${colSpan}`}>
              <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                {field.label}
                {field.required ? (
                  <span aria-hidden className="ml-2 text-taupe-deep">
                    *
                  </span>
                ) : null}
              </span>
              {field.type === 'textarea' ? (
                <textarea
                  value={values[field.key]}
                  onChange={(e) => update(field.key, e.target.value)}
                  rows={field.rows ?? 3}
                  maxLength={field.maxLength}
                  required={field.required}
                  className={inputClass}
                  placeholder={field.placeholder}
                />
              ) : (
                <input
                  type={field.type}
                  value={values[field.key]}
                  onChange={(e) => update(field.key, e.target.value)}
                  maxLength={field.maxLength}
                  required={field.required}
                  className={inputClass}
                  placeholder={field.placeholder}
                />
              )}
              {field.help ? (
                <span className="t-mono mt-2 block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  {field.help}
                </span>
              ) : null}
            </label>
          );
        })}
      </div>

      {error ? (
        <p
          role="alert"
          className="border-l-2 border-ink bg-cream-soft px-4 py-3 text-sm text-ink"
        >
          {error}
        </p>
      ) : null}

      {success ? (
        <p
          role="status"
          className="border-l-2 border-taupe-deep bg-cream-soft px-4 py-3 text-sm text-ink"
        >
          Ajustes guardados.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 border-t border-ink-line pt-6">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-3 bg-ink px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-paper transition-colors duration-500 hover:bg-taupe-deep disabled:opacity-50"
        >
          {pending ? 'Guardando…' : 'Guardar ajustes'}
        </button>
        <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
          Marcados con <span className="text-taupe-deep">*</span> son obligatorios.
        </p>
      </div>
    </form>
  );
}