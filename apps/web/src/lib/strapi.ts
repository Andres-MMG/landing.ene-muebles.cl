/**
 * Strapi v5 client for the public Next.js frontend.
 *
 * Uses the v5 flat response shape (no `attributes` wrapper). The token
 * is read from `STRAPI_API_TOKEN` and never shipped to the client —
 * every helper below is intended to be called from Server Components
 * or Route Handlers inside the Next.js server runtime.
 *
 * ISR (`revalidate: 60`) is used implicitly via `next: { revalidate: 60 }`.
 * Errors are re-thrown so the error boundary can render them.
 */

const DEFAULT_STRAPI_URL = 'http://localhost:1337';
// Public origin (browser-reachable) used for media URLs. When unset we fall
// back to NEXT_PUBLIC_STRAPI_URL; if that's also unset we derive a sensible
// default from STRAPI_INTERNAL_URL by swapping the docker DNS for localhost.
const PUBLIC_STRAPI_URL_FALLBACK = (() => {
  const internal = process.env.STRAPI_INTERNAL_URL;
  if (!internal) return DEFAULT_STRAPI_URL;
  // e.g. http://cms:1337 -> http://localhost:4781 (local dev maps 4781->1337).
  if (internal.includes('://cms:') || internal.includes('://strapi:')) {
    return 'http://localhost:4781';
  }
  return internal;
})();

export const STRAPI_URL =
  process.env.STRAPI_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_STRAPI_URL ||
  DEFAULT_STRAPI_URL;

export const STRAPI_PUBLIC_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL || PUBLIC_STRAPI_URL_FALLBACK;

const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || '';

export const REVALIDATE_SECONDS = 60;

export type StrapiMedia = {
  id: number;
  documentId?: string;
  url: string;
  alternativeText?: string | null;
  width?: number | null;
  height?: number | null;
  mime?: string;
  formats?: Record<string, { url: string }>;
};

export type SocialLinks = {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  linkedin?: string;
};

export type SiteSetting = {
  id: number;
  documentId?: string;
  siteName: string;
  tagline?: string;
  contactEmail?: string;
  contactPhone?: string;
  whatsappNumber?: string;
  address?: string;
  socialLinks?: SocialLinks;
  businessHours?: string;
  aboutText?: string;
  heroImage?: StrapiMedia | null;
};

export type Category = {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  description?: string;
  image?: StrapiMedia | null;
  order?: number;
  active?: boolean;
};

export type Product = {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  price: number;
  currency: string;
  dimensions?: { width?: number; height?: number; depth?: number; weight?: number };
  materials?: string[];
  featured?: boolean;
  active?: boolean;
  order?: number;
  category?: Pick<Category, 'id' | 'documentId' | 'name' | 'slug'> | null;
  images?: StrapiMedia[];
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
};

type CollectionEnvelope<T> = { data: T[]; meta?: unknown };
type SingleEnvelope<T> = { data: T; meta?: unknown };

const buildHeaders = (): HeadersInit => {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (STRAPI_TOKEN) headers.Authorization = `Bearer ${STRAPI_TOKEN}`;
  return headers;
};

const ensureAbsoluteUrl = (url: string): string => {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${STRAPI_PUBLIC_URL.replace(/\/+$/, '')}${url}`;
  return `${STRAPI_PUBLIC_URL.replace(/\/+$/, '')}/${url}`;
};

const requireField = <T,>(value: T | null | undefined, name: string): T => {
  if (value === null || value === undefined) {
    throw new Error(`[strapi] Missing required field: ${name}`);
  }
  return value;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${STRAPI_URL.replace(/\/+$/, '')}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { ...buildHeaders(), ...(init?.headers || {}) },
      next: { revalidate: REVALIDATE_SECONDS },
    });
  } catch (err) {
    throw new Error(
      `[strapi] Network error contacting ${url}: ${(err as Error).message}`
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `[strapi] ${init?.method || 'GET'} ${path} failed: ${res.status} ${res.statusText} ${body}`
    );
  }

  try {
    return (await res.json()) as T;
  } catch (err) {
    throw new Error(
      `[strapi] Invalid JSON response from ${path}: ${(err as Error).message}`
    );
  }
}

const normalizeMedia = (media: any): StrapiMedia | null => {
  if (!media) return null;
  if (Array.isArray(media)) {
    const first = media[0];
    return first ? normalizeMedia(first) : null;
  }
  const url = media.url || media?.formats?.thumbnail?.url || media?.formats?.small?.url;
  if (!url) return null;
  return {
    id: media.id,
    documentId: media.documentId,
    url: ensureAbsoluteUrl(url),
    alternativeText: media.alternativeText ?? null,
    width: media.width ?? null,
    height: media.height ?? null,
    mime: media.mime,
    formats: media.formats,
  };
};

const normalizeImageList = (images: any): StrapiMedia[] => {
  if (!images) return [];
  if (!Array.isArray(images)) return [];
  return images.map(normalizeMedia).filter((m): m is StrapiMedia => m !== null);
};

export async function getSiteSettings(): Promise<SiteSetting> {
  const json = await request<SingleEnvelope<SiteSetting> | SiteSetting>(
    '/api/site-setting?populate=*'
  );
  const raw = (json as { data?: SiteSetting }).data ?? (json as SiteSetting);
  if (!raw || !raw.siteName) {
    throw new Error('[strapi] getSiteSettings: response missing siteName');
  }
  return {
    ...raw,
    heroImage: normalizeMedia(raw.heroImage),
  };
}

export async function getCategories(): Promise<Category[]> {
  const json = await request<CollectionEnvelope<Category>>(
    '/api/categories?filters[active][$eq]=true&sort=order&populate=*'
  );
  return (json.data ?? []).map((c) => ({
    ...c,
    image: normalizeMedia(c.image),
  }));
}

export async function getFeaturedProducts(limit = 6): Promise<Product[]> {
  // Prefer products flagged as `featured`. If none are flagged yet, fall
  // back to the most recently published active products so the home page
  // never renders an empty section while the catalog is still being curated.
  const featured = await request<CollectionEnvelope<Product>>(
    `/api/products?filters[featured][$eq]=true&filters[active][$eq]=true&populate=*&pagination[limit]=${limit}&sort=publishedAt:desc`
  );
  const featuredData = (featured.data ?? []).map(normalizeProduct);
  if (featuredData.length > 0) return featuredData;

  const fallback = await request<CollectionEnvelope<Product>>(
    `/api/products?filters[active][$eq]=true&populate=*&pagination[limit]=${limit}&sort=publishedAt:desc`
  );
  return (fallback.data ?? []).map(normalizeProduct);
}

export async function getProducts(categorySlug?: string): Promise<Product[]> {
  const params = new URLSearchParams();
  params.set('filters[active][$eq]', 'true');
  params.set('sort', 'order');
  params.set('populate', '*');
  if (categorySlug) {
    params.set('filters[category][slug][$eq]', categorySlug);
  }
  const json = await request<CollectionEnvelope<Product>>(
    `/api/products?${params.toString()}`
  );
  return (json.data ?? []).map(normalizeProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const json = await request<CollectionEnvelope<Product>>(
    `/api/products?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=*`
  );
  const raw = json.data?.[0];
  if (!raw) return null;
  return normalizeProduct(raw);
}

function normalizeProduct(raw: any): Product {
  const category = raw.category
    ? {
        id: raw.category.id,
        documentId: raw.category.documentId,
        name: raw.category.name,
        slug: raw.category.slug,
      }
    : null;
  return {
    id: raw.id,
    documentId: raw.documentId,
    name: requireField(raw.name, 'product.name'),
    slug: requireField(raw.slug, 'product.slug'),
    description: requireField(raw.description, 'product.description'),
    shortDescription: raw.shortDescription,
    price: typeof raw.price === 'number' ? raw.price : Number(raw.price),
    currency: raw.currency || 'CLP',
    dimensions: raw.dimensions,
    materials: raw.materials,
    featured: Boolean(raw.featured),
    active: raw.active !== false,
    order: raw.order ?? 0,
    category,
    images: normalizeImageList(raw.images),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    publishedAt: raw.publishedAt,
  };
}

export const formatPrice = (product: Pick<Product, 'price' | 'currency'>): string => {
  const value = typeof product.price === 'number' ? product.price : Number(product.price);
  if (!Number.isFinite(value)) return '';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: product.currency || 'CLP',
    maximumFractionDigits: 0,
  }).format(value);
};

export const buildWhatsAppLink = (number: string, message: string): string => {
  const sanitized = (number || '').replace(/[^0-9+]/g, '');
  return `https://wa.me/${sanitized.replace(/^\+/, '')}?text=${encodeURIComponent(message)}`;
};

// Internal helpers reused by tests.
export const __internal = {
  buildHeaders,
  normalizeMedia,
  normalizeImageList,
  ensureAbsoluteUrl,
};
