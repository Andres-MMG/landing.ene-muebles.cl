import type { Metadata } from "next";
import { APP_VERSION } from "./version";
import {
  buildSeoMetadata,
  FALLBACK_ROOT_DESCRIPTION,
  FALLBACK_ROOT_SOCIAL_DESCRIPTION,
  FALLBACK_ROOT_TITLE,
  FALLBACK_SITE_NAME,
  metadataBase,
} from "./seo-metadata";

const rootMetadata = buildSeoMetadata({
  title: FALLBACK_ROOT_TITLE,
  description: FALLBACK_ROOT_DESCRIPTION,
  socialDescription: FALLBACK_ROOT_SOCIAL_DESCRIPTION,
  path: "/",
  siteName: FALLBACK_SITE_NAME,
  absoluteTitle: true,
});

/** Static fail-safe metadata. Public routes replace it with complete route-owned objects. */
export const siteMetadata: Metadata = {
  ...rootMetadata,
  metadataBase: metadataBase(),
  applicationName: FALLBACK_SITE_NAME,
  robots: {
    index: true,
    follow: true,
  },
  other: {
    version: APP_VERSION,
  },
};
