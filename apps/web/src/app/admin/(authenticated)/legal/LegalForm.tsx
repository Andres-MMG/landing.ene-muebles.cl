"use client";

import { useState, useTransition } from "react";
import { adminPut } from "@/lib/admin/client";
import type { LegalCode } from "@/lib/legal-pages";

export type LegalFormValues = {
  metadataTitle?: string;
  metadataDescription?: string;
  eyebrow: string;
  title: string;
  intro: string;
  tocLabel: string;
  updatedLabel: string;
  effectiveDate: string;
  version: string;
  updatedAt: string;
  sections: Array<{ heading: string; paragraphs: Array<{ text: string }> }>;
};

const inputClass =
  "w-full border-0 border-b border-ink-line bg-transparent px-0 py-3 text-base text-ink focus:border-ink focus:outline-none";
const labelClass = "t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute";

export function buildLegalPayload(values: LegalFormValues) {
  return {
    metadataTitle: (values.metadataTitle ?? "").trim() || null,
    metadataDescription: (values.metadataDescription ?? "").trim() || null,
    eyebrow: values.eyebrow.trim(),
    title: values.title.trim(),
    intro: values.intro.trim(),
    tocLabel: values.tocLabel.trim(),
    updatedLabel: values.updatedLabel.trim(),
    effectiveDate: values.effectiveDate,
    version: values.version,
    expectedUpdatedAt: values.updatedAt,
    sections: values.sections.map((section) => ({
      heading: section.heading.trim(),
      paragraphs: section.paragraphs.map((paragraph) => ({ text: paragraph.text.trim() })),
    })),
  };
}

function errorMessage(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const value = body as { error?: unknown };
  return typeof value.error === "string" ? value.error : "";
}

export function LegalForm({ code, initial }: { code: LegalCode; initial: LegalFormValues }) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof LegalFormValues>(key: K, value: LegalFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setSuccess(false);
  }

  function updateSection(index: number, heading: string) {
    update(
      "sections",
      values.sections.map((section, current) =>
        current === index ? { ...section, heading } : section,
      ),
    );
  }

  function updateParagraph(sectionIndex: number, paragraphIndex: number, text: string) {
    update(
      "sections",
      values.sections.map((section, currentSection) =>
        currentSection === sectionIndex
          ? {
              ...section,
              paragraphs: section.paragraphs.map((paragraph, currentParagraph) =>
                currentParagraph === paragraphIndex ? { text } : paragraph,
              ),
            }
          : section,
      ),
    );
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        const response = await adminPut<unknown>(
          `/api/admin/legal/${code}`,
          buildLegalPayload(values),
        );
        const message = errorMessage(response);
        if (message) return setError(message);
        if (response && typeof response === "object") {
          const data = (response as { data?: { updatedAt?: unknown } }).data;
          if (typeof data?.updatedAt === "string") {
            setValues((current) => ({ ...current, updatedAt: data.updatedAt as string }));
          }
        }
        setSuccess(true);
      } catch (saveError) {
        setError(
          saveError instanceof Error ? saveError.message : "No se pudo guardar la página legal.",
        );
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-10" noValidate>
      <fieldset className="space-y-6">
        <legend className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
          SEO de la página
        </legend>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Título SEO</span>
            <input
              value={values.metadataTitle ?? ""}
              onChange={(event) => update("metadataTitle", event.target.value)}
              maxLength={60}
              className={inputClass}
            />
            <span className="t-mono mt-2 block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Opcional. Si queda vacío, se usa el título legal predeterminado.
            </span>
          </label>
          <label className="block sm:col-span-2">
            <span className={labelClass}>Descripción SEO</span>
            <textarea
              value={values.metadataDescription ?? ""}
              onChange={(event) => update("metadataDescription", event.target.value)}
              maxLength={160}
              rows={3}
              className={`${inputClass} resize-y`}
            />
            <span className="t-mono mt-2 block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Opcional. No cambia la versión de la política si es la única modificación.
            </span>
          </label>
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {(
          [
            ["eyebrow", "Etiqueta superior", 80],
            ["title", "Título", 180],
            ["tocLabel", "Etiqueta del índice", 80],
            ["updatedLabel", "Etiqueta de actualización", 80],
            ["version", "Versión", 40],
          ] as const
        ).map(([key, label, maxLength]) => (
          <label key={key} className="block">
            <span className={labelClass}>{label} *</span>
            <input
              value={values[key]}
              onChange={(event) => update(key, event.target.value)}
              required
              maxLength={maxLength}
              className={inputClass}
            />
          </label>
        ))}
        <label className="block">
          <span className={labelClass}>Fecha de vigencia *</span>
          <input
            type="date"
            value={values.effectiveDate}
            onChange={(event) => update("effectiveDate", event.target.value)}
            required
            className={inputClass}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Introducción *</span>
          <textarea
            value={values.intro}
            onChange={(event) => update("intro", event.target.value)}
            required
            maxLength={800}
            rows={4}
            className={`${inputClass} resize-y`}
          />
        </label>
      </div>

      <div className="space-y-8">
        {values.sections.map((section, sectionIndex) => (
          <fieldset key={sectionIndex} className="space-y-5 border border-ink-line p-5">
            <legend className="t-mono px-2 text-[10px] uppercase tracking-[0.22em] text-ink-soft">
              Sección {sectionIndex + 1}
            </legend>
            <label className="block">
              <span className={labelClass}>Título de sección *</span>
              <input
                value={section.heading}
                onChange={(event) => updateSection(sectionIndex, event.target.value)}
                required
                maxLength={160}
                className={inputClass}
              />
            </label>
            {section.paragraphs.map((paragraph, paragraphIndex) => (
              <div key={paragraphIndex} className="flex items-start gap-3">
                <label className="block flex-1">
                  <span className={labelClass}>Párrafo {paragraphIndex + 1} *</span>
                  <textarea
                    value={paragraph.text}
                    onChange={(event) =>
                      updateParagraph(sectionIndex, paragraphIndex, event.target.value)
                    }
                    required
                    maxLength={1200}
                    rows={4}
                    className={`${inputClass} resize-y`}
                  />
                </label>
                {section.paragraphs.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        "sections",
                        values.sections.map((item, index) =>
                          index === sectionIndex
                            ? {
                                ...item,
                                paragraphs: item.paragraphs.filter(
                                  (_, current) => current !== paragraphIndex,
                                ),
                              }
                            : item,
                        ),
                      )
                    }
                    className="mt-6 text-sm underline"
                  >
                    Quitar
                  </button>
                ) : null}
              </div>
            ))}
            <div className="flex gap-4">
              {section.paragraphs.length < 6 ? (
                <button
                  type="button"
                  onClick={() =>
                    update(
                      "sections",
                      values.sections.map((item, index) =>
                        index === sectionIndex
                          ? { ...item, paragraphs: [...item.paragraphs, { text: "" }] }
                          : item,
                      ),
                    )
                  }
                  className="text-sm underline"
                >
                  Agregar párrafo
                </button>
              ) : null}
              {values.sections.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    update(
                      "sections",
                      values.sections.filter((_, index) => index !== sectionIndex),
                    )
                  }
                  className="text-sm underline"
                >
                  Quitar sección
                </button>
              ) : null}
            </div>
          </fieldset>
        ))}
        {values.sections.length < 20 ? (
          <button
            type="button"
            onClick={() =>
              update("sections", [...values.sections, { heading: "", paragraphs: [{ text: "" }] }])
            }
            className="text-sm underline"
          >
            Agregar sección
          </button>
        ) : null}
      </div>

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
          Cambios publicados.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="bg-ink px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-paper disabled:opacity-50"
      >
        {pending ? "Publicando…" : "Guardar y publicar"}
      </button>
    </form>
  );
}
