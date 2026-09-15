/**
 * Cloudinary media service for the admin panel.
 *
 * Media upload is backed by an unsigned upload preset so no API secret ever
 * reaches the browser. Set these keys in the project's Keys/API keys tab:
 *
 *   VITE_CLOUDINARY_CLOUD_NAME      e.g. "nabila-fashion"
 *   VITE_CLOUDINARY_UPLOAD_PRESET   e.g. "nabila_products"
 *
 * Until they are set the admin product form still works by pasting image URLs.
 */

const CLOUD_NAME = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined)?.trim();
const UPLOAD_PRESET = (
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined
)?.trim();

export const cloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const MAX_BYTES = 8 * 1024 * 1024;

export function validateImage(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Only JPG, PNG, WEBP, AVIF or GIF images are allowed.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Images must be smaller than 8MB.");
  }
}

/** Injects f_auto/q_auto transformations so Cloudinary serves optimised media. */
export function optimizedImage(url: string, width = 900): string {
  if (!url) return url;
  if (!url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) {
    return url;
  }
  if (/\/image\/upload\/[^/]*(f_auto|q_auto|w_)/.test(url)) return url;
  return url.replace("/image/upload/", `/image/upload/f_auto,q_auto,w_${width},c_limit/`);
}

export async function uploadImage(file: File): Promise<string> {
  validateImage(file);
  if (!cloudinaryConfigured) {
    throw new Error(
      "Cloudinary is not configured yet. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET, or paste an image URL instead.",
    );
  }

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", UPLOAD_PRESET!);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body },
  );

  if (!response.ok) {
    const detail = await response.text();
    console.error("[cloudinary] upload failed", detail);
    throw new Error("Upload failed. Check the Cloudinary cloud name and preset.");
  }

  const payload = (await response.json()) as { secure_url?: string };
  if (!payload.secure_url) throw new Error("Cloudinary did not return a secure URL.");
  return payload.secure_url;
}
