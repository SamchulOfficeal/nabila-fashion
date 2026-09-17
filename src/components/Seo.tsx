import { useEffect } from "react";

type SeoProps = {
  title: string;
  description?: string;
  image?: string;
  type?: "website" | "product" | "article";
};

function upsertMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", "canonical");
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
}

/** Per-route SEO metadata. Metadata is applied through a small effect to avoid extra deps. */
export function Seo({ title, description, image, type = "website" }: SeoProps) {
  useEffect(() => {
    const fullTitle = title.includes("NABILA") ? title : `${title} · NABILA FASHION`;
    document.title = fullTitle;
    upsertMeta('meta[property="og:title"]', "property", "og:title", fullTitle);
    upsertMeta('meta[property="og:type"]', "property", "og:type", type);
    upsertMeta('meta[property="og:site_name"]', "property", "og:site_name", "NABILA FASHION");
    upsertCanonical(window.location.origin + window.location.pathname);

    if (description) {
      upsertMeta('meta[name="description"]', "name", "description", description);
      upsertMeta(
        'meta[property="og:description"]',
        "property",
        "og:description",
        description,
      );
    }
    if (image) {
      upsertMeta('meta[property="og:image"]', "property", "og:image", image);
      upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", image);
    }
  }, [title, description, image, type]);

  return null;
}
