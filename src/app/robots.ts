import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = "https://fraudguard-indonesia.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/edukasi/", "/login"],
        disallow: ["/admin/", "/api/", "/auth/", "/dashboard", "/analyze", "/history", "/report", "/billing"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
