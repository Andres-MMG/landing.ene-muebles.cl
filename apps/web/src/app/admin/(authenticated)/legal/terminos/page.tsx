import { LegalForm } from "../LegalForm";
import { getLegalPageForAdmin } from "../_lib/legal-admin";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Términos · Ene Muebles",
  robots: { index: false, follow: false },
};

export default async function TermsEditorPage() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16">
      <h1 className="t-display mb-10 text-4xl text-ink">Términos y condiciones</h1>
      <LegalForm code="terms" initial={await getLegalPageForAdmin("terms")} />
    </div>
  );
}
