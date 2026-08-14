'use client';

import Image from "next/image";
import { useState } from "react";
import type { StrapiMedia } from "@/lib/strapi";
import { pickMediaFormat } from "@/lib/strapi";

type ProductGalleryProps = {
  images: StrapiMedia[];
  productName: string;
};

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex];
  const hasMultipleImages = images.length > 1;

  const selectImage = (index: number) => {
    setActiveIndex(index);
  };

  const showPreviousImage = () => {
    setActiveIndex((currentIndex) => Math.max(currentIndex - 1, 0));
  };

  const showNextImage = () => {
    setActiveIndex((currentIndex) =>
      Math.min(currentIndex + 1, images.length - 1)
    );
  };

  return (
    <div
      className="space-y-4"
      role="region"
      aria-label={`Galería de imágenes de ${productName}`}
    >
      <div className="img-zoom relative aspect-[4/5] overflow-hidden bg-cream-soft">
        {activeImage ? (
          <Image
            src={activeImage.url}
            alt={activeImage.alternativeText || productName}
            fill
            priority
            sizes="(min-width: 1024px) 58vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-mute">
            Sin imagen
          </div>
        )}

        {hasMultipleImages ? (
          <div className="absolute inset-x-0 bottom-0 flex justify-between p-4">
            <button
              type="button"
              onClick={showPreviousImage}
              disabled={activeIndex === 0}
              className="grid h-11 w-11 place-items-center bg-paper/90 text-xl text-ink transition-colors hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              aria-label="Ver imagen anterior"
            >
              <span aria-hidden>←</span>
            </button>
            <button
              type="button"
              onClick={showNextImage}
              disabled={activeIndex === images.length - 1}
              className="grid h-11 w-11 place-items-center bg-paper/90 text-xl text-ink transition-colors hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              aria-label="Ver imagen siguiente"
            >
              <span aria-hidden>→</span>
            </button>
          </div>
        ) : null}
      </div>

      {images.length > 0 ? (
        <>
          <p className="sr-only" aria-live="polite">
            Imagen {activeIndex + 1} de {images.length}
          </p>
          <ul className="grid grid-cols-3 gap-3" aria-label="Seleccionar imagen">
            {images.map((image, index) => {
              const imageLabel = image.alternativeText || `${productName} detalle`;
              const isActive = index === activeIndex;

              return (
                <li key={image.id} className="relative aspect-square overflow-hidden bg-cream-soft">
                  <button
                    type="button"
                    onClick={() => selectImage(index)}
                    className={`img-zoom relative block h-full w-full overflow-hidden focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                      isActive ? "ring-2 ring-inset ring-ink" : ""
                    }`}
                    aria-label={`Ver ${imageLabel}, imagen ${index + 1} de ${images.length}`}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <Image
                      // Slot-aware media (ISR milestone): thumbnails are
                      // small squares — request the smallest Strapi
                      // responsive format (thumbnail, falling back
                      // upward). The main gallery image above keeps the
                      // ORIGINAL url because it is the LCP element.
                      src={pickMediaFormat(image, "thumbnail") ?? image.url}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 16vw, 33vw"
                      className="object-cover"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}
