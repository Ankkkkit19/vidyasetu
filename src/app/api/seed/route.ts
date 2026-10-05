import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  users, courses, batches, students, teachers, parents, attendance,
  tests, testResults, assignments, submissions, fees, feePayments,
  remarks, notifications, recommendations, studyTasks,
} from "@/db/schema";
import bcrypt from "bcryptjs";

const DAYS = 30;

function dateNDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function POST() {
  try {
    const existing = await db.select().from(users).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ ok: true, message: "Already seeded", seeded: false });
    }

    const hash = await bcrypt.hash("password123", 10);
    const adminHash = await bcrypt.hash("admin123", 10);

    // ── Courses ──
    const courseRows = await db.insert(courses).values([
      { name: "JEE Main + Advanced 2027", description: "2-year classroom program for Class 11 — Physics, Chemistry, Maths", duration: "2 Years", targetExam: "JEE 2027", totalFees: 145000 },
      { name: "JEE Main + Advanced 2026", description: "Dropper / Class 12 batch with daily practice + mocks", duration: "1 Year", targetExam: "JEE 2026", totalFees: 120000 },
      { name: "NEET-UG Achiever", description: "Physics, Chemistry, Botany + Zoology with NCERT drills", duration: "2 Years", targetExam: "NEET 2027", totalFees: 135000 },
      { name: "Foundation IX–X", description: "Science + Maths foundation + Olympiad + NTSE", duration: "1 Year", targetExam: "Board + Olympiad", totalFees: 55000 },
    ]).returning();

    // ── Users: admin ──
    const [admin] = await db.insert(users).values({
      name: "Rajesh Sharma", email: "admin@coaching.in", password: adminHash, role: "admin", phone: "9811002233",
    }).returning();

    // ── Teachers ──
    const teacherDefs = [
      { name: "Anita Verma", email: "anita@coaching.in", phone: "9811002244", subjects: "Physics", qualification: "M.Sc Physics, IIT Delhi", exp: 12 },
      { name: "Vikram Singh", email: "vikram@coaching.in", phone: "9811002255", subjects: "Chemistry", qualification: "M.Sc Chemistry, BHU", exp: 9 },
      { name: "Priya Nair", email: "priya@coaching.in", phone: "9811002266", subjects: "Mathematics", qualification: "M.Tech, NIT Trichy", exp: 10 },
      { name: "Dr. Kavita Rao", email: "kavita@coaching.in", phone: "9811002277", subjects: "Biology", qualification: "MBBS, MAMC", exp: 8 },
    ];
    const teacherUsers: typeof admin[] = [];
    for (const t of teacherDefs) {
      const [u] = await db.insert(users).values({ name: t.name, email: t.email, password: hash, role: "teacher", phone: t.phone }).returning();
      teacherUsers.push(u);
      await db.insert(teachers).values({ userId: u.id, subjects: t.subjects, qualification: t.qualification, experienceYears: t.exp });
    }

    // ── Batches ──
    const batchRows = await db.insert(batches).values([
      { name: "JEE 2027 • Morning A", courseId: courseRows[0].id, teacherId: teacherUsers[0].id, schedule: "Mon–Sat • 7:00–11:00 AM", room: "Room 101", capacity: 45, startDate: "2025-06-01", endDate: "2027-03-31", status: "active" },
      { name: "JEE 2026 • Evening Dropper", courseId: courseRows[1].id, teacherId: teacherUsers[2].id, schedule: "Mon–Sat • 3:00–7:00 PM", room: "Room 102", capacity: 40, startDate: "2025-06-01", endDate: "2026-03-31", status: "active" },
      { name: "NEET Achiever B1", courseId: courseRows[2].id, teacherId: teacherUsers[3].id, schedule: "Mon–Sat • 8:00 AM–12:00 PM", room: "Room 201", capacity: 50, startDate: "2025-06-01", endDate: "2027-03-31", status: "active" },
      { name: "Foundation IX • Weekend", courseId: courseRows[3].id, teacherId: teacherUsers[2].id, schedule: "Sat–Sun • 10:00 AM–2:00 PM", room: "Room 301", capacity: 35, startDate: "2025-07-01", endDate: "2026-03-31", status: "active" },
    ]).returning();

    // ── Students (12 profiles: toppers, steady, declining, at-risk) ──
    const studentDefs = [
      { name: "Aarav Mehta", email: "aarav@student.in", gender: "Male", target: "JEE 2027", batch: 0, course: 0, profile: "topper", study: 6.5, parent: "Ramesh Mehta" },
      { name: "Diya Patel", email: "diya@student.in", gender: "Female", target: "JEE 2027", batch: 0, course: 0, profile: "improving", study: 5.5, parent: "Ketan Patel" },
      { name: "Aman Kumar", email: "aman@student.in", gender: "Male", target: "JEE 2027", batch: 0, course: 0, profile: "declining", study: 2.5, parent: "Suresh Kumar" },
      { name: "Sneha Reddy", email: "sneha@student.in", gender: "Female", target: "NEET 2027", batch: 2, course: 2, profile: "topper", study: 6, parent: "Ravi Reddy" },
      { name: "Rohan Gupta", email: "rohan@student.in", gender: "Male", target: "JEE 2026", batch: 1, course: 1, profile: "average", study: 4, parent: "Manoj Gupta" },
      { name: "Ishita Singh", email: "ishita@student.in", gender: "Female", target: "JEE 2027", batch: 0, course: 0, profile: "improving", study: 5, parent: "Ajay Singh" },
      { name: "Karan Joshi", email: "karan@student.in", gender: "Male", target: "JEE 2026", batch: 1, course: 1, profile: "atrisk", study: 2, parent: "Prakash Joshi" },
      { name: "Ananya Das", email: "ananya@student.in", gender: "Female", target: "NEET 2027", batch: 2, course: 2, profile: "average", study: 4.5, parent: "Bijoy Das" },
      { name: "Vivaan Shah", email: "vivaan@student.in", gender: "Male", target: "Board + Olympiad", batch: 3, course: 3, profile: "topper", study: 5, parent: "Nilesh Shah" },
      { name: "Myra Khan", email: "myra@student.in", gender: "Female", target: "JEE 2027", batch: 0, course: 0, profile: "average", study: 3.8, parent: "Imran Khan" },
      { name: "Aditya Yadav", email: "aditya@student.in", gender: "Male", target: "NEET 2027", batch: 2, course: 2, profile: "declining", study: 3, parent: "Ram Yadav" },
      { name: "Navya Menon", email: "navya@student.in", gender: "Female", target: "JEE 2026", batch: 1, course: 1, profile: "improving", study: 5.2, parent: "Sanjay Menon" },
    ];

    const studentIds: number[] = [];
    const studentUserIds: number[] = [];

    for (let i = 0; i < studentDefs.length; i++) {
      const s = studentDefs[i];
      const [u] = await db.insert(users).values({
        name: s.name, email: s.email, password: hash, role: "student", phone: `98${(10000000 + i * 1111111).toString().slice(0, 8)}`,
      }).returning();
      studentUserIds.push(u.id);
      const [st] = await db.insert(students).values({
        userId: u.id,
        rollNo: `STU-${2025}${String(i + 1).padStart(3, "0")}`,
        batchId: batchRows[s.batch].id,
        courseId: courseRows[s.course].id,
        targetExam: s.target,
        enrollmentDate: "2025-06-05",
        gender: s.gender,
        address: "Jaipur, Rajasthan",
        parentName: s.parent,
        parentPhone: `99${(10000000 + i * 2222222).toString().slice(0, 8)}`,
        studyHours: s.study,
        status: "active",
      }).returning();
      studentIds.push(st.id);

      // parent user
      const [pu] = await db.insert(users).values({
        name: s.parent, email: `parent${i + 1}@family.in`, password: hash, role: "parent", phone: `97${(10000000 + i * 3333333).toString().slice(0, 8)}`,
      }).returning();
      await db.insert(parents).values({ userId: pu.id, studentId: st.id, relation: i % 2 === 0 ? "Father" : "Mother" });
    }

    // ── Attendance: 30 days with profile patterns ──
    for (let si = 0; si < studentDefs.length; si++) {
      const prof = studentDefs[si].profile;
      for (let d = DAYS; d >= 0; d--) {
        const r = Math.random();
        let status = "present";
        if (prof === "topper") status = r < 0.96 ? "present" : r < 0.98 ? "late" : "absent";
        else if (prof === "improving") status = d > 12 ? (r < 0.78 ? "present" : r < 0.86 ? "late" : "absent") : (r < 0.93 ? "present" : "late");
        else if (prof === "average") status = r < 0.85 ? "present" : r < 0.9 ? "late" : "absent";
        else if (prof === "declining") status = d > 12 ? (r < 0.9 ? "present" : "late") : (r < 0.68 ? "present" : r < 0.78 ? "late" : "absent");
        else status = r < 0.62 ? "present" : r < 0.74 ? "late" : "absent"; // atrisk
        if (d === 0 && si % 4 === 0) status = "present";
        await db.insert(attendance).values({
          studentId: studentIds[si],
          batchId: batchRows[studentDefs[si].batch].id,
          date: dateNDaysAgo(d),
          status,
          markedBy: admin.id,
        });
      }
    }

    // ── Tests ──
    const testDefs = [
      { title: "Physics: Kinematics + NLM", subject: "Physics", chapter: "Kinematics", difficulty: "Medium", total: 100, neg: "Yes (-0.25)", dur: 90, days: 55, batch: 0 },
      { title: "Chemistry: Mole Concept", subject: "Chemistry", chapter: "Mole Concept", difficulty: "Easy", total: 80, neg: "No", dur: 60, days: 48, batch: 0 },
      { title: "Maths: Quadratic + Sequence", subject: "Mathematics", chapter: "Algebra", difficulty: "Medium", total: 100, neg: "Yes (-0.25)", dur: 90, days: 40, batch: 0 },
      { title: "Physics: Work Energy Power", subject: "Physics", chapter: "Work Energy Power", difficulty: "Hard", total: 120, neg: "Yes (-1)", dur: 120, days: 32, batch: 0 },
      { title: "Chemistry: Organic Basics (GOC)", subject: "Chemistry", chapter: "Organic Chemistry", difficulty: "Hard", total: 100, neg: "Yes (-0.25)", dur: 90, days: 24, batch: 0 },
      { title: "Maths: Trigonometry + Calculus Intro", subject: "Mathematics", chapter: "Calculus", difficulty: "Hard", total: 120, neg: "Yes (-1)", dur: 120, days: 15, batch: 0 },
      { title: "JEE Mock #7 (Full Syllabus)", subject: "Mixed", chapter: "Full Mock", difficulty: "Hard", total: 300, neg: "Yes (-1)", dur: 180, days: 6, batch: 0 },
      { title: "Physics: Current Electricity Quiz", subject: "Physics", chapter: "Current Electricity", difficulty: "Medium", total: 60, neg: "No", dur: 45, days: 2, batch: 0 },
    ];
    const testIds: number[] = [];
    for (const t of testDefs) {
      const [row] = await db.insert(tests).values({
        title: t.title, subject: t.subject, chapter: t.chapter, difficulty: t.difficulty,
        totalMarks: t.total, negativeMarking: t.neg, durationMin: t.dur,
        examDate: dateNDaysAgo(t.days), batchId: batchRows[t.batch].id, createdBy: teacherUsers[0].id,
      }).returning();
      testIds.push(row.id);
    }

    // ── Results per profile ──
    const baseByProfile: Record<string, number> = { topper: 86, improving: 58, average: 66, declining: 74, atrisk: 48 };
    for (let si = 0; si < studentDefs.length; si++) {
      const prof = studentDefs[si].profile;
      const base = baseByProfile[prof] + (Math.random() * 6 - 3);
      for (let ti = 0; ti < testDefs.length; ti++) {
        let drift = 0;
        if (prof === "improving") drift = ti * 2.4;
        if (prof === "declining") drift = -ti * 3.1;
        if (prof === "atrisk") drift = -ti * 1.6;
        if (prof === "topper") drift = ti * 0.5;
        const pct = Math.max(18, Math.min(98, base + drift + (Math.random() * 10 - 5)));
        const total = testDefs[ti].total;
        const marks = Math.round((pct / 100) * total * 10) / 10;
        const acc = Math.max(30, Math.min(98, pct + (Math.random() * 12 - 6)));
        const attempted = Math.max(55, Math.min(100, 78 + Math.random() * 20 - (prof === "atrisk" ? 12 : 0)));
        await db.insert(testResults).values({
          testId: testIds[ti],
          studentId: studentIds[si],
          marksObtained: marks,
          accuracy: Math.round(acc * 10) / 10,
          attemptedPct: Math.round(attempted * 10) / 10,
          correct: Math.round((attempted / 100) * 25 * (acc / 100)),
          wrong: Math.round((attempted / 100) * 25 * (1 - acc / 100)),
          skipped: Math.round(25 * (1 - attempted / 100)),
          timeTakenMin: testDefs[ti].dur - Math.floor(Math.random() * 10),
          percentile: Math.round(pct * 10) / 10,
          rank: Math.floor(Math.random() * 40) + 1,
        });
      }
    }

    // ── Assignments ──
    const assignDefs = [
      { title: "Physics DPP #42 — Current Electricity", subject: "Physics", topic: "Current Electricity", total: 20, days: -2 },
      { title: "Organic Chemistry — GOC Practice Set", subject: "Chemistry", topic: "Organic Chemistry", total: 25, days: -4 },
      { title: "Maths — 20 Calculus Questions", subject: "Mathematics", topic: "Calculus", total: 20, days: 3 },
      { title: "Physics — Rotation Revision Sheet", subject: "Physics", topic: "Mechanics", total: 30, days: -8 },
      { title: "Chemistry — Thermodynamics Numericals", subject: "Chemistry", topic: "Thermodynamics", total: 20, days: 5 },
      { title: "Maths — Algebra Mock Drill", subject: "Mathematics", topic: "Algebra", total: 25, days: -1 },
    ];
    const assignIds: number[] = [];
    for (const a of assignDefs) {
      const dd = new Date();
      dd.setDate(dd.getDate() + a.days);
      const [row] = await db.insert(assignments).values({
        title: a.title, subject: a.subject, topic: a.topic,
        description: "Solve all questions. Show steps. Submit before deadline for evaluation.",
        totalMarks: a.total, deadline: dd.toISOString().slice(0, 10),
        batchId: batchRows[0].id, createdBy: teacherUsers[0].id,
      }).returning();
      assignIds.push(row.id);
    }
    for (let si = 0; si < studentDefs.length; si++) {
      const prof = studentDefs[si].profile;
      for (let ai = 0; ai < assignIds.length; ai++) {
        const r = Math.random();
        let status = "submitted";
        if (prof === "topper") status = r < 0.95 ? "submitted" : "pending";
        else if (prof === "improving") status = r < 0.85 ? "submitted" : "pending";
        else if (prof === "average") status = r < 0.78 ? "submitted" : r < 0.88 ? "late" : "pending";
        else if (prof === "declining") status = r < 0.55 ? "submitted" : r < 0.7 ? "late" : "pending";
        else status = r < 0.45 ? "submitted" : r < 0.6 ? "late" : "pending";
        await db.insert(submissions).values({
          assignmentId: assignIds[ai],
          studentId: studentIds[si],
          status,
          submittedAt: status === "pending" ? null : new Date(),
          marks: status === "pending" ? null : Math.round((14 + Math.random() * 6) * 10) / 10,
        });
      }
    }

    // ── Fees ──
    for (let si = 0; si < studentDefs.length; si++) {
      const total = si % 3 === 0 ? 145000 : si % 3 === 1 ? 120000 : 135000;
      const paid = [145000, 90000, 60000, 120000, 40000, 100000, 25000, 80000, 55000, 70000, 45000, 95000][si];
      const status = paid >= total ? "paid" : paid >= total * 0.5 ? "partial" : "pending";
      const due = new Date();
      due.setDate(due.getDate() + (si % 2 === 0 ? 12 : -6));
      const [fee] = await db.insert(fees).values({
        studentId: studentIds[si], total, paid, discount: si === 5 ? 5000 : 0,
        dueDate: due.toISOString().slice(0, 10), status,
      }).returning();
      if (paid > 0) {
        await db.insert(feePayments).values({
          feeId: fee.id, amount: Math.round(paid / 2), method: "UPI", receiptNo: `RCP-2025-${1000 + si}`,
        });
        await db.insert(feePayments).values({
          feeId: fee.id, amount: paid - Math.round(paid / 2), method: "Cash", receiptNo: `RCP-2025-${2000 + si}`,
        });
      }
    }

    // ── Remarks ──
    const remarkTexts = [
      { type: "academic", text: "Good improvement this month. Keep solving DPPs daily." },
      { type: "behaviour", text: "Very disciplined in class. Helps peers during doubt sessions." },
      { type: "improvement", text: "Physics numericals need more practice. Attend extra doubt class on Saturday." },
      { type: "academic", text: "Test temperament is good but silly mistakes in Chemistry — revise NCERT lines." },
      { type: "improvement", text: "Attendance dropped last two weeks. Please meet mentor with parent." },
    ];
    for (let si = 0; si < studentDefs.length; si += 2) {
      await db.insert(remarks).values({
        studentId: studentIds[si],
        teacherId: teacherUsers[si % teacherUsers.length].id,
        type: remarkTexts[si % remarkTexts.length].type,
        text: remarkTexts[si % remarkTexts.length].text,
      });
    }

    // ── Recommendations + study tasks ──
    for (let si = 0; si < studentDefs.length; si++) {
      const prof = studentDefs[si].profile;
      const recs =
        prof === "topper"
          ? [
            { title: "Full-length mock every Sunday", description: "Attempt JEE mock under exam conditions + 2hr analysis.", priority: "medium", subject: "Mixed", min: 180 },
            { title: "Error notebook revision", description: "Revise all marked mistakes twice a week.", priority: "low", subject: "Mixed", min: 30 },
          ]
          : prof === "atrisk" || prof === "declining"
            ? [
              { title: "Priority repair: Physics", description: "30 min concept revision + 20 mixed questions daily for 7 days.", priority: "high", subject: "Physics", min: 45 },
              { title: "Restore attendance rhythm", description: "Attend all classes for 2 weeks; cover backlog via recordings.", priority: "high", subject: "Discipline", min: 20 },
              { title: "Clear assignment backlog", description: "Complete pending assignments oldest-first, 2 per day.", priority: "medium", subject: "Consistency", min: 60 },
            ]
            : [
              { title: "Consolidate weakest subject", description: "Increase practice by 30 min/day + 2 extra sectional tests.", priority: "medium", subject: "Chemistry", min: 40 },
              { title: "Accuracy bootcamp", description: "15 timed questions daily + error log. Target 70%+ accuracy.", priority: "medium", subject: "Exam Skills", min: 40 },
            ];
      for (const r of recs) {
        await db.insert(recommendations).values({
          studentId: studentIds[si], title: r.title, description: r.description,
          priority: r.priority, subject: r.subject, estimatedMin: r.min, status: "pending",
        });
      }
      await db.insert(studyTasks).values([
        { studentId: studentIds[si], title: "Physics — Current Electricity drill", subject: "Physics", topic: "Current Electricity", durationMin: 45, priority: "high", dueDate: new Date().toISOString().slice(0, 10), status: "pending" },
        { studentId: studentIds[si], title: "Chemistry — Organic revision", subject: "Chemistry", topic: "GOC + Isomerism", durationMin: 30, priority: "medium", dueDate: new Date().toISOString().slice(0, 10), status: "pending" },
        { studentId: studentIds[si], title: "Maths — 20 mixed questions", subject: "Mathematics", topic: "Algebra", durationMin: 45, priority: "low", dueDate: new Date().toISOString().slice(0, 10), status: "pending" },
      ]);
    }

    // ── Notifications ──
    const notifDefs = [
      { title: "New test scheduled: JEE Mock #7", message: "Full-syllabus mock on Sunday 9 AM. Syllabus + admit card in Tests section.", type: "test" },
      { title: "Assignment deadline near", message: "Physics DPP #42 due in 2 days. Submit to avoid late marking.", type: "assignment" },
      { title: "Fee reminder", message: "Installment due this week. Pay to avoid late fee.", type: "fee" },
      { title: "PTM on Saturday", message: "Parent-teacher meeting 10 AM–1 PM. Performance report will be shared.", type: "announcement" },
    ];
    const allUsers = await db.select().from(users);
    for (const u of allUsers.slice(0, 20)) {
      for (const n of notifDefs.slice(0, 2)) {
        await db.insert(notifications).values({ userId: u.id, title: n.title, message: n.message, type: n.type });
      }
    }

    return NextResponse.json({ ok: true, seeded: true, counts: { students: studentIds.length, tests: testIds.length } });
  } catch (e) {
    console.error("seed error", e);
    return NextResponse.json({ error: "Seed failed: " + String(e) }, { status: 500 });
  }
}

export async function GET() {
  const rows = await db.select().from(users).limit(1);
  return NextResponse.json({ seeded: rows.length > 0 });
}
