import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/services/firebase/api";
import { BD_DIVISIONS } from "@/convex/lib/delivery";
import { useShop } from "@/context/app-context";
import { useMutation, useQuery } from "@/services/firebase/hooks";
import { uploadImage, cloudinaryConfigured } from "@/services/cloudinary";
import { uploadProductImage } from "@/services/firebase/products";
import { Coins, CreditCard, Loader2, Save, Truck } from "lucide-react";
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
  { key: "paymentBkashNumber", label: "bKash merchant/personal number" },
  { key: "paymentNagadNumber", label: "Nagad merchant/personal number" },
  { key: "courierPathaoPhone", label: "Pathao account phone" },
  { key: "courierSteadfastPhone", label: "Steadfast account phone" },
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
  const [chatEnabled, setChatEnabled] = useState(true);
  const [bkashEnabled, setBkashEnabled] = useState(false);
  const [nagadEnabled, setNagadEnabled] = useState(false);
  const [courierPathaoEnabled, setCourierPathaoEnabled] = useState(false);
  const [courierSteadfastEnabled, setCourierSteadfastEnabled] = useState(false);

  useEffect(() => {
    if (prefilled.current || !settings) return;
    prefilled.current = true;
    setValues(settings as unknown as Record<string, string>);
    setAnnouncement(settings.announcement);
    setChatEnabled(settings.chatEnabled !== false && settings.chatEnabled !== "false");
    setBkashEnabled(settings.paymentBkashEnabled === true || settings.paymentBkashEnabled === "true");
    setNagadEnabled(settings.paymentNagadEnabled === true || settings.paymentNagadEnabled === "true");
    setCourierPathaoEnabled(settings.courierPathaoEnabled === true || settings.courierPathaoEnabled === "true");
    setCourierSteadfastEnabled(settings.courierSteadfastEnabled === true || settings.courierSteadfastEnabled === "true");
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
          { key: "chatEnabled", value: chatEnabled ? "true" : "false" },
          { key: "paymentBkashEnabled", value: bkashEnabled ? "true" : "false" },
          { key: "paymentNagadEnabled", value: nagadEnabled ? "true" : "false" },
          { key: "courierPathaoEnabled", value: courierPathaoEnabled ? "true" : "false" },
          { key: "courierSteadfastEnabled", value: courierSteadfastEnabled ? "true" : "false" },
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
      // Prefer Cloudinary when configured; fall back to Firebase Storage.
      const logoUrl = cloudinaryConfigured
        ? await uploadImage(file)
        : await uploadProductImage(file, `branding/logo-${Date.now()}`);
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
          Currency, payments, couriers, chat and the announcement bar shown across the
          storefront.
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

          <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/50 p-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold">Chat widget</p>
              <p className="text-[11px] text-muted-foreground">Show the help bubble for shoppers.</p>
            </div>
            <Switch
              checked={chatEnabled}
              onCheckedChange={setChatEnabled}
              className="cursor-pointer"
              aria-label="Toggle chat widget"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-muted/50 p-3">
            <img src={values.logoUrl || "/auravelle-mark.svg"} alt="Store logo preview" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/auravelle-mark.svg"; }} className="size-12 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">Brand logo</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {cloudinaryConfigured ? "Uploaded to Cloudinary · square JPG, PNG or SVG." : "Cloudinary keys not set — uploads go to Firebase Storage."}
              </p>
            </div>
            <Input type="file" accept="image/*" disabled={logoUploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void onLogoUpload(file); event.target.value = ""; }} className="max-w-44 max-sm:w-full cursor-pointer text-xs" />
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
              <CreditCard className="size-4 text-primary" strokeWidth={1.8} />
              <h2 className="font-display text-lg font-semibold tracking-tight">
                Payments
              </h2>
            </div>
            <div className="mt-4 space-y-4">
              {[
                { id: "bkash", label: "bKash", enabled: bkashEnabled, setEnabled: setBkashEnabled, numberKey: "paymentBkashNumber" },
                { id: "nagad", label: "Nagad", enabled: nagadEnabled, setEnabled: setNagadEnabled, numberKey: "paymentNagadNumber" },
              ].map((msf) => (
                <div key={msf.id} className="rounded-2xl bg-muted/50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor={`${msf.id}-toggle`} className="text-xs font-semibold">
                      {msf.label} payments
                    </Label>
                    <Switch
                      id={`${msf.id}-toggle`}
                      checked={msf.enabled}
                      onCheckedChange={(checked) => msf.setEnabled(checked)}
                      className="cursor-pointer"
                    />
                  </div>
                  <div className="mt-2">
                    <Input
                      value={values[msf.numberKey] ?? ""}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [msf.numberKey]: event.target.value,
                        }))
                      }
                      placeholder="01XXXXXXXXX"
                      inputMode="tel"
                      className="h-10 rounded-xl text-xs"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
                    Customers send money to this number (send-money rails) and enter the
                    transaction ID at checkout. Gateway API (bKash merchant) can be
                    plugged in later without changing checkout.
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="glass rounded-3xl p-5">
            <div className="flex items-center gap-2">
              <Truck className="size-4 text-primary" strokeWidth={1.8} />
              <h2 className="font-display text-lg font-semibold tracking-tight">
                Courier accounts
              </h2>
            </div>
            <div className="mt-4 space-y-4">
              {[
                { id: "pathao", label: "Pathao Courier", enabled: courierPathaoEnabled, setEnabled: setCourierPathaoEnabled, phoneKey: "courierPathaoPhone" },
                { id: "steadfast", label: "Steadfast", enabled: courierSteadfastEnabled, setEnabled: setCourierSteadfastEnabled, phoneKey: "courierSteadfastPhone" },
              ].map((courier) => (
                <div key={courier.id} className="rounded-2xl bg-muted/50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor={`${courier.id}-toggle`} className="text-xs font-semibold">
                      {courier.label}
                    </Label>
                    <Switch
                      id={`${courier.id}-toggle`}
                      checked={courier.enabled}
                      onCheckedChange={(checked) => courier.setEnabled(checked)}
                      className="cursor-pointer"
                    />
                  </div>
                  <div className="mt-2">
                    <Input
                      value={values[courier.phoneKey] ?? ""}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [courier.phoneKey]: event.target.value,
                        }))
                      }
                      placeholder="Account phone"
                      inputMode="tel"
                      className="h-10 rounded-xl text-xs"
                    />
                </div>
                  <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
                    Enable to mark the courier as preferred for dispatch. Order parcels
                    are booked by phone today; API booking + consignment sync is a
                    drop-in extension point.
                    <span className="mt-1 block">Consignment numbers attach to orders in Admin → Orders.</span>
                  </p>
                </div>
              ))}
            </div>
          </section>

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
