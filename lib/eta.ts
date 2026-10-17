import { formatTargetClock } from "./format";
import { getItemById } from "./menu";
import { RESTAURANT } from "./restaurant";

export interface EtaResult {
  minMinutes: number;
  maxMinutes: number;
  label: string;
  clockTarget: string;
  rideMinutes: number;
  prepMinutes: number;
  distanceKm: number;
  mapsUrl: string;
  source: "google_routes" | "osrm" | "estimate" | "pickup";
  destLatitude?: number;
  destLongitude?: number;
  cleanAddress?: string;
  matchedPlaceName?: string;
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
 * Open Source Routing Machine (OSRM) motorcycle route calculator.
 * 100% Free, Open-Source, No API key, No credit card.
 */
async function queryOsrmRoutes(
  origin: { latitude: number; longitude: number },
  dest: { latitude: number; longitude: number },
): Promise<{ durationSeconds: number; distanceMeters: number } | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${dest.longitude},${dest.latitude}?overview=false`;
    const res = await fetch(url, {
      headers: { "User-Agent": "FastFoodFriends-Peje/1.0" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.routes?.[0]) {
      // Motorcycles in Pejë travel faster through traffic than average cars (0.75 factor)
      const durationSeconds = Math.max(120, Math.round(data.routes[0].duration * 0.75));
      const distanceMeters = Math.round(data.routes[0].distance);
      return { durationSeconds, distanceMeters };
    }
  } catch {
    // fallback
  }
  return null;
}

/**
 * Strips building/apartment noise (hyrja, kati, banesa, etc.) and punctuation,
 * returning the clean street or neighborhood name in Pejë for routing and mapping.
 */
export function cleanPejeAddress(raw: string): string {
  if (!raw) return "";
  let text = raw
    .replace(/[\n\r\t]+/g, " ")
    .replace(/,\s*/g, " ")
    .trim();

  // Strip common building noise: "hyrja 2", "h. 2", "kati 3", "kat 3", "k 3", "banesa 14", "b 14", "nr 12", "ap 5"
  text = text.replace(
    /\b(hyrja|hyrje|h|kati|kat|k|banesa|banese|b|nr|numri|ap|apartament|apartamenti)\s*[:.]?\s*\d+[a-zA-Z]?\b/gi,
    " ",
  );

  // Strip standalone numbers like "15", "2B", "14/2"
  text = text.replace(/\b\d+([a-zA-Z]|\/\d+)?\b/g, " ");

  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();
  return text || raw.trim();
}

interface PejePlace {
  keywords: string[];
  lat: number;
  lng: number;
  name: string;
}

function normalizeAlbanian(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Curated offline dictionary of all prominent Pejë neighbourhoods, roads, and landmarks.
 * Instant 0ms lookup, 100% reliable, zero API rate limits or network failures.
 */
export const PEJE_LOCAL_PLACES: PejePlace[] = [
  { keywords: ["kapeshnic", "kapeshnice"], lat: 42.6564, lng: 20.2831, name: "Kapeshnicë" },
  { keywords: ["dardani", "dardania", "banesat e bardha"], lat: 42.6593, lng: 20.2885, name: "Dardania" },
  { keywords: ["karagac", "karagaq", "karagaci"], lat: 42.6561, lng: 20.2918, name: "Karagaç" },
  { keywords: ["zatra"], lat: 42.6469, lng: 20.2791, name: "Zatra" },
  { keywords: ["xhemajl kada", "xhemajlkada"], lat: 42.6682, lng: 20.2985, name: "Xhemajl Kada" },
  { keywords: ["fidanishte", "fidanishtja"], lat: 42.6678, lng: 20.3068, name: "Fidanishte" },
  { keywords: ["asllan qeshme", "asllan ceshme"], lat: 42.6659, lng: 20.2862, name: "Asllan Qeshme" },
  { keywords: ["vitomiric", "vitomirica", "vitomirice"], lat: 42.7009, lng: 20.3464, name: "Vitomiricë" },
  { keywords: ["bellopoj", "bellopoja", "bellopoje"], lat: 42.6385, lng: 20.2978, name: "Bellopojë" },
  { keywords: ["qendra", "sheshi", "korzo", "qender"], lat: 42.6595, lng: 20.2882, name: "Qendra" },
  { keywords: ["spital", "spitali"], lat: 42.6621, lng: 20.2732, name: "Spitali Rajonal i Pejës" },
  { keywords: ["peja city mall", "city mall"], lat: 42.6685, lng: 20.3150, name: "Peja City Mall" },
  { keywords: ["elkos", "etc"], lat: 42.6811, lng: 20.3194, name: "ETC Pejë" },
  { keywords: ["carshia", "carshi", "çarshia"], lat: 42.6606, lng: 20.2950, name: "Çarshia e Vjetër" },
  { keywords: ["rrokaqiell", "rrokaqielli"], lat: 42.6633, lng: 20.3007, name: "Lagjja Rrokaqielli" },
  { keywords: ["7 shtatori", "shtatori"], lat: 42.6620, lng: 20.3120, name: "7 Shtatori" },
  { keywords: ["fadil hoxha"], lat: 42.6612, lng: 20.2995, name: "Rruga Fadil Hoxha" },
  { keywords: ["william walker"], lat: 42.6651, lng: 20.3082, name: "Rruga William Walker" },
  { keywords: ["eliot engel"], lat: 42.6596, lng: 20.2926, name: "Rruga Eliot Engel" },
  { keywords: ["mbreteresha teute", "teuta"], lat: 42.6620, lng: 20.2956, name: "Rruga Mbretëresha Teutë" },
  { keywords: ["adem jashari"], lat: 42.6645, lng: 20.2994, name: "Rruga Adem Jashari" },
  { keywords: ["vellezerit gervalla", "gervalla"], lat: 42.6629, lng: 20.3016, name: "Rruga Vëllezërit Gërvalla" },
  { keywords: ["nene tereza"], lat: 42.6605, lng: 20.2830, name: "Rruga Nënë Tereza" },
  { keywords: ["tahir zemaj"], lat: 42.6450, lng: 20.2850, name: "Rruga Tahir Zemaj" },
  { keywords: ["haxhi zeka"], lat: 42.6630, lng: 20.2920, name: "Rruga Haxhi Zeka" },
  { keywords: ["bekim fehmiu"], lat: 42.6625, lng: 20.2940, name: "Rruga Bekim Fehmiu" },
  { keywords: ["leke dukagjini"], lat: 42.6640, lng: 20.2910, name: "Rruga Lekë Dukagjini" },
  { keywords: ["banesat e zeza"], lat: 42.6600, lng: 20.2890, name: "Banesat e Zeza" },
];

export function findPejeLocalPlace(address: string): PejePlace | null {
  const norm = normalizeAlbanian(address);
  for (const place of PEJE_LOCAL_PLACES) {
    for (const kw of place.keywords) {
      if (norm.includes(normalizeAlbanian(kw))) {
        return place;
      }
    }
  }
  return null;
}

/**
 * Geocode text address in Pejë:
 * 1. Fast local dictionary check for Pejë neighborhoods and roads.
 * 2. OpenStreetMap Nominatim with strict Pejë viewbox bounding (20.23,42.70,20.36,42.63).
 * 3. OpenStreetMap Photon (Komoot) with Pejë coordinate bias.
 * 100% Free & Open-Source, no API key, zero cost.
 */
export async function geocodePejeAddress(
  address: string,
): Promise<{ latitude: number; longitude: number; name?: string } | null> {
  if (!address.trim()) return null;

  // 1. Check local Pejë dictionary
  const localMatch = findPejeLocalPlace(address);
  if (localMatch) {
    return {
      latitude: localMatch.lat,
      longitude: localMatch.lng,
      name: localMatch.name,
    };
  }

  const cleanQuery = cleanPejeAddress(address);

  // 2. OpenStreetMap Nominatim with strict Pejë bounding box
  try {
    const q = encodeURIComponent(`${cleanQuery}, Pejë`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&viewbox=20.23,42.70,20.36,42.63&bounded=1&limit=1`,
      {
        headers: { "User-Agent": "FastFoodFriends-Peje/1.0" },
        signal: AbortSignal.timeout(2500),
      },
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data[0] && data[0].lat && data[0].lon) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
          name: data[0].display_name,
        };
      }
    }
  } catch {
    // fallback
  }

  // 3. OpenStreetMap Photon (Komoot engine) with Pejë bias
  try {
    const q = encodeURIComponent(`${cleanQuery} Peje`);
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${q}&lat=42.6629&lon=20.3016&limit=1`,
      {
        headers: { "User-Agent": "FastFoodFriends-Peje/1.0" },
        signal: AbortSignal.timeout(2000),
      },
    );
    if (res.ok) {
      const data = await res.json();
      const coords = data?.features?.[0]?.geometry?.coordinates;
      if (coords && coords.length >= 2) {
        return {
          latitude: coords[1],
          longitude: coords[0],
          name: data?.features?.[0]?.properties?.name,
        };
      }
    }
  } catch {
    // fallback
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
      clockTarget: formatTargetClock(prepMinMinutes, prepMaxMinutes),
      rideMinutes: 0,
      prepMinutes: prepMinMinutes,
      distanceKm: 0,
      mapsUrl,
      source: "pickup",
    };
  }

  const cleanStreet = location.address ? cleanPejeAddress(location.address) : "";
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

  let rideMinutes = 5; // Typical motorcycle delivery ride across Pejë (fast, weaves through traffic)
  let distanceKm = 2.0;
  let source: EtaResult["source"] = "estimate";
  let matchedPlaceName: string | undefined;

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

  // 2. If not resolved via Google, try OpenStreetMap + OSRM motorcycle routing
  if (source === "estimate") {
    if ((!destLat || !destLng) && location.address) {
      const geo = await geocodePejeAddress(location.address);
      if (geo) {
        destLat = geo.latitude;
        destLng = geo.longitude;
        matchedPlaceName = geo.name;
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
  const clockTarget = formatTargetClock(minMinutes, maxMinutes);

  // Destination parameter for Google Maps navigation in motorcycle mode:
  // If coordinates were found: destination is "lat,lng"
  // If not: destination is the clean street name in Pejë so Google Maps drives directly there
  const destinationQuery =
    destLat && destLng
      ? `${destLat},${destLng}`
      : encodeURIComponent(`${cleanStreet || location.address || "Pejë"}, Pejë`);

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destinationQuery}&travelmode=two_wheeler`;

  return {
    minMinutes,
    maxMinutes,
    label,
    clockTarget,
    rideMinutes,
    prepMinutes: prepMinMinutes,
    distanceKm,
    mapsUrl,
    source,
    destLatitude: destLat,
    destLongitude: destLng,
    cleanAddress: cleanStreet,
    matchedPlaceName,
  };
}

/**
 * Instant, client-safe preview of delivery/pickup ETA based on current basket and address.
 * Calculates in 0ms without network round-trips using the Pejë local dictionary.
 */
export function estimateQuickEta(
  mode: "delivery" | "pickup",
  address = "",
  items?: Array<{ itemId: string; quantity: number }>,
): {
  minMinutes: number;
  maxMinutes: number;
  label: string;
  clockTarget: string;
  prepMinutes: number;
  rideMinutes: number;
  distanceKm: number;
  placeName?: string;
} {
  const { prepMinMinutes, prepMaxMinutes } = estimateCookTime(items);

  if (mode === "pickup") {
    return {
      minMinutes: prepMinMinutes,
      maxMinutes: prepMaxMinutes,
      label: `${prepMinMinutes}–${prepMaxMinutes} min`,
      clockTarget: formatTargetClock(prepMinMinutes, prepMaxMinutes),
      prepMinutes: prepMinMinutes,
      rideMinutes: 0,
      distanceKm: 0,
    };
  }

  let rideMinutes = 4; // average motorcycle ride across urban Pejë
  let distanceKm = 1.8;
  let placeName: string | undefined;

  if (address.trim()) {
    const local = findPejeLocalPlace(address);
    if (local) {
      placeName = local.name;
      const dist = haversineDistanceKm(
        RESTAURANT.geo.latitude,
        RESTAURANT.geo.longitude,
        local.lat,
        local.lng,
      );
      distanceKm = Number(dist.toFixed(1));
      rideMinutes = Math.max(3, Math.min(10, Math.round((dist / 28) * 60) + 1));
    }
  }

  const minMinutes = prepMinMinutes + rideMinutes;
  const maxMinutes = Math.max(minMinutes + 3, prepMaxMinutes + rideMinutes);

  return {
    minMinutes,
    maxMinutes,
    label: `${minMinutes}–${maxMinutes} min`,
    clockTarget: formatTargetClock(minMinutes, maxMinutes),
    prepMinutes: prepMinMinutes,
    rideMinutes,
    distanceKm,
    placeName,
  };
}

