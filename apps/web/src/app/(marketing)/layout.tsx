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
      <Header
        siteName={settings?.siteName ?? fallbackName}
        whatsappNumber={settings?.whatsappNumber}
        whatsappDefaultMessage={settings?.whatsappDefaultMessage}
        contactPhone={settings?.contactPhone}
        contactEmail={settings?.contactEmail}
      />
      <div className="bg-paper text-ink">{children}</div>
      {settings ? <Footer settings={settings} block={footerBlock} /> : null}
    </>
  );
}