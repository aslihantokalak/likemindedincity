// Controlled vocabulary for the synthetic users. Interests are grouped by the persona that favours them.

export const INTEREST_GROUPS = {
  newcomer: [
    "hiking", "street food", "language exchange", "board games", "cycling", "live music",
    "photography", "cooking", "bosphorus walks", "climbing", "football", "travel", "dancing",
  ],
  introvert_reader: [
    "literary fiction", "poetry", "philosophy", "history", "classical music", "museums",
    "film", "chess", "writing", "coffee", "art house cinema", "journaling", "tea",
  ],
  founder: [
    "startups", "product management", "ai", "venture capital", "design", "investing",
    "public speaking", "running", "productivity", "saas", "fintech", "growth marketing", "yoga", "podcasts",
  ],
} as const;

export const INTERESTS: string[] = Object.values(INTEREST_GROUPS).flat();

export type Book = { title: string; author: string };

export const BOOKS: Book[] = [
  { title: "Madonna in a Fur Coat", author: "Sabahattin Ali" },
  { title: "Kuyucaklı Yusuf", author: "Sabahattin Ali" },
  { title: "The Time Regulation Institute", author: "Ahmet Hamdi Tanpınar" },
  { title: "Huzur", author: "Ahmet Hamdi Tanpınar" },
  { title: "Tutunamayanlar", author: "Oğuz Atay" },
  { title: "The Museum of Innocence", author: "Orhan Pamuk" },
  { title: "Istanbul: Memories and the City", author: "Orhan Pamuk" },
  { title: "The Bastard of Istanbul", author: "Elif Şafak" },
  { title: "Memed, My Hawk", author: "Yaşar Kemal" },
  { title: "Selected Poems", author: "Nazım Hikmet" },
  { title: "Human Landscapes from My Country", author: "Nazım Hikmet" },
  { title: "Crime and Punishment", author: "Fyodor Dostoevsky" },
  { title: "The Brothers Karamazov", author: "Fyodor Dostoevsky" },
  { title: "Anna Karenina", author: "Leo Tolstoy" },
  { title: "One Hundred Years of Solitude", author: "Gabriel García Márquez" },
  { title: "Kafka on the Shore", author: "Haruki Murakami" },
  { title: "Norwegian Wood", author: "Haruki Murakami" },
  { title: "The Stranger", author: "Albert Camus" },
  { title: "Mrs Dalloway", author: "Virginia Woolf" },
  { title: "Stoner", author: "John Williams" },
  { title: "Sapiens", author: "Yuval Noah Harari" },
  { title: "Atomic Habits", author: "James Clear" },
  { title: "Zero to One", author: "Peter Thiel" },
  { title: "The Lean Startup", author: "Eric Ries" },
  { title: "Inspired", author: "Marty Cagan" },
  { title: "The Mom Test", author: "Rob Fitzpatrick" },
  { title: "Thinking, Fast and Slow", author: "Daniel Kahneman" },
  { title: "The Hard Thing About Hard Things", author: "Ben Horowitz" },
  { title: "Shoe Dog", author: "Phil Knight" },
  { title: "Project Hail Mary", author: "Andy Weir" },
  { title: "Dune", author: "Frank Herbert" },
  { title: "The Alchemist", author: "Paulo Coelho" },
];

export type Job = { profession: string; industry: string };

export const PROFESSIONS: Job[] = [
  { profession: "Software Engineer", industry: "tech" },
  { profession: "Product Manager", industry: "tech" },
  { profession: "Product Designer", industry: "tech" },
  { profession: "Data Scientist", industry: "tech" },
  { profession: "Founder", industry: "tech" },
  { profession: "Investment Analyst", industry: "finance" },
  { profession: "Accountant", industry: "finance" },
  { profession: "Banker", industry: "finance" },
  { profession: "Teacher", industry: "education" },
  { profession: "Academic", industry: "education" },
  { profession: "Editor", industry: "media" },
  { profession: "Journalist", industry: "media" },
  { profession: "Architect", industry: "architecture" },
  { profession: "Doctor", industry: "health" },
  { profession: "Lawyer", industry: "law" },
  { profession: "Marketing Specialist", industry: "marketing" },
  { profession: "Chef", industry: "hospitality" },
];

export const SCHOOLS: string[] = [
  "Boğaziçi University", "Istanbul Technical University", "Koç University", "Sabancı University",
  "METU", "Bilkent University", "Galatasaray University", "Istanbul University",
  "Robert College", "Galatasaray High School", "Kabataş Erkek Lisesi", "Ankara Fen Lisesi",
];

export type District = { name: string; coords: [number, number] };

export const DISTRICTS: District[] = [
  { name: "Kadıköy", coords: [40.9909, 29.0303] },
  { name: "Üsküdar", coords: [41.0233, 29.0152] },
  { name: "Ataşehir", coords: [40.9923, 29.1244] },
  { name: "Beşiktaş", coords: [41.0422, 29.0083] },
  { name: "Şişli", coords: [41.0602, 28.9877] },
  { name: "Beyoğlu", coords: [41.0370, 28.9850] },
  { name: "Sarıyer", coords: [41.1670, 29.0500] },
  { name: "Fatih", coords: [41.0190, 28.9400] },
  { name: "Kağıthane", coords: [41.0800, 28.9700] },
  { name: "Maltepe", coords: [40.9350, 29.1300] },
];

/** Far from everyone else; used only by an edge-case user. */
export const FAR_DISTRICT: District = { name: "Silivri", coords: [41.0739, 28.2465] };

export const SLOTS: string[] = [
  "mon_evening", "tue_evening", "wed_evening", "thu_evening", "fri_evening",
  "sat_morning", "sat_afternoon", "sat_evening", "sun_morning", "sun_afternoon",
];

export const FIRST_NAMES: string[] = [
  "Elif", "Deniz", "Can", "Zeynep", "Mert", "Ece", "Emre", "Selin", "Burak", "Defne",
  "Kerem", "İpek", "Ozan", "Ayşe", "Baran", "Naz", "Kaan", "Duru", "Arda", "Lara",
  "Yusuf", "Melis", "Efe", "Sena", "Onur", "Ada", "Tolga", "Irmak", "Umut", "Asya",
  "Sarp", "Ela", "Doruk", "Nehir", "Alp", "Derin", "Berk", "Ilgın", "Cem", "Pelin",
  "Maya", "Leo", "Sofia", "Omar", "Anna", "Lukas", "Nadia",
];

/** Conversation starters for demo members' "An idea you can't stop thinking about". */
export const IDEAS: string[] = [
  "Cities should have more benches",
  "Every neighbourhood needs a free tool library",
  "We should read more books written before we were born",
  "Ferries are the best office in İstanbul",
  "Small talk is underrated",
  "Most meetings could be walks",
  "Translation is a kind of writing",
  "Everyone should learn to cook one dish from their grandmother",
  "Boredom is where ideas come from",
  "Second-hand bookshops are the real social networks",
  "We need more places to sit that don't require buying coffee",
  "AI will make handwriting fashionable again",
];
