import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Compass, Home } from "lucide-react";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <Seo title="Page not found" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass w-full max-w-md rounded-[2rem] p-8 text-center"
      >
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-blush text-primary">
          <Compass className="size-6" strokeWidth={1.6} />
        </span>
        <p className="mt-6 font-display text-5xl font-semibold tracking-tight">404</p>
        <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight">
          This page has moved on
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The link you followed no longer exists. The collection, however, is very much
          still here.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild className="cursor-pointer rounded-full">
            <Link to="/">
              <Home className="size-4" strokeWidth={1.8} /> Back to store
            </Link>
          </Button>
          <Button asChild variant="outline" className="cursor-pointer rounded-full">
            <Link to="/shop">Browse the collection</Link>
          </Button>
        </div>
      </motion.div>
    </main>
  );
}
