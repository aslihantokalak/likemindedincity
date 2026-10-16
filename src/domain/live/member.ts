import type { Member, NewMember, User } from "../types";
import { BOOKS, PROFESSIONS } from "../../data/vocab";
import { districtsOf } from "../../data/locations";

type SignupErrors = Partial<Record<keyof NewMember | "consent", string>>;

export function validateSignup(
  input: Partial<NewMember>, consent: boolean,
): { ok: true; member: NewMember } | { ok: false; errors: SignupErrors } {
  const errors: SignupErrors = {};
  const firstName = (input.firstName ?? "").trim();
  if (firstName.length < 1 || firstName.length > 40) errors.firstName = "Tell us your first name.";
  if (!Number.isInteger(input.age) || input.age! < 18 || input.age! > 99) errors.age = "You need to be between 18 and 99.";
  if (!input.province) errors.province = "Pick your city.";
  if (!input.district) errors.district = "Pick your district.";
  else if (input.province && !districtsOf(input.province).includes(input.district)) errors.district = "Pick a district in your city.";
  if (!input.intent) errors.intent = "Tell us what you're looking for.";
  const interests = input.interests ?? [];
  if (interests.length < 3 || interests.length > 8) errors.interests = "Pick between 3 and 8 interests.";
  if ((input.idea ?? "").length > 200) errors.idea = "Keep it under 200 characters.";
  if (!input.availability?.length) errors.availability = "Pick at least one time you're free.";
  if (!input.languages?.length) errors.languages = "Pick at least one language.";
  if (!input.tableSize) errors.tableSize = "Pick a table size.";
  if (!consent) errors.consent = "Please confirm you understand this is a demo.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const member: NewMember = {
    firstName, age: input.age!, province: input.province!, district: input.district!,
    intent: input.intent!, interests, availability: input.availability!, languages: input.languages!,
    tableSize: input.tableSize!,
  };
  const optional = (v?: string) => (v && v.trim() ? v.trim() : undefined);
  const book = optional(input.book), idea = optional(input.idea), school = optional(input.school), profession = optional(input.profession);
  if (book) member.book = book;
  if (idea) member.idea = idea;
  if (school) member.school = school;
  if (profession) member.profession = profession;
  return { ok: true, member };
}

/** Adapts a live member to the matching engine's User. `persona` is never set. */
export function toMatchUser(m: Member): User {
  const book = m.book ? BOOKS.find(b => b.title === m.book) : undefined;
  const job = m.profession ? PROFESSIONS.find(p => p.profession === m.profession) : undefined;
  return {
    id: m.id, name: m.firstName, age: m.age,
    district: m.district, province: m.province, coords: [0, 0],
    languages: m.languages, intent: m.intent, availability: m.availability,
    interests: m.interests,
    books: m.book ? [m.book] : [], authors: book ? [book.author] : [],
    profession: m.profession ?? "", industry: job?.industry ?? "",
    schools: m.school ? [m.school] : [],
    groupSizePref: m.tableSize,
  };
}
