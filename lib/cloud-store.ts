import { pbkdf2Sync, randomBytes, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export type PublicCloudUser = {
  id: string;
  email: string;
};

type StoredUser = PublicCloudUser & {
  passwordHash: string;
  salt: string;
  createdAt: string;
};

export type StoredClip = {
  id: string;
  text: string;
  voiceId: string;
  voiceName: string;
  chars: number;
  createdAt: string;
};

type DbShape = {
  users: Record<string, StoredUser>;
  userByEmail: Record<string, string>;
  clipsByUser: Record<string, StoredClip[]>;
  usageByUserDay: Record<string, number>;
};

const DB_FILE = path.join(process.cwd(), ".data", "cloud-sync.json");
const DEFAULT_DB: DbShape = {
  users: {},
  userByEmail: {},
  clipsByUser: {},
  usageByUserDay: {},
};

let lock = Promise.resolve();

function cloneDefaultDb(): DbShape {
  return {
    users: {},
    userByEmail: {},
    clipsByUser: {},
    usageByUserDay: {},
  };
}

function sanitizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function readDbFile() {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<DbShape>;
    return {
      users: parsed.users ?? {},
      userByEmail: parsed.userByEmail ?? {},
      clipsByUser: parsed.clipsByUser ?? {},
      usageByUserDay: parsed.usageByUserDay ?? {},
    };
  } catch {
    return cloneDefaultDb();
  }
}

async function writeDbFile(db: DbShape) {
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

function runWithLock<T>(fn: () => Promise<T>) {
  const next = lock.then(fn, fn);
  lock = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function hashPassword(password: string, salt: string) {
  return pbkdf2Sync(password, salt, 120_000, 32, "sha256").toString("hex");
}

function toPublicUser(user: StoredUser): PublicCloudUser {
  return {
    id: user.id,
    email: user.email,
  };
}

export async function registerCloudUser(email: string, password: string) {
  const normalizedEmail = sanitizeEmail(email);

  return runWithLock(async () => {
    const db = await readDbFile();
    const existingUserId = db.userByEmail[normalizedEmail];
    if (existingUserId) {
      throw new Error("An account with this email already exists.");
    }

    const salt = randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt);
    const id = randomUUID();

    const user: StoredUser = {
      id,
      email: normalizedEmail,
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
    };

    db.users[id] = user;
    db.userByEmail[normalizedEmail] = id;
    await writeDbFile(db);

    return toPublicUser(user);
  });
}

export async function authenticateCloudUser(email: string, password: string) {
  const normalizedEmail = sanitizeEmail(email);

  return runWithLock(async () => {
    const db = await readDbFile();
    const userId = db.userByEmail[normalizedEmail];
    const user = userId ? db.users[userId] : null;
    if (!user) {
      return null;
    }

    const attemptedHash = hashPassword(password, user.salt);
    if (attemptedHash !== user.passwordHash) {
      return null;
    }

    return toPublicUser(user);
  });
}

export async function getCloudUserById(userId: string) {
  return runWithLock(async () => {
    const db = await readDbFile();
    const user = db.users[userId];
    return user ? toPublicUser(user) : null;
  });
}

export async function getCloudClips(userId: string) {
  return runWithLock(async () => {
    const db = await readDbFile();
    return (db.clipsByUser[userId] ?? []).slice(0, 30);
  });
}

export async function upsertCloudClip(userId: string, clip: Omit<StoredClip, "id" | "createdAt">) {
  return runWithLock(async () => {
    const db = await readDbFile();
    const existing = db.clipsByUser[userId] ?? [];

    const nextClip: StoredClip = {
      ...clip,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };

    const deduped = existing.filter(
      (entry) => !(entry.text === clip.text && entry.voiceId === clip.voiceId),
    );

    db.clipsByUser[userId] = [nextClip, ...deduped].slice(0, 30);
    await writeDbFile(db);
    return db.clipsByUser[userId];
  });
}

function usageKey(userId: string, day: string) {
  return `${userId}:${day}`;
}

export async function getCloudUsage(userId: string, day: string) {
  return runWithLock(async () => {
    const db = await readDbFile();
    return db.usageByUserDay[usageKey(userId, day)] ?? 0;
  });
}

export async function incrementCloudUsage(userId: string, day: string, chars: number) {
  return runWithLock(async () => {
    const db = await readDbFile();
    const key = usageKey(userId, day);
    db.usageByUserDay[key] = (db.usageByUserDay[key] ?? 0) + chars;
    await writeDbFile(db);
    return db.usageByUserDay[key];
  });
}

export async function getCloudUsageWithLimit(userId: string, limit: number, day: string) {
  const used = await getCloudUsage(userId, day);
  return {
    day,
    used,
    limit,
  };
}

export const CLOUD_DB_FILE = DB_FILE;
export const CLOUD_DB_TEMPLATE = DEFAULT_DB;
