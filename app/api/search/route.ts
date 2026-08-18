import { NextRequest, NextResponse } from "next/server";
import { searchPlaces } from "@/lib/data/search";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const results = await searchPlaces(q);
  return NextResponse.json({ results });
}
