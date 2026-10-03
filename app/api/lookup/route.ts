import { NextResponse } from "next/server";
import { loadLookup } from "@/lib/gametora";

export async function GET() {
  try {
    return NextResponse.json(await loadLookup());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
