import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  users, students, teachers, batches, attendance, tests, testResults,
  assignments, submissions, fees, courses,
} from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { computeIntelligence } from "@/lib/analytics";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function studentIntelligence(studentId: number, targetExam: string) {
  const att = await db.select().from(attendance).where(eq(attendance.studentId, studentId));
  const total = att.length || 1;
  const present = att.filter((a) => a.status === "present").length + att.filter((a) => a.status === "late").length * 0.5;
  const attendancePct = Math.round((present / total) * 1000) / 10;
  const recent = att.slice(-10);
  const rTot = recent.length || 1;
  const rPres = recent.filter((a) => a.status === "present").length + recent.filter((a) => a.status === "late").length * 0.5;
  const recentPct = Math.round((rPres / rTot) * 1000) / 10;

  const res = await db.select({ r: testResults, t: tests })
    .from(testResults)
    .leftJoin(tests, eq(testResults.testId, tests.id))
    .where(eq(testResults.studentId, studentId));

  const pcts = res.map(({ r, t }) => (t?.totalMarks ? (Number(r.marksObtained) / t.totalMarks) * 100 : 0));
  const testAvg = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
  const recentAvg = pcts.slice(-3).length ? pcts.slice(-3).reduce((a, b) => a + b, 0) / pcts.slice(-3).length : testAvg;
  const accAvg = res.length ? res.reduce((a, { r }) => a + Number(r.accuracy), 0) / res.length : 0;

  const subs = await db.select().from(submissions).where(eq(submissions.studentId, studentId));
  const assignPct = subs.length ? (subs.filter((s) => s.status !== "pending").length / subs.length) * 100 : 0;

  const stRows = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  const studyHours = Number(stRows[0]?.studyHours ?? 4);

  const bySubject: Record<string, number[]> = {};
  res.forEach(({ r, t }) => {
    const subj = t?.subject ?? "Mixed";
    const p = t?.totalMarks ? (Number(r.marksObtained) / t.totalMarks) * 100 : 0;
    if (!bySubject[subj]) bySubject[subj] = [];
    bySubject[subj].push(p);
  });
  const subjectAvgs: Record<string, number> = {};
  const subjectTrends: Record<string, number> = {};
  for (const [k, v] of Object.entries(bySubject)) {
    subjectAvgs[k] = v.reduce((a, b) => a + b, 0) / v.length;
    subjectTrends[k] = v.length > 1 ? (v[v.length - 1] - v[0]) / (v.length - 1) : 0;
  }
  if (Object.keys(subjectAvgs).length === 0) {
    subjectAvgs["Physics"] = 60; subjectAvgs["Chemistry"] = 60; subjectAvgs["Mathematics"] = 60;
  }

  const monthlyTrend = pcts.slice(-5).map((avg, i) => ({ month: `T${i + 1}`, avg: Math.round(avg * 10) / 10 }));

  const intel = computeIntelligence({
    attendancePct, attendanceRecentPct: recentPct,
    testAvgPct: testAvg, recentAvgPct: recentAvg, accuracyAvg: accAvg,
    assignmentCompletion: assignPct, studyHours, subjectAvgs, subjectTrends,
    monthlyTrend: monthlyTrend.length ? monthlyTrend : [{ month: "Now", avg: testAvg }],
    mockParticipation: Math.min(1, res.length / 7),
  }, targetExam);

  return { attendancePct, recentPct, testAvg, recentAvg, accAvg, assignPct, subjectAvgs, subjectTrends, monthlyTrend, intel, testCount: res.length };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") || session.role;
  const studentIdParam = searchParams.get("studentId");

  try {
    // ── ADMIN overview ──
    if (view === "admin") {
      const [sCount] = await db.select({ c: sql<number>`count(*)` }).from(students);
      const [sActive] = await db.select({ c: sql<number>`count(*)` }).from(students).where(eq(students.status, "active"));
      const [tCount] = await db.select({ c: sql<number>`count(*)` }).from(teachers);
      const [bCount] = await db.select({ c: sql<number>`count(*)` }).from(batches);
      const [cCount] = await db.select({ c: sql<number>`count(*)` }).from(courses);
      const todayAtt = await db.select().from(attendance).where(eq(attendance.date, todayStr()));
      const todayPresent = todayAtt.filter((a) => a.status !== "absent").length;
      const feeRows = await db.select().from(fees);
      const pendingFees = feeRows.reduce((a, f) => a + (Number(f.total) - Number(f.paid)), 0);
      const upcomingTests = await db.select().from(tests).orderBy(desc(tests.examDate)).limit(5);
      const assignRows = await db.select().from(assignments).limit(50);

      // student intelligence summary
      const allStudents = await db.select({ s: students, u: users })
        .from(students).leftJoin(users, eq(students.userId, users.id)).limit(60);
      const summaries: { id: number; name: string; target: string; prob: number; risk: string; avg: number; att: number }[] = [];
      for (const { s, u } of allStudents) {
        const d = await studentIntelligence(s.id, s.targetExam ?? "JEE 2027");
        summaries.push({
          id: s.id, name: u?.name ?? "Student", target: s.targetExam ?? "",
          prob: d.intel.probability, risk: d.intel.riskLevel,
          avg: Math.round(d.testAvg * 10) / 10, att: d.attendancePct,
        });
      }
      summaries.sort((a, b) => a.prob - b.prob);
      const avgPerf = summaries.length ? Math.round((summaries.reduce((a, s) => a + s.avg, 0) / summaries.length) * 10) / 10 : 0;
      const highRisk = summaries.filter((s) => s.risk === "high");

      // monthly fee collection + attendance trend (last 8 records grouped)
      const attTrendRaw = await db.select({ date: attendance.date, status: attendance.status }).from(attendance).limit(400);
      const byDate: Record<string, { p: number; t: number }> = {};
      attTrendRaw.forEach((r) => {
        if (!byDate[r.date]) byDate[r.date] = { p: 0, t: 0 };
        byDate[r.date].t += 1;
        if (r.status !== "absent") byDate[r.date].p += 1;
      });
      const attTrend = Object.entries(byDate).slice(-10).map(([date, v]) => ({ date: date.slice(5), pct: Math.round((v.p / v.t) * 100) }));

      return NextResponse.json({
        totals: {
          students: Number(sCount?.c ?? 0), active: Number(sActive?.c ?? 0),
          teachers: Number(tCount?.c ?? 0), batches: Number(bCount?.c ?? 0),
          courses: Number(cCount?.c ?? 0),
          todayAttendance: todayAtt.length ? `${todayPresent}/${todayAtt.length}` : "—",
          todayPct: todayAtt.length ? Math.round((todayPresent / todayAtt.length) * 100) : 0,
          pendingFees, avgPerf, highRiskCount: highRisk.length,
        },
        upcomingTests, summaries, highRisk: highRisk.slice(0, 8),
        attTrend, assignments: assignRows.slice(0, 5),
      });
    }

    // ── Single student deep analytics ──
    if (view === "student-detail") {
      const sid = Number(studentIdParam);
      if (!sid) return NextResponse.json({ error: "studentId required" }, { status: 400 });
      const sRows = await db.select({ s: students, u: users }).from(students)
        .leftJoin(users, eq(students.userId, users.id)).where(eq(students.id, sid)).limit(1);
      if (!sRows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const { s, u } = sRows[0];
      const d = await studentIntelligence(s.id, s.targetExam ?? "JEE 2027");

      const res = await db.select({ r: testResults, t: tests }).from(testResults)
        .leftJoin(tests, eq(testResults.testId, tests.id)).where(eq(testResults.studentId, sid));
      const history = res.map(({ r, t }) => ({
        id: r.id, title: t?.title ?? "", subject: t?.subject ?? "",
        chapter: t?.chapter, total: t?.totalMarks ?? 100,
        marks: Number(r.marksObtained),
        pct: t?.totalMarks ? Math.round((Number(r.marksObtained) / t.totalMarks) * 1000) / 10 : 0,
        accuracy: Number(r.accuracy), date: t?.examDate,
      }));

      const batchRows = s.batchId ? await db.select().from(batches).where(eq(batches.id, s.batchId)).limit(1) : [];
      const courseRows = s.courseId ? await db.select().from(courses).where(eq(courses.id, s.courseId)).limit(1) : [];
      const feeRows = await db.select().from(fees).where(eq(fees.studentId, sid));
      const subs = await db.select({ sub: submissions, a: assignments }).from(submissions)
        .leftJoin(assignments, eq(submissions.assignmentId, assignments.id))
        .where(eq(submissions.studentId, sid));

      // rank among all
      const allAvgs: { id: number; avg: number }[] = [];
      const allSt = await db.select().from(students).limit(60);
      for (const st of allSt) {
        const rr = await db.select({ r: testResults, t: tests }).from(testResults)
          .leftJoin(tests, eq(testResults.testId, tests.id)).where(eq(testResults.studentId, st.id));
        const pp = rr.map(({ r, t }) => (t?.totalMarks ? (Number(r.marksObtained) / t.totalMarks) * 100 : 0));
        allAvgs.push({ id: st.id, avg: pp.length ? pp.reduce((a, b) => a + b, 0) / pp.length : 0 });
      }
      allAvgs.sort((a, b) => b.avg - a.avg);
      const rank = allAvgs.findIndex((x) => x.id === sid) + 1;

      return NextResponse.json({
        profile: {
          id: s.id, name: u?.name, email: u?.email, phone: u?.phone,
          rollNo: s.rollNo, target: s.targetExam, batch: batchRows[0]?.name,
          course: courseRows[0]?.name, studyHours: s.studyHours, gender: s.gender,
          parentName: s.parentName, rank, totalStudents: allAvgs.length,
        },
        analytics: d, history,
        fees: feeRows[0] ? { ...feeRows[0], pending: Number(feeRows[0].total) - Number(feeRows[0].paid) } : null,
        assignments: subs.map(({ sub, a }) => ({
          id: sub.id, title: a?.title, subject: a?.subject, deadline: a?.deadline,
          status: sub.status, marks: sub.marks ? Number(sub.marks) : null,
        })),
      });
    }

    // ── Teacher overview ──
    if (view === "teacher") {
      const myBatches = session.teacherId
        ? await db.select().from(batches)
        : await db.select().from(batches).limit(10);
      const allStudents = await db.select({ s: students, u: users }).from(students)
        .leftJoin(users, eq(students.userId, users.id)).limit(40);
      const list: { id: number; name: string; batchId: number | null; prob: number; risk: string; avg: number; att: number; trend: string }[] = [];
      for (const { s, u } of allStudents) {
        const d = await studentIntelligence(s.id, s.targetExam ?? "JEE 2027");
        list.push({
          id: s.id, name: u?.name ?? "", batchId: s.batchId,
          prob: d.intel.probability, risk: d.intel.riskLevel,
          avg: Math.round(d.testAvg * 10) / 10, att: d.attendancePct, trend: d.intel.trend,
        });
      }
      const needAttention = list.filter((x) => x.risk === "high").concat(list.filter((x) => x.risk === "medium").slice(0, 3));
      const upcoming = await db.select().from(tests).orderBy(desc(tests.examDate)).limit(4);
      const pendingAssign = await db.select().from(assignments).limit(5);
      return NextResponse.json({ batches: myBatches, students: list, needAttention: needAttention.slice(0, 8), upcoming, pendingAssign });
    }

    return NextResponse.json({ error: "Unknown view" }, { status: 400 });
  } catch (e) {
    console.error("dashboard error", e);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}

export { studentIntelligence };
