import { LegalForm } from "../LegalForm";
import { getLegalPageForAdmin } from "../_lib/legal-admin";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Privacidad · Ene Muebles",
  robots: { index: false, follow: false },
};

export default async function PrivacyEditorPage() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16">
      <h1 className="t-display mb-3 text-4xl text-ink">Política de privacidad</h1>
      <p className="t-mono mb-10 text-sm text-ink-mute">
        Los cambios materiales requieren una nueva versión.
      </p>
      <LegalForm code="privacy" initial={await getLegalPageForAdmin("privacy")} />
    </div>
  );
}
