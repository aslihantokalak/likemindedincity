// Fictional, generic venues for the seeded cities. Names describe a kind of place; none is a real business.
import type { Venue } from "../domain/types";

export const VENUES: Venue[] = [
  // İstanbul
  { name: "Moda Bookshop Café", type: "bookshop", district: "Kadıköy" },
  { name: "Cihangir Reading Room", type: "bookshop", district: "Beyoğlu" },
  { name: "Kadıköy Corner Café", type: "cafe", district: "Kadıköy" },
  { name: "Nişantaşı Coffee House", type: "cafe", district: "Şişli" },
  { name: "Fenerbahçe Park, north gate", type: "park", district: "Kadıköy" },
  { name: "Maçka Park, upper lawn", type: "park", district: "Şişli" },
  { name: "Karaköy Design Studio", type: "studio", district: "Beyoğlu" },
  { name: "Beşiktaş Listening Bar", type: "bar", district: "Beşiktaş" },
  // Ankara
  { name: "Kızılay Bookshop Café", type: "bookshop", district: "Çankaya" },
  { name: "Tunalı Coffee House", type: "cafe", district: "Çankaya" },
  { name: "Seğmenler Park, east entrance", type: "park", district: "Çankaya" },
  { name: "Göksu Park, lakeside", type: "park", district: "Etimesgut" },
  { name: "Kavaklıdere Art Studio", type: "studio", district: "Çankaya" },
  { name: "Kavaklıdere Jazz Bar", type: "bar", district: "Çankaya" },
  // İzmir
  { name: "Alsancak Bookshop Café", type: "bookshop", district: "Konak" },
  { name: "Kordon Coffee House", type: "cafe", district: "Konak" },
  { name: "Bostanlı Seaside Park", type: "park", district: "Karşıyaka" },
  { name: "Bornova Craft Studio", type: "studio", district: "Bornova" },
  { name: "Alsancak Jazz Bar", type: "bar", district: "Konak" },
];
