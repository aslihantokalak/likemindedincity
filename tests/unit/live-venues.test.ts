import { PROVINCES, districtsOf } from "../../src/data/locations";
import { VENUES } from "../../src/data/venues";
import { SEEDED_CITIES, nearestSeededCity, pickVenue } from "../../src/domain/live/venues";

test("81 provinces with districts", () => {
  expect(PROVINCES).toHaveLength(81);
  PROVINCES.forEach(p => expect(p.districts.length).toBeGreaterThan(0));
});

test("seeded cities have their official district counts", () => {
  expect(districtsOf("İstanbul")).toHaveLength(39);
  expect(districtsOf("Ankara")).toHaveLength(25);
  expect(districtsOf("İzmir")).toHaveLength(30);
  expect(districtsOf("İstanbul")).toContain("Kadıköy");
  expect(districtsOf("Ankara")).toContain("Çankaya");
});

test("no district label keeps a Wikidata suffix", () =>
  PROVINCES.forEach(p => p.districts.forEach(d => expect(d).not.toMatch(/ilçe|district|rayon|^Q\d+$/i))));

test("venues: at least 4 per seeded city, all five types per city, districts real", () => {
  for (const city of SEEDED_CITIES) {
    const vs = VENUES.filter(v => districtsOf(city).includes(v.district));
    expect(vs.length).toBeGreaterThanOrEqual(4);
    expect(new Set(vs.map(v => v.type)).size).toBe(5);
  }
  VENUES.forEach(v => expect(SEEDED_CITIES.some(c => districtsOf(c).includes(v.district))).toBe(true));
});

test("bookish group gets a bookshop in İstanbul", () =>
  expect(pickVenue("İstanbul", "Kadıköy", "literary fiction").type).toBe("bookshop"));

test("hikers get a park in Ankara", () => expect(pickVenue("Ankara", "Çankaya", "hiking").type).toBe("park"));

test("prefers a fitting venue in the group's own district", () => {
  const v = pickVenue("İstanbul", "Kadıköy", "coffee");
  expect(v.type).toBe("cafe");
  expect(v.district).toBe("Kadıköy");
});

test("province without venues gets a generic café", () =>
  expect(pickVenue("Van", "Merkez", "hiking")).toEqual({ name: "A café in Merkez", type: "cafe", district: "Merkez" }));

test("nearest seeded city to Bornova is İzmir", () => expect(nearestSeededCity([38.46, 27.22])).toBe("İzmir"));
test("nearest seeded city to Konya is Ankara", () => expect(nearestSeededCity([37.87, 32.48])).toBe("Ankara"));
