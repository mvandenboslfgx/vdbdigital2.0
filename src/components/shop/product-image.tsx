"use client";

import Image from "next/image";
import { useState } from "react";

const FALLBACK_SRC = "/images/catalog/product-fallback.svg";

export function ProductImage({
  src,
  alt,
  priority = false,
  className = "",
}: {
  src?: string | null;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolved = !failed && src ? src : FALLBACK_SRC;

  return (
    <div
      className={`relative aspect-[16/10] overflow-hidden bg-slate-100 ${className}`}
      data-image-fallback={!src || failed ? "true" : "false"}
    >
      <Image
        src={resolved}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover"
        priority={priority}
        unoptimized={resolved.startsWith("http")}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
