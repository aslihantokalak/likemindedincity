// Guards against factual errors found in review. The case study is only as credible as its copy.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(__dirname, "../..", p), "utf8");
const adr1 = read("src/content/adr/001-data-portability.mdx");
const adr2 = read("src/content/adr/002-sensitive-attributes.mdx");
const overview = read("src/pages/index.astro");

test("ADR-001 does not claim KVKK grants data portability", () => {
  expect(adr1).not.toMatch(/GDPR and KVKK entitle/);
  expect(adr1).toMatch(/GDPR \(Art\. 20\)/);
});

test("ADR-001 refers to ADR-006 as planned", () => expect(adr1).toMatch(/planned ADR-006/));

test("ADR-002 does not call nationality a special category", () =>
  expect(adr2).not.toMatch(/ethnicity or nationality/));

test("ADR-002 does not present the diversity weight as the proxy-risk mitigation", () =>
  expect(adr2).not.toMatch(/diversity weight and regular audits .* are the mitigation/));

test("Overview does not promise a Retrospective that isn't written yet", () =>
  expect(overview).not.toMatch(/The Retrospective covers/));

test("ADR-001 does not claim LinkedIn sign-in verifies identity", () =>
  expect(adr1).not.toMatch(/Sign in with LinkedIn verifies identity/));
