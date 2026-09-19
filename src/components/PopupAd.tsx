import { SmartImage } from "@/components/SmartImage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/services/firebase/api";
import { useQuery } from "@/services/firebase/hooks";
import { AnimatePresence, motion } from "framer-motion";
import { Megaphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const DAY_MS = 24 * 60 * 60 * 1000;
const seenKey = (id: string) => `popup:seen:${id}`;

/**
 * True when the visitor should see this popup again, based on the campaign's
 * frequency setting and the last-seen timestamp stored in localStorage.
 *  once   → never again after the first dismiss
 *  daily  → reshow when last seen more than 24h ago
 *  always → every session load
 */
function shouldShow(popup: { _id: string; frequency?: string }): boolean {
  try {
    const raw = window.localStorage.getItem(seenKey(popup._id));
    if (!raw) return true;
    const seenAt = Number(raw);
    if (!Number.isFinite(seenAt)) return true;
    if (popup.frequency === "always") return true;
    if (popup.frequency === "daily") return Date.now() - seenAt > DAY_MS;
    return false;
  } catch {
    return true;
  }
}

function markSeen(id: string) {
  try {
    window.localStorage.setItem(seenKey(id), String(Date.now()));
  } catch {
    // storage unavailable (private mode) — popup simply shows more often
  }
}

/** Storefront popup ad. Mounted once in StoreLayout; admin controls content. */
export function PopupAd() {
  const popup = useQuery<null | { _id: string; title: string; description?: string; image: string; ctaText?: string; ctaUrl?: string; frequency?: string }>(api.popups.active);
  const [open, setOpen] = useState(false);
  // Ref (not state): a state guard made React StrictMode's double-invoked
  // effect skip scheduling the open timer after cleanup cleared it, so the
  // popup never appeared in the dev preview. With a ref the timer survives.
  const scheduledFor = useRef<string | null>(null);

  useEffect(() => {
    if (!popup || scheduledFor.current === popup._id) return;
    scheduledFor.current = popup._id;
    if (shouldShow(popup)) {
      // Small delay lets the page finish painting first.
      window.setTimeout(() => setOpen(true), 900);
    }
  }, [popup]);

  const dismiss = () => {
    if (popup) markSeen(popup._id);
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && popup && (
        <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : dismiss())}>
          <DialogContent
            showCloseButton={false}
            className="glass-strong max-h-[88vh] overflow-y-auto rounded-3xl border-border/60 p-0 sm:max-w-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="relative">
                <SmartImage
                  src={popup.image}
                  alt={popup.title}
                  width={800}
                  eager
                  className="aspect-[4/3] w-full rounded-t-3xl"
                />
                <button
                  type="button"
                  aria-label="Close popup"
                  onClick={dismiss}
                  className="absolute top-3 right-3 grid size-9 cursor-pointer place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <DialogHeader className="gap-2 px-5 pt-4 pb-1 text-left">
                <DialogTitle className="font-display text-xl font-semibold tracking-tight">
                  {popup.title}
                </DialogTitle>
                {popup.description ? (
                  <DialogDescription className="text-sm leading-relaxed">
                    {popup.description}
                  </DialogDescription>
                ) : null}
              </DialogHeader>
              <div className="flex items-center gap-3 px-5 pt-1 pb-5">
                {popup.ctaUrl && popup.ctaText ? (
                  <Button asChild className="cursor-pointer rounded-full">
                    <a
                      href={popup.ctaUrl}
                      onClick={() => {
                        markSeen(popup._id);
                        setOpen(false);
                      }}
                    >
                      <Megaphone className="size-4" strokeWidth={2} />
                      {popup.ctaText}
                    </a>
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  onClick={dismiss}
                  className="cursor-pointer rounded-full text-muted-foreground"
                >
                  Maybe later
                </Button>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
