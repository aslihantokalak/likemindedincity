import type { Feedback, MeetupEvent, Member, NewMember, Rsvp, SeedData } from "../domain/types";
import { SEED } from "../data/seed";
import { materializeSeed, type Store, type StoreData } from "./store";

const PREFIX = "likeminded:v1:";
const KEYS = {
  members: `${PREFIX}members`,
  events: `${PREFIX}events`,
  feedback: `${PREFIX}feedback`,
  current: `${PREFIX}currentMember`,
  seededAt: `${PREFIX}seededAt`,
};

type Options = { storage?: Storage | null; now?: () => Date; newId?: () => string; seed?: SeedData };

/** Keeps all state in this browser's localStorage, or in memory when storage is unavailable. */
export class LocalStore implements Store {
  private storage: Storage | null;
  private readonly now: () => Date;
  private readonly newId: () => string;
  private readonly seed: SeedData;
  private data!: StoreData;
  private current: string | null = null;
  private listeners = new Set<() => void>();
  /** Increases on every change; lets React re-render (see use-store.ts). */
  version = 0;

  constructor(opts: Options = {}) {
    this.storage = opts.storage === undefined ? defaultStorage() : opts.storage;
    this.now = opts.now ?? (() => new Date());
    this.newId = opts.newId ?? (() => crypto.randomUUID());
    this.seed = opts.seed ?? SEED;
    this.load();
  }

  listMembers(): Member[] { return this.data.members; }
  listEvents(): MeetupEvent[] { return this.data.events; }
  listFeedback(): Feedback[] { return this.data.feedback; }
  getCurrentMemberId(): string | null { return this.current; }

  addMember(m: NewMember): Member {
    const member: Member = { ...m, id: this.newId(), createdAt: this.now().toISOString() };
    this.data = { ...this.data, members: [...this.data.members, member] };
    this.commit("members");
    return member;
  }

  saveEvents(events: MeetupEvent[]): void {
    const byId = new Map(this.data.events.map(e => [e.id, e]));
    for (const e of events) byId.set(e.id, e);
    this.data = { ...this.data, events: [...byId.values()] };
    this.commit("events");
  }

  setRsvp(eventId: string, memberId: string, rsvp: Rsvp): void {
    this.data = {
      ...this.data,
      events: this.data.events.map(e => (e.id === eventId ? { ...e, rsvps: { ...e.rsvps, [memberId]: rsvp } } : e)),
    };
    this.commit("events");
  }

  saveFeedback(f: Feedback): void {
    const rest = this.data.feedback.filter(x => !(x.eventId === f.eventId && x.memberId === f.memberId));
    this.data = { ...this.data, feedback: [...rest, f] };
    this.commit("feedback");
  }

  setCurrentMemberId(id: string | null): void {
    this.current = id;
    this.write(KEYS.current, id === null ? null : JSON.stringify(id));
    this.notify();
  }

  reset(): void {
    this.data = materializeSeed(this.seed, this.now());
    this.current = null;
    this.persistAll();
    this.notify();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Re-reads storage after another tab changed it. */
  reload(): void {
    this.load();
    this.notify();
  }

  private load() {
    const s = this.storage;
    if (s && s.getItem(KEYS.seededAt)) {
      try {
        this.data = {
          members: JSON.parse(s.getItem(KEYS.members) ?? "null") ?? fail("members"),
          events: JSON.parse(s.getItem(KEYS.events) ?? "null") ?? fail("events"),
          feedback: JSON.parse(s.getItem(KEYS.feedback) ?? "null") ?? fail("feedback"),
        };
        const current = s.getItem(KEYS.current);
        this.current = current === null ? null : JSON.parse(current);
        return;
      } catch (err) {
        console.warn("Likeminded: stored demo data was unreadable, restoring the demo data.", err);
      }
    }
    this.data = materializeSeed(this.seed, this.now());
    this.current = null;
    this.persistAll();
  }

  private persistAll() {
    this.write(KEYS.members, JSON.stringify(this.data.members));
    this.write(KEYS.events, JSON.stringify(this.data.events));
    this.write(KEYS.feedback, JSON.stringify(this.data.feedback));
    this.write(KEYS.current, this.current === null ? null : JSON.stringify(this.current));
    this.write(KEYS.seededAt, this.now().toISOString());
  }

  private commit(part: keyof StoreData) {
    this.write(KEYS[part], JSON.stringify(this.data[part]));
    this.notify();
  }

  private write(key: string, value: string | null) {
    if (!this.storage) return;
    try {
      if (value === null) this.storage.removeItem(key);
      else this.storage.setItem(key, value);
    } catch (err) {
      console.warn("Likeminded: browser storage is unavailable, keeping data in memory for this visit.", err);
      this.storage = null;
    }
  }

  private notify() {
    this.version++;
    this.listeners.forEach(l => l());
  }
}

function fail(part: string): never {
  throw new Error(`missing ${part}`);
}

function defaultStorage(): Storage | null {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    s.setItem(`${PREFIX}probe`, "1");
    s.removeItem(`${PREFIX}probe`);
    return s;
  } catch {
    return null;
  }
}

export const STORAGE_PREFIX = PREFIX;
