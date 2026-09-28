import { backendFetch } from "@/lib/api-client";

// Reads must not queue behind deck mutations or obsolete search Server Actions.
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return Response.json({ total_cards: 0, has_more: false, data: [] });
  }
  try {
    const result = await backendFetch(
      `/api/scryfall/search?q=${encodeURIComponent(query)}&page=1&prefer_local=true`,
      { signal: request.signal },
    );
    return Response.json(result);
  } catch {
    return Response.json({ error: "No se pudo buscar la carta" }, { status: 502 });
  }
}
