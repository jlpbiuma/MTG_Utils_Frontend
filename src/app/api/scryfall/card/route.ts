import { backendFetch } from "@/lib/api-client";

// A catalog read must not wait behind offer mutations in the Server Action queue.
export async function GET(request: Request) {
  const input = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const key of ["id", "name", "set", "collector_number"]) {
    const value = input.get(key)?.trim();
    if (value) query.set(key, value);
  }
  if (!query.has("id") && !query.has("name")) {
    return Response.json({ error: "Indica una carta." }, { status: 400 });
  }
  try {
    const card = await backendFetch(`/api/scryfall/card?${query}`, { signal: request.signal, cache: "no-store" });
    return Response.json(card, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "No se pudo cargar el detalle de la carta." }, { status: 502 });
  }
}
