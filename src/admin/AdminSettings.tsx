import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/services/firebase/api";
import { BD_DIVISIONS } from "@/convex/lib/delivery";
import { useShop } from "@/context/app-context";
import { useMutation, useQuery } from "@/services/firebase/hooks";
import { uploadProductImage } from "@/services/firebase/products";
import { Coins, Loader2, Save, Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const FIELDS = [
  { key: "storeName", label: "Store name" },
  { key: "logoUrl", label: "Logo URL" },
  { key: "supportPhone", label: "Support phone" },
  { key: "whatsappNumber", label: "WhatsApp number" },
  { key: "chatGreeting", label: "Chat greeting" },
  { key: "chatApiKey", label: "Chatbot API key", type: "password" },
  { key: "chatSystemPrompt", label: "Chatbot system prompt" },
  { key: "usdRate", label: "USD conversion rate (1 USD = ? BDT)", type: "number" },
  {
    key: "freeDeliveryThreshold",
    label: "Free delivery above (৳)",
    type: "number",
  },
] as const;

export function AdminSettings() {
  const { money } = useShop();
  const settings = useQuery(api.settings.raw);
  const update = useMutation(api.settings.update);
  const [values, setValues] = useState<Record<string, string>>({});
  const [announcement, setAnnouncement] = useState("");
  const [busy, setBusy] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const prefilled = useRef(false);

  useEffect(() => {
    if (prefilled.current || !settings) return;
    prefilled.current = true;
    setValues(settings as unknown as Record<string, string>);
    setAnnouncement(settings.announcement);
  }, [settings]);

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await update({
        values: [
          ...FIELDS.map((field) => ({
            key: field.key,
            value: values[field.key] ?? "",
          })),
          { key: "announcement", value: announcement },
          { key: "chatSystemPrompt", value: values.chatSystemPrompt ?? "You are a helpful customer care assistant for AURAVELLE." },
        ],
      });
      toast.success("Store settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setBusy(false);
    }
  };

  if (settings === undefined) {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const usdRate = Number(values.usdRate) || 120;

  const onLogoUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      const logoUrl = await uploadProductImage(file, `branding/logo-${Date.now()}`);
      setValues((current) => ({ ...current, logoUrl }));
      toast.success("Logo uploaded. Save settings to publish it.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Logo upload failed");
    } finally {
      setLogoUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <Seo title="Settings" />

      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Store settings
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Currency, delivery policy and the announcement bar shown across the storefront.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <form onSubmit={onSave} className="glass space-y-4 rounded-3xl p-5">
          <div className="flex items-center gap-2">
            <Coins className="size-4 text-primary" strokeWidth={1.8} />
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Storefront
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={"type" in field ? field.type : "text"}
                  value={values[field.key] ?? ""}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3">
            <img src={values.logoUrl || "/auravelle-mark.svg"} alt="Store logo preview" className="size-12 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">Brand logo</p>
              <p className="truncate text-[11px] text-muted-foreground">Upload a square JPG, PNG, or SVG.</p>
            </div>
            <Input type="file" accept="image/*" disabled={logoUploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void onLogoUpload(file); event.target.value = ""; }} className="max-w-44 cursor-pointer text-xs" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="announcement">Announcement bar</Label>
            <Textarea
              id="announcement"
              value={announcement}
              onChange={(event) => setAnnouncement(event.target.value)}
              className="min-h-20 rounded-xl"
            />
          </div>

          <Button type="submit" disabled={busy} className="cursor-pointer rounded-full">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" strokeWidth={1.8} />}
            Save settings
          </Button>
        </form>

        <div className="space-y-4">
          <section className="glass rounded-3xl p-5">
            <div className="flex items-center gap-2">
              <Truck className="size-4 text-primary" strokeWidth={1.8} />
              <h2 className="font-display text-lg font-semibold tracking-tight">
                Delivery zones
              </h2>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
              Charges below are recalculated on the server at checkout — clients cannot
              alter them. Free above {money(Number(values.freeDeliveryThreshold) || 4000)}.
            </p>
            <div className="mt-4 space-y-1.5">
              {BD_DIVISIONS.map((zone) => (
                <div
                  key={zone.division}
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-xs odd:bg-muted/50"
                >
                  <span className="font-medium">
                    {zone.division}
                    <span className="ml-2 text-muted-foreground">{zone.divisionBn}</span>
                  </span>
                  <span className="font-semibold">{money(zone.charge)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="glass rounded-3xl p-5">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Currency preview
            </h2>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Shoppers can switch between BDT and USD at any time.
            </p>
            <div className="mt-3 space-y-1.5 text-xs">
              {[890, 2450, 6850].map((amount) => (
                <div
                  key={amount}
                  className="flex items-center justify-between rounded-xl px-3 py-2 odd:bg-muted/50"
                >
                  <span className="font-medium">৳{amount.toLocaleString()}</span>
                  <span className="text-muted-foreground">
                    ${(amount / usdRate).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
