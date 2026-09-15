import { optimizedImage } from "@/services/cloudinary";
import { cn } from "@/lib/utils";
import { Gem } from "lucide-react";
import { useMemo, useState } from "react";

type SmartImageProps = {
  src?: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  width?: number;
  eager?: boolean;
};

/** Lazy image with Cloudinary delivery optimisation, fade-in and a graceful fallback. */
export function SmartImage({
  src,
  alt,
  className,
  imageClassName,
  width = 900,
  eager = false,
}: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const resolved = useMemo(() => (src ? optimizedImage(src, width) : ""), [src, width]);

  const showFallback = failed || !resolved;

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-brand-blush via-muted to-secondary" />
      )}
      {showFallback ? (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-brand-blush via-background to-secondary">
          <Gem className="size-6 text-primary/40" strokeWidth={1.4} />
        </div>
      ) : (
        <img
          src={resolved}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={eager ? "high" : "auto"}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            "h-full w-full object-cover transition-all duration-700 ease-out",
            loaded ? "scale-100 opacity-100 blur-0" : "scale-105 opacity-0 blur-sm",
            imageClassName,
          )}
        />
      )}
    </div>
  );
}
