import type { MetadataRoute } from "next";
import { educationArticles } from "@/lib/education-content";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = "https://fraudguard-indonesia.vercel.app";
  const updatedAt = new Date("2026-07-27T00:00:00+07:00");

  return [
    { url: siteUrl, lastModified: updatedAt, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/edukasi`, lastModified: updatedAt, changeFrequency: "weekly", priority: 0.9 },
    ...educationArticles.map((article) => ({
      url: `${siteUrl}/edukasi/${article.slug}`,
      lastModified: new Date(`${article.updatedAt}T00:00:00+07:00`),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
