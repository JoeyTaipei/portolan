import type { MetadataRoute } from "next";

// Dossier and share links are private capabilities: crawlers stay out (spec §5, §9).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/d/", "/s/"] },
  };
}
