import { NextRequest, NextResponse } from "next/server";

// GET /api/weather?lat=40.7&lon=-74.0
export async function GET(request: NextRequest) {
  try {
    const lat = request.nextUrl.searchParams.get("lat");
    const lon = request.nextUrl.searchParams.get("lon");

    // Use coordinates if provided, otherwise fall back to IP
    const location = lat && lon ? `${lat},${lon}` : "";
    const url = `https://wttr.in/${location}?format=j1`;

    const res = await fetch(url, { next: { revalidate: 1800 } });
    const data = await res.json();

    const current = data.current_condition?.[0];
    const area = data.nearest_area?.[0];

    return NextResponse.json({
      temp: current?.temp_C || "?",
      feelsLike: current?.FeelsLikeC || "?",
      desc: current?.weatherDesc?.[0]?.value || "Unknown",
      humidity: current?.humidity || "?",
      windSpeed: current?.windspeedKmph || "?",
      city: area?.areaName?.[0]?.value || "Unknown",
      country: area?.country?.[0]?.value || "",
      weatherCode: current?.weatherCode || "113",
    });
  } catch {
    return NextResponse.json({
      temp: "?", feelsLike: "?", desc: "Unable to fetch",
      humidity: "?", windSpeed: "?", city: "Unknown", country: "", weatherCode: "113",
    });
  }
}
