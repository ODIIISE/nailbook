const SERVICE_IMAGES = {
  manicure: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80&auto=format&fit=crop",
  pedicure: "https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?w=800&q=80&auto=format&fit=crop",
  gel: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&q=80&auto=format&fit=crop",
  design: "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=800&q=80&auto=format&fit=crop",
  extension: "https://images.unsplash.com/photo-1610992015762-45dca7fa3a85?w=800&q=80&auto=format&fit=crop",
  polish: "https://images.unsplash.com/photo-1636019411401-82485711b6ba?w=800&q=80&auto=format&fit=crop",
  default: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80&auto=format&fit=crop",
} as const;

function normalizedName(name: string): string {
  return name.toLocaleLowerCase().replace(/[يى]/g, "ی").replace(/[ك]/g, "ک");
}

export function getServiceImage(name: string): string {
  const normalized = normalizedName(name);

  if (normalized.includes("پدیکور") || normalized.includes("pedicure")) return SERVICE_IMAGES.pedicure;
  if (normalized.includes("مانیکور") || normalized.includes("manicure")) return SERVICE_IMAGES.manicure;
  if (normalized.includes("ژل") || normalized.includes("gel")) return SERVICE_IMAGES.gel;
  if (
    normalized.includes("طراح") ||
    normalized.includes("دیزاین") ||
    normalized.includes("design") ||
    normalized.includes("هنر") ||
    normalized.includes("art")
  ) return SERVICE_IMAGES.design;
  if (
    normalized.includes("کاشت") ||
    normalized.includes("اکریل") ||
    normalized.includes("لمینت") ||
    normalized.includes("extension") ||
    normalized.includes("acrylic")
  ) return SERVICE_IMAGES.extension;
  if (normalized.includes("لاک") || normalized.includes("رنگ") || normalized.includes("polish")) return SERVICE_IMAGES.polish;

  return SERVICE_IMAGES.default;
}
