import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/demo", "/owner", "/merchant"].map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "weekly", priority: p ? 0.7 : 1 }));
}
