import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Compass, Sparkles } from "lucide-react";
import { Link } from "react-router";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function NotFound() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-24">
      <Seo title="Page not found" />

      {/* ambient brand orbs */}
      <div className="pointer-events-none absolute -top-24 left-[8%] size-72 rounded-full bg-primary/15 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute right-[6%] bottom-[12%] size-64 rounded-full bg-brand-champagne/20 blur-3xl animate-float-slow [animation-delay:-7s]" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="glass-strong relative w-full max-w-lg overflow-hidden rounded-[2.5rem] p-8 text-center sm:p-12"
      >
        {/* gold hairline top edge */}
        <div className="gold-gradient absolute inset-x-0 top-0 h-1" />

        <motion.div variants={item} className="flex items-center justify-center gap-2">
          <img
            src="/auravelle-mark.svg"
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-xl"
          />
          <span className="text-[10px] font-semibold tracking-[0.34em] text-muted-foreground uppercase">
            NABILA STUDIO
          </span>
        </motion.div>

        <motion.p
          variants={item}
          className="text-gradient-rose mt-8 font-display text-[5.5rem] leading-none font-semibold tracking-tight sm:text-[7rem]"
        >
          404
        </motion.p>

        <motion.h1
          variants={item}
          className="mt-4 flex items-center justify-center gap-2 font-display text-2xl font-semibold tracking-tight"
        >
          <Compass className="size-5 text-brand-champagne" strokeWidth={1.6} />
          This page has moved on
        </motion.h1>

        <motion.p
          variants={item}
          className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground"
        >
          The link you followed no longer exists. The collection, however, is very
          much still here — and waiting to be explored.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center"
        >
          <Button asChild className="cursor-pointer rounded-full px-7">
            <Link to="/">
              Back to store <ArrowRight className="size-4" strokeWidth={1.8} />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="glass-strong cursor-pointer rounded-full border-transparent px-7"
          >
            <Link to="/shop">
              <Sparkles className="size-4 text-primary" strokeWidth={1.8} />
              Browse the collection
            </Link>
          </Button>
        </motion.div>

        <motion.p
          variants={item}
          className="mt-6 text-[10px] tracking-[0.24em] text-muted-foreground/70 uppercase"
        >
          Error 404 — page not found
        </motion.p>
      </motion.div>
    </main>
  );
}
