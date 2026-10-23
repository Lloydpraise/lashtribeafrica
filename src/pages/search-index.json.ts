// /search-index.json: the product list behind the header search suggestions.
// It used to be written into EVERY page (name, price, photo and description of every product), which
// gets heavy with hundreds of products. Now it is one file, built once, that the browser downloads the
// first time someone opens the search box and then caches.
import type { APIRoute } from "astro";
import { getEcommerceProducts, formatKsh } from "../data/ecommerce-products.js";

export const GET: APIRoute = async () => {
  const products = (await getEcommerceProducts()) as any[];
  const list = products.map((p) => {
    const optionWords = (p.options || []).flatMap((o: any) => [o.name, ...o.values.map((v: any) => v.value)]).slice(0, 60);
    return {
      slug: p.slug,
      name: p.name,
      price: `${p.priceVaries ? "From " : ""}${formatKsh(p.effectiveFromPrice ?? p.effectivePrice ?? p.nowPrice)}`,
      image: p.images?.[0]?.url || "",
      searchText: [p.name, p.slug, p.category?.parent?.name, p.category?.name, (p.description || "").slice(0, 120), ...optionWords]
        .filter(Boolean)
        .join(" "),
    };
  });
  return new Response(JSON.stringify(list), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
};
