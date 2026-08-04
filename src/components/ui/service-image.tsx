"use client";

import { useState } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import type { Service } from "@/lib/types";
import { getServiceImage } from "@/lib/service-images";

interface ServiceImageProps {
  service: Service;
  alt?: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}

export function ServiceImage({
  service,
  alt = "",
  sizes,
  className = "object-cover",
  priority = false,
}: ServiceImageProps) {
  const preferredImage = service.image_url || getServiceImage(service.name);
  const fallbackImage = getServiceImage(service.name);
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const imageSrc = failedUrls.includes(preferredImage)
    ? preferredImage === fallbackImage || failedUrls.includes(fallbackImage)
      ? null
      : fallbackImage
    : preferredImage;

  if (!imageSrc) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground" aria-hidden="true">
        <Sparkles className="h-5 w-5" />
      </div>
    );
  }

  return (
    <Image
      src={imageSrc}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized
      priority={priority}
      onError={() => setFailedUrls((current) => current.includes(imageSrc) ? current : [...current, imageSrc])}
      className={className}
    />
  );
}
