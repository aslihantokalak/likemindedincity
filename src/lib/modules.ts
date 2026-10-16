export type ModuleInfo = { slug: string; title: string; milestone: "M1" | "M2" | "M3" };

/** The ten modules of the case study, in navigation order. Overview lives at "/". */
export const MODULES: ModuleInfo[] = [
  { slug: "", title: "Overview", milestone: "M1" },
  { slug: "discovery", title: "Discovery", milestone: "M2" },
  { slug: "prd", title: "PRD", milestone: "M2" },
  { slug: "backlog", title: "Backlog", milestone: "M2" },
  { slug: "wireframes", title: "Wireframes", milestone: "M3" },
  { slug: "prototype", title: "Prototype", milestone: "M3" },
  { slug: "technical-design", title: "Technical Design", milestone: "M1" },
  { slug: "decision-log", title: "Decision Log", milestone: "M1" },
  { slug: "analytics", title: "Analytics", milestone: "M3" },
  { slug: "retrospective", title: "Retrospective", milestone: "M3" },
];

export const moduleHref = (slug: string) => `/${slug}`;
