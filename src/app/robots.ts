import type { MetadataRoute } from "next";

// The owner dashboard, admin panel, and API surface are private — keep them
// out of search indexes explicitly instead of relying on no links existing.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/owner", "/admin", "/api", "/bootstrap", "/login"],
      },
    ],
  };
}
