import { SmartImage } from "@/components/SmartImage";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { api } from "@/services/firebase/api";
import { useShop } from "@/context/app-context";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { useQuery } from "@/services/firebase/hooks";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  Search,
  ShoppingBag,
  Sparkles,
  Sun,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

const NAV_LINKS = [
  { labelKey: "nav.home", to: "/" },
  { labelKey: "nav.shop", to: "/shop" },
  { labelKey: "nav.newIn", to: "/shop?sort=newest" },
  { labelKey: "nav.sale", to: "/shop?flash=1" },
] as const;

export function Header() {
  const {
    t,
    locale,
    setLocale,
    currency,
    setCurrency,
    theme,
    toggleTheme,
    announcement,
    storeName,
    logoUrl,
  } = useShop();
  const { count: bagCount } = useCart();
  const { count: wishCount } = useWishlist();
  const { isAuthenticated, signOut } = useAuth();
  const profile = useQuery(api.profile.get);
  const categories = useQuery(api.catalog.categories);
  const setCartOpen = useUiStore((state) => state.setCartOpen);
  const navigate = useNavigate();

  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(term), 220);
    return () => window.clearTimeout(timer);
  }, [term]);

  const suggestions = useQuery(api.catalog.suggestions, { term: debounced });
  const isStaff = profile?.role === "admin" || profile?.role === "manager";

  const submitSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    setSearchOpen(false);
    setMenuOpen(false);
    navigate(`/shop?q=${encodeURIComponent(term.trim())}`);
    setTerm("");
  };

  return (
    <header className="sticky top-0 z-50">
      {/* Announcement strip */}
      <div className="glass-tint hidden border-b border-border/40 py-2 text-center text-[11px] font-medium tracking-wide text-foreground/75 md:block">
        <span className="inline-flex items-center gap-2">
          <Sparkles className="size-3 text-primary" strokeWidth={1.8} />
          {announcement}
        </span>
      </div>

      <div
        className={cn(
          "relative transition-all duration-500",
          scrolled
            ? "glass-strong shadow-[0_18px_50px_-38px_rgba(43,23,34,0.6)]"
            : "glass",
        )}
        onMouseLeave={() => setMegaOpen(false)}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:h-18 lg:px-8">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Menu"
                className="cursor-pointer lg:hidden"
              >
                <Menu className="size-5" strokeWidth={1.6} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="glass-strong w-[84%] sm:max-w-sm">
              <SheetHeader>
                <SheetTitle className="font-display text-lg">
                  {storeName}
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 px-4">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    {t(link.labelKey)}
                  </Link>
                ))}
                <p className="mt-4 px-3 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                  {t("section.categories")}
                </p>
                {(categories ?? []).map((category) => (
                  <Link
                    key={category._id}
                    to={`/shop?category=${category.slug}`}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent"
                  >
                    {locale === "bn" && category.nameBn ? category.nameBn : category.name}
                  </Link>
                ))}
              </div>

              {/* Currency, language and theme stay reachable on small screens. */}
              <div className="mt-5 border-t border-border/50 px-3 pt-5">
                <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                  {t("common.currency")} · {t("common.language")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["BDT", "USD"] as const).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setCurrency(code)}
                      className={cn(
                        "cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                        currency === code
                          ? "bg-primary text-primary-foreground"
                          : "glass-soft hover:bg-accent",
                      )}
                    >
                      {code}
                    </button>
                  ))}
                  {(["en", "bn"] as const).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setLocale(code)}
                      className={cn(
                        "cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                        locale === code
                          ? "bg-primary text-primary-foreground"
                          : "glass-soft hover:bg-accent",
                      )}
                    >
                      {code === "en" ? "English" : "বাংলা"}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="glass-soft inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
                  >
                    {theme === "dark" ? (
                      <Sun className="size-3.5" strokeWidth={1.8} />
                    ) : (
                      <Moon className="size-3.5" strokeWidth={1.8} />
                    )}
                    {t("common.theme")}
                  </button>
                </div>

                {!isAuthenticated && (
                  <Button
                    asChild
                    onClick={() => setMenuOpen(false)}
                    className="mt-4 w-full cursor-pointer rounded-full"
                  >
                    <Link to="/auth">{t("nav.signIn")}</Link>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoUrl} alt="" className="size-9 rounded-xl object-cover" />
            <span className="hidden flex-col leading-none sm:flex">
              <span className="font-display text-[15px] font-semibold tracking-tight">
                {storeName}
              </span>
              <span className="text-[9px] font-medium tracking-[0.34em] text-muted-foreground">
                STUDIO
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
              >
                {t(link.labelKey)}
              </Link>
            ))}
            <button
              type="button"
              onMouseEnter={() => setMegaOpen(true)}
              onClick={() => setMegaOpen((open) => !open)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
            >
              {t("nav.collections")}
              <ChevronDown
                className={cn("size-3.5 transition-transform", megaOpen && "rotate-180")}
                strokeWidth={2}
              />
            </button>
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            {/* Animated search */}
            <form
              onSubmit={submitSearch}
              className="relative hidden lg:block"
              onFocus={() => setSearchOpen(true)}
              onBlur={() => window.setTimeout(() => setSearchOpen(false), 160)}
            >
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} />
              <Input
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder={t("search.placeholder")}
                className={cn(
                  "h-10 rounded-full border-transparent bg-card/70 pl-9 transition-all duration-500 focus-visible:bg-card",
                  searchOpen ? "w-80" : "w-52",
                )}
              />
              <AnimatePresence>
                {searchOpen && debounced.trim().length >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="glass-strong absolute top-12 right-0 w-96 overflow-hidden rounded-2xl p-2"
                  >
                    {(suggestions ?? []).length === 0 ? (
                      <p className="px-3 py-4 text-sm text-muted-foreground">
                        {t("search.empty")}
                      </p>
                    ) : (
                      (suggestions ?? []).map((item) => (
                        <Link
                          key={item.id}
                          to={`/product/${item.slug}`}
                          onClick={() => setTerm("")}
                          className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-accent"
                        >
                          <SmartImage
                            src={item.image}
                            alt={item.name}
                            width={120}
                            className="size-11 shrink-0 rounded-lg"
                          />
                          <span className="line-clamp-1 text-sm font-medium">
                            {item.name}
                          </span>
                        </Link>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            <Button
              variant="ghost"
              size="icon"
              aria-label={t("common.search")}
              onClick={() => setSearchOpen((open) => !open)}
              className="cursor-pointer lg:hidden"
            >
              <Search className="size-5" strokeWidth={1.6} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("common.currency")}
                  className="hidden cursor-pointer sm:inline-flex"
                >
                  <span className="text-xs font-semibold">{currency}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t("common.currency")}</DropdownMenuLabel>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setCurrency("BDT")}
                >
                  ৳ BDT · Taka
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setCurrency("USD")}
                >
                  $ USD · Dollar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("common.language")}
                  className="hidden cursor-pointer sm:inline-flex"
                >
                  <span className="text-xs font-semibold uppercase">{locale}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t("common.language")}</DropdownMenuLabel>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setLocale("en")}
                >
                  English
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setLocale("bn")}
                >
                  বাংলা
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              aria-label={t("common.theme")}
              onClick={toggleTheme}
              className="cursor-pointer"
            >
              {theme === "dark" ? (
                <Sun className="size-5" strokeWidth={1.6} />
              ) : (
                <Moon className="size-5" strokeWidth={1.6} />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              asChild
              aria-label={t("nav.wishlist")}
              className="relative hidden cursor-pointer sm:inline-flex"
            >
              <Link to="/wishlist">
                <Heart className="size-5" strokeWidth={1.6} />
                {wishCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-brand-champagne text-[9px] font-bold text-brand-plum">
                    {wishCount}
                  </span>
                )}
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("nav.account")}
                  className="cursor-pointer"
                >
                  <User className="size-5" strokeWidth={1.6} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">
                  {isAuthenticated
                    ? (profile?.name || profile?.email || t("nav.account"))
                    : t("nav.account")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAuthenticated ? (
                  <>
                    <DropdownMenuItem className="cursor-pointer" asChild>
                      <Link to="/account">
                        <User className="size-4" /> {t("nav.account")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" asChild>
                      <Link to="/orders">
                        <Package className="size-4" /> {t("nav.orders")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" asChild>
                      <Link to="/wishlist">
                        <Heart className="size-4" /> {t("nav.wishlist")}
                      </Link>
                    </DropdownMenuItem>
                    {isStaff && (
                      <DropdownMenuItem className="cursor-pointer" asChild>
                        <Link to="/admin">
                          <LayoutDashboard className="size-4" /> {t("nav.admin")}
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      className="cursor-pointer"
                      onClick={() => {
                        void signOut().then(() => navigate("/"));
                      }}
                    >
                      <LogOut className="size-4" /> {t("nav.signOut")}
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem className="cursor-pointer" asChild>
                    <Link to="/auth">
                      <User className="size-4" /> {t("nav.signIn")}
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              aria-label={t("bag.title")}
              onClick={() => setCartOpen(true)}
              className="relative cursor-pointer"
            >
              <ShoppingBag className="size-5" strokeWidth={1.6} />
              {bagCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                  {bagCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Mega menu */}
        <AnimatePresence>
          {megaOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 top-full hidden border-t border-border/40 px-4 pb-6 before:absolute before:inset-x-0 before:top-0 before:h-3 before:bg-popover lg:block"
              onMouseEnter={() => setMegaOpen(true)}
            >
              <div className="bg-popover mx-auto mt-3 grid w-full max-w-7xl grid-cols-[1.4fr_1fr] gap-4 rounded-3xl border border-border/60 p-4 shadow-2xl shadow-black/20">
                <div className="grid grid-cols-2 gap-2">
                  {(categories ?? []).map((category) => (
                    <Link
                      key={category._id}
                      to={`/shop?category=${category.slug}`}
                      onClick={() => setMegaOpen(false)}
                      className="group flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-accent"
                    >
                      <SmartImage
                        src={category.image}
                        alt={category.name}
                        width={160}
                        className="size-12 shrink-0 rounded-xl"
                      />
                      <span>
                        <span className="block text-sm font-medium">
                          {locale === "bn" && category.nameBn
                            ? category.nameBn
                            : category.name}
                        </span>
                        <span className="line-clamp-1 text-[11px] text-muted-foreground">
                          {category.tagline}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
                <div className="bg-muted/60 relative overflow-hidden rounded-2xl border border-border/40 p-4">
                  <SmartImage
                    src={(categories ?? [])[0]?.image}
                    alt="Featured collection"
                    width={600}
                    className="absolute inset-0 h-full w-full opacity-35"
                  />
                  <div className="relative flex h-full flex-col justify-end gap-2">
                    <span className="text-[10px] font-semibold tracking-[0.22em] text-primary uppercase">
                      {t("section.featured")}
                    </span>
                    <p className="font-display text-lg leading-snug font-semibold">
                      {t("section.featuredHint")}
                    </p>
                    <Button
                      size="sm"
                      className="mt-1 w-fit cursor-pointer rounded-full"
                      onClick={() => {
                        setMegaOpen(false);
                        navigate("/shop");
                      }}
                    >
                      {t("cta.viewAll")}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass-strong border-b border-border/40 px-4 py-3 lg:hidden"
          >
            <form onSubmit={submitSearch} className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder={t("search.placeholder")}
                className="h-11 rounded-full border-transparent bg-card/80 pr-10 pl-9"
              />
              <button
                type="button"
                aria-label={t("common.clear")}
                onClick={() => {
                  setTerm("");
                  setSearchOpen(false);
                }}
                className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer"
              >
                <X className="size-4 text-muted-foreground" />
              </button>
            </form>
            {debounced.trim().length >= 2 && (
              <div className="mt-2 space-y-1">
                {(suggestions ?? []).length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">
                    {t("search.empty")}
                  </p>
                ) : (
                  (suggestions ?? []).map((item) => (
                    <Link
                      key={item.id}
                      to={`/product/${item.slug}`}
                      onClick={() => {
                        setTerm("");
                        setSearchOpen(false);
                      }}
                      className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-accent"
                    >
                      <SmartImage
                        src={item.image}
                        alt={item.name}
                        width={120}
                        className="size-10 shrink-0 rounded-lg"
                      />
                      <span className="line-clamp-1 text-sm font-medium">{item.name}</span>
                    </Link>
                  ))
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
