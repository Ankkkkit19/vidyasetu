import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, students, parents, batches, courses } from "@/db/schema";
import { eq, ilike, or, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  let rows = await db.select({ s: students, u: users }).from(students)
    .leftJoin(users, eq(students.userId, users.id))
    .orderBy(desc(students.id)).limit(100);

  if (q) {
    const lq = q.toLowerCase();
    rows = rows.filter(({ s, u }) =>
      (u?.name ?? "").toLowerCase().includes(lq) ||
      (u?.email ?? "").toLowerCase().includes(lq) ||
      (s.rollNo ?? "").toLowerCase().includes(lq) ||
      (s.targetExam ?? "").toLowerCase().includes(lq)
    );
  }

  const batchList = await db.select().from(batches);
  const courseList = await db.select().from(courses);
  const bMap = Object.fromEntries(batchList.map((b) => [b.id, b.name]));
  const cMap = Object.fromEntries(courseList.map((c) => [c.id, c.name]));

  return NextResponse.json({
    students: rows.map(({ s, u }) => ({
      id: s.id, userId: s.userId, name: u?.name, email: u?.email, phone: u?.phone,
      rollNo: s.rollNo, batchId: s.batchId, batch: s.batchId ? bMap[s.batchId] : "—",
      courseId: s.courseId, course: s.courseId ? cMap[s.courseId] : "—",
      target: s.targetExam, status: s.status, studyHours: s.studyHours,
      parentName: s.parentName, parentPhone: s.parentPhone, gender: s.gender,
    })),
    batches: batchList, courses: courseList,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  try {
    const b = await req.json();
    const hash = await bcrypt.hash(b.password || "password123", 10);
    const [u] = await db.insert(users).values({
      name: b.name, email: b.email.toLowerCase().trim(), password: hash, role: "student", phone: b.phone,
    }).returning();
    const [s] = await db.insert(students).values({
      userId: u.id, rollNo: b.rollNo || `STU-${Date.now().toString().slice(-6)}`,
      batchId: b.batchId ? Number(b.batchId) : null, courseId: b.courseId ? Number(b.courseId) : null,
      targetExam: b.targetExam || "JEE 2027", gender: b.gender || "Male",
      parentName: b.parentName, parentPhone: b.parentPhone,
      studyHours: Number(b.studyHours || 4), status: "active", enrollmentDate: new Date().toISOString().slice(0, 10),
    }).returning();
    if (b.parentEmail) {
      const [pu] = await db.insert(users).values({
        name: b.parentName || "Parent", email: b.parentEmail.toLowerCase().trim(),
        password: await bcrypt.hash("password123", 10), role: "parent",
      }).returning();
      await db.insert(parents).values({ userId: pu.id, studentId: s.id, relation: "Father" });
    }
    return NextResponse.json({ ok: true, id: s.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "Create failed: " + msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || !["admin", "teacher"].includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  const b = await req.json();
  await db.update(students).set({
    batchId: b.batchId ? Number(b.batchId) : null,
    courseId: b.courseId ? Number(b.courseId) : null,
    targetExam: b.targetExam, status: b.status,
    studyHours: b.studyHours ? Number(b.studyHours) : undefined,
    parentName: b.parentName, parentPhone: b.parentPhone,
  }).where(eq(students.id, id));
  if (b.name || b.phone) {
    const sRows = await db.select().from(students).where(eq(students.id, id)).limit(1);
    if (sRows[0]?.userId) {
      await db.update(users).set({ ...(b.name ? { name: b.name } : {}), ...(b.phone ? { phone: b.phone } : {}) }).where(eq(users.id, sRows[0].userId));
    }
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  await db.update(students).set({ status: "inactive" }).where(eq(students.id, id));
  return NextResponse.json({ ok: true });
}
