// Catalog = bundled Kirana defaults + items the seller added by voice or via the [+ Add/Edit Kirana Catalog] UI modal.
import { DEFAULT_CATALOG } from "../data/default-catalog";
import { callTool } from "./paytm-toolkit";
import type { CatalogItem, SpokenForms } from "./types";

const MARKER_VERSION = 2;
const TTL_MS = 15_000;

type ProductRow = { id: string; name: string; description?: string; create_time?: string };

export function oldestFirst(rows: ProductRow[]): ProductRow[] {
  return [...rows].sort((a, b) => String(a?.create_time ?? "").localeCompare(String(b?.create_time ?? "")) || String(a?.id ?? "").localeCompare(String(b?.id ?? "")));
}

let cache: { items: CatalogItem[]; at: number } | null = null;

export function encodeProductDescription(item: Pick<CatalogItem, "sku" | "price" | "aliases" | "brand" | "unit">): string {
  return JSON.stringify({ sd: MARKER_VERSION, sku: item.sku, price: item.price, aliases: item.aliases, brand: item.brand, unit: item.unit });
}

export function decodeProduct(row: ProductRow): CatalogItem | null {
  try {
    const meta = JSON.parse(row.description ?? "");
    if (meta?.sd !== MARKER_VERSION || typeof meta.sku !== "string" || typeof meta.price !== "number") return null;
    if (!Number.isFinite(meta.price) || meta.price <= 0 || meta.price > 50000) return null;
    return {
      sku: meta.sku,
      name: row.name,
      brand: meta.brand ?? "Custom Brand",
      unit: meta.unit ?? "1 unit",
      price: meta.price,
      aliases: Array.isArray(meta.aliases) ? meta.aliases : [],
      spoken: simpleSpoken(row.name),
      paypal_product_id: row.id,
    };
  } catch {
    return null;
  }
}

export function simpleSpoken(name: string): SpokenForms {
  const one = name.toLowerCase();
  const many = /(s|x|ch|sh)$/.test(one) ? one : `${one}`;
  return { one, many, short: name.charAt(0).toUpperCase() + name.slice(1) };
}

export function mergeCatalogs(defaults: CatalogItem[], extras: CatalogItem[]): CatalogItem[] {
  const bySku = new Map(defaults.map((d) => [d.sku, d]));
  for (const e of extras) {
    const base = bySku.get(e.sku);
    bySku.set(e.sku, base ? { ...base, ...e, category: base.category ?? e.category, spoken: base.spoken ?? e.spoken } : e);
  }
  return [...bySku.values()];
}

export async function getCatalog(): Promise<CatalogItem[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.items;
  try {
    const res = await callTool<{ products?: ProductRow[] }>("list_products", { page: 1, page_size: 100 });
    const extras = oldestFirst((res.products ?? []).filter(Boolean)).map(decodeProduct).filter((x): x is CatalogItem => x !== null);
    cache = { items: mergeCatalogs(DEFAULT_CATALOG, extras), at: Date.now() };
  } catch (e) {
    console.warn("[catalog] list_products fallback:", (e as Error).message);
    cache = { items: cache?.items ?? DEFAULT_CATALOG, at: Date.now() - TTL_MS + 3000 };
  }
  return cache.items;
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9ऀ-ॿ]+/g, "-").replace(/^-|-$/g, "") || `item-${Date.now()}`;

export async function addCatalogItem(input: { name: string; brand?: string; unit?: string; price: number; aliases: string[] }): Promise<CatalogItem> {
  const sku = slugify(input.name);
  const draft: CatalogItem = {
    sku,
    name: input.name,
    brand: input.brand ?? "Local Market",
    unit: input.unit ?? "1 unit",
    price: input.price,
    aliases: input.aliases.map((a) => a.toLowerCase()),
  };
  draft.spoken = simpleSpoken(input.name);
  const created = await callTool<{ id: string }>("create_product", {
    name: draft.name,
    type: "PHYSICAL",
    category: "FOOD_PRODUCTS",
    description: encodeProductDescription(draft),
  });
  const item = { ...draft, paypal_product_id: created.id };
  const current = cache?.items ?? DEFAULT_CATALOG;
  cache = { items: mergeCatalogs(current, [item]), at: Date.now() };
  return item;
}
