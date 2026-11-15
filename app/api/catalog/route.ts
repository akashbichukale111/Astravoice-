import { respond } from "@/lib/http";
import { addCatalogItem, getCatalog } from "@/lib/catalog";

export async function GET() {
  return respond(async () => ({ items: await getCatalog() }));
}

export async function POST(req: Request) {
  return respond(async () => {
    const body = (await req.json().catch(() => null)) as {
      name?: string;
      brand?: string;
      unit?: string;
      price?: number;
      aliases?: string[];
    } | null;
    if (!body?.name || typeof body.price !== "number" || body.price <= 0) {
      throw new Error("Please provide a valid item name and price in ₹.");
    }
    const created = await addCatalogItem({
      name: body.name.trim(),
      brand: body.brand?.trim() || "Local Market",
      unit: body.unit?.trim() || "1 unit",
      price: body.price,
      aliases: Array.isArray(body.aliases) && body.aliases.length > 0 ? body.aliases : [body.name.toLowerCase()],
    });
    return { item: created, items: await getCatalog() };
  });
}
