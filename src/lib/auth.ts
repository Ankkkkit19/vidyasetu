import { cookies } from "next/headers";

export type Role = "admin" | "teacher" | "student" | "parent";

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  studentId?: number | null;
  teacherId?: number | null;
}

export function encodeSession(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user)).toString("base64url");
}

export function decodeSession(token: string): SessionUser | null {
  try {
    const json = Buffer.from(token, "base64url").toString("utf-8");
    const u = JSON.parse(json);
    if (!u?.id || !u?.email || !u?.role) return null;
    return u as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get("erp_session")?.value;
  if (!token) return null;
  return decodeSession(token);
}

export function sessionCookie(token: string) {
  return `erp_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`;
}

export function clearSessionCookie() {
  return `erp_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
