import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const adr = defineCollection({
  loader: glob({ pattern: "*.mdx", base: "./src/content/adr" }),
  schema: z.object({
    number: z.number().int().positive(),
    title: z.string(),
    status: z.enum(["accepted", "proposed", "superseded"]),
    date: z.coerce.date(),
    tags: z.array(z.string()),
  }),
});

export const collections = { adr };
