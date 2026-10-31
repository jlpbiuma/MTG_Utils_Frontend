import { NextResponse } from "next/server";
import { READS, type ReadName } from "@/lib/read-registry";

export const dynamic = "force-dynamic";

/** Runs one allow-listed read with JSON arguments; never a mutation. */
export async function POST(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!Object.prototype.hasOwnProperty.call(READS, name)) {
    return NextResponse.json({ error: "Lectura desconocida" }, { status: 404 });
  }
  let args: unknown[] = [];
  try {
    const body = await req.json();
    args = Array.isArray(body?.args) ? body.args : [];
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON no válido" }, { status: 400 });
  }
  try {
    const read = READS[name as ReadName] as (...values: unknown[]) => Promise<unknown>;
    const result = await read(...args);
    // `undefined` is not valid JSON; the client turns null back into it.
    return NextResponse.json({ result: result ?? null });
  } catch (error) {
    console.error(`Read ${name} failed:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 }
    );
  }
}
