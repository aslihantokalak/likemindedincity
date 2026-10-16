// Temporary: three seeded cities only. Replaced by the full 81-province list in the next task.
export type Province = { name: string; districts: string[]; center?: [number, number] };

export const PROVINCES: Province[] = [
  { name: "Ankara", districts: ["Çankaya", "Keçiören", "Yenimahalle"], center: [39.9334, 32.8597] },
  { name: "İstanbul", districts: ["Beşiktaş", "Kadıköy", "Şişli", "Üsküdar"], center: [41.0082, 28.9784] },
  { name: "İzmir", districts: ["Bornova", "Karşıyaka", "Konak"], center: [38.4237, 27.1428] },
];

export const districtsOf = (province: string): string[] => PROVINCES.find(p => p.name === province)?.districts ?? [];
