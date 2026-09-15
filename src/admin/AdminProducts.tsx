import { Seo } from "@/components/Seo";
import { SmartImage } from "@/components/SmartImage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/services/firebase/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useShop } from "@/context/app-context";
import { cn } from "@/lib/utils";
import { uploadProductImage } from "@/services/firebase/products";
import { useMutation, useQuery } from "@/services/firebase/hooks";
import {
  ImagePlus,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

type ProductForm = {
  name: string;
  nameBn: string;
  categorySlug: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  sizes: string;
  colors: string;
  tags: string;
  description: string;
  descriptionBn: string;
  images: string[];
  isActive: boolean;
  isFeatured: boolean;
  flashSalePrice: string;
  flashSaleHours: string;
  resellerCommission: string;
};

const EMPTY_FORM: ProductForm = {
  name: "",
  nameBn: "",
  categorySlug: "",
  price: "",
  compareAtPrice: "",
  stock: "10",
  sizes: "S, M, L, XL",
  colors: "Black, Ivory",
  tags: "",
  description: "",
  descriptionBn: "",
  images: [],
  isActive: true,
  isFeatured: false,
  flashSalePrice: "",
  flashSaleHours: "",
  resellerCommission: "",
};

function toList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function AdminProducts() {
  const { money } = useShop();
  const products = useQuery(api.catalog.staffList, {});
  const categories = useQuery(api.catalog.categories);
  const createProduct = useMutation(api.catalog.create);
  const updateProduct = useMutation(api.catalog.update);
  const removeProduct = useMutation(api.catalog.remove);
  const toggleActive = useMutation(api.catalog.toggleActive);
  const setStock = useMutation(api.catalog.setStock);
  const createCategory = useMutation(api.catalog.createCategory);
  const updateCategory = useMutation(api.catalog.updateCategory);
  const removeCategory = useMutation(api.catalog.removeCategory);

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"products"> | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [imageInput, setImageInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: "", nameBn: "", tagline: "", image: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = (products ?? []).filter((product) =>
    search.trim().length === 0
      ? true
      : `${product.name} ${product.categorySlug} ${product.sku ?? ""}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, categorySlug: (categories ?? [])[0]?.slug ?? "" });
    setOpen(true);
  };

  const openEdit = (product: Doc<"products">) => {
    setEditing(product);
    setForm({
      name: product.name,
      nameBn: product.nameBn ?? "",
      categorySlug: product.categorySlug,
      price: String(product.price),
      compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : "",
      stock: String(product.stock),
      sizes: product.sizes.join(", "),
      colors: product.colors.join(", "),
      tags: product.tags.join(", "),
      description: product.description,
      descriptionBn: product.descriptionBn ?? "",
      images: product.images,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      flashSalePrice: product.flashSalePrice ? String(product.flashSalePrice) : "",
      flashSaleHours: "",
      resellerCommission: product.resellerCommission ? String(product.resellerCommission) : "",
    });
    setOpen(true);
  };

  const addImageUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setForm((current) => ({ ...current, images: [...current.images, trimmed] }));
    setImageInput("");
  };

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      setForm((current) => ({ ...current, images: [...current.images, url] }));
      toast.success("Image uploaded to Firebase Storage");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const flashHours = Number(form.flashSaleHours);
    const payload = {
      name: form.name,
      nameBn: form.nameBn || undefined,
      description: form.description,
      descriptionBn: form.descriptionBn || undefined,
      categorySlug: form.categorySlug,
      price: Number(form.price),
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
      images: form.images,
      sizes: toList(form.sizes),
      colors: toList(form.colors),
      tags: toList(form.tags),
      stock: Number(form.stock),
      sku: editing?.sku,
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      flashSalePrice: form.flashSalePrice ? Number(form.flashSalePrice) : undefined,
      flashSaleEndsAt:
        form.flashSalePrice && flashHours > 0
          ? Date.now() + flashHours * 60 * 60 * 1000
          : editing?.flashSaleEndsAt,
      resellerCommission: form.resellerCommission
        ? Number(form.resellerCommission)
        : undefined,
    };

    try {
      if (editing) {
        await updateProduct({ id: editing._id, ...payload });
        toast.success("Product updated");
      } else {
        await createProduct(payload);
        toast.success("Product published");
      }
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save product");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: Id<"products">) => {
    try {
      await removeProduct({ id });
      toast.success("Product removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove product");
    }
  };

  const toggleCategory = async (category: Doc<"categories">) => {
    try {
      await updateCategory({
        id: category._id,
        name: category.name,
        nameBn: category.nameBn,
        tagline: category.tagline,
        image: category.image,
        order: category.order,
        isActive: !category.isActive,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update category");
    }
  };

  const onDeleteCategory = async (id: Id<"categories">) => {
    try {
      await removeCategory({ id });
      toast.success("Category removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove category");
    }
  };

  const onAddCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await createCategory({
        name: categoryForm.name,
        nameBn: categoryForm.nameBn || undefined,
        tagline: categoryForm.tagline || undefined,
        image: categoryForm.image || undefined,
      });
      toast.success("Category added");
      setCategoryOpen(false);
      setCategoryForm({ name: "", nameBn: "", tagline: "", image: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add category");
    }
  };

  return (
    <div className="space-y-5">
      <Seo title="Products" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Products
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {filtered.length} of {products?.length ?? 0} pieces · inventory, pricing and
            flash sales
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCategoryOpen(true)}
            className="cursor-pointer rounded-full"
          >
            <Layers className="size-4" strokeWidth={1.8} /> Category
          </Button>
          <Button onClick={openCreate} className="cursor-pointer rounded-full">
            <Plus className="size-4" strokeWidth={2} /> New product
          </Button>
        </div>
      </div>

      <div className="glass flex items-center gap-2 rounded-2xl p-2.5">
        <Search className="ml-2 size-4 text-muted-foreground" strokeWidth={1.8} />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, category or SKU"
          className="h-10 border-transparent bg-transparent shadow-none focus-visible:bg-card/60"
        />
      </div>

      {products === undefined ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass grid place-items-center gap-3 rounded-3xl py-20 text-center">
          <p className="font-display text-lg font-semibold">No products found</p>
          <Button onClick={openCreate} className="cursor-pointer rounded-full">
            <Plus className="size-4" /> Add the first piece
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((product) => (
            <div
              key={product._id}
              className="glass flex flex-col gap-3 rounded-3xl p-3 sm:flex-row sm:items-center"
            >
              <SmartImage
                src={product.images[0]}
                alt={product.name}
                width={160}
                className="h-32 w-full shrink-0 rounded-2xl sm:size-16"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="line-clamp-1 font-medium">{product.name}</p>
                  {product.isFeatured && (
                    <Badge className="rounded-full bg-brand-champagne/25 text-[9px] font-semibold tracking-wide text-brand-plum uppercase">
                      Featured
                    </Badge>
                  )}
                  {!product.isActive && (
                    <Badge variant="outline" className="rounded-full text-[9px] uppercase">
                      Hidden
                    </Badge>
                  )}
                  {product.flashSalePrice && product.flashSaleEndsAt && (
                      <Badge className="rounded-full bg-primary text-[9px] font-semibold text-primary-foreground uppercase">
                        Flash {money(product.flashSalePrice)}
                      </Badge>
                    )}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground capitalize">
                  {product.categorySlug.replace(/-/g, " ")} · {product.sku ?? "no SKU"} ·{" "}
                  {product.soldCount} sold
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
                  <span className="font-semibold">{money(product.price)}</span>
                  <span className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      defaultValue={product.stock}
                      aria-label={`Stock for ${product.name}`}
                      onBlur={(event) => {
                        const next = Math.round(Number(event.target.value));
                        if (!Number.isFinite(next) || next < 0 || next === product.stock) {
                          return;
                        }
                        void setStock({ id: product._id, stock: next }).catch((error) =>
                          toast.error(
                            error instanceof Error ? error.message : "Could not set stock",
                          ),
                        );
                      }}
                      className="h-8 w-16 rounded-lg text-xs"
                    />
                    <span
                      className={cn(
                        "font-medium",
                        product.stock === 0
                          ? "text-destructive"
                          : product.stock <= 3
                            ? "text-amber-600"
                            : "text-muted-foreground",
                      )}
                    >
                      {product.stock === 0 ? "sold out" : "in stock"}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    Sizes: {product.sizes.join(", ") || "—"}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <Switch
                  checked={product.isActive}
                  onCheckedChange={() => void toggleActive({ id: product._id })}
                  aria-label="Toggle visibility"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Edit"
                  onClick={() => openEdit(product)}
                  className="cursor-pointer"
                >
                  <Pencil className="size-4" strokeWidth={1.8} />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${product.name}`}
                      className="cursor-pointer text-destructive"
                    >
                      <Trash2 className="size-4" strokeWidth={1.8} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="glass-strong">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-display">
                        Delete “{product.name}”?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        It is removed from the store, wishlists, bags and reviews. Past
                        orders keep their record. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="cursor-pointer rounded-full">
                        Keep it
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void onDelete(product._id)}
                        className="cursor-pointer rounded-full bg-destructive text-white hover:bg-destructive/90"
                      >
                        Delete product
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* product dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-strong max-h-[88vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? "Edit product" : "New product"}
            </DialogTitle>
            <DialogDescription>
              Prices are stored in BDT. Flash sale prices override the regular price while
              the sale is live.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-name">Name</Label>
                <Input
                  id="p-name"
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-namebn">Name (Bangla)</Label>
                <Input
                  id="p-namebn"
                  value={form.nameBn}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, nameBn: event.target.value }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-category">Category</Label>
                <select
                  id="p-category"
                  required
                  value={form.categorySlug}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, categorySlug: event.target.value }))
                  }
                  className="h-11 w-full rounded-xl border border-border/60 bg-card/70 px-3 text-sm"
                >
                  <option value="">Select category</option>
                  {(categories ?? []).map((category) => (
                    <option key={category._id} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-price">Price (৳)</Label>
                <Input
                  id="p-price"
                  required
                  type="number"
                  min={1}
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, price: event.target.value }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-compare">Compare at (৳)</Label>
                <Input
                  id="p-compare"
                  type="number"
                  min={0}
                  value={form.compareAtPrice}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      compareAtPrice: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-stock">Stock</Label>
                <Input
                  id="p-stock"
                  required
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, stock: event.target.value }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-sizes">Sizes (comma separated)</Label>
                <Input
                  id="p-sizes"
                  value={form.sizes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sizes: event.target.value }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-colors">Colours (comma separated)</Label>
                <Input
                  id="p-colors"
                  value={form.colors}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, colors: event.target.value }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-tags">Tags (comma separated)</Label>
                <Input
                  id="p-tags"
                  value={form.tags}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, tags: event.target.value }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-commission">Reseller commission (৳)</Label>
                <Input
                  id="p-commission"
                  type="number"
                  min={0}
                  value={form.resellerCommission}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      resellerCommission: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-flash">Flash sale price (৳)</Label>
                <Input
                  id="p-flash"
                  type="number"
                  min={0}
                  value={form.flashSalePrice}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      flashSalePrice: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-flashhours">Flash sale duration (hours)</Label>
                <Input
                  id="p-flashhours"
                  type="number"
                  min={0}
                  value={form.flashSaleHours}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      flashSaleHours: event.target.value,
                    }))
                  }
                  placeholder="e.g. 48"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="p-desc">Description</Label>
                <Textarea
                  id="p-desc"
                  required
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                  className="min-h-24 rounded-xl"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="p-descbn">Description (Bangla)</Label>
                <Textarea
                  id="p-descbn"
                  value={form.descriptionBn}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      descriptionBn: event.target.value,
                    }))
                  }
                  className="min-h-20 rounded-xl"
                />
              </div>
            </div>

            {/* images */}
            <div className="space-y-2.5">
              <Label>Images</Label>
              <div className="flex flex-wrap gap-2">
                {form.images.map((image, index) => (
                  <span key={`${image}-${index}`} className="relative">
                    <SmartImage
                      src={image}
                      alt=""
                      width={200}
                      className="size-20 rounded-2xl"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          images: current.images.filter((_, i) => i !== index),
                        }))
                      }
                      className="glass-strong absolute -top-1.5 -right-1.5 grid size-6 cursor-pointer place-items-center rounded-full"
                      aria-label="Remove image"
                    >
                      <X className="size-3" strokeWidth={2} />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="glass-soft grid size-20 cursor-pointer place-items-center rounded-2xl text-muted-foreground transition-colors hover:text-primary"
                >
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImagePlus className="size-5" strokeWidth={1.7} />
                  )}
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onUpload(file);
                  event.target.value = "";
                }}
              />
              <div className="flex gap-2">
                <Input
                  value={imageInput}
                  onChange={(event) => setImageInput(event.target.value)}
                  placeholder="Paste an image URL"
                  className="h-10 rounded-xl"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addImageUrl(imageInput)}
                  className="h-10 cursor-pointer rounded-xl"
                >
                  Add
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                "Uploads are stored securely in Firebase Storage, or you can paste an image URL."
              </p>
            </div>

            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, isActive: checked }))
                  }
                />
                Visible in store
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.isFeatured}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, isFeatured: checked }))
                  }
                />
                Featured on homepage
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-full"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy} className="cursor-pointer rounded-full">
                {busy && <Loader2 className="size-4 animate-spin" />}
                {editing ? "Save changes" : "Publish product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* category dialog */}
      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent className="glass-strong max-h-[88vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Category management</DialogTitle>
            <DialogDescription>
              Categories power the header mega menu, the homepage grid and the shop
              filters. Hide one to remove it from the storefront without touching its
              products.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {(categories ?? []).map((category) => (
              <div
                key={category._id}
                className="glass-soft flex items-center gap-3 rounded-2xl p-2.5"
              >
                <SmartImage
                  src={category.image}
                  alt={category.name}
                  width={120}
                  className="size-11 shrink-0 rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{category.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    /{category.slug}
                    {category.tagline ? ` · ${category.tagline}` : ""}
                  </p>
                </div>
                <Switch
                  checked={category.isActive}
                  onCheckedChange={() => void toggleCategory(category)}
                  aria-label={`Show ${category.name}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${category.name}`}
                  onClick={() => void onDeleteCategory(category._id)}
                  className="cursor-pointer text-destructive"
                >
                  <Trash2 className="size-4" strokeWidth={1.8} />
                </Button>
              </div>
            ))}
            {(categories ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">
                No categories yet — add the first one below.
              </p>
            )}
          </div>

          <form
            onSubmit={onAddCategory}
            className="grid gap-3 border-t border-border/50 pt-4 sm:grid-cols-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Name</Label>
              <Input
                id="c-name"
                required
                value={categoryForm.name}
                onChange={(event) =>
                  setCategoryForm((current) => ({ ...current, name: event.target.value }))
                }
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-namebn">Name (Bangla)</Label>
              <Input
                id="c-namebn"
                value={categoryForm.nameBn}
                onChange={(event) =>
                  setCategoryForm((current) => ({ ...current, nameBn: event.target.value }))
                }
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-tagline">Tagline</Label>
              <Input
                id="c-tagline"
                value={categoryForm.tagline}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    tagline: event.target.value,
                  }))
                }
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-image">Cover image URL</Label>
              <Input
                id="c-image"
                value={categoryForm.image}
                onChange={(event) =>
                  setCategoryForm((current) => ({ ...current, image: event.target.value }))
                }
                className="h-11 rounded-xl"
              />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="submit" className="cursor-pointer rounded-full">
                <Plus className="size-4" strokeWidth={2} /> Add category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
