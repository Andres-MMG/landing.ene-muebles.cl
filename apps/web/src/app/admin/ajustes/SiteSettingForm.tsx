'use client';

import { useState, useTransition } from 'react';
import { adminPut } from '@/lib/admin/client';

type Values = {
  brandName: string;
  tagline: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  socialInstagram: string;
  socialFacebook: string;
  socialLinkedIn: string;
  heroTitle: string;
  heroSubtitle: string;
  footerCopy: string;
};

type FieldKey = keyof Values;

const FIELDS: Array<{ key: FieldKey; label: string; type: 'text' | 'email' | 'tel' | 'url' | 'textarea'; placeholder?: string; maxLength?: number; rows?: number }> = [
  { key: 'brandName', label: 'Nombre de marca', type: 'text', placeholder: 'Ene Muebles', maxLength: 120 },
  { key: 'tagline', label: 'Tagline', type: 'text', placeholder: 'Muebles a medida para oficina y hogar', maxLength: 280 },
  { key: 'contactEmail', label: 'Correo de contacto', type: 'email', placeholder: 'hola@ene-muebles.cl' },
  { key: 'contactPhone', label: 'Teléfono de contacto', type: 'tel', placeholder: '+56 9 1234 5678' },
  { key: 'address', label: 'Dirección', type: 'textarea', rows: 2, placeholder: 'Av. Apoquindo 4000, Las Condes, Santiago' },
  { key: 'socialInstagram', label: 'Instagram', type: 'url', placeholder: 'https://instagram.com/enemuebles' },
  { key: 'socialFacebook', label: 'Facebook', type: 'url', placeholder: 'https://facebook.com/enemuebles' },
  { key: 'socialLinkedIn', label: 'LinkedIn', type: 'url', placeholder: 'https://linkedin.com/company/enemuebles' },
  { key: 'heroTitle', label: 'Título del hero', type: 'text', placeholder: 'Muebles que cuentan historias', maxLength: 160 },
  { key: 'heroSubtitle', label: 'Subtítulo del hero', type: 'textarea', rows: 2, placeholder: 'Una línea que acompaña al título del hero.' },
  { key: 'footerCopy', label: 'Texto del pie de página', type: 'textarea', rows: 2, placeholder: '© 2026 Ene Muebles · Todos los derechos reservados.' },
];

/**
 * Site-setting singleton editor. Reads initial values from the server
 * component, writes via PUT /api/admin/site-setting. One "Guardar
 * ajustes" submit button.
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
    startTransition(async () => {
      try {
        const payload: Record<string, string> = {};
        for (const [k, v] of Object.entries(values)) {
          if (typeof v === 'string' && v.trim() !== '') {
            payload[k] = v.trim();
          }
        }
        await adminPut('/api/admin/site-setting', payload);
        setSuccess(true);
      } catch (err) {
        const message =
          (err as { error?: string }).error ?? 'No se pudieron guardar los ajustes.';
        setError(message);
      }
    });
  }

  const inputClass =
    'w-full border-0 border-b border-ink-line bg-transparent px-0 py-3 text-base text-ink placeholder:text-ink-soft focus:border-ink focus:outline-none';

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <label
            key={field.key}
            className={field.type === 'textarea' ? 'block sm:col-span-2' : 'block'}
          >
            <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              {field.label}
            </span>
            {field.type === 'textarea' ? (
              <textarea
                value={values[field.key]}
                onChange={(e) => update(field.key, e.target.value)}
                rows={field.rows ?? 3}
                maxLength={field.maxLength}
                className={inputClass}
                placeholder={field.placeholder}
              />
            ) : (
              <input
                type={field.type}
                value={values[field.key]}
                onChange={(e) => update(field.key, e.target.value)}
                maxLength={field.maxLength}
                className={inputClass}
                placeholder={field.placeholder}
              />
            )}
          </label>
        ))}
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
      </div>
    </form>
  );
}