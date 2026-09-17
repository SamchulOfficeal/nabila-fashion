import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useShop } from "@/context/app-context";
import { useAuth } from "@/hooks/use-auth";
import { useUiStore } from "@/store/ui-store";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Chrome,
  Loader2,
  Mail,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Truck,
  UserX,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(returnTo: string | null, fallback = "/account") {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { storeName } = useShop();
  const brandInitial = storeName.charAt(0).toUpperCase();
  const {
    isLoading: authLoading,
    isAuthenticated,
    signIn,
    signInGoogle,
    requestPasswordReset,
    authError,
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const locale = useUiStore((state) => state.locale);
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      formData.set("mode", mode);
      await signIn("email-otp", formData);
      navigate(redirect);
    } catch (signInError) {
      console.error("Email sign-in error:", signInError);
      setError(authError(signInError));
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInGoogle();
      navigate(redirect);
    } catch (googleError) {
      setError(authError(googleError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      navigate(redirect);
    } catch (verifyError) {
      console.error("OTP verification error:", verifyError);
      setError("The verification code you entered is incorrect.");
      setIsLoading(false);
      setOtp("");
    }
  };

  const handleResetSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
      setResetEmail(email);
      await requestPasswordReset(email);
      setResetSent(true);
    } catch (resetError) {
      console.error("Password reset error:", resetError);
      setError(authError(resetError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
      navigate(redirect);
    } catch (guestError) {
      console.error("Guest login error:", guestError);
      setError("Guest sign-in is unavailable right now. Use your email instead.");
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Seo
        title="Sign in"
        description={`Sign in to ${storeName} with a secure email one-time passcode.`}
      />

      <div className="grid items-stretch gap-6 lg:grid-cols-[1.05fr_1fr]">
        {/* brand panel */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="glass relative hidden overflow-hidden rounded-[2rem] p-10 lg:block"
        >
          <div className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-primary/20 blur-3xl animate-float-slow" />
          <div className="relative flex h-full flex-col">
            <Link to="/" className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-primary font-display text-base font-bold text-primary-foreground">
                {brandInitial}
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-display text-lg font-semibold tracking-tight">
                  {storeName.replace(/\s*FASHION$/i, "")}
                </span>
                <span className="text-[9px] font-medium tracking-[0.34em] text-muted-foreground">
                  {storeName.includes("FASHION") ? "FASHION" : "STUDIO"}
                </span>
              </span>
            </Link>

            <div className="mt-auto">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-blush px-3.5 py-1.5 text-[10px] font-semibold tracking-[0.22em] text-primary uppercase">
                <Sparkles className="size-3" strokeWidth={2} />
                {locale === "bn" ? "নিরাপদ লগ ইন" : "Secure OTP sign in"}
              </span>
              <h2 className="mt-5 max-w-md font-display text-4xl leading-[1.1] font-semibold tracking-tight">
                Your wardrobe, waiting on the other side.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
                Save favourites, track every cash-on-delivery order and get first access
                to flash sales.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  { icon: ShieldCheck, label: "6-digit email OTP, no passwords stored" },
                  { icon: Truck, label: "Track COD orders across all 64 districts" },
                  { icon: BadgeCheck, label: "Verified-buyer reviews only" },
                ].map((item) => (
                  <li key={item.label} className="flex items-center gap-3 text-sm">
                    <span className="grid size-9 place-items-center rounded-xl bg-brand-blush text-primary">
                      <item.icon className="size-4" strokeWidth={1.7} />
                    </span>
                    <span className="text-foreground/80">{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.section>

        {/* form panel */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="glass flex flex-col justify-center rounded-[2rem] p-6 sm:p-10"
        >
          {step === "signIn" ? resetMode ? (
            <>
              <Link to="/" className="mb-6 flex items-center gap-2.5 lg:hidden">
                <span className="grid size-9 place-items-center rounded-xl bg-primary font-display text-sm font-bold text-primary-foreground">
                  {brandInitial}
                </span>
                <span className="font-display text-sm font-semibold tracking-tight">
                  {storeName}
                </span>
              </Link>
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                Reset your password
              </h1>
              {resetSent ? (
                <>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    If an account exists for <strong>{resetEmail}</strong>, a secure reset
                    link is on its way. Check your inbox — and spam — then sign in with
                    the new password.
                  </p>
                  <Button
                    type="button"
                    onClick={() => {
                      setResetMode(false);
                      setResetSent(false);
                      setError(null);
                    }}
                    className="mt-6 h-12 w-full cursor-pointer rounded-xl"
                  >
                    Back to sign in
                    <ArrowRight className="size-4" strokeWidth={1.8} />
                  </Button>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Enter your account email and we&apos;ll send a secure link to set a
                    new password.
                  </p>
                  <form onSubmit={handleResetSubmit} className="mt-7">
                    <label className="text-xs font-medium" htmlFor="reset-email">
                      Email address
                    </label>
                    <div className="relative mt-2">
                      <Mail
                        className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                        strokeWidth={1.8}
                      />
                      <Input
                        id="reset-email"
                        name="email"
                        placeholder="name@example.com"
                        type="email"
                        className="h-12 rounded-xl pl-9"
                        disabled={isLoading}
                        required
                      />
                    </div>
                    {error && (
                      <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {error}
                      </p>
                    )}
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="mt-5 h-12 w-full cursor-pointer rounded-xl"
                    >
                      {isLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <>
                          Send reset link
                          <ArrowRight className="size-4" strokeWidth={1.8} />
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isLoading}
                      onClick={() => {
                        setResetMode(false);
                        setResetSent(false);
                        setError(null);
                      }}
                      className="mt-2 h-11 w-full cursor-pointer rounded-xl text-xs"
                    >
                      <RefreshCcw className="size-3.5" strokeWidth={1.8} />
                      Back to sign in
                    </Button>
                  </form>
                </>
              )}
            </>
          ) : (
            <>
              <Link to="/" className="mb-6 flex items-center gap-2.5 lg:hidden">
                <span className="grid size-9 place-items-center rounded-xl bg-primary font-display text-sm font-bold text-primary-foreground">
                  {brandInitial}
                </span>
                <span className="font-display text-sm font-semibold tracking-tight">
                  {storeName}
                </span>
              </Link>
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                {mode === "signIn" ? "Welcome back" : "Create your account"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {mode === "signIn"
                  ? "Sign in to shop, save favourites and track every order."
                  : "Join the wardrobe edit and keep every order in one place."}
              </p>

              <form onSubmit={handleEmailSubmit} className="mt-7">
                <label className="text-xs font-medium" htmlFor="email">
                  Email address
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Mail
                      className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                      strokeWidth={1.8}
                    />
                    <Input
                      id="email"
                      name="email"
                      placeholder="name@example.com"
                      type="email"
                      className="h-12 rounded-xl pl-9"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
                <label className="mt-4 block text-xs font-medium" htmlFor="password">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  placeholder="At least 6 characters"
                  type="password"
                  minLength={6}
                  className="mt-2 h-12 rounded-xl"
                  disabled={isLoading}
                  required
                />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {mode === "signUp" ? "Use at least 6 characters." : "Use your Firebase account password."}
                </p>
                {mode === "signIn" && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setResetMode(true);
                        setResetSent(false);
                        setError(null);
                      }}
                      className="cursor-pointer text-xs font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
                <div className="mt-4 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-12 cursor-pointer rounded-xl px-5"
                  >
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        {mode === "signIn" ? "Sign in" : "Create account"}
                        <ArrowRight className="size-4" strokeWidth={1.8} />
                      </>
                    )}
                  </Button>
                </div>
                {error && (
                  <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {error}
                  </p>
                )}
              </form>

              <button
                type="button"
                onClick={() => void handleGoogleLogin()}
                disabled={isLoading}
                className="mt-4 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border/70 bg-background/50 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
              >
                <Chrome className="size-4" strokeWidth={1.8} />
                Continue with Google
              </button>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                {mode === "signIn" ? "New here?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  className="cursor-pointer font-semibold text-primary hover:underline"
                  onClick={() => {
                    setMode(mode === "signIn" ? "signUp" : "signIn");
                    setError(null);
                  }}
                >
                  {mode === "signIn" ? "Create an account" : "Sign in"}
                </button>
              </p>

              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-medium tracking-[0.2em] text-muted-foreground uppercase">
                  or
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => void handleGuestLogin()}
                disabled={isLoading}
                className="h-12 w-full cursor-pointer rounded-xl"
              >
                <UserX className="size-4" strokeWidth={1.8} />
                Continue as guest
              </Button>
              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                Guest sessions can browse and add to bag, but placing an order needs an
                email so we can confirm delivery by phone.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                Check your email
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                We sent a 6-digit code to <strong>{step.email}</strong>. It stays valid
                for 15 minutes.
              </p>

              <form onSubmit={handleOtpSubmit} className="mt-7">
                <input type="hidden" name="email" value={step.email} />
                <input type="hidden" name="code" value={otp} />
                <div className="flex justify-center">
                  <InputOTP
                    value={otp}
                    onChange={setOtp}
                    maxLength={6}
                    disabled={isLoading}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && otp.length === 6 && !isLoading) {
                        const form = (event.target as HTMLElement).closest("form");
                        form?.requestSubmit();
                      }
                    }}
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, index) => (
                        <InputOTPSlot key={index} index={index} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {error && (
                  <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className="mt-6 h-12 w-full cursor-pointer rounded-xl"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Verifying…
                    </>
                  ) : (
                    <>
                      Verify &amp; continue
                      <ArrowRight className="size-4" strokeWidth={1.8} />
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isLoading}
                  onClick={() => {
                    setOtp("");
                    setError(null);
                    setStep("signIn");
                  }}
                  className="mt-2 h-11 w-full cursor-pointer rounded-xl text-xs"
                >
                  <RefreshCcw className="size-3.5" strokeWidth={1.8} />
                  Use a different email
                </Button>
              </form>
            </>
          )}

          <p className="mt-8 text-center text-[10px] tracking-wide text-muted-foreground">
            Protected by role based access control and strict server-side validation.
          </p>
        </motion.section>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
