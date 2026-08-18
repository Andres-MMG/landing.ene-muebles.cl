"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { site } from "@ene/ui-tokens";

/**
 * ContactForm — public lead capture form (lead-capture spec).
 *
 * Client component posting JSON to `POST /api/leads`. The server
 * validates again; this component renders field-level errors with
 * `aria-describedby` + `aria-invalid`, focuses the first invalid
 * field, and announces status changes through an `aria-live` region.
 * A hidden honeypot field (`website`) lets the backend drop bots
 * without disclosing enforcement internals.
 *
 * `consentVersion` identifies the privacy policy text the visitor
 * agreed to (see /privacidad). The API response shape is
 * `{ ok, errors?: Record<string, string> }` — 201 on success.
 */

const REGIONES = [
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "Metropolitana",
  "O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "La Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén",
  "Magallanes",
];

const CONSENT_VERSION = "2026-01";

/** Error text color on the ink section — light salmon keeps contrast on dark. */
const ERROR_TEXT = "text-[#ffb4ab]";

type FieldErrors = Partial<
  Record<"name" | "email" | "phone" | "consent" | "message" | "form", string>
>;

type Status =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success" }
  | { state: "error"; message: string };

const FIELD_IDS: Record<keyof FieldErrors, string> = {
  name: "lead-name",
  email: "lead-email",
  phone: "lead-phone",
  consent: "lead-consent",
  message: "lead-message",
  form: "lead-form-status",
};

export function ContactForm() {
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const formRef = useRef<HTMLFormElement | null>(null);
  // One key per mounted form instance; retries of the same logical
  // submission are deduplicated server-side so a network retry never
  // creates a second Lead.
  const idempotencyKeyRef = useRef<string | null>(null);
  if (idempotencyKeyRef.current === null) {
    idempotencyKeyRef.current = crypto.randomUUID();
  }

  // Mirror the current key onto the form element's data attribute so
  // tests (and any instrumentation) can read it from the DOM. Refs are
  // not needed for rendering, so the sync happens imperatively here
  // (after mount) and again in the success handler on regeneration.
  useEffect(() => {
    formRef.current?.setAttribute("data-idempotency-key", idempotencyKeyRef.current ?? "");
  }, []);

  const focusFirstError = (fieldErrors: FieldErrors) => {
    const firstField = (["name", "email", "phone", "consent", "message"] as const).find(
      (field) => fieldErrors[field],
    );
    if (firstField) {
      document.getElementById(FIELD_IDS[firstField])?.focus();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setErrors({});
    setStatus({ state: "submitting" });

    const payload = {
      name: data.get("name"),
      institution: data.get("institution"),
      email: data.get("email"),
      phone: data.get("phone"),
      region: data.get("region"),
      message: data.get("message"),
      consent: data.get("consent") === "on",
      consentVersion: CONSENT_VERSION,
      website: data.get("website") ?? "",
      idempotencyKey: idempotencyKeyRef.current,
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; errors?: Record<string, string> }
        | null;

      if (res.ok && json?.ok) {
        // A fresh key per successful submission: keeping the old one
        // would make every later legitimate submission short-circuit
        // as a "duplicate retry" server-side and be silently dropped.
        idempotencyKeyRef.current = crypto.randomUUID();
        formRef.current?.setAttribute("data-idempotency-key", idempotencyKeyRef.current);
        form.reset();
        setStatus({ state: "success" });
        return;
      }

      const fieldErrors: FieldErrors = {};
      for (const [key, message] of Object.entries(json?.errors ?? {})) {
        if (key in FIELD_IDS) {
          fieldErrors[key as keyof FieldErrors] = message;
        }
      }
      const formError =
        json?.errors?.form ?? "No se pudo enviar la solicitud. Intenta nuevamente.";
      setErrors(fieldErrors);
      setStatus({ state: "error", message: formError });
      focusFirstError(fieldErrors);
    } catch {
      setErrors({});
      setStatus({
        state: "error",
        message: "Error de conexión. Verifica tu internet e intenta nuevamente.",
      });
    }
  };

  const inputClasses =
    "mt-2 w-full border-b border-paper-line-on-ink bg-transparent py-3 text-paper placeholder:text-paper-soft focus:border-taupe focus:outline-none aria-invalid:border-[#ffb4ab]";
  const labelClasses =
    "t-overline text-paper-mute-on-ink";
  const submitting = status.state === "submitting";

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="lg:col-span-7 space-y-5"
      aria-label="Formulario de contacto"
    >
      {/* Honeypot — invisible to humans and keyboard users, tempting to bots. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden"
      >
        <label htmlFor="lead-website">Website</label>
        <input
          id="lead-website"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={labelClasses}>{site.contactoFieldName}</span>
          <input
            id={FIELD_IDS.name}
            type="text"
            name="name"
            required
            autoComplete="name"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? `${FIELD_IDS.name}-error` : undefined}
            className={inputClasses}
          />
          {errors.name ? (
            <p id={`${FIELD_IDS.name}-error`} className={`t-mono mt-2 text-xs ${ERROR_TEXT}`}>
              {errors.name}
            </p>
          ) : null}
        </label>
        <label className="block">
          <span className={labelClasses}>{site.contactoFieldCompany}</span>
          <input
            id="lead-institution"
            type="text"
            name="institution"
            autoComplete="organization"
            className={inputClasses}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={labelClasses}>{site.contactoFieldEmail}</span>
          <input
            id={FIELD_IDS.email}
            type="email"
            name="email"
            required
            autoComplete="email"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? `${FIELD_IDS.email}-error` : undefined}
            className={inputClasses}
          />
          {errors.email ? (
            <p id={`${FIELD_IDS.email}-error`} className={`t-mono mt-2 text-xs ${ERROR_TEXT}`}>
              {errors.email}
            </p>
          ) : null}
        </label>
        <label className="block">
          <span className={labelClasses}>{site.contactoFieldPhone}</span>
          <input
            id={FIELD_IDS.phone}
            type="tel"
            name="phone"
            autoComplete="tel"
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? `${FIELD_IDS.phone}-error` : undefined}
            className={inputClasses}
          />
          {errors.phone ? (
            <p id={`${FIELD_IDS.phone}-error`} className={`t-mono mt-2 text-xs ${ERROR_TEXT}`}>
              {errors.phone}
            </p>
          ) : null}
        </label>
      </div>

      <label className="block">
        <span className={labelClasses}>{site.contactoFieldRegion}</span>
        <select
          id="lead-region"
          name="region"
          defaultValue=""
          className="mt-2 w-full border-b border-paper-line-on-ink bg-transparent py-3 text-paper focus:border-taupe focus:outline-none"
        >
          <option value="" disabled className="bg-ink text-paper">
            Selecciona una región
          </option>
          {REGIONES.map((region) => (
            <option key={region} value={region} className="bg-ink text-paper">
              {region}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={labelClasses}>{site.contactoFieldMessage}</span>
        <textarea
          id={FIELD_IDS.message}
          name="message"
          rows={4}
          required
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? `${FIELD_IDS.message}-error` : undefined}
          className={inputClasses}
        />
        {errors.message ? (
          <p id={`${FIELD_IDS.message}-error`} className={`t-mono mt-2 text-xs ${ERROR_TEXT}`}>
            {errors.message}
          </p>
        ) : null}
      </label>

      <div className="pt-2">
        <label className="flex items-start gap-3">
          <input
            id={FIELD_IDS.consent}
            type="checkbox"
            name="consent"
            required
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={errors.consent ? `${FIELD_IDS.consent}-error` : undefined}
            className="mt-0.5 h-5 w-5 shrink-0 accent-taupe"
          />
          <span className="t-body text-sm text-paper-mute-on-ink">
            Acepto la{" "}
            <Link
              href="/privacidad"
              className="text-taupe underline-offset-[6px] hover:underline"
            >
              política de privacidad
            </Link>{" "}
            y autorizo el uso de mis datos para recibir la cotización solicitada.
          </span>
        </label>
        {errors.consent ? (
          <p id={`${FIELD_IDS.consent}-error`} className={`t-mono mt-2 text-xs ${ERROR_TEXT}`}>
            {errors.consent}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-6">
        <p className="t-overline text-paper-mute-on-ink">
          Respondemos en 24 h hábiles
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-3 bg-taupe px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-ink transition-colors duration-500 hover:bg-paper disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Enviando…" : site.contactoSubmit}
          <span aria-hidden>→</span>
        </button>
      </div>

      {/* Status region — announcements are polite so they do not
          interrupt the reading flow (lead-capture spec). */}
      <div
        id={FIELD_IDS.form}
        aria-live="polite"
        role="status"
        className="min-h-[1.5rem] pt-2"
      >
        {status.state === "success" ? (
          <p className="t-mono text-sm text-taupe">
            Recibimos tu solicitud. Te contactaremos dentro de 24 h hábiles.
          </p>
        ) : null}
        {status.state === "error" ? (
          <p className={`t-mono text-sm ${ERROR_TEXT}`}>{status.message}</p>
        ) : null}
      </div>
    </form>
  );
}
