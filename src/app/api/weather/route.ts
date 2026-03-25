import { NextResponse } from "next/server";

// Free weather API (no key needed) - uses ip-based location
export async function GET() {
  try {
    const res = await fetch(
      "https://wttr.in/?format=j1",
      { next: { revalidate: 1800 } } // cache 30min
    );
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
      temp: "?",
      feelsLike: "?",
      desc: "Unable to fetch",
      humidity: "?",
      windSpeed: "?",
      city: "Unknown",
      country: "",
      weatherCode: "113",
    });
  }
}
