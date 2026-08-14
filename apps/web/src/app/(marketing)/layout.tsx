import type { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getFooterBlock, getSiteSettings } from '@/lib/strapi';

/**
 * Marketing layout: wraps every page in the (marketing) route group
 * with the public site chrome (Header + Footer). Pages under /admin/*
 * intentionally live outside this group so they only render their own
 * admin chrome (see app/admin/(authenticated)/layout.tsx).
 */
export default async function MarketingLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  let settings = null;
  try {
    settings = await getSiteSettings();
  } catch (err) {
    console.warn('[marketing/layout] site-setting fetch failed:', err);
  }

  // Batch 2: the Footer reads the `footer-block` singleton. The helper
  // already swallows network/CMS failures and returns a typed fallback,
  // so no try/catch is needed here. We still await it before rendering
  // the Footer so the tree remains serial rather than racing renders.
  const footerBlock = await getFooterBlock();

  const fallbackName = 'ENE-MUEBLES';

  return (
    <>
      {/* B2/U13 — skip link (WCAG 2.4.1): first focusable element on
          every marketing page. Visually hidden until :focus-visible
          (see `.skip-link` in globals.css); the native hash jump to
          #main-content moves focus because main carries tabIndex={-1}. */}
      <a href="#main-content" className="skip-link t-label">
        Saltar al contenido
      </a>
      <Header
        siteName={settings?.siteName ?? fallbackName}
        whatsappNumber={settings?.whatsappNumber}
        whatsappDefaultMessage={settings?.whatsappDefaultMessage}
        contactPhone={settings?.contactPhone}
        contactEmail={settings?.contactEmail}
      />
      {/* B2/U13 — the single `main` landmark for the marketing group.
          tabIndex={-1} makes it the fragment-navigation focus target;
          the focus ring is suppressed and scroll-margin-top clears the
          sticky header (globals.css). Pages inside this group must NOT
          render their own <main>. */}
      <main
        id="main-content"
        tabIndex={-1}
        className="bg-paper text-ink"
      >
        {children}
      </main>
      {settings ? <Footer settings={settings} block={footerBlock} /> : null}
    </>
  );
}