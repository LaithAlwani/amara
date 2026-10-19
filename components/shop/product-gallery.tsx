"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// Product gallery: one main image plus clickable thumbnails that swap it.
// On mobile the main image is height-capped so it doesn't dominate the screen.
export function ProductGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const [active, setActive] = useState(0);
  if (images.length === 0) return null;
  const main = images[Math.min(active, images.length - 1)];

  return (
    <div className="space-y-4">
      <div className="relative h-[44vh] w-full overflow-hidden rounded-3xl bg-secondary sm:h-auto sm:aspect-4/5">
        <Image
          src={main}
          alt={alt}
          fill
          priority
          sizes="(min-width: 1024px) 45vw, 100vw"
          className="object-cover"
        />
      </div>

      {images.length > 1 ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "relative aspect-square w-16 shrink-0 overflow-hidden rounded-xl bg-secondary ring-2 transition sm:w-20",
                i === active
                  ? "ring-clay"
                  : "ring-transparent hover:ring-border",
              )}
            >
              <Image
                src={src}
                alt={`${alt} thumbnail ${i + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
