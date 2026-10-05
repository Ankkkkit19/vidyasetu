import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  users, teachers, batches, courses, tests, testResults, attendance,
  assignments, submissions, fees, feePayments, remarks, notifications, studyTasks, students,
} from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";

// ?entity=teachers|batches|courses|tests|results|attendance|assignments|submissions|fees|remarks|notifications|tasks
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const entity = searchParams.get("entity") || "tests";
  const batchId = searchParams.get("batchId");
  const studentId = searchParams.get("studentId");
  const date = searchParams.get("date");

  try {
    if (entity === "teachers") {
      const rows = await db.select({ t: teachers, u: users }).from(teachers)
        .leftJoin(users, eq(teachers.userId, users.id)).limit(50);
      return NextResponse.json({
        teachers: rows.map(({ t, u }) => ({
          id: t.id, userId: t.userId, name: u?.name, email: u?.email, phone: u?.phone,
          subjects: t.subjects, qualification: t.qualification, exp: t.experienceYears, status: t.status,
        })),
      });
    }
    if (entity === "batches") {
      const rows = await db.select().from(batches).limit(50);
      const tRows = await db.select({ t: teachers, u: users }).from(teachers).leftJoin(users, eq(teachers.userId, users.id));
      const counts = await db.select().from(students).limit(200);
      return NextResponse.json({
        batches: rows.map((b) => ({
          ...b, strength: counts.filter((s) => s.batchId === b.id).length,
          teacher: tRows.find((x) => x.u?.id === b.teacherId)?.u?.name ?? "—",
        })),
        teachers: tRows.map(({ t, u }) => ({ id: u?.id, name: u?.name, subjects: t.subjects })),
        courses: await db.select().from(courses),
      });
    }
    if (entity === "courses") {
      return NextResponse.json({ courses: await db.select().from(courses) });
    }
    if (entity === "tests") {
      const rows = await db.select().from(tests).orderBy(desc(tests.id)).limit(40);
      const withCounts = [];
      for (const t of rows) {
        const rr = await db.select().from(testResults).where(eq(testResults.testId, t.id));
        const avg = rr.length && t.totalMarks ? rr.reduce((a, r) => a + Number(r.marksObtained), 0) / rr.length / t.totalMarks * 100 : 0;
        withCounts.push({ ...t, attempts: rr.length, avg: Math.round(avg * 10) / 10 });
      }
      return NextResponse.json({ tests: withCounts });
    }
    if (entity === "results") {
      const testId = searchParams.get("testId");
      let rows = await db.select({ r: testResults, t: tests, s: students, u: users })
        .from(testResults)
        .leftJoin(tests, eq(testResults.testId, tests.id))
        .leftJoin(students, eq(testResults.studentId, students.id))
        .leftJoin(users, eq(students.userId, users.id))
        .orderBy(desc(testResults.id)).limit(120);
      if (testId) rows = rows.filter((x) => x.t?.id === Number(testId));
      if (studentId) rows = rows.filter((x) => x.s?.id === Number(studentId));
      return NextResponse.json({
        results: rows.map(({ r, t, u }) => ({
          id: r.id, test: t?.title, subject: t?.subject, total: t?.totalMarks,
          student: u?.name, marks: Number(r.marksObtained),
          pct: t?.totalMarks ? Math.round((Number(r.marksObtained) / t.totalMarks) * 1000) / 10 : 0,
          accuracy: Number(r.accuracy), rank: r.rank, percentile: Number(r.percentile),
        })),
      });
    }
    if (entity === "attendance") {
      const d = date || new Date().toISOString().slice(0, 10);
      const list = await db.select({ s: students, u: users }).from(students)
        .leftJoin(users, eq(students.userId, users.id))
        .limit(60);
      const marked = await db.select().from(attendance).where(eq(attendance.date, d));
      const mMap: Record<number, string> = {};
      marked.forEach((m) => { if (m.studentId) mMap[m.studentId] = m.status; });
      let filtered = list;
      if (batchId) filtered = filtered.filter((x) => x.s.batchId === Number(batchId));
      return NextResponse.json({
        date: d,
        rows: filtered.map(({ s, u }) => ({
          studentId: s.id, name: u?.name, rollNo: s.rollNo, batchId: s.batchId,
          status: mMap[s.id] || "unmarked",
        })),
        batches: await db.select().from(batches),
      });
    }
    if (entity === "assignments") {
      const rows = await db.select().from(assignments).orderBy(desc(assignments.id)).limit(30);
      const out = [];
      for (const a of rows) {
        const subs = await db.select().from(submissions).where(eq(submissions.assignmentId, a.id));
        out.push({
          ...a,
          submitted: subs.filter((s) => s.status === "submitted").length,
          late: subs.filter((s) => s.status === "late").length,
          pending: subs.filter((s) => s.status === "pending").length,
          total: subs.length,
        });
      }
      return NextResponse.json({ assignments: out });
    }
    if (entity === "fees") {
      const rows = await db.select({ f: fees, s: students, u: users }).from(fees)
        .leftJoin(students, eq(fees.studentId, students.id))
        .leftJoin(users, eq(students.userId, users.id)).limit(60);
      const total = rows.reduce((a, { f }) => a + Number(f.total), 0);
      const paid = rows.reduce((a, { f }) => a + Number(f.paid), 0);
      return NextResponse.json({
        fees: rows.map(({ f, u, s }) => ({
          id: f.id, studentId: f.studentId, student: u?.name, rollNo: s?.rollNo,
          total: Number(f.total), paid: Number(f.paid),
          pending: Number(f.total) - Number(f.paid), status: f.status, dueDate: f.dueDate,
        })),
        summary: { total, paid, pending: total - paid },
      });
    }
    if (entity === "remarks") {
      const rows = await db.select().from(remarks).orderBy(desc(remarks.id)).limit(40);
      const stList = await db.select({ s: students, u: users }).from(students).leftJoin(users, eq(students.userId, users.id)).limit(100);
      const nameOf = (id: number | null) => stList.find((x) => x.s.id === id)?.u?.name ?? `#${id}`;
      return NextResponse.json({
        remarks: rows.map((r) => ({ ...r, studentName: nameOf(r.studentId) }))
          .filter((r) => (!studentId || r.studentId === Number(studentId))),
      });
    }
    if (entity === "notifications") {
      const rows = await db.select().from(notifications).where(eq(notifications.userId, session.id))
        .orderBy(desc(notifications.id)).limit(20);
      return NextResponse.json({ notifications: rows });
    }
    if (entity === "tasks") {
      const sid = studentId ? Number(studentId) : session.studentId;
      if (!sid) return NextResponse.json({ tasks: [] });
      const rows = await db.select().from(studyTasks).where(eq(studyTasks.studentId, sid)).limit(20);
      return NextResponse.json({ tasks: rows });
    }
    return NextResponse.json({ error: "Unknown entity" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["admin", "teacher"].includes(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const entity = searchParams.get("entity") || "tests";
  const b = await req.json();

  try {
    if (entity === "teachers") {
      const [u] = await db.insert(users).values({
        name: b.name, email: b.email.toLowerCase().trim(),
        password: await bcrypt.hash(b.password || "password123", 10),
        role: "teacher", phone: b.phone,
      }).returning();
      const [t] = await db.insert(teachers).values({
        userId: u.id, subjects: b.subjects, qualification: b.qualification,
        experienceYears: Number(b.exp || 0),
      }).returning();
      return NextResponse.json({ ok: true, id: t.id });
    }
    if (entity === "batches") {
      const [row] = await db.insert(batches).values({
        name: b.name, courseId: b.courseId ? Number(b.courseId) : null,
        teacherId: b.teacherId ? Number(b.teacherId) : null,
        schedule: b.schedule, room: b.room, capacity: Number(b.capacity || 40),
        startDate: b.startDate, endDate: b.endDate, status: "active",
      }).returning();
      return NextResponse.json({ ok: true, id: row.id });
    }
    if (entity === "courses") {
      const [row] = await db.insert(courses).values({
        name: b.name, description: b.description, duration: b.duration,
        targetExam: b.targetExam, totalFees: Number(b.totalFees || 0),
      }).returning();
      return NextResponse.json({ ok: true, id: row.id });
    }
    if (entity === "tests") {
      const [row] = await db.insert(tests).values({
        title: b.title, subject: b.subject, chapter: b.chapter, difficulty: b.difficulty || "Medium",
        totalMarks: Number(b.totalMarks || 100), negativeMarking: b.negativeMarking || "No",
        durationMin: Number(b.durationMin || 60), examDate: b.examDate,
        batchId: b.batchId ? Number(b.batchId) : null, createdBy: session.id,
      }).returning();
      // auto-create empty results? create randomised demo results for batch students
      if (b.batchId) {
        const stList = await db.select().from(students).where(eq(students.batchId, Number(b.batchId))).limit(50);
        for (const st of stList) {
          const pct = 45 + Math.random() * 45;
          await db.insert(testResults).values({
            testId: row.id, studentId: st.id,
            marksObtained: Math.round((pct / 100) * Number(b.totalMarks || 100) * 10) / 10,
            accuracy: Math.round((50 + Math.random() * 40) * 10) / 10,
            attemptedPct: Math.round((70 + Math.random() * 28) * 10) / 10,
            correct: 12, wrong: 5, skipped: 3, timeTakenMin: Number(b.durationMin || 60) - 5,
            percentile: Math.round(pct * 10) / 10, rank: Math.floor(Math.random() * 30) + 1,
          });
        }
      }
      // notify students
      const allSt = await db.select().from(users).where(eq(users.role, "student")).limit(30);
      for (const u of allSt.slice(0, 10)) {
        await db.insert(notifications).values({
          userId: u.id, title: `New test: ${b.title}`,
          message: `${b.subject} • ${b.totalMarks} marks • ${b.examDate}`, type: "test",
        });
      }
      return NextResponse.json({ ok: true, id: row.id });
    }
    if (entity === "results") {
      // b: { testId, entries: [{studentId, marks}] }
      const tRows = await db.select().from(tests).where(eq(tests.id, Number(b.testId))).limit(1);
      const total = tRows[0]?.totalMarks ?? 100;
      for (const e of b.entries || []) {
        const pct = total ? (Number(e.marks) / total) * 100 : 0;
        await db.insert(testResults).values({
          testId: Number(b.testId), studentId: Number(e.studentId),
          marksObtained: Number(e.marks),
          accuracy: Math.round((55 + Math.random() * 35) * 10) / 10,
          attemptedPct: 85, correct: 15, wrong: 5, skipped: 2,
          timeTakenMin: tRows[0]?.durationMin ?? 60,
          percentile: Math.round(pct * 10) / 10, rank: 0,
        });
      }
      return NextResponse.json({ ok: true });
    }
    if (entity === "attendance") {
      // b: { date, batchId, marks: [{studentId, status}] }
      for (const m of b.marks || []) {
        const ex = await db.select().from(attendance).where(
          and(eq(attendance.studentId, Number(m.studentId)), eq(attendance.date, b.date))
        ).limit(1);
        if (ex.length) {
          await db.update(attendance).set({ status: m.status }).where(eq(attendance.id, ex[0].id));
        } else {
          await db.insert(attendance).values({
            studentId: Number(m.studentId), batchId: b.batchId ? Number(b.batchId) : null,
            date: b.date, status: m.status, markedBy: session.id,
          });
        }
      }
      return NextResponse.json({ ok: true });
    }
    if (entity === "assignments") {
      const [row] = await db.insert(assignments).values({
        title: b.title, subject: b.subject, topic: b.topic, description: b.description,
        totalMarks: Number(b.totalMarks || 20), deadline: b.deadline,
        batchId: b.batchId ? Number(b.batchId) : null, createdBy: session.id,
      }).returning();
      const stList = b.batchId
        ? await db.select().from(students).where(eq(students.batchId, Number(b.batchId))).limit(60)
        : await db.select().from(students).limit(60);
      for (const st of stList) {
        await db.insert(submissions).values({ assignmentId: row.id, studentId: st.id, status: "pending" });
      }
      return NextResponse.json({ ok: true, id: row.id });
    }
    if (entity === "remarks") {
      const [row] = await db.insert(remarks).values({
        studentId: Number(b.studentId), teacherId: session.teacherId ?? session.id,
        type: b.type || "academic", text: b.text,
      }).returning();
      return NextResponse.json({ ok: true, id: row.id });
    }
    if (entity === "fees-collect") {
      const fRows = await db.select().from(fees).where(eq(fees.id, Number(b.feeId))).limit(1);
      if (!fRows[0]) return NextResponse.json({ error: "Fee not found" }, { status: 404 });
      const f = fRows[0];
      const newPaid = Number(f.paid) + Number(b.amount);
      const status = newPaid >= Number(f.total) ? "paid" : newPaid > 0 ? "partial" : "pending";
      await db.update(fees).set({ paid: newPaid, status }).where(eq(fees.id, f.id));
      await db.insert(feePayments).values({
        feeId: f.id, amount: Number(b.amount), method: b.method || "Cash",
        receiptNo: `RCP-${Date.now().toString().slice(-6)}`,
      });
      return NextResponse.json({ ok: true });
    }
    if (entity === "tasks") {
      const [row] = await db.insert(studyTasks).values({
        studentId: Number(b.studentId), title: b.title, subject: b.subject, topic: b.topic,
        durationMin: Number(b.durationMin || 45), priority: b.priority || "medium",
        dueDate: b.dueDate || new Date().toISOString().slice(0, 10), status: "pending",
      }).returning();
      return NextResponse.json({ ok: true, id: row.id });
    }
    if (entity === "announce") {
      const targets = await db.select().from(users).limit(100);
      for (const u of targets) {
        await db.insert(notifications).values({
          userId: u.id, title: b.title, message: b.message, type: "announcement",
        });
      }
      return NextResponse.json({ ok: true, sent: targets.length });
    }
    return NextResponse.json({ error: "Unknown entity" }, { status: 400 });
  } catch (e: unknown) {
    console.error("manage post", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const entity = searchParams.get("entity");
  const b = await req.json();
  try {
    if (entity === "tasks") {
      await db.update(studyTasks).set({ status: b.status }).where(eq(studyTasks.id, Number(b.id)));
      return NextResponse.json({ ok: true });
    }
    if (entity === "submissions") {
      await db.update(submissions).set({
        status: b.status,
        ...(b.status !== "pending" ? { submittedAt: new Date() } : {}),
      }).where(eq(submissions.id, Number(b.id)));
      return NextResponse.json({ ok: true });
    }
    if (entity === "notifications") {
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, Number(b.id)));
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
