import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Runtime Maps key (not proxied to Survey-Backend). */
export async function GET() {
  const googleMapsApiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    "";

  return NextResponse.json({ googleMapsApiKey });
}
