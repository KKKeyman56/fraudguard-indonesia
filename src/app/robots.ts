import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = "https://fraudguard-indonesia.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/edukasi/", "/login", "/privacy", "/terms", "/data-deletion"],
        disallow: ["/admin/", "/api/", "/auth/", "/dashboard", "/analyze", "/history", "/report", "/billing", "/settings"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
