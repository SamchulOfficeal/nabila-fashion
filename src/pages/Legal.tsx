import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { api } from "@/services/firebase/api";
import { formatDate } from "@/lib/utils";
import { useQuery } from "@/services/firebase/hooks";
import { FileText, Loader2 } from "lucide-react";
import { Link, useParams } from "react-router";

export default function Legal() {
  const { slug = "" } = useParams();
  const page = useQuery(api.legal.get, { slug });
  const pages = useQuery(api.legal.list);

  if (page === undefined) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-10 sm:px-6 lg:px-8">
      <Seo
        title={page?.title ?? "Legal"}
        description={`${page?.title ?? "Legal information"} for NABILA FASHION.`}
      />

      <nav className="flex flex-wrap gap-2">
        {(pages ?? []).map((item) => (
          <Link
            key={item._id}
            to={`/legal/${item.slug}`}
            className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
              item.slug === slug
                ? "bg-primary text-primary-foreground"
                : "glass-soft hover:bg-accent"
            }`}
          >
            {item.title}
          </Link>
        ))}
      </nav>

      {page === null ? (
        <div className="glass mt-6 grid place-items-center gap-4 rounded-[2rem] px-6 py-20 text-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-brand-blush text-primary">
            <FileText className="size-7" strokeWidth={1.5} />
          </span>
          <div>
            <p className="font-display text-xl font-semibold">Page not found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This document has not been published yet.
            </p>
          </div>
          <Button asChild className="cursor-pointer rounded-full px-6">
            <Link to="/">Back to store</Link>
          </Button>
        </div>
      ) : (
        <article className="glass mt-6 rounded-[2rem] p-6 sm:p-10">
          <span className="text-[10px] font-semibold tracking-[0.24em] text-primary uppercase">
            NABILA FASHION
          </span>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {page.title}
          </h1>
          <p className="mt-2 text-xs text-muted-foreground">
            Last updated {formatDate(page.updatedAt)}
          </p>
          <div className="mt-7 space-y-4 text-sm leading-7 whitespace-pre-line text-foreground/85">
            {page.content}
          </div>
        </article>
      )}
    </div>
  );
}
