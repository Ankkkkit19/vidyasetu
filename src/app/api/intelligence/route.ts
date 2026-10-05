import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { students, users, recommendations, predictions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { studentIntelligence } from "../dashboard/route";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") || "predict";
  let sid = Number(searchParams.get("studentId") || 0);
  if (!sid) {
    if (session.role === "student") sid = session.studentId ?? 0;
    else if (session.role === "parent") {
      const { parents } = await import("@/db/schema");
      const pr = await db.select().from(parents).where(eq(parents.userId, session.id)).limit(1);
      sid = pr[0]?.studentId ?? 0;
    }
  }
  if (!sid) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  const sRows = await db.select().from(students).where(eq(students.id, sid)).limit(1);
  if (!sRows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const target = sRows[0].targetExam ?? "JEE 2027";

  const d = await studentIntelligence(sid, target);

  if (view === "predict") {
    // persist prediction snapshot
    await db.insert(predictions).values({
      studentId: sid,
      probability: d.intel.probability,
      riskLevel: d.intel.riskLevel,
      positiveFactors: d.intel.positiveFactors,
      negativeFactors: d.intel.negativeFactors,
      trend: d.intel.trend,
    });
    return NextResponse.json({
      probability: d.intel.probability,
      riskLevel: d.intel.riskLevel,
      trend: d.intel.trend,
      insight: d.intel.insight,
      positiveFactors: d.intel.positiveFactors,
      negativeFactors: d.intel.negativeFactors,
      metrics: {
        attendance: d.attendancePct, recentAttendance: d.recentPct,
        testAvg: Math.round(d.testAvg * 10) / 10,
        recentAvg: Math.round(d.recentAvg * 10) / 10,
        accuracy: Math.round(d.accAvg * 10) / 10,
        assignments: Math.round(d.assignPct * 10) / 10,
      },
      subjectAvgs: d.subjectAvgs,
      monthlyTrend: d.monthlyTrend,
      history: d.monthlyTrend,
    });
  }

  if (view === "recommend") {
    const existing = await db.select().from(recommendations).where(eq(recommendations.studentId, sid)).orderBy(desc(recommendations.id)).limit(10);
    return NextResponse.json({
      generated: d.intel.recommendations,
      stored: existing,
      studyPlan: d.intel.studyPlan,
    });
  }

  if (view === "report") {
    const uRows = await db.select().from(users).where(eq(users.id, sRows[0].userId ?? 0)).limit(1);
    const { remarks } = await import("@/db/schema");
    const rem = await db.select().from(remarks).where(eq(remarks.studentId, sid)).orderBy(desc(remarks.id)).limit(5);
    return NextResponse.json({
      student: uRows[0]?.name, rollNo: sRows[0].rollNo, target,
      attendance: d.attendancePct, testAvg: Math.round(d.testAvg * 10) / 10,
      assignments: Math.round(d.assignPct * 10) / 10,
      trend: d.intel.trend, probability: d.intel.probability, risk: d.intel.riskLevel,
      strong: Object.entries(d.subjectAvgs).filter(([, v]) => v >= 65).map(([k]) => k),
      weak: Object.entries(d.subjectAvgs).filter(([, v]) => v < 65).map(([k]) => k),
      recommendations: d.intel.recommendations.slice(0, 3),
      remarks: rem,
      month: new Date().toLocaleString("en-IN", { month: "long", year: "numeric" }),
    });
  }

  return NextResponse.json({ error: "Unknown view" }, { status: 400 });
}
