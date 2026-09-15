import { Seo } from "@/components/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/services/firebase/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn, formatDate } from "@/lib/utils";
import { useMutation, useQuery } from "@/services/firebase/hooks";
import { Loader2, Search, ShieldCheck, UserCog } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ROLES = ["customer", "reseller", "manager", "admin"] as const;
type Role = (typeof ROLES)[number];

const ROLE_STYLES: Record<Role, string> = {
  admin: "bg-primary text-primary-foreground",
  manager: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  reseller: "bg-brand-champagne/25 text-brand-plum dark:text-brand-champagne",
  customer: "bg-muted text-muted-foreground",
};

export function AdminUsers() {
  const [search, setSearch] = useState("");
  const users = useQuery(api.admin.listUsers, { search: search || undefined });
  const setRole = useMutation(api.admin.setRole);
  const setBlocked = useMutation(api.admin.setBlocked);

  const onRoleChange = async (userId: Id<"users">, role: Role) => {
    try {
      await setRole({ userId, role });
      toast.success(`Role updated to ${role}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update role");
    }
  };

  const onToggleBlocked = async (userId: Id<"users">, blocked: boolean) => {
    try {
      await setBlocked({ userId, blocked });
      toast.success(blocked ? "Account suspended" : "Account reinstated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update account");
    }
  };

  return (
    <div className="space-y-5">
      <Seo title="Users & roles" />

      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Users &amp; roles
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Promote managers, onboard resellers and suspend abusive accounts. Role changes
          are enforced on every protected route and mutation.
        </p>
      </div>

      <div className="glass flex items-center gap-2 rounded-2xl p-2.5">
        <Search className="ml-2 size-4 text-muted-foreground" strokeWidth={1.8} />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email or phone"
          className="h-10 border-transparent bg-transparent shadow-none"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {ROLES.map((role) => (
          <div key={role} className="glass rounded-2xl p-4">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              {role}
            </p>
            <p className="mt-2 font-display text-2xl font-semibold">
              {(users ?? []).filter((user) => user.role === role).length}
            </p>
          </div>
        ))}
      </div>

      {users === undefined ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2.5">
          {users.map((user) => (
            <div
              key={user._id}
              className="glass flex flex-col gap-3 rounded-3xl p-4 lg:flex-row lg:items-center"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-blush font-display text-sm font-bold text-primary">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{user.name}</p>
                  <Badge
                    className={cn(
                      "rounded-full border-transparent text-[10px] font-semibold uppercase",
                      ROLE_STYLES[user.role as Role] ?? ROLE_STYLES.customer,
                    )}
                  >
                    {user.role}
                  </Badge>
                  {user.blocked && (
                    <Badge variant="outline" className="rounded-full text-[10px] text-destructive uppercase">
                      Suspended
                    </Badge>
                  )}
                  {user.referralCode && (
                    <Badge variant="outline" className="rounded-full text-[10px] uppercase">
                      {user.referralCode}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  {user.email}
                  {user.phone ? ` · ${user.phone}` : ""}
                  {user.division ? ` · ${user.division}` : ""} · joined{" "}
                  {formatDate(user.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Select
                  value={user.role}
                  onValueChange={(value) => void onRoleChange(user._id, value as Role)}
                >
                  <SelectTrigger className="h-10 w-36 rounded-xl" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role} className="capitalize">
                        <UserCog className="size-3.5" /> {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Switch
                    checked={!user.blocked}
                    onCheckedChange={(checked) => void onToggleBlocked(user._id, !checked)}
                    aria-label="Active account"
                  />
                  Active
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="glass flex items-start gap-3 rounded-3xl p-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-blush text-primary">
          <ShieldCheck className="size-4" strokeWidth={1.8} />
        </span>
        <div>
          <p className="text-sm font-medium">Role based access control</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Admins control everything. Managers can manage products and orders but cannot
            change roles, settings or legal pages. Resellers get a referral code and earn
            commission on delivered orders. Customers can only ever see their own data.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 cursor-pointer rounded-full text-xs"
            onClick={() => toast.info("Every admin mutation is re-checked on the server")}
          >
            How access is enforced
          </Button>
        </div>
      </div>
    </div>
  );
}
