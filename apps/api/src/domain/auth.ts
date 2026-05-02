import { createHmac, randomBytes } from "node:crypto";
import { z } from "zod";

interface StoredUser {
  userId: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

const users = new Map<string, StoredUser>();

const SECRET = "jobvault-dev-secret-key";

function hashPassword(password: string, salt: string): string {
  return createHmac("sha256", salt).update(password).digest("hex");
}

export function createToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyToken(token: string): string | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", SECRET).update(payload).digest("base64url");
  if (sig !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (data.exp < Date.now()) return null;
    return data.userId;
  } catch {
    return null;
  }
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export function registerUser(payload: unknown): { token: string; user: { userId: string; email: string; name: string } } {
  const parsed = registerSchema.parse(payload);
  const existing = [...users.values()].find((u) => u.email === parsed.email.toLowerCase());
  if (existing) throw new Error("An account with this email already exists.");

  const salt = randomBytes(16).toString("hex");
  const userId = randomBytes(8).toString("hex");
  const user: StoredUser = {
    userId,
    email: parsed.email.toLowerCase(),
    name: parsed.name,
    passwordHash: hashPassword(parsed.password, salt),
    salt,
    createdAt: new Date().toISOString(),
  };
  users.set(userId, user);

  return {
    token: createToken(userId),
    user: { userId, email: user.email, name: user.name },
  };
}

export function loginUser(payload: unknown): { token: string; user: { userId: string; email: string; name: string } } {
  const parsed = loginSchema.parse(payload);
  const user = [...users.values()].find((u) => u.email === parsed.email.toLowerCase());
  if (!user) throw new Error("Invalid email or password.");

  const hash = hashPassword(parsed.password, user.salt);
  if (hash !== user.passwordHash) throw new Error("Invalid email or password.");

  return {
    token: createToken(user.userId),
    user: { userId: user.userId, email: user.email, name: user.name },
  };
}
