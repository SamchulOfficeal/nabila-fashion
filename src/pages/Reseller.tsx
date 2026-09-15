import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { api } from "@/services/firebase/api";
import { useShop } from "@/context/app-context";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@/services/firebase/hooks";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Percent,
  Phone,
  Share2,
  Sparkles,
  Truck,
  Wallet,
} from "lucide-react";
import { Link } from "react-router";

const STEPS = [
  {
    icon: Share2,
    title: "Share your code",
    body: "Every approved reseller gets a personal referral code. Share it on WhatsApp, Facebook or in person.",
  },
  {
    icon: Sparkles,
    title: "Customers order with it",
    body: "Your code is entered at checkout, so the order is tracked to you without any paperwork.",
  },
  {
    icon: Wallet,
    title: "Get paid after delivery",
    body: "Commission is confirmed when the parcel is delivered and settles every week via bKash, Nagad or bank.",
  },
] as const;

const PERKS = [
  "Per-product commission set by the boutique — the average sits around 12%.",
  "Cash-on-delivery handles collection, so you never chase a payment.",
  "Studio photography, sizing charts and copy you can reuse for your own posts.",
  "Priority stock on new arrivals and private sale pieces.",
  "A live dashboard for referred orders and commission in your account.",
] as const;

export default function Reseller() {
  const { supportPhone, money } = useShop();
  const { isAuthenticated } = useAuth();
  const profile = useQuery(api.profile.get);

  const isReseller = profile?.role === "reseller";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
      <Seo
        title="Reseller programme"
        description="Earn commission on every NABILA FASHION parcel you refer. Share your code, get paid weekly after delivery."
      />

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="glass relative overflow-hidden rounded-[2rem] p-6 sm:p-10"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-primary/12 blur-3xl"
        />
        <div className="relative max-w-2xl">
          <span className="text-[10px] font-semibold tracking-[0.24em] text-primary uppercase">
            Reseller programme
          </span>
          <h1 className="mt-3 font-display text-3xl leading-tight font-semibold tracking-tight sm:text-5xl">
            Sell NABILA to your circle and{" "}
            <span className="text-gradient-rose">earn on every parcel</span>.
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
            Our resellers sell from their own page, boutique desk or social feed without
            holding stock. You share a code, we handle photography, delivery and cash
            collection — commission lands in your account after each delivered order.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button asChild className="h-12 cursor-pointer rounded-full px-6 text-sm">
              <Link to={isAuthenticated ? "/account" : "/auth?returnTo=/account"}>
                {isReseller ? "Open my reseller dashboard" : "Get my referral code"}
                <ArrowRight className="size-4" strokeWidth={1.8} />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="glass-strong h-12 cursor-pointer rounded-full border-transparent px-6 text-sm"
            >
              <a href={`tel:${supportPhone}`}>
                <Phone className="size-4" strokeWidth={1.8} />
                Talk to care
              </a>
            </Button>
          </div>

          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="size-3.5 text-primary" strokeWidth={1.8} /> Free to
              join
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Percent className="size-3.5 text-primary" strokeWidth={1.8} /> Commission
              per delivered order
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Truck className="size-3.5 text-primary" strokeWidth={1.8} /> No stock to
              hold
            </span>
          </p>
        </div>
      </motion.section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <motion.article
            key={step.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: index * 0.08 }}
            className="glass lift rounded-3xl p-6"
          >
            <span className="grid size-11 place-items-center rounded-2xl bg-brand-blush text-primary">
              <step.icon className="size-5" strokeWidth={1.7} />
            </span>
            <p className="mt-4 text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
              Step {index + 1}
            </p>
            <h2 className="mt-1.5 font-display text-lg font-semibold tracking-tight">
              {step.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
          </motion.article>
        ))}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="glass rounded-[2rem] p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            What you get
          </h2>
          <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
            {PERKS.map((perk) => (
              <li key={perk} className="flex gap-3">
                <BadgeCheck
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  strokeWidth={1.8}
                />
                <span className="leading-6">{perk}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass flex flex-col rounded-[2rem] p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            A worked example
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Commission is calculated from the live product price on the day of the order,
            never from an old catalogue.
          </p>
          <div className="glass-soft mt-5 space-y-2.5 rounded-2xl p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Order value</span>
              <span className="font-medium">{money(5000)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Commission rate (example)</span>
              <span className="font-medium">12%</span>
            </div>
            <div className="flex items-center justify-between border-t border-border/50 pt-2.5 text-primary">
              <span>Your payout</span>
              <span className="font-display text-lg font-semibold">{money(600)}</span>
            </div>
          </div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Ten delivered orders a week at this value earns {money(6000)} — around{" "}
            {money(24000)} a month, paid straight to your wallet.
          </p>
          <Button
            asChild
            className="mt-auto h-12 w-full cursor-pointer rounded-full text-sm"
          >
            <Link to={isAuthenticated ? "/account" : "/auth?returnTo=/account"}>
              {isReseller ? "See my earnings" : "Apply as a reseller"}
            </Link>
          </Button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Applications are approved by the boutique within one working day. Questions?{" "}
            <a href={`tel:${supportPhone}`} className="font-medium text-primary underline">
              {supportPhone}
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
