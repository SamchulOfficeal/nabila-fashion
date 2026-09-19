import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  children,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "glass flex flex-col items-center gap-4 rounded-3xl px-6 py-16 text-center",
        className,
      )}
    >
      <span className="relative grid size-16 place-items-center rounded-2xl bg-brand-blush text-primary">
        <Icon className="size-7" strokeWidth={1.5} />
        <span className="absolute inset-0 -z-10 rounded-2xl bg-primary/15 blur-lg" />
      </span>
      <div className="space-y-1.5">
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        {description && (
          <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children}
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="mt-1 h-11 rounded-full px-6 font-medium cursor-pointer"
        >
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
