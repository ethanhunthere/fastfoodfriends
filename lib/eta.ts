import { getItemById } from "./menu";
import { RESTAURANT } from "./restaurant";

export interface EtaResult {
  minMinutes: number;
  maxMinutes: number;
  label: string;
  rideMinutes: number;
  prepMinutes?: number;
  distanceKm?: number;
  mapsUrl: string;
  source: "google_routes" | "osrm" | "estimate" | "pickup";
}

export interface CookTimeEstimate {
  prepMinMinutes: number;
  prepMaxMinutes: number;
  foodCount: number;
}

export interface LocationInput {
  address?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Smart preparation time based on ordered items:
 * - 1-2 burgers/food items: ~5 min
 * - Up to 10 burgers/food items: ~10 min
 * - Drinks only: ~2-4 min
 */
export function estimateCookTime(
  items?: Array<{ itemId: string; quantity: number }>,
): CookTimeEstimate {
  if (!items || items.length === 0) {
    return { prepMinMinutes: 5, prepMaxMinutes: 8, foodCount: 1 };
  }

  let foodCount = 0;
  for (const line of items) {
    const item = getItemById(line.itemId);
    if (!item || item.category === "ushqime-kryesore") {
      foodCount += line.quantity;
    }
  }

  if (foodCount === 0) {
    return { prepMinMinutes: 2, prepMaxMinutes: 4, foodCount: 0 };
  }

  let prepMinMinutes: number;
  let prepMaxMinutes: number;

  if (foodCount <= 2) {
    prepMinMinutes = 5;
    prepMaxMinutes = 8;
  } else if (foodCount <= 4) {
    prepMinMinutes = 6;
    prepMaxMinutes = 9;
  } else if (foodCount <= 7) {
    prepMinMinutes = 8;
    prepMaxMinutes = 11;
  } else if (foodCount <= 10) {
    prepMinMinutes = 10;
    prepMaxMinutes = 14;
  } else {
    prepMinMinutes = Math.min(15, 10 + Math.floor((foodCount - 10) / 2));
    prepMaxMinutes = prepMinMinutes + 4;
  }

  return { prepMinMinutes, prepMaxMinutes, foodCount };
}

/**
 * Compute motorcycle route via Google Maps Routes API (travelMode: TWO_WHEELER).
 */
async function queryGoogleRoutes(
  origin: { latitude: number; longitude: number },
  destination: { latitude?: number; longitude?: number; address?: string },
  apiKey: string,
): Promise<{ durationSeconds: number; distanceMeters: number } | null> {
  const url = "https://routes.googleapis.com/directions/v2:computeRoutes";

  const destPayload =
    destination.latitude && destination.longitude
      ? {
          location: {
            latLng: {
              latitude: destination.latitude,
              longitude: destination.longitude,
            },
          },
        }
      : {
          address: `${destination.address || ""}, Pejë, Kosovë`,
        };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: origin.latitude,
              longitude: origin.longitude,
            },
          },
        },
        destination: destPayload,
        travelMode: "TWO_WHEELER",
        routingPreference: "TRAFFIC_AWARE",
      }),
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.routes || !data.routes[0]) return null;

    const route = data.routes[0];
    const durationSeconds = parseInt(
      (route.duration ?? "0s").replace("s", ""),
      10,
    );
    const distanceMeters = Number(route.distanceMeters ?? 0);

    return { durationSeconds, distanceMeters };
  } catch {
    return null;
  }
}

/**
 * Open Source Routing Machine (OSRM) driving/motorcycle fallback.
 */
async function queryOsrmRoutes(
  origin: { latitude: number; longitude: number },
  dest: { latitude: number; longitude: number },
): Promise<{ durationSeconds: number; distanceMeters: number } | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${dest.longitude},${dest.latitude}?overview=false`;
    const res = await fetch(url, {
      headers: { "User-Agent": "FastFoodFriends/1.0" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.routes?.[0]) {
      // Motorcycles in Pejë travel faster through traffic than average cars
      const durationSeconds = Math.round(data.routes[0].duration * 0.85);
      const distanceMeters = Math.round(data.routes[0].distance);
      return { durationSeconds, distanceMeters };
    }
  } catch {
    // fallback
  }
  return null;
}

/**
 * Geocode text address in Pejë using OpenStreetMap Nominatim.
 */
async function geocodePejeAddress(
  address: string,
): Promise<{ latitude: number; longitude: number } | null> {
  if (!address.trim()) return null;
  try {
    const cleanQuery = address
      .replace(/[\n\r]+/g, " ")
      .replace(/hyrja.*?(\s|$)/gi, " ")
      .replace(/kati.*?(\s|$)/gi, " ")
      .trim();

    const q = encodeURIComponent(`${cleanQuery}, Pejë, Kosovë`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      {
        headers: { "User-Agent": "FastFoodFriendsApp/1.0" },
        signal: AbortSignal.timeout(3000),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data[0] && data[0].lat && data[0].lon) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Haversine distance with urban street curvature multiplier for Pejë.
 */
function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1.3; // 1.3 urban street factor in Pejë
}

/**
 * Measure delivery time with motorcycle from Fast Food Friends location to customer location.
 * Combines dynamic kitchen preparation time (based on items cooked) + motorcycle travel time.
 */
export async function calculateDeliveryEta(
  mode: "delivery" | "pickup",
  location: LocationInput,
  items?: Array<{ itemId: string; quantity: number }>,
): Promise<EtaResult> {
  const originLat = RESTAURANT.geo.latitude;
  const originLng = RESTAURANT.geo.longitude;
  const { prepMinMinutes, prepMaxMinutes } = estimateCookTime(items);

  if (mode === "pickup") {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${originLat},${originLng}`;
    return {
      minMinutes: prepMinMinutes,
      maxMinutes: prepMaxMinutes,
      label: `${prepMinMinutes}–${prepMaxMinutes} min`,
      rideMinutes: 0,
      prepMinutes: prepMinMinutes,
      distanceKm: 0,
      mapsUrl,
      source: "pickup",
    };
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

  let rideMinutes = 5; // Typical motorcycle delivery ride across Pejë (fast, weaves through traffic)
  let distanceKm = 2.0;
  let source: EtaResult["source"] = "estimate";

  let destLat = location.latitude;
  let destLng = location.longitude;

  // 1. If Google Maps API Key is provided, use Google Routes API with motorcycle mode (TWO_WHEELER)
  if (apiKey) {
    const googleResult = await queryGoogleRoutes(
      { latitude: originLat, longitude: originLng },
      {
        latitude: destLat,
        longitude: destLng,
        address: location.address,
      },
      apiKey,
    );

    if (googleResult) {
      rideMinutes = Math.max(3, Math.round(googleResult.durationSeconds / 60));
      distanceKm = Number((googleResult.distanceMeters / 1000).toFixed(1));
      source = "google_routes";
    }
  }

  // 2. If not resolved via Google, try OSRM routing with coordinates
  if (source === "estimate") {
    if ((!destLat || !destLng) && location.address) {
      const geo = await geocodePejeAddress(location.address);
      if (geo) {
        destLat = geo.latitude;
        destLng = geo.longitude;
      }
    }

    if (destLat && destLng) {
      const osrmResult = await queryOsrmRoutes(
        { latitude: originLat, longitude: originLng },
        { latitude: destLat, longitude: destLng },
      );

      if (osrmResult) {
        rideMinutes = Math.max(3, Math.round(osrmResult.durationSeconds / 60));
        distanceKm = Number((osrmResult.distanceMeters / 1000).toFixed(1));
        source = "osrm";
      } else {
        const hKm = haversineDistanceKm(originLat, originLng, destLat, destLng);
        distanceKm = Number(hKm.toFixed(1));
        rideMinutes = Math.max(3, Math.round((distanceKm / 28) * 60));
        source = "estimate";
      }
    }
  }

  // Total delivery ETA = kitchen cooking duration + motorcycle ride
  const minMinutes = prepMinMinutes + rideMinutes;
  const maxMinutes = Math.max(minMinutes + 3, prepMaxMinutes + rideMinutes);
  const label = `${minMinutes}–${maxMinutes} min`;

  // Destination parameter for Google Maps navigation in motorcycle mode
  const destinationQuery =
    destLat && destLng
      ? `${destLat},${destLng}`
      : encodeURIComponent(`${location.address || "Pejë"}, Pejë`);

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destinationQuery}&travelmode=two_wheeler`;

  return {
    minMinutes,
    maxMinutes,
    label,
    rideMinutes,
    prepMinutes: prepMinMinutes,
    distanceKm,
    mapsUrl,
    source,
  };
}

