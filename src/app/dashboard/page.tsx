"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie,
} from "recharts";

// ─── Types ───
interface SessionUser { id: number; name: string; email: string; role: string; studentId?: number | null; teacherId?: number | null; parentStudentId?: number | null; }
interface AdminData {
  totals: { students: number; active: number; teachers: number; batches: number; courses: number; todayAttendance: string; todayPct: number; pendingFees: number; avgPerf: number; highRiskCount: number };
  upcomingTests: { id: number; title: string; subject: string; examDate: string; totalMarks: number }[];
  summaries: { id: number; name: string; target: string; prob: number; risk: string; avg: number; att: number }[];
  highRisk: { id: number; name: string; target: string; prob: number; risk: string; avg: number; att: number }[];
  attTrend: { date: string; pct: number }[];
  assignments: { id: number; title: string; subject: string; deadline: string }[];
}
interface StudentDetail {
  profile: { id: number; name: string; email: string; phone: string; rollNo: string; target: string; batch: string; course: string; studyHours: number; rank: number; totalStudents: number; parentName: string };
  analytics: {
    attendancePct: number; recentPct: number; testAvg: number; recentAvg: number; accAvg: number; assignPct: number;
    subjectAvgs: Record<string, number>; monthlyTrend: { month: string; avg: number }[];
    intel: { probability: number; riskLevel: string; trend: string; positiveFactors: string[]; negativeFactors: string[]; recommendations: { title: string; description: string; priority: string; subject: string; estimatedMin: number }[]; studyPlan: { title: string; subject: string; topic: string; durationMin: number; priority: string; reason: string }[]; insight: string };
    testCount: number;
  };
  history: { id: number; title: string; subject: string; chapter: string; total: number; marks: number; pct: number; accuracy: number; date: string }[];
  fees: { total: number; paid: number; pending: number; status: string; dueDate: string; id: number } | null;
  assignments: { id: number; title: string; subject: string; deadline: string; status: string; marks: number | null }[];
}

// ─── Small UI atoms ───
function RiskBadge({ risk }: { risk: string }) {
  const map: Record<string, string> = {
    low: "bg-emerald-100 text-emerald-700 border-emerald-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    high: "bg-rose-100 text-rose-700 border-rose-200",
  };
  const dot: Record<string, string> = { low: "🟢", medium: "🟡", high: "🔴" };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${map[risk] ?? map.medium}`}>
      {dot[risk] ?? "🟡"} {risk.toUpperCase()} RISK
    </span>
  );
}

function ProbDial({ value, size = 120 }: { value: number; size?: number }) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const color = value >= 72 ? "#10b981" : value >= 55 ? "#f59e0b" : "#f43f5e";
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={11} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={11}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * value) / 100}
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute text-center">
        <div className="font-black leading-none" style={{ fontSize: size * 0.26 }}>{value}<span className="text-sm text-slate-400">%</span></div>
        <div className="text-[10px] font-bold text-slate-500 tracking-wider">SUCCESS</div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub, grad }: { icon: string; label: string; value: string; sub?: string; grad: string }) {
  return (
    <div className={`rounded-2xl p-5 text-white bg-gradient-to-br ${grad} card-hover shadow-lg`}>
      <div className="flex items-center justify-between">
        <div className="text-3xl">{icon}</div>
        <div className="text-[11px] font-bold opacity-80 tracking-widest">{label}</div>
      </div>
      <div className="text-3xl font-black mt-2">{value}</div>
      {sub && <div className="text-xs opacity-80 mt-1">{sub}</div>}
    </div>
  );
}

function Section({ title, sub, right, children }: { title: string; sub?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-extrabold text-slate-900">{title}</h3>
          {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto scroll-thin" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-lg">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const btnPrimary = "px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-60";
const btnGhost = "px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold hover:bg-slate-50";

// ─── Main ───
export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [teacher, setTeacher] = useState<{ batches: { id: number; name: string; schedule: string; room: string }[]; students: { id: number; name: string; batchId: number | null; prob: number; risk: string; avg: number; att: number; trend: string }[]; needAttention: { id: number; name: string; prob: number; risk: string; avg: number; att: number }[]; upcoming: { id: number; title: string; subject: string; examDate: string }[]; pendingAssign: { id: number; title: string; subject: string; deadline: string }[] } | null>(null);
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // lists
  const [students, setStudents] = useState<{ id: number; name: string; email: string; phone: string; rollNo: string; batchId: number | null; batch: string; courseId: number | null; course: string; target: string; status: string; studyHours: number; parentName: string; parentPhone: string }[]>([]);
  const [batches, setBatches] = useState<{ id: number; name: string; schedule: string; room: string; strength: number; teacher: string; status: string; courseId: number | null; teacherId: number | null; capacity: number; startDate: string; endDate: string }[]>([]);
  const [courses, setCourses] = useState<{ id: number; name: string; targetExam: string; totalFees: number; duration: string }[]>([]);
  const [teachersList, setTeachersList] = useState<{ id: number; name: string; email: string; phone: string; subjects: string; qualification: string; exp: number }[]>([]);
  const [testsList, setTestsList] = useState<{ id: number; title: string; subject: string; chapter: string; difficulty: string; totalMarks: number; examDate: string; attempts: number; avg: number }[]>([]);
  const [assignList, setAssignList] = useState<{ id: number; title: string; subject: string; topic: string; deadline: string; submitted: number; late: number; pending: number; total: number }[]>([]);
  const [feesList, setFeesList] = useState<{ id: number; studentId: number; student: string; total: number; paid: number; pending: number; status: string; dueDate: string }[]>([]);
  const [feesSummary, setFeesSummary] = useState({ total: 0, paid: 0, pending: 0 });
  const [attRows, setAttRows] = useState<{ studentId: number; name: string; rollNo: string; batchId: number | null; status: string }[]>([]);
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [attBatch, setAttBatch] = useState("");
  const [remarks, setRemarks] = useState<{ id: number; studentId: number; studentName: string; type: string; text: string; createdAt: string }[]>([]);
  const [notifs, setNotifs] = useState<{ id: number; title: string; message: string; type: string; isRead: boolean; createdAt: string }[]>([]);
  const [tasks, setTasks] = useState<{ id: number; title: string; subject: string; topic: string; durationMin: number; priority: string; status: string; dueDate: string }[]>([]);
  const [results, setResults] = useState<{ id: number; test: string; subject: string; total: number; student: string; marks: number; pct: number; accuracy: number; rank: number }[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState<{ student: string; rollNo: string; target: string; attendance: number; testAvg: number; assignments: number; trend: string; probability: number; risk: string; strong: string[]; weak: string[]; recommendations: { title: string; description: string }[]; remarks: { text: string; type: string }[]; month: string } | null>(null);
  const [showNotifs, setShowNotifs] = useState(false);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // ── boot ──
  useEffect(() => {
    (async () => {
      try {
        const me = await fetch("/api/auth").then((r) => r.json());
        if (!me.user) { router.push("/login"); return; }
        setUser(me.user);
        if (me.user.role === "student" && me.user.studentId) setDetailId(me.user.studentId);
        if (me.user.role === "parent" && me.user.parentStudentId) setDetailId(me.user.parentStudentId);
      } catch { router.push("/login"); }
      finally { setLoading(false); }
    })();
  }, [router]);

  // ── role data ──
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        if (user.role === "admin") {
          const j = await fetch("/api/dashboard?view=admin").then((r) => r.json());
          if (!j.error) setAdmin(j);
          const s = await fetch("/api/students").then((r) => r.json());
          if (s.students) { setStudents(s.students); setBatches(s.batches ?? []); setCourses(s.courses ?? []); }
          const m = await fetch("/api/manage?entity=teachers").then((r) => r.json());
          if (m.teachers) setTeachersList(m.teachers);
          const t = await fetch("/api/manage?entity=tests").then((r) => r.json());
          if (t.tests) setTestsList(t.tests);
          const a = await fetch("/api/manage?entity=assignments").then((r) => r.json());
          if (a.assignments) setAssignList(a.assignments);
          const f = await fetch("/api/manage?entity=fees").then((r) => r.json());
          if (f.fees) { setFeesList(f.fees); setFeesSummary(f.summary); }
          const bb = await fetch("/api/manage?entity=batches").then((r) => r.json());
          if (bb.batches) setBatches(bb.batches);
          const rm = await fetch("/api/manage?entity=remarks").then((r) => r.json());
          if (rm.remarks) setRemarks(rm.remarks);
          const rr = await fetch("/api/manage?entity=results").then((r) => r.json());
          if (rr.results) setResults(rr.results);
        } else if (user.role === "teacher") {
          const j = await fetch("/api/dashboard?view=teacher").then((r) => r.json());
          if (!j.error) setTeacher(j);
          const rm = await fetch("/api/manage?entity=remarks").then((r) => r.json());
          if (rm.remarks) setRemarks(rm.remarks);
          const t = await fetch("/api/manage?entity=tests").then((r) => r.json());
          if (t.tests) setTestsList(t.tests);
          const a = await fetch("/api/manage?entity=assignments").then((r) => r.json());
          if (a.assignments) setAssignList(a.assignments);
        }
        const n = await fetch("/api/manage?entity=notifications").then((r) => r.json());
        if (n.notifications) setNotifs(n.notifications);
      } catch (e) { console.error(e); }
    })();
  }, [user, refreshKey]);

  // ── student detail ──
  useEffect(() => {
    if (!detailId) return;
    (async () => {
      const j = await fetch(`/api/dashboard?view=student-detail&studentId=${detailId}`).then((r) => r.json());
      if (!j.error) setDetail(j);
      const tk = await fetch(`/api/manage?entity=tasks&studentId=${detailId}`).then((r) => r.json());
      if (tk.tasks) setTasks(tk.tasks);
      const rm = await fetch(`/api/manage?entity=remarks&studentId=${detailId}`).then((r) => r.json());
      if (rm.remarks) setRemarks(rm.remarks);
      const rp = await fetch(`/api/intelligence?view=report&studentId=${detailId}`).then((r) => r.json());
      if (!rp.error) setReport(rp);
    })();
  }, [detailId, refreshKey]);

  // ── attendance rows ──
  useEffect(() => {
    if (!user || !["admin", "teacher"].includes(user.role)) return;
    if (tab !== "attendance") return;
    (async () => {
      const j = await fetch(`/api/manage?entity=attendance&date=${attDate}&batchId=${attBatch}`).then((r) => r.json());
      if (j.rows) setAttRows(j.rows);
    })();
  }, [user, tab, attDate, attBatch, refreshKey]);

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  function setF(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submitModal() {
    setSaving(true);
    try {
      if (modal === "student") {
        const res = await fetch("/api/students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        if (!res.ok) throw new Error((await res.json()).error);
      } else if (modal === "teacher") {
        await fetch("/api/manage?entity=teachers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      } else if (modal === "batch") {
        await fetch("/api/manage?entity=batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      } else if (modal === "course") {
        await fetch("/api/manage?entity=courses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      } else if (modal === "test") {
        await fetch("/api/manage?entity=tests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      } else if (modal === "assignment") {
        await fetch("/api/manage?entity=assignments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      } else if (modal === "remark") {
        await fetch("/api/manage?entity=remarks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, studentId: detailId ?? form.studentId }) });
      } else if (modal === "fee") {
        await fetch("/api/manage?entity=fees-collect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      } else if (modal === "announce") {
        await fetch("/api/manage?entity=announce", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      } else if (modal === "task") {
        await fetch("/api/manage?entity=tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, studentId: detailId }) });
      }
      setModal(null); setForm({}); refresh();
    } catch (e) { alert(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  async function saveAttendance() {
    setSaving(true);
    await fetch("/api/manage?entity=attendance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: attDate, batchId: attBatch || null, marks: attRows.map((r) => ({ studentId: r.studentId, status: r.status === "unmarked" ? "present" : r.status })) }),
    });
    setSaving(false); refresh(); alert("Attendance saved ✓");
  }

  async function toggleTask(id: number, status: string) {
    await fetch("/api/manage?entity=tasks", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: status === "done" ? "pending" : "done" }) });
    refresh();
  }

  async function submitAssignment(subId: number) {
    await fetch("/api/manage?entity=submissions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: subId, status: "submitted" }) });
    refresh();
  }

  if (loading) return <div className="min-h-screen grid place-items-center bg-slate-100"><div className="text-center"><div className="text-5xl animate-bounce">🎓</div><div className="mt-3 font-bold text-slate-500">Loading ERP…</div></div></div>;
  if (!user) return null;

  const unread = notifs.filter((n) => !n.isRead).length;

  const adminNav = [
    ["overview", "📊 Overview"], ["students", "🎓 Students"], ["teachers", "👩‍🏫 Teachers"],
    ["batches", "🏫 Batches"], ["attendance", "📅 Attendance"], ["tests", "📝 Tests & Results"],
    ["assignments", "📚 Assignments"], ["fees", "💰 Fees"], ["intelligence", "🧠 Intelligence"], ["announce", "📢 Notify"],
  ];
  const teacherNav = [
    ["overview", "📊 Overview"], ["students", "🎓 My Students"], ["attendance", "📅 Attendance"],
    ["tests", "📝 Tests"], ["assignments", "📚 Assignments"], ["remarks", "💬 Remarks"],
  ];
  const studentNav = [
    ["overview", "📊 My Performance"], ["tests", "📝 Test History"], ["assignments", "📚 Assignments"],
    ["planner", "🗓️ Study Planner"], ["report", "📄 Report Card"],
  ];
  const parentNav = [["overview", "📊 Child Progress"], ["report", "📄 Report"], ["fees", "💰 Fees"]];
  const nav = user.role === "admin" ? adminNav : user.role === "teacher" ? teacherNav : user.role === "student" ? studentNav : parentNav;

  const filteredStudents = students.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.rollNo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* SIDEBAR */}
      <aside className="w-60 shrink-0 bg-[#0b1120] text-white hidden md:flex flex-col sticky top-0 h-screen">
        <Link href="/" className="flex items-center gap-2.5 p-5 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 grid place-items-center text-xl">🎓</div>
          <div>
            <div className="font-extrabold leading-none">VidyaSetu</div>
            <div className="text-[10px] text-indigo-300 tracking-[0.2em] font-bold mt-1">{user.role.toUpperCase()} PANEL</div>
          </div>
        </Link>
        <div className="flex-1 overflow-y-auto scroll-thin p-3 space-y-1">
          {nav.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition ${tab === k ? "bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg" : "hover:bg-white/5 text-slate-300"}`}>
              {label}
            </button>
          ))}
          {(user.role === "admin" || user.role === "teacher") && detailId && (
            <div className="pt-3">
              <div className="text-[10px] font-black tracking-widest text-slate-500 px-4 mb-1">INSPECT STUDENT</div>
              <select value={detailId ?? ""} onChange={(e) => { setDetailId(Number(e.target.value)); setTab(user.role === "admin" ? "intelligence" : "students"); }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm">
                <option value="">Select…</option>
                {(user.role === "admin" ? students.map((s) => ({ id: s.id, name: s.name })) : (teacher?.students ?? [])).map((s) => (
                  <option key={s.id} value={s.id} className="text-slate-900">{s.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center font-black">{user.name[0]}</div>
            <div className="min-w-0">
              <div className="text-sm font-bold truncate">{user.name}</div>
              <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
            </div>
          </div>
          <button onClick={logout} className="mt-3 w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold">Logout ⟶</button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 min-w-0">
        {/* TOPBAR */}
        <header className="sticky top-0 z-30 bg-white/85 glass border-b border-slate-200 px-4 md:px-7 py-3.5 flex items-center gap-3">
          <div className="md:hidden font-extrabold">🎓 VidyaSetu</div>
          <div className="hidden md:block">
            <h1 className="font-extrabold text-lg leading-none capitalize">{tab.replace("-", " ")}</h1>
            <p className="text-xs text-slate-500 mt-1">Welcome, {user.name.split(" ")[0]} — here&apos;s what needs your attention today.</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="md:hidden flex gap-1 overflow-x-auto max-w-[45vw]">
              {nav.map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${tab === k ? "bg-indigo-600 text-white" : "bg-slate-100"}`}>{l.split(" ")[0]}</button>
              ))}
            </div>
            <div className="relative">
              <button onClick={() => setShowNotifs((s) => !s)} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 grid place-items-center text-lg relative">
                🔔{unread > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black grid place-items-center">{unread}</span>}
              </button>
              {showNotifs && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 max-h-96 overflow-y-auto scroll-thin">
                  <div className="font-extrabold text-sm px-1 pb-2">Notifications</div>
                  {notifs.length === 0 && <div className="text-xs text-slate-400 px-1">No notifications.</div>}
                  {notifs.map((n) => (
                    <div key={n.id} className={`rounded-xl p-3 mb-2 text-xs ${n.isRead ? "bg-slate-50" : "bg-indigo-50 border border-indigo-100"}`}>
                      <div className="font-bold">{n.title}</div>
                      <div className="text-slate-500 mt-0.5">{n.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={logout} className="md:hidden px-3 py-2 rounded-xl bg-slate-100 text-xs font-bold">Logout</button>
          </div>
        </header>

        <main className="p-4 md:p-7 space-y-5 max-w-7xl mx-auto">
          {/* ═════════ ADMIN ═════════ */}
          {user.role === "admin" && (
            <>
              {tab === "overview" && admin && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Stat icon="🎓" label="TOTAL STUDENTS" value={String(admin.totals.students)} sub={`${admin.totals.active} active`} grad="from-indigo-600 to-violet-600" />
                    <Stat icon="👩‍🏫" label="TEACHERS / BATCHES" value={`${admin.totals.teachers}/${admin.totals.batches}`} sub={`${admin.totals.courses} courses`} grad="from-emerald-500 to-teal-600" />
                    <Stat icon="📅" label="TODAY ATTENDANCE" value={admin.totals.todayAttendance} sub={`${admin.totals.todayPct}% present`} grad="from-sky-500 to-blue-600" />
                    <Stat icon="💰" label="PENDING FEES" value={`₹${(admin.totals.pendingFees / 1000).toFixed(0)}k`} sub={`Avg perf ${admin.totals.avgPerf}%`} grad="from-amber-500 to-orange-600" />
                  </div>
                  {admin.highRisk.length > 0 && (
                    <div className="rounded-2xl bg-gradient-to-r from-rose-600 to-orange-500 text-white p-5 flex flex-wrap items-center gap-4 shadow-lg">
                      <div className="text-3xl">🚨</div>
                      <div className="flex-1 min-w-52">
                        <div className="font-extrabold">Early Warning: {admin.totals.highRiskCount} high-risk students need intervention</div>
                        <div className="text-sm opacity-90">{admin.highRisk.slice(0, 3).map((s) => s.name).join(", ")} — attendance / scores declining. <button onClick={() => setTab("intelligence")} className="underline font-bold">Open intelligence →</button></div>
                      </div>
                      <RiskBadge risk="high" />
                    </div>
                  )}
                  <div className="grid lg:grid-cols-3 gap-5">
                    <Section title="Attendance trend" sub="Last 10 working days • % present">
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={admin.attTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="date" fontSize={11} />
                            <YAxis domain={[50, 100]} fontSize={11} />
                            <Tooltip />
                            <Line type="monotone" dataKey="pct" stroke="#6366f1" strokeWidth={3} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </Section>
                    <Section title="Risk distribution" sub="All students by AI risk level">
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={[
                              { name: "Low", value: admin.summaries.filter((s) => s.risk === "low").length },
                              { name: "Medium", value: admin.summaries.filter((s) => s.risk === "medium").length },
                              { name: "High", value: admin.summaries.filter((s) => s.risk === "high").length },
                            ]} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                              <Cell fill="#10b981" /><Cell fill="#f59e0b" /><Cell fill="#f43f5e" />
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center gap-4 text-xs font-bold mt-1">
                        <span>🟢 Low</span><span>🟡 Medium</span><span>🔴 High</span>
                      </div>
                    </Section>
                    <Section title="Upcoming tests" sub="Scheduled examinations" right={<button onClick={() => setTab("tests")} className="text-xs font-bold text-indigo-600">Manage →</button>}>
                      <div className="space-y-2.5">
                        {admin.upcomingTests.slice(0, 4).map((t) => (
                          <div key={t.id} className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm">
                            <div className="font-bold">{t.title}</div>
                            <div className="text-xs text-slate-500">{t.subject} • {t.totalMarks} marks • {t.examDate}</div>
                          </div>
                        ))}
                        {admin.upcomingTests.length === 0 && <div className="text-xs text-slate-400">No tests scheduled.</div>}
                      </div>
                    </Section>
                  </div>
                  <Section title="Leaderboard vs watchlist" sub="Sorted by predicted success probability">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="text-left text-[11px] text-slate-500 tracking-wider">
                          <th className="pb-2">STUDENT</th><th className="pb-2">TARGET</th><th className="pb-2">AVG</th><th className="pb-2">ATT</th><th className="pb-2">SUCCESS</th><th className="pb-2">RISK</th><th className="pb-2"></th>
                        </tr></thead>
                        <tbody>
                          {admin.summaries.map((s) => (
                            <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                              <td className="py-2.5 font-bold">{s.name}</td>
                              <td className="text-slate-500 text-xs">{s.target}</td>
                              <td className="font-bold">{s.avg}%</td>
                              <td>{s.att}%</td>
                              <td><span className={`font-black ${s.prob >= 72 ? "text-emerald-600" : s.prob >= 55 ? "text-amber-600" : "text-rose-600"}`}>{s.prob}%</span></td>
                              <td><RiskBadge risk={s.risk} /></td>
                              <td><button onClick={() => { setDetailId(s.id); setTab("intelligence"); }} className="text-xs font-bold text-indigo-600 hover:underline">Analyse →</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Section>
                </>
              )}

              {tab === "students" && (
                <Section title={`Students (${filteredStudents.length})`} sub="Add, assign batch/course, deactivate"
                  right={<div className="flex gap-2"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className={inputCls + " !w-44"} /><button onClick={() => { setForm({}); setModal("student"); }} className={btnPrimary}>+ Add student</button></div>}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[720px]">
                      <thead><tr className="text-left text-[11px] text-slate-500"><th className="pb-2">ROLL / NAME</th><th className="pb-2">BATCH</th><th className="pb-2">TARGET</th><th className="pb-2">PARENT</th><th className="pb-2">STATUS</th><th className="pb-2"></th></tr></thead>
                      <tbody>
                        {filteredStudents.map((s) => (
                          <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="py-2.5"><div className="font-bold">{s.name}</div><div className="text-[11px] text-slate-400">{s.rollNo} • {s.email}</div></td>
                            <td className="text-xs">{s.batch}</td>
                            <td className="text-xs font-bold">{s.target}</td>
                            <td className="text-xs">{s.parentName}<div className="text-slate-400">{s.parentPhone}</div></td>
                            <td><span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${s.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>{s.status}</span></td>
                            <td className="text-right whitespace-nowrap">
                              <button onClick={() => { setDetailId(s.id); setTab("intelligence"); }} className="text-xs font-bold text-indigo-600 mr-2">AI →</button>
                              <button onClick={async () => { if (confirm("Deactivate?")) { await fetch(`/api/students?id=${s.id}`, { method: "DELETE" }); refresh(); } }} className="text-xs font-bold text-rose-500">Off</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              )}

              {tab === "teachers" && (
                <Section title={`Teachers (${teachersList.length})`} sub="Profiles, subjects, experience"
                  right={<button onClick={() => { setForm({}); setModal("teacher"); }} className={btnPrimary}>+ Add teacher</button>}>
                  <div className="grid md:grid-cols-2 gap-3">
                    {teachersList.map((t) => (
                      <div key={t.id} className="rounded-2xl border border-slate-200 p-4 flex gap-4 card-hover">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 grid place-items-center text-white font-black text-lg">{t.name[0]}</div>
                        <div className="flex-1">
                          <div className="font-extrabold">{t.name}</div>
                          <div className="text-xs text-slate-500">{t.email} • {t.phone}</div>
                          <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-bold">
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{t.subjects}</span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{t.qualification}</span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{t.exp} yrs exp</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {tab === "batches" && (
                <div className="space-y-5">
                  <Section title={`Batches (${batches.length})`} sub="Timetable, strength, teacher"
                    right={<button onClick={() => { setForm({}); setModal("batch"); }} className={btnPrimary}>+ Create batch</button>}>
                    <div className="grid md:grid-cols-2 gap-3">
                      {batches.map((b) => (
                        <div key={b.id} className="rounded-2xl border border-slate-200 p-4 card-hover">
                          <div className="flex items-center justify-between">
                            <div className="font-extrabold">{b.name}</div>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{b.strength} students</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">👩‍🏫 {b.teacher} • 🏠 Room {b.room ?? "—"}</div>
                          <div className="text-xs text-slate-500">🕐 {(b as { schedule?: string }).schedule ?? "—"}</div>
                        </div>
                      ))}
                    </div>
                  </Section>
                  <Section title={`Courses (${courses.length})`} sub="Programs & fee structure"
                    right={<button onClick={() => { setForm({}); setModal("course"); }} className={btnPrimary}>+ Add course</button>}>
                    <div className="grid md:grid-cols-2 gap-3">
                      {courses.map((c) => (
                        <div key={c.id} className="rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-900 text-white p-4">
                          <div className="font-extrabold">{c.name}</div>
                          <div className="text-xs opacity-70 mt-1">🎯 {c.targetExam} • ⏳ {c.duration}</div>
                          <div className="text-lg font-black mt-2">₹{Number(c.totalFees).toLocaleString("en-IN")}</div>
                        </div>
                      ))}
                    </div>
                  </Section>
                </div>
              )}

              {tab === "attendance" && (
                <Section title="Mark attendance" sub="Present / Absent / Late — auto alert below 75%"
                  right={<div className="flex gap-2"><input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} className={inputCls + " !w-40"} />
                    <select value={attBatch} onChange={(e) => setAttBatch(e.target.value)} className={inputCls + " !w-44"}><option value="">All batches</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
                    <button onClick={saveAttendance} disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save ✓"}</button></div>}>
                  <div className="space-y-2 max-h-[480px] overflow-y-auto scroll-thin">
                    {attRows.map((r) => (
                      <div key={r.studentId} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 grid place-items-center font-black text-indigo-700">{r.name[0]}</div>
                        <div className="flex-1 min-w-0"><div className="text-sm font-bold truncate">{r.name}</div><div className="text-[11px] text-slate-400">{r.rollNo}</div></div>
                        <div className="flex gap-1.5">
                          {(["present", "absent", "late"] as const).map((st) => (
                            <button key={st} onClick={() => setAttRows((rows) => rows.map((x) => x.studentId === r.studentId ? { ...x, status: st } : x))}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${r.status === st ? (st === "present" ? "bg-emerald-500 text-white" : st === "absent" ? "bg-rose-500 text-white" : "bg-amber-500 text-white") : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{st}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {attRows.length === 0 && <div className="text-sm text-slate-400">No students found.</div>}
                  </div>
                </Section>
              )}

              {tab === "tests" && (
                <div className="space-y-5">
                  <Section title={`Tests & exams (${testsList.length})`} sub="Auto-analysis: marks, accuracy, percentile, rank"
                    right={<button onClick={() => { setForm({ batchId: batches[0]?.id ? String(batches[0].id) : "" }); setModal("test"); }} className={btnPrimary}>+ Create test</button>}>
                    <div className="grid md:grid-cols-2 gap-3">
                      {testsList.map((t) => (
                        <div key={t.id} className="rounded-2xl border border-slate-200 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-extrabold text-sm">{t.title}</div>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">{t.difficulty}</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">{t.subject} • {t.chapter} • {t.totalMarks} marks • {t.examDate}</div>
                          <div className="mt-2 flex items-center gap-3 text-xs font-bold">
                            <span className="text-indigo-600">{t.attempts} attempts</span>
                            <span className="text-emerald-600">avg {t.avg}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                  <Section title={`Recent results (${results.length})`} sub="Accuracy • percentile • rank auto-computed">
                    <div className="overflow-x-auto max-h-80 overflow-y-auto scroll-thin">
                      <table className="w-full text-sm min-w-[640px]">
                        <thead><tr className="text-left text-[11px] text-slate-500"><th className="pb-2">TEST</th><th className="pb-2">STUDENT</th><th className="pb-2">MARKS</th><th className="pb-2">%</th><th className="pb-2">ACCURACY</th></tr></thead>
                        <tbody>{results.slice(0, 30).map((r) => (
                          <tr key={r.id} className="border-t border-slate-100"><td className="py-2 text-xs font-bold">{r.test}</td><td className="text-xs">{r.student}</td><td className="font-bold">{r.marks}/{r.total}</td><td className="font-black text-indigo-600">{r.pct}%</td><td className="text-xs">{r.accuracy}%</td></tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </Section>
                </div>
              )}

              {tab === "assignments" && (
                <Section title={`Assignments (${assignList.length})`} sub="Submitted • pending • late tracking"
                  right={<button onClick={() => { setForm({ batchId: batches[0]?.id ? String(batches[0].id) : "" }); setModal("assignment"); }} className={btnPrimary}>+ Create assignment</button>}>
                  <div className="space-y-3">
                    {assignList.map((a) => (
                      <div key={a.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="font-extrabold text-sm">{a.title}</div>
                          <div className="text-[11px] text-slate-500">⏰ {a.deadline}</div>
                        </div>
                        <div className="text-xs text-slate-500">{a.subject} • {a.topic}</div>
                        <div className="mt-2 h-2.5 rounded-full bg-slate-100 overflow-hidden flex">
                          <div className="bg-emerald-500" style={{ width: `${a.total ? (a.submitted / a.total) * 100 : 0}%` }} />
                          <div className="bg-amber-400" style={{ width: `${a.total ? (a.late / a.total) * 100 : 0}%` }} />
                        </div>
                        <div className="mt-1 text-[11px] font-bold text-slate-500">✅ {a.submitted} • ⏳ {a.late} late • ❌ {a.pending} pending</div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {tab === "fees" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-4">
                    <Stat icon="💰" label="TOTAL" value={`₹${(feesSummary.total / 100000).toFixed(1)}L`} grad="from-slate-700 to-slate-900" />
                    <Stat icon="✅" label="COLLECTED" value={`₹${(feesSummary.paid / 100000).toFixed(1)}L`} grad="from-emerald-500 to-teal-600" />
                    <Stat icon="⏳" label="PENDING" value={`₹${(feesSummary.pending / 100000).toFixed(1)}L`} grad="from-rose-500 to-orange-500" />
                  </div>
                  <Section title="Fee ledger" sub="Installments, due dates, receipts">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[680px]">
                        <thead><tr className="text-left text-[11px] text-slate-500"><th className="pb-2">STUDENT</th><th className="pb-2">TOTAL</th><th className="pb-2">PAID</th><th className="pb-2">PENDING</th><th className="pb-2">STATUS</th><th className="pb-2"></th></tr></thead>
                        <tbody>{feesList.map((f) => (
                          <tr key={f.id} className="border-t border-slate-100">
                            <td className="py-2.5 font-bold">{f.student}<div className="text-[11px] font-normal text-slate-400">due {f.dueDate}</div></td>
                            <td>₹{f.total.toLocaleString("en-IN")}</td><td className="text-emerald-600 font-bold">₹{f.paid.toLocaleString("en-IN")}</td>
                            <td className="text-rose-600 font-bold">₹{f.pending.toLocaleString("en-IN")}</td>
                            <td><span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${f.status === "paid" ? "bg-emerald-100 text-emerald-700" : f.status === "partial" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>{f.status}</span></td>
                            <td><button onClick={() => { setForm({ feeId: String(f.id), amount: String(Math.min(f.pending, 10000)) }); setModal("fee"); }} className="text-xs font-bold text-indigo-600">Collect →</button></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </Section>
                </div>
              )}

              {tab === "intelligence" && (
                <IntelligenceView detail={detail} detailId={detailId} setDetailId={setDetailId} students={(admin?.summaries ?? []).map((s) => ({ id: s.id, name: s.name }))} report={report} remarks={remarks} openRemark={() => setModal("remark")} />
              )}

              {tab === "announce" && (
                <Section title="Broadcast notification" sub="Reaches every user instantly (future: WhatsApp / SMS / push)">
                  <div className="flex gap-3">
                    <button onClick={() => { setForm({}); setModal("announce"); }} className={btnPrimary}>📢 New announcement</button>
                    <button onClick={() => { setForm({}); setModal("remark"); }} className={btnGhost}>💬 Add teacher remark</button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {remarks.slice(0, 6).map((r) => (
                      <div key={r.id} className="rounded-xl bg-slate-50 border p-3 text-sm"><span className="font-bold">{r.studentName}</span> <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold ml-1">{r.type}</span><div className="text-slate-600 mt-1">{r.text}</div></div>
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}

          {/* ═════════ TEACHER ═════════ */}
          {user.role === "teacher" && teacher && (
            <>
              {tab === "overview" && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Stat icon="🏫" label="BATCHES" value={String(teacher.batches.length)} grad="from-indigo-600 to-violet-600" />
                    <Stat icon="🎓" label="STUDENTS" value={String(teacher.students.length)} grad="from-emerald-500 to-teal-600" />
                    <Stat icon="🚨" label="NEED ATTENTION" value={String(teacher.needAttention.length)} sub="high + medium risk" grad="from-rose-500 to-orange-500" />
                    <Stat icon="📝" label="UPCOMING TESTS" value={String(teacher.upcoming.length)} grad="from-sky-500 to-blue-600" />
                  </div>
                  <Section title="🚨 Students requiring attention" sub="High-risk first — click to open full AI analysis"
                    right={<button onClick={() => setTab("students")} className="text-xs font-bold text-indigo-600">All students →</button>}>
                    <div className="grid md:grid-cols-2 gap-3">
                      {teacher.needAttention.map((s) => (
                        <button key={s.id} onClick={() => { setDetailId(s.id); setTab("students"); }} className="text-left rounded-2xl border-2 border-rose-100 bg-rose-50/50 p-4 hover:border-rose-300 transition">
                          <div className="flex items-center justify-between"><span className="font-extrabold">{s.name}</span><RiskBadge risk={s.risk} /></div>
                          <div className="text-xs text-slate-500 mt-1">Avg {s.avg}% • Att {s.att}% • Success {s.prob}%</div>
                          <div className="text-xs font-bold text-rose-600 mt-1">Teacher intervention recommended →</div>
                        </button>
                      ))}
                      {teacher.needAttention.length === 0 && <div className="text-sm text-slate-400">All students on track 🎉</div>}
                    </div>
                  </Section>
                  <div className="grid lg:grid-cols-2 gap-5">
                    <Section title="Upcoming tests"><div className="space-y-2">{teacher.upcoming.map((t) => <div key={t.id} className="rounded-xl bg-slate-50 p-3 text-sm font-bold">{t.title}<div className="text-xs font-normal text-slate-500">{t.subject} • {t.examDate}</div></div>)}</div></Section>
                    <Section title="Pending assignments"><div className="space-y-2">{teacher.pendingAssign.map((a) => <div key={a.id} className="rounded-xl bg-slate-50 p-3 text-sm font-bold">{a.title}<div className="text-xs font-normal text-slate-500">{a.subject} • due {a.deadline}</div></div>)}</div></Section>
                  </div>
                </>
              )}
              {tab === "students" && (
                <div className="space-y-5">
                  <Section title={`My students (${teacher.students.length})`} sub="Attendance • avg • risk • success probability">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[640px]">
                        <thead><tr className="text-left text-[11px] text-slate-500"><th className="pb-2">STUDENT</th><th className="pb-2">AVG</th><th className="pb-2">ATT</th><th className="pb-2">SUCCESS</th><th className="pb-2">RISK</th><th className="pb-2"></th></tr></thead>
                        <tbody>{teacher.students.map((s) => (
                          <tr key={s.id} className={`border-t border-slate-100 hover:bg-slate-50 ${detailId === s.id ? "bg-indigo-50" : ""}`}>
                            <td className="py-2.5 font-bold">{s.name}</td><td>{s.avg}%</td><td>{s.att}%</td>
                            <td className="font-black text-indigo-600">{s.prob}%</td><td><RiskBadge risk={s.risk} /></td>
                            <td><button onClick={() => setDetailId(s.id)} className="text-xs font-bold text-indigo-600">Open →</button></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </Section>
                  {detail && detailId && <StudentIntelCard detail={detail} compact={false} />}
                  <Section title="Add remark" sub="Academic / behaviour / improvement" right={<button onClick={() => setModal("remark")} className={btnPrimary}>+ Remark</button>}>
                    <div className="space-y-2">{remarks.slice(0, 5).map((r) => <div key={r.id} className="rounded-xl bg-slate-50 p-3 text-sm"><b>{r.studentName}</b> — {r.text}</div>)}</div>
                  </Section>
                </div>
              )}
              {tab === "attendance" && (
                <Section title="Mark attendance" sub={`${attDate}`}
                  right={<div className="flex gap-2"><input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} className={inputCls + " !w-40"} /><button onClick={saveAttendance} disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Save ✓"}</button></div>}>
                  <div className="space-y-2 max-h-[480px] overflow-y-auto scroll-thin">
                    {attRows.map((r) => (
                      <div key={r.studentId} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5">
                        <div className="flex-1 text-sm font-bold">{r.name}</div>
                        <div className="flex gap-1.5">{(["present", "absent", "late"] as const).map((st) => (
                          <button key={st} onClick={() => setAttRows((rows) => rows.map((x) => x.studentId === r.studentId ? { ...x, status: st } : x))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${r.status === st ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{st}</button>
                        ))}</div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
              {tab === "tests" && (
                <Section title="Tests" sub="Create tests — results auto-generate for the batch"
                  right={<button onClick={() => { setForm({}); setModal("test"); }} className={btnPrimary}>+ Create test</button>}>
                  <div className="grid md:grid-cols-2 gap-3">{testsList.map((t) => (
                    <div key={t.id} className="rounded-2xl border p-4"><div className="font-extrabold text-sm">{t.title}</div><div className="text-xs text-slate-500">{t.subject} • {t.totalMarks} marks • {t.examDate} • avg {t.avg}%</div></div>
                  ))}</div>
                </Section>
              )}
              {tab === "assignments" && (
                <Section title="Assignments" right={<button onClick={() => setModal("assignment")} className={btnPrimary}>+ Create</button>}>
                  <div className="space-y-2">{assignList.map((a) => <div key={a.id} className="rounded-xl border p-3 text-sm font-bold">{a.title}<div className="text-xs font-normal text-slate-500">{a.subject} • ✅{a.submitted} ⏳{a.late} ❌{a.pending}</div></div>)}</div>
                </Section>
              )}
              {tab === "remarks" && (
                <Section title="Remarks log" right={<button onClick={() => setModal("remark")} className={btnPrimary}>+ Remark</button>}>
                  <div className="space-y-2">{remarks.map((r) => <div key={r.id} className="rounded-xl bg-slate-50 p-3 text-sm"><b>{r.studentName}</b> <span className="text-[11px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">{r.type}</span><div className="text-slate-600">{r.text}</div></div>)}</div>
                </Section>
              )}
            </>
          )}

          {/* ═════════ STUDENT ═════════ */}
          {user.role === "student" && (
            <>
              {!detail ? <div className="text-center py-20 text-slate-400 font-bold">Loading your performance…</div> : (
                <>
                  {tab === "overview" && <StudentIntelCard detail={detail} compact={false} />}
                  {tab === "tests" && (
                    <Section title="Test history" sub="Marks • accuracy • percentile • rank">
                      <div className="h-64 mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={detail.history.map((h) => ({ name: h.title.slice(0, 14) + "…", pct: h.pct }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="name" fontSize={10} interval={0} angle={-18} height={60} /><YAxis domain={[0, 100]} fontSize={11} /><Tooltip />
                            <Bar dataKey="pct" radius={[6, 6, 0, 0]}>{detail.history.map((h, i) => <Cell key={i} fill={h.pct >= 72 ? "#10b981" : h.pct >= 55 ? "#f59e0b" : "#f43f5e"} />)}</Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">{detail.history.map((h) => (
                        <div key={h.id} className="rounded-xl border border-slate-100 p-3 flex items-center gap-3 text-sm">
                          <div className="flex-1"><div className="font-bold">{h.title}</div><div className="text-xs text-slate-500">{h.subject} • {h.date} • accuracy {h.accuracy}%</div></div>
                          <div className="font-black text-indigo-600">{h.marks}/{h.total}</div>
                          <div className={`font-black ${h.pct >= 72 ? "text-emerald-600" : h.pct >= 55 ? "text-amber-600" : "text-rose-600"}`}>{h.pct}%</div>
                        </div>
                      ))}</div>
                    </Section>
                  )}
                  {tab === "assignments" && (
                    <Section title="My assignments" sub="Submit before deadline">
                      <div className="space-y-2">{detail.assignments.map((a) => (
                        <div key={a.id} className="rounded-xl border p-3.5 flex items-center gap-3 text-sm">
                          <div className="flex-1"><div className="font-bold">{a.title}</div><div className="text-xs text-slate-500">{a.subject} • due {a.deadline}{a.marks ? ` • scored ${a.marks}` : ""}</div></div>
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${a.status === "submitted" ? "bg-emerald-100 text-emerald-700" : a.status === "late" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{a.status}</span>
                          {a.status === "pending" && <button onClick={() => submitAssignment(a.id)} className={btnPrimary + " !py-1.5"}>Submit ✓</button>}
                        </div>
                      ))}</div>
                    </Section>
                  )}
                  {tab === "planner" && <PlannerView tasks={tasks} toggleTask={toggleTask} studyPlan={detail.analytics.intel.studyPlan} openNew={() => setModal("task")} />}
                  {tab === "report" && <ReportView report={report} detail={detail} />}
                </>
              )}
            </>
          )}

          {/* ═════════ PARENT ═════════ */}
          {user.role === "parent" && (
            <>
              {!detail ? <div className="text-center py-20 text-slate-400 font-bold">Linking child profile… (login as <b>parent1@family.in</b> after seeding)</div> : (
                <>
                  {tab === "overview" && (
                    <>
                      <div className="rounded-3xl bg-gradient-to-r from-sky-600 to-blue-700 text-white p-6 flex flex-wrap items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 grid place-items-center text-3xl font-black">{detail.profile.name[0]}</div>
                        <div className="flex-1 min-w-52">
                          <div className="font-extrabold text-xl">{detail.profile.name} <span className="text-sm font-normal opacity-80">• {detail.profile.rollNo}</span></div>
                          <div className="text-sm opacity-90">{detail.profile.target} • {detail.profile.batch} • Rank #{detail.profile.rank}/{detail.profile.totalStudents}</div>
                          <div className="mt-1 text-sm">📈 Performance {detail.analytics.intel.trend === "improving" ? "improved" : detail.analytics.intel.trend} — success probability <b>{detail.analytics.intel.probability}%</b></div>
                        </div>
                        <ProbDial value={detail.analytics.intel.probability} size={110} />
                      </div>
                      <StudentIntelCard detail={detail} compact={true} />
                      <Section title="💬 Teacher remarks" sub="Latest feedback">
                        <div className="space-y-2">{remarks.slice(0, 4).map((r) => <div key={r.id} className="rounded-xl bg-slate-50 p-3 text-sm"><b className="capitalize">{r.type}:</b> {r.text}</div>)}{remarks.length === 0 && <div className="text-xs text-slate-400">No remarks yet.</div>}</div>
                      </Section>
                    </>
                  )}
                  {tab === "report" && <ReportView report={report} detail={detail} />}
                  {tab === "fees" && (
                    <Section title="Fee status" sub="Payments & receipts">
                      {detail.fees ? (
                        <div>
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="rounded-2xl bg-slate-50 p-4"><div className="text-xs font-bold text-slate-500">TOTAL</div><div className="font-black">₹{detail.fees.total.toLocaleString("en-IN")}</div></div>
                            <div className="rounded-2xl bg-emerald-50 p-4"><div className="text-xs font-bold text-emerald-600">PAID</div><div className="font-black text-emerald-700">₹{detail.fees.paid.toLocaleString("en-IN")}</div></div>
                            <div className="rounded-2xl bg-rose-50 p-4"><div className="text-xs font-bold text-rose-500">PENDING</div><div className="font-black text-rose-600">₹{detail.fees.pending.toLocaleString("en-IN")}</div></div>
                          </div>
                          <div className="mt-3 text-sm">Status: <b className="capitalize">{detail.fees.status}</b> • Due: {detail.fees.dueDate}</div>
                        </div>
                      ) : <div className="text-sm text-slate-400">No fee record.</div>}
                    </Section>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── MODALS ── */}
      {modal === "student" && (
        <Modal title="Add student" onClose={() => setModal(null)}>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Full name" className={inputCls} onChange={(e) => setF("name", e.target.value)} />
            <input placeholder="Email" className={inputCls} onChange={(e) => setF("email", e.target.value)} />
            <input placeholder="Phone" className={inputCls} onChange={(e) => setF("phone", e.target.value)} />
            <input placeholder="Password (default password123)" className={inputCls} onChange={(e) => setF("password", e.target.value)} />
            <select className={inputCls} onChange={(e) => setF("batchId", e.target.value)}><option value="">Batch…</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
            <select className={inputCls} onChange={(e) => setF("courseId", e.target.value)}><option value="">Course…</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <select className={inputCls} onChange={(e) => setF("targetExam", e.target.value)}><option>JEE 2027</option><option>JEE 2026</option><option>NEET 2027</option><option>Board + Olympiad</option></select>
            <input placeholder="Parent name" className={inputCls} onChange={(e) => setF("parentName", e.target.value)} />
            <input placeholder="Parent phone" className={inputCls} onChange={(e) => setF("parentPhone", e.target.value)} />
            <input placeholder="Parent email (creates parent login)" className={inputCls} onChange={(e) => setF("parentEmail", e.target.value)} />
          </div>
          <button onClick={submitModal} disabled={saving} className={btnPrimary + " w-full mt-4"}>{saving ? "Saving…" : "Create student ✓"}</button>
        </Modal>
      )}
      {modal === "teacher" && (
        <Modal title="Add teacher" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <input placeholder="Full name" className={inputCls} onChange={(e) => setF("name", e.target.value)} />
            <input placeholder="Email" className={inputCls} onChange={(e) => setF("email", e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Phone" className={inputCls} onChange={(e) => setF("phone", e.target.value)} />
              <input placeholder="Subjects (e.g. Physics)" className={inputCls} onChange={(e) => setF("subjects", e.target.value)} />
              <input placeholder="Qualification" className={inputCls} onChange={(e) => setF("qualification", e.target.value)} />
              <input placeholder="Experience (yrs)" type="number" className={inputCls} onChange={(e) => setF("exp", e.target.value)} />
            </div>
          </div>
          <button onClick={submitModal} disabled={saving} className={btnPrimary + " w-full mt-4"}>{saving ? "Saving…" : "Create teacher ✓"}</button>
        </Modal>
      )}
      {modal === "batch" && (
        <Modal title="Create batch" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <input placeholder="Batch name (e.g. JEE 2028 Morning)" className={inputCls} onChange={(e) => setF("name", e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <select className={inputCls} onChange={(e) => setF("courseId", e.target.value)}><option value="">Course…</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <input placeholder="Room" className={inputCls} onChange={(e) => setF("room", e.target.value)} />
              <input placeholder="Schedule (Mon–Sat 7–11 AM)" className={inputCls} onChange={(e) => setF("schedule", e.target.value)} />
              <input placeholder="Capacity" type="number" className={inputCls} onChange={(e) => setF("capacity", e.target.value)} />
            </div>
          </div>
          <button onClick={submitModal} disabled={saving} className={btnPrimary + " w-full mt-4"}>{saving ? "Saving…" : "Create batch ✓"}</button>
        </Modal>
      )}
      {modal === "course" && (
        <Modal title="Add course" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <input placeholder="Course name" className={inputCls} onChange={(e) => setF("name", e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Target exam" className={inputCls} onChange={(e) => setF("targetExam", e.target.value)} />
              <input placeholder="Duration" className={inputCls} onChange={(e) => setF("duration", e.target.value)} />
            </div>
            <input placeholder="Total fees" type="number" className={inputCls} onChange={(e) => setF("totalFees", e.target.value)} />
            <textarea placeholder="Description" className={inputCls} onChange={(e) => setF("description", e.target.value)} />
          </div>
          <button onClick={submitModal} disabled={saving} className={btnPrimary + " w-full mt-4"}>Save ✓</button>
        </Modal>
      )}
      {modal === "test" && (
        <Modal title="Create test" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <input placeholder="Test title" className={inputCls} onChange={(e) => setF("title", e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <select className={inputCls} onChange={(e) => setF("subject", e.target.value)}><option value="">Subject…</option><option>Physics</option><option>Chemistry</option><option>Mathematics</option><option>Biology</option><option>Mixed</option></select>
              <input placeholder="Chapter / topic" className={inputCls} onChange={(e) => setF("chapter", e.target.value)} />
              <select className={inputCls} onChange={(e) => setF("difficulty", e.target.value)}><option>Easy</option><option>Medium</option><option>Hard</option></select>
              <input placeholder="Total marks" type="number" className={inputCls} onChange={(e) => setF("totalMarks", e.target.value)} />
              <input type="date" className={inputCls} onChange={(e) => setF("examDate", e.target.value)} />
              <input placeholder="Duration (min)" type="number" className={inputCls} onChange={(e) => setF("durationMin", e.target.value)} />
            </div>
            <select className={inputCls} value={form.batchId ?? ""} onChange={(e) => setF("batchId", e.target.value)}><option value="">Batch (auto-generates results)…</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          </div>
          <button onClick={submitModal} disabled={saving} className={btnPrimary + " w-full mt-4"}>{saving ? "Creating…" : "Create test ✓"}</button>
        </Modal>
      )}
      {modal === "assignment" && (
        <Modal title="Create assignment" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <input placeholder="Title" className={inputCls} onChange={(e) => setF("title", e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <select className={inputCls} onChange={(e) => setF("subject", e.target.value)}><option value="">Subject…</option><option>Physics</option><option>Chemistry</option><option>Mathematics</option><option>Biology</option></select>
              <input placeholder="Topic" className={inputCls} onChange={(e) => setF("topic", e.target.value)} />
              <input type="date" className={inputCls} onChange={(e) => setF("deadline", e.target.value)} />
              <input placeholder="Total marks" type="number" className={inputCls} onChange={(e) => setF("totalMarks", e.target.value)} />
            </div>
            <select className={inputCls} value={form.batchId ?? ""} onChange={(e) => setF("batchId", e.target.value)}><option value="">Batch…</option>{batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
            <textarea placeholder="Description / instructions" className={inputCls} onChange={(e) => setF("description", e.target.value)} />
          </div>
          <button onClick={submitModal} disabled={saving} className={btnPrimary + " w-full mt-4"}>Create ✓</button>
        </Modal>
      )}
      {modal === "remark" && (
        <Modal title="Add teacher remark" onClose={() => setModal(null)}>
          <div className="space-y-3">
            {!detailId && <input placeholder="Student ID" className={inputCls} onChange={(e) => setF("studentId", e.target.value)} />}
            <select className={inputCls} onChange={(e) => setF("type", e.target.value)}><option value="academic">Academic</option><option value="behaviour">Behaviour</option><option value="improvement">Improvement</option></select>
            <textarea placeholder="Feedback / suggestion…" rows={4} className={inputCls} onChange={(e) => setF("text", e.target.value)} />
          </div>
          <button onClick={submitModal} disabled={saving} className={btnPrimary + " w-full mt-4"}>Save remark ✓</button>
        </Modal>
      )}
      {modal === "fee" && (
        <Modal title="Collect fee" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <input placeholder="Amount" type="number" className={inputCls} value={form.amount ?? ""} onChange={(e) => setF("amount", e.target.value)} />
            <select className={inputCls} onChange={(e) => setF("method", e.target.value)}><option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option></select>
          </div>
          <button onClick={submitModal} disabled={saving} className={btnPrimary + " w-full mt-4"}>Collect + receipt 🧾</button>
        </Modal>
      )}
      {modal === "announce" && (
        <Modal title="Broadcast announcement" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <input placeholder="Title" className={inputCls} onChange={(e) => setF("title", e.target.value)} />
            <textarea placeholder="Message…" rows={4} className={inputCls} onChange={(e) => setF("message", e.target.value)} />
          </div>
          <button onClick={submitModal} disabled={saving} className={btnPrimary + " w-full mt-4"}>Send to all 📢</button>
        </Modal>
      )}
      {modal === "task" && (
        <Modal title="Add study task" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <input placeholder="Task title" className={inputCls} onChange={(e) => setF("title", e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Subject" className={inputCls} onChange={(e) => setF("subject", e.target.value)} />
              <input placeholder="Topic" className={inputCls} onChange={(e) => setF("topic", e.target.value)} />
              <input placeholder="Minutes" type="number" className={inputCls} onChange={(e) => setF("durationMin", e.target.value)} />
              <select className={inputCls} onChange={(e) => setF("priority", e.target.value)}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
            </div>
          </div>
          <button onClick={submitModal} disabled={saving} className={btnPrimary + " w-full mt-4"}>Add task ✓</button>
        </Modal>
      )}
    </div>
  );
}

// ─── Student intelligence card ───
function StudentIntelCard({ detail, compact }: { detail: StudentDetail; compact: boolean }) {
  const a = detail.analytics;
  const intel = a.intel;
  const entries = Object.entries(a.subjectAvgs);
  const strong = entries.filter(([, v]) => v >= 65);
  const weak = entries.filter(([, v]) => v < 65);
  return (
    <div className="space-y-5">
      {/* header */}
      <div className="rounded-3xl bg-gradient-to-r from-[#141b33] via-[#1e1b4b] to-[#4c1d95] text-white p-6 flex flex-wrap items-center gap-6 shadow-xl">
        <ProbDial value={intel.probability} size={130} />
        <div className="flex-1 min-w-60">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-black">{detail.profile.name}</h2>
            <RiskBadge risk={intel.riskLevel} />
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/10">
              {intel.trend === "improving" ? "📈 Improving" : intel.trend === "declining" ? "📉 Declining" : "➖ Stable"}
            </span>
          </div>
          <div className="text-sm text-indigo-200 mt-1">{detail.profile.target} • {detail.profile.batch} • Rank #{detail.profile.rank}/{detail.profile.totalStudents} • {detail.profile.rollNo}</div>
          <div className="mt-2 text-sm bg-white/10 rounded-xl px-3 py-2">💡 {intel.insight}</div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center min-w-44">
          {[["ATTENDANCE", `${a.attendancePct}%`], ["TEST AVG", `${Math.round(a.testAvg * 10) / 10}%`], ["ACCURACY", `${Math.round(a.accAvg * 10) / 10}%`], ["ASSIGNMENTS", `${Math.round(a.assignPct * 10) / 10}%`]].map(([l, v]) => (
            <div key={l} className="rounded-2xl bg-white/10 p-3"><div className="font-black text-lg">{v}</div><div className="text-[10px] tracking-widest opacity-70 font-bold">{l}</div></div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Section title="Progress graph" sub="Past → current → predicted trajectory">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[...a.monthlyTrend.map((m) => ({ name: m.month, score: m.avg })), { name: "Predicted", score: Math.min(98, Math.round((a.monthlyTrend[a.monthlyTrend.length - 1]?.avg ?? a.testAvg) + (intel.trend === "improving" ? 5 : intel.trend === "declining" ? -4 : 1))) }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={11} /><YAxis domain={[0, 100]} fontSize={11} /><Tooltip />
                <Line type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4, fill: "#7c3aed" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title="Subject-wise performance" sub="Strong vs needs-improvement">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={entries.map(([s, v]) => ({ subject: s.slice(0, 10), score: Math.round(v * 10) / 10 }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" domain={[0, 100]} fontSize={11} /><YAxis type="category" dataKey="subject" fontSize={11} width={90} /><Tooltip />
                <Bar dataKey="score" radius={[0, 8, 8, 0]}>
                  {entries.map(([, v], i) => <Cell key={i} fill={v >= 70 ? "#10b981" : v >= 55 ? "#f59e0b" : "#f43f5e"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
            {strong.map(([s]) => <span key={s} className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">✓ {s}</span>)}
            {weak.map(([s]) => <span key={s} className="px-2 py-1 rounded-full bg-rose-100 text-rose-700">! {s}</span>)}
          </div>
        </Section>
      </div>

      {/* factors */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-emerald-200 p-5">
          <h3 className="font-extrabold text-emerald-700">🟢 Positive factors</h3>
          <ul className="mt-2 space-y-1.5 text-sm">{intel.positiveFactors.map((f, i) => <li key={i} className="flex gap-2"><span>✓</span><span>{f}</span></li>)}{intel.positiveFactors.length === 0 && <li className="text-slate-400 text-sm">None yet — keep pushing.</li>}</ul>
        </div>
        <div className="bg-white rounded-2xl border border-rose-200 p-5">
          <h3 className="font-extrabold text-rose-600">🔴 Negative factors</h3>
          <ul className="mt-2 space-y-1.5 text-sm">{intel.negativeFactors.map((f, i) => <li key={i} className="flex gap-2"><span>!</span><span>{f}</span></li>)}{intel.negativeFactors.length === 0 && <li className="text-slate-400 text-sm">No red flags 🎉</li>}</ul>
        </div>
      </div>

      {!compact && (
        <Section title="🎯 Personalised recommendations" sub="Student ko ab kya karna chahiye?">
          <div className="grid md:grid-cols-2 gap-3">
            {intel.recommendations.map((r, i) => (
              <div key={i} className={`rounded-2xl border-2 p-4 ${r.priority === "high" ? "border-rose-200 bg-rose-50/60" : r.priority === "medium" ? "border-amber-200 bg-amber-50/60" : "border-emerald-200 bg-emerald-50/60"}`}>
                <div className="flex items-center gap-2"><span>{r.priority === "high" ? "🔴" : r.priority === "medium" ? "🟡" : "🟢"}</span><span className="font-extrabold text-sm">{r.title}</span></div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{r.description}</p>
                <div className="text-[11px] font-bold text-slate-500 mt-2">⏱ {r.estimatedMin} min • {r.subject}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function IntelligenceView({ detail, detailId, setDetailId, students, report, remarks, openRemark }: {
  detail: StudentDetail | null; detailId: number | null; setDetailId: (id: number) => void;
  students: { id: number; name: string }[]; report: { probability: number } | null;
  remarks: { id: number; text: string; type: string }[]; openRemark: () => void;
}) {
  if (!detailId) return <Section title="AI Student Intelligence" sub="Select a student to run prediction"><p className="text-sm text-slate-500">Use the “Inspect student” picker in the sidebar.</p></Section>;
  if (!detail) return <div className="text-center py-16 text-slate-400 font-bold">Analysing student… 🧠</div>;
  return (
    <div className="space-y-5">
      <Section title="Select student" sub="Prediction updates with every new test / attendance">
        <div className="flex gap-2 flex-wrap">
          <select value={detailId} onChange={(e) => setDetailId(Number(e.target.value))} className={inputCls + " !w-64"}>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={openRemark} className={btnGhost}>💬 Add remark</button>
          <button onClick={() => window.print()} className={btnGhost}>🖨 Print report</button>
        </div>
      </Section>
      <StudentIntelCard detail={detail} compact={false} />
      {report !== null && <ReportView report={report as never} detail={detail} />}
    </div>
  );
}

function PlannerView({ tasks, toggleTask, studyPlan, openNew }: {
  tasks: { id: number; title: string; subject: string; topic: string; durationMin: number; priority: string; status: string; dueDate: string }[];
  toggleTask: (id: number, s: string) => void;
  studyPlan: { title: string; subject: string; topic: string; durationMin: number; priority: string; reason: string }[];
  openNew: () => void;
}) {
  const done = tasks.filter((t) => t.status === "done").length;
  return (
    <div className="space-y-5">
      <Section title="🤖 AI study planner — today's priority" sub="Generated from your weak areas" right={<button onClick={openNew} className={btnPrimary}>+ Task</button>}>
        <div className="space-y-2.5">
          {studyPlan.map((p, i) => (
            <div key={i} className="rounded-2xl border-2 border-indigo-100 bg-indigo-50/50 p-4 flex items-center gap-4">
              <div className="text-2xl">{p.priority === "high" ? "🔴" : p.priority === "medium" ? "🟡" : "🟢"}</div>
              <div className="flex-1"><div className="font-extrabold text-sm">{p.title}</div><div className="text-xs text-slate-500">{p.subject} • {p.topic} • {p.reason}</div></div>
              <div className="text-xs font-black bg-white rounded-xl px-3 py-2 border">⏱ {p.durationMin}m</div>
            </div>
          ))}
        </div>
      </Section>
      <Section title={`My tasks (${done}/${tasks.length} done)`} sub="Weak topic → recommendation → daily task → performance update">
        <div className="space-y-2">
          {tasks.map((t) => (
            <button key={t.id} onClick={() => toggleTask(t.id, t.status)} className={`w-full text-left rounded-xl border p-3.5 flex items-center gap-3 text-sm ${t.status === "done" ? "bg-emerald-50 border-emerald-200 line-through opacity-70" : "bg-white hover:border-indigo-300"}`}>
              <span className="text-xl">{t.status === "done" ? "✅" : "⬜"}</span>
              <span className="flex-1 font-bold">{t.title}<span className="block text-xs font-normal text-slate-500">{t.subject} • {t.topic} • {t.durationMin} min</span></span>
              <span className="text-[11px] font-black uppercase">{t.priority}</span>
            </button>
          ))}
          {tasks.length === 0 && <div className="text-sm text-slate-400">No tasks — enjoy! 🎉</div>}
        </div>
      </Section>
    </div>
  );
}

function ReportView({ report, detail }: {
  report: { student: string; rollNo: string; target: string; attendance: number; testAvg: number; assignments: number; trend: string; probability: number; risk: string; strong: string[]; weak: string[]; recommendations: { title: string; description: string }[]; remarks: { text: string; type: string }[]; month: string } | null;
  detail: StudentDetail;
}) {
  const r = report;
  if (!r) return <div className="text-center py-10 text-slate-400 text-sm">Generating report…</div>;
  return (
    <Section title={`📄 Monthly performance report — ${r.month}`} sub="Shareable with parents • printable"
      right={<button onClick={() => window.print()} className={btnGhost}>🖨 Print</button>}>
      <div className="rounded-2xl border-2 border-slate-200 p-6 max-w-2xl mx-auto bg-gradient-to-b from-white to-slate-50">
        <div className="text-center">
          <div className="text-2xl">🎓</div>
          <div className="font-black text-lg">VidyaSetu Coaching • Monthly Report</div>
          <div className="text-sm text-slate-500">{r.student} • {r.rollNo} • Target: {r.target}</div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4 text-center text-sm">
          <div className="rounded-xl bg-slate-100 p-3"><div className="font-black text-lg">{r.attendance}%</div><div className="text-[11px] text-slate-500 font-bold">ATTENDANCE</div></div>
          <div className="rounded-xl bg-slate-100 p-3"><div className="font-black text-lg">{Math.round(r.testAvg * 10) / 10}%</div><div className="text-[11px] text-slate-500 font-bold">TEST AVG</div></div>
          <div className="rounded-xl bg-slate-100 p-3"><div className="font-black text-lg">{Math.round(r.assignments)}%</div><div className="text-[11px] text-slate-500 font-bold">ASSIGNMENTS</div></div>
        </div>
        <div className="mt-3 text-sm space-y-1.5">
          <div>Performance trend: <b>{r.trend === "improving" ? "📈 Improving" : r.trend === "declining" ? "📉 Declining" : "➖ Stable"}</b></div>
          <div>Strong subjects: <b className="text-emerald-600">{r.strong.join(", ") || "—"}</b></div>
          <div>Weak subjects: <b className="text-rose-600">{r.weak.join(", ") || "—"}</b></div>
          <div>Predicted success probability: <b className="text-indigo-600">{r.probability}%</b> <RiskBadge risk={r.risk} /></div>
          <div>Recommended action: <b>{r.recommendations[0]?.title} — {r.recommendations[0]?.description}</b></div>
          {r.remarks[0] && <div>Teacher remarks: <i>“{r.remarks[0].text}”</i></div>}
        </div>
        <div className="mt-4 flex justify-between text-xs text-slate-400"><span>Rank #{detail.profile.rank}/{detail.profile.totalStudents}</span><span>Mentor sign: ______</span></div>
      </div>
    </Section>
  );
}
