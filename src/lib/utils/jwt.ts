// src/lib/utils/jwt.ts
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const JWT_EXPIRY = "7d";

export type TokenPayload = { uid: string; email: string; iat?: number; exp?: number };

export function signToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): TokenPayload {
  // ✅ jwt.verify will throw if invalid or expired
  const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

  if (!decoded?.uid || !decoded?.email) {
    throw new Error("Invalid token payload");
  }

  return decoded;
}
