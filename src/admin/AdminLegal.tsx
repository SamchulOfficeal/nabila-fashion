import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/services/firebase/api";
import { useShop } from "@/context/app-context";
import { cn, formatDateTime } from "@/lib/utils";
import { useMutation, useQuery } from "@/services/firebase/hooks";
import { AlignLeft, Bold, FileText, Heading2, List, Loader2, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const PAGES = [
  { slug: "privacy-policy", title: "Privacy Policy" },
  { slug: "terms-conditions", title: "Terms & Conditions" },
  { slug: "refund-policy", title: "Refund & Exchange Policy" },
];

/** Minimal markdown-ish renderer for the stored rich text. */
function renderContent(content: string) {
  return content.split("\n").map((line, index) => {
    const key = `${index}-${line.slice(0, 12)}`;
    if (line.startsWith("# ")) {
      return (
        <h2 key={key} className="mt-6 font-display text-xl font-semibold tracking-tight">
          {line.slice(2)}
        </h2>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h3 key={key} className="mt-5 font-display text-base font-semibold">
          {line.slice(3)}
        </h3>
      );
    }
    if (line.startsWith("- ")) {
      return (
        <p key={key} className="flex gap-2 text-sm leading-7 text-muted-foreground">
          <span className="text-primary">•</span>
          {line.slice(2)}
        </p>
      );
    }
    if (line.trim().length === 0) return <span key={key} className="block h-3" />;
    return (
      <p key={key} className="text-sm leading-7 text-foreground/85">
        {line}
      </p>
    );
  });
}

export function AdminLegal() {
  const { storeName } = useShop();
  const [slug, setSlug] = useState(PAGES[0].slug);
  const page = useQuery(api.legal.get, { slug });
  const upsert = useMutation(api.legal.upsert);
  const [title, setTitle] = useState(PAGES[0].title);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const fallback = PAGES.find((item) => item.slug === slug)?.title ?? "Legal page";
    if (page === undefined) return;
    setTitle(page?.title ?? fallback);
    setContent(page?.content ?? "");
  }, [page, slug]);

  const insert = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((current) => `${current}\n${snippet}`);
      return;
    }
    const start = textarea.selectionStart ?? content.length;
    const end = textarea.selectionEnd ?? content.length;
    const selected = content.slice(start, end);
    const next = `${content.slice(0, start)}${snippet.replace("$1", selected)}${content.slice(end)}`;
    setContent(next);
  };

  const onSave = async () => {
    setBusy(true);
    try {
      await upsert({ slug, title, content });
      toast.success("Legal page saved — it is live immediately");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the page");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Seo title="Legal pages" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Legal pages
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Content is stored in the database and rendered at /legal/{slug} — no deploy
            needed.
          </p>
        </div>
        <Button
          onClick={() => void onSave()}
          disabled={busy}
          className="w-fit cursor-pointer rounded-full"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" strokeWidth={1.8} />}
          Save page
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {PAGES.map((item) => (
          <button
            key={item.slug}
            type="button"
            onClick={() => setSlug(item.slug)}
            className={cn(
              "cursor-pointer rounded-full px-4 py-2 text-xs font-medium transition-colors",
              slug === item.slug
                ? "bg-primary text-primary-foreground"
                : "glass-soft hover:bg-accent",
            )}
          >
            {item.title}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass rounded-3xl p-5">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-primary" strokeWidth={1.8} />
            <h2 className="font-display text-lg font-semibold tracking-tight">Editor</h2>
          </div>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="l-title">Page title</Label>
              <Input
                id="l-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { icon: Heading2, snippet: "\n# Heading\n", label: "Heading" },
                { icon: Bold, snippet: "\n$1\n", label: "Paragraph" },
                { icon: List, snippet: "\n- Bullet point\n", label: "Bullet" },
                { icon: AlignLeft, snippet: "\n## Sub heading\n", label: "Sub heading" },
              ].map((tool) => (
                <Button
                  key={tool.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insert(tool.snippet)}
                  className="cursor-pointer rounded-full text-[11px]"
                >
                  <tool.icon className="size-3.5" strokeWidth={1.8} />
                  {tool.label}
                </Button>
              ))}
            </div>

            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="min-h-96 rounded-2xl font-mono text-xs leading-6"
              placeholder="Write the policy…"
            />

            {page?.updatedAt && (
              <p className="text-[11px] text-muted-foreground">
                Last saved {formatDateTime(page.updatedAt)}
              </p>
            )}
          </div>
        </section>

        <section className="glass rounded-3xl p-5">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Live preview
          </h2>
          <div className="glass-soft mt-4 max-h-[42rem] overflow-y-auto rounded-2xl p-5">
            <span className="text-[10px] font-semibold tracking-[0.24em] text-primary uppercase">
              {storeName}
            </span>
            <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">
              {title}
            </h3>
            <div className="mt-4 space-y-1">{renderContent(content)}</div>
          </div>
        </section>
      </div>
    </div>
  );
}
