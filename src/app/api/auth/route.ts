import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, students, teachers, parents } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { encodeSession, getSession, sessionCookie, clearSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password)
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });

    const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    const user = rows[0];
    if (!user || !user.active)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    let studentId: number | null = null;
    let teacherId: number | null = null;
    if (user.role === "student") {
      const s = await db.select().from(students).where(eq(students.userId, user.id)).limit(1);
      studentId = s[0]?.id ?? null;
    }
    if (user.role === "teacher") {
      const t = await db.select().from(teachers).where(eq(teachers.userId, user.id)).limit(1);
      teacherId = t[0]?.id ?? null;
    }

    const token = encodeSession({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as "admin" | "teacher" | "student" | "parent",
      studentId,
      teacherId,
    });

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, studentId, teacherId },
    });
    res.headers.set("Set-Cookie", sessionCookie(token));
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });

  // enrich parent -> studentId
  let parentStudentId: number | null = null;
  if (session.role === "parent") {
    const rows = await db.select().from(parents).where(eq(parents.userId, session.id)).limit(1);
    parentStudentId = rows[0]?.studentId ?? null;
  }
  return NextResponse.json({ user: { ...session, parentStudentId } });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearSessionCookie());
  return res;
}
