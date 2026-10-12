import type { MetadataRoute } from "next";

// Personal app: ask every crawler to stay out (IMPLEMENTATION_PLAN §2). Pairs with the noindex metadata in layout.tsx.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
