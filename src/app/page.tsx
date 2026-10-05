"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DEMO = [
  { role: "Admin", email: "admin@coaching.in", pass: "admin123", desc: "Full control: students, fees, batches, intelligence", icon: "👨‍💼", color: "from-indigo-600 to-violet-600" },
  { role: "Teacher", email: "anita@coaching.in", pass: "password123", desc: "Attendance, tests, remarks, at-risk students", icon: "👩‍🏫", color: "from-emerald-500 to-teal-600" },
  { role: "Student", email: "aarav@student.in", pass: "password123", desc: "Performance, prediction, study planner", icon: "🎓", color: "from-amber-500 to-orange-600" },
  { role: "Parent", email: "parent1@family.in", pass: "password123", desc: "Child progress, fees, teacher remarks", icon: "👨‍👩‍👦", color: "from-sky-500 to-blue-600" },
];

export default function Landing() {
  const [seeded, setSeeded] = useState<boolean | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetch("/api/seed").then((r) => r.json()).then((j) => setSeeded(j.seeded)).catch(() => setSeeded(false));
  }, []);

  async function ensureSeed() {
    setSeeding(true);
    try {
      await fetch("/api/seed", { method: "POST" });
      setSeeded(true);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070b1a] text-white overflow-x-hidden">
      {/* NAV */}
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 grid place-items-center text-2xl shadow-lg shadow-indigo-500/30">🎓</div>
          <div>
            <div className="font-extrabold text-lg tracking-tight">VidyaSetu ERP</div>
            <div className="text-[11px] text-indigo-300 tracking-[0.22em] font-semibold">AI STUDENT INTELLIGENCE</div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-7 text-sm text-slate-300">
          <a href="#flow" className="hover:text-white">How it works</a>
          <a href="#roles" className="hover:text-white">Roles</a>
          <a href="#intelligence" className="hover:text-white">AI Engine</a>
          <a href="#pricing" className="hover:text-white">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm px-4 py-2 rounded-xl border border-white/15 hover:bg-white/10">Login</Link>
          <Link href="/dashboard" className="text-sm px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 font-bold shadow-lg shadow-fuchsia-500/25 hover:opacity-95">Open ERP →</Link>
        </div>
      </nav>

      {/* HERO */}
      <header className="max-w-7xl mx-auto px-6 pt-10 pb-16 grid lg:grid-cols-2 gap-12 items-center relative">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-600/25 blur-[120px] rounded-full" />
        <div className="absolute top-40 right-0 w-96 h-96 bg-fuchsia-600/20 blur-[120px] rounded-full" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-indigo-200 mb-5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            ERP → Data → Analytics → Prediction → Action → Improvement
          </div>
          <h1 className="text-4xl md:text-6xl font-black leading-[1.05] tracking-tight">
            Coaching ERP that doesn&apos;t just <span className="text-slate-500">store data.</span><br />
            It <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">predicts success.</span>
          </h1>
          <p className="mt-5 text-slate-300 text-lg leading-relaxed max-w-xl">
            Admin + Teacher + Student + Parent dashboards with attendance, tests, fees — plus an
            <b> AI intelligence layer</b>: success probability, early-warning risk detection &amp; personalised study actions.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/dashboard" className="px-7 py-3.5 rounded-2xl bg-white text-slate-900 font-extrabold hover:bg-indigo-50">Launch live demo 🚀</Link>
            <button onClick={ensureSeed} className="px-7 py-3.5 rounded-2xl border border-white/15 font-bold hover:bg-white/5">
              {seeding ? "Seeding data…" : seeded ? "✓ Demo data ready" : "Seed demo data"}
            </button>
          </div>
          <div className="mt-8 grid grid-cols-4 gap-3 max-w-xl">
            {[["340+", "Students"], ["94%", "Attendance"], ["74%", "Avg success"], ["12", "At-risk flagged"]].map(([v, l]) => (
              <div key={l} className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center">
                <div className="text-xl font-black">{v}</div>
                <div className="text-[11px] text-slate-400">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Prediction card mock */}
        <div className="relative">
          <div className="rounded-3xl bg-gradient-to-b from-white/10 to-white/[0.03] border border-white/10 p-6 shadow-2xl animate-floaty">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 font-semibold tracking-widest">JEE 2027 • SUCCESS PROBABILITY</div>
                <div className="text-5xl font-black mt-1">74<span className="text-xl text-slate-400">%</span></div>
              </div>
              <div className="w-24 h-24 rounded-full grid place-items-center text-3xl font-black border-8 border-emerald-400/80 bg-emerald-400/10">↗</div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-3 py-2"><span>🟢</span> Attendance 91% • Maths improving</div>
              <div className="flex items-center gap-2 bg-rose-400/10 border border-rose-400/20 rounded-xl px-3 py-2"><span>🔴</span> Physics declining • Chemistry weak</div>
              <div className="rounded-xl bg-indigo-500/15 border border-indigo-400/25 px-3 py-2">💡 Increase Physics practice 30 min/day + 2 extra tests this week.</div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl bg-white/5 p-2.5"><div className="font-black text-emerald-300">LOW</div><div className="text-slate-400">Aarav • 91%</div></div>
              <div className="rounded-xl bg-white/5 p-2.5"><div className="font-black text-amber-300">MEDIUM</div><div className="text-slate-400">Diya • 68%</div></div>
              <div className="rounded-xl bg-white/5 p-2.5"><div className="font-black text-rose-300">HIGH ⚠️</div><div className="text-slate-400">Aman • 41%</div></div>
            </div>
          </div>
          <div className="absolute -bottom-6 -left-6 rounded-2xl bg-white text-slate-900 px-4 py-3 shadow-2xl text-sm font-bold">⚠️ Early warning: Aman 89%→71% attendance <span className="text-rose-600">HIGH RISK</span></div>
        </div>
      </header>

      {/* FLOW */}
      <section id="flow" className="max-w-7xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-black">Overall intelligence flow</h2>
        <p className="text-slate-400 text-sm mt-1">Student data loops back into ever-smarter predictions.</p>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-[13px] font-bold">
          {["Student Data", "Attendance + Tests", "Analytics Engine", "Progress Tracking", "AI Prediction", "Risk Detection", "Recommendations", "Improvement"].map((s, i, a) => (
            <span key={s} className="flex items-center gap-2">
              <span className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10">{s}</span>
              {i < a.length - 1 && <span className="text-indigo-400">→</span>}
            </span>
          ))}
        </div>
      </section>

      {/* ROLES */}
      <section id="roles" className="max-w-7xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-black">Four dashboards. One brain.</h2>
        <div className="mt-5 grid md:grid-cols-4 gap-4">
          {DEMO.map((d) => (
            <div key={d.role} className="rounded-3xl bg-white/[0.04] border border-white/10 p-5 card-hover">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${d.color} grid place-items-center text-2xl`}>{d.icon}</div>
              <div className="mt-3 font-extrabold text-lg">{d.role}</div>
              <div className="text-sm text-slate-400 mt-1 min-h-10">{d.desc}</div>
              <div className="mt-3 text-xs font-mono bg-black/40 rounded-xl p-2.5 text-slate-300">{d.email}<br />{d.pass}</div>
              <Link href="/login" className="mt-3 inline-block text-sm font-bold text-indigo-300 hover:text-white">Login as {d.role} →</Link>
            </div>
          ))}
        </div>
      </section>

      {/* INTELLIGENCE */}
      <section id="intelligence" className="max-w-7xl mx-auto px-6 py-10 grid lg:grid-cols-3 gap-4">
        <div className="rounded-3xl p-6 bg-gradient-to-br from-indigo-600/30 to-transparent border border-indigo-400/20">
          <div className="text-3xl">🧠</div>
          <h3 className="font-extrabold text-lg mt-2">Success prediction</h3>
          <p className="text-sm text-slate-300 mt-1">Weighted model on test scores, accuracy, attendance, assignments, study hours, mock participation + trend slope — with explainable +ve / −ve factors.</p>
        </div>
        <div className="rounded-3xl p-6 bg-gradient-to-br from-rose-600/25 to-transparent border border-rose-400/20">
          <div className="text-3xl">🚨</div>
          <h3 className="font-extrabold text-lg mt-2">Early warning + risk levels</h3>
          <p className="text-sm text-slate-300 mt-1">🟢 Low • 🟡 Medium • 🔴 High. Attendance crash 89%→71% or test avg 72%→54% auto-flags teacher intervention.</p>
        </div>
        <div className="rounded-3xl p-6 bg-gradient-to-br from-emerald-600/25 to-transparent border border-emerald-400/20">
          <div className="text-3xl">🎯</div>
          <h3 className="font-extrabold text-lg mt-2">Recommendations + AI planner</h3>
          <p className="text-sm text-slate-300 mt-1">“Student ko ab kya karna chahiye?” — daily priority tasks, revision schedule, mock plan from weak topics.</p>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-black">Commercial packages</h2>
        <div className="mt-5 grid md:grid-cols-4 gap-4">
          {[
            ["BASIC", "₹30–40k", "ERP fundamentals: students, batches, attendance, fees"],
            ["STANDARD", "₹60–80k", "ERP + analytics + dashboards + reports"],
            ["INTELLIGENT ERP ⭐", "₹80k–1.5L+", "ERP + analytics + prediction + recommendations"],
            ["MAINTENANCE", "₹1.5–5k/mo", "Hosting, backups, updates, support"],
          ].map(([t, p, d]) => (
            <div key={t} className="rounded-3xl bg-white/[0.04] border border-white/10 p-5">
              <div className="text-xs font-black tracking-widest text-indigo-300">{t}</div>
              <div className="text-2xl font-black mt-1">{p}</div>
              <div className="text-sm text-slate-400 mt-2">{d}</div>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="font-extrabold text-xl">Don&apos;t sell “an ERP”. Sell outcomes.</div>
            <div className="text-slate-400 text-sm">“An intelligent platform that analyses performance, predicts risk &amp; prescribes actions to improve results.”</div>
          </div>
          <Link href="/dashboard" className="px-7 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 font-extrabold">Enter the ERP →</Link>
        </div>
        <div className="text-center text-xs text-slate-500 py-8">VidyaSetu ERP • Built with Next.js + PostgreSQL + Drizzle • AI Student Intelligence Engine v1</div>
      </section>
    </div>
  );
}
