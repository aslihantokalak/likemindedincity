import type { Venue } from "../types";
import { VENUES } from "../../data/venues";
import { PROVINCES, districtsOf } from "../../data/locations";
import { distanceKm } from "../matching/filters";
import { byString } from "../compare";

export const SEEDED_CITIES = ["İstanbul", "Ankara", "İzmir"];

const TYPE_HINTS: [Venue["type"], string[]][] = [
  ["bookshop", ["book", "literary", "poetry", "philosophy", "writing"]],
  ["park", ["hiking", "cycling", "running", "climbing", "bosphorus walks"]],
  ["studio", ["design", "photography", "art", "film"]],
  ["bar", ["live music", "jazz", "dancing"]],
];

/** The kind of venue that suits a group's top shared interest; café when nothing fits. */
export function venueTypeFor(interest: string | undefined): Venue["type"] {
  const i = (interest ?? "").toLowerCase();
  return TYPE_HINTS.find(([, words]) => words.some(w => i.includes(w)))?.[0] ?? "cafe";
}

/**
 * Best venue in the province: fitting type in the group's district, then fitting type anywhere in the
 * province, then any venue in the district, then any in the province, else a generic café.
 */
export function pickVenue(province: string, district: string, topInterest: string | undefined): Venue {
  const inProvince = VENUES.filter(v => districtsOf(province).includes(v.district)).sort((a, b) => byString(a.name, b.name));
  const type = venueTypeFor(topInterest);
  return inProvince.find(v => v.type === type && v.district === district)
    ?? inProvince.find(v => v.type === type)
    ?? inProvince.find(v => v.district === district)
    ?? inProvince[0]
    ?? { name: `A café in ${district}`, type: "cafe", district };
}

/** The seeded city closest to a point, for "Use my location". */
export function nearestSeededCity(coords: [number, number]): string {
  return SEEDED_CITIES
    .map(name => ({ name, km: distanceKm(coords, PROVINCES.find(p => p.name === name)!.center!) }))
    .sort((a, b) => a.km - b.km)[0]!.name;
}
