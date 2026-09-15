import { Button } from "@/components/ui/button";
import { api } from "@/services/firebase/api";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@/services/firebase/hooks";
import { Loader2, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router";

type AppRole = "admin" | "manager" | "reseller" | "customer";

/**
 * Route level role gate. Signed out visitors are sent to /auth with the intended
 * path preserved; signed in visitors without the required role get a 403 panel —
 * the admin panel is never rendered for unauthorised accounts.
 */
export function RoleRoute({
  roles,
  children,
}: {
  roles: AppRole[];
  children: ReactNode;
}) {
  const { isLoading, isAuthenticated } = useAuth();
  const profile = useQuery<{ role?: AppRole } | null>(api.profile.get);
  const location = useLocation();

  if (isLoading || profile === undefined) {
    return (
      <main className="grid min-h-screen place-items-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  const role: AppRole = profile?.role ?? "customer";
  if (!roles.includes(role)) {
    return <AccessDenied role={role} />;
  }

  return children;
}

export function AccessDenied({ role }: { role: string }) {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="glass w-full max-w-md rounded-3xl p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="size-6" strokeWidth={1.6} />
        </span>
        <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight">
          Not authorised
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This area is restricted to store staff. Your account is signed in as{" "}
          <strong className="text-foreground">{role}</strong>.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild className="cursor-pointer rounded-full">
            <Link to="/">Back to store</Link>
          </Button>
          <Button asChild variant="outline" className="cursor-pointer rounded-full">
            <Link to="/account">My account</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
