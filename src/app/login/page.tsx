"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const QUICK = [
  { role: "Admin", email: "admin@coaching.in", pass: "admin123", icon: "👨‍💼", grad: "from-indigo-500 to-violet-600" },
  { role: "Teacher", email: "anita@coaching.in", pass: "password123", icon: "👩‍🏫", grad: "from-emerald-500 to-teal-600" },
  { role: "Student", email: "aarav@student.in", pass: "password123", icon: "🎓", grad: "from-amber-500 to-orange-600" },
  { role: "Parent", email: "parent1@family.in", pass: "password123", icon: "👨‍👩‍👦", grad: "from-sky-500 to-blue-600" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@coaching.in");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [seedState, setSeedState] = useState("");

  useEffect(() => {
    fetch("/api/seed").then((r) => r.json()).then((j) => {
      if (!j.seeded) {
        setSeedState("Seeding demo data…");
        fetch("/api/seed", { method: "POST" }).then(() => setSeedState("Demo data ready ✓")).catch(() => setSeedState(""));
      }
    }).catch(() => {});
  }, []);

  async function login(e?: React.FormEvent, em?: string, pw?: string) {
    e?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em ?? email, password: pw ?? password }),
      });
      const j = await res.json();
      if (!res.ok) {
        // auto-seed then retry once
        if (j.error === "Invalid credentials") {
          await fetch("/api/seed", { method: "POST" });
          const retry = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: em ?? email, password: pw ?? password }),
          });
          const rj = await retry.json();
          if (!retry.ok) throw new Error(rj.error || "Login failed");
          router.push("/dashboard");
          return;
        }
        throw new Error(j.error || "Login failed");
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070b1a] text-white grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 blur-[100px] rounded-full" />
        <Link href="/" className="flex items-center gap-3 relative">
          <div className="w-11 h-11 rounded-2xl bg-white/15 grid place-items-center text-2xl">🎓</div>
          <div className="font-extrabold text-lg">VidyaSetu ERP</div>
        </Link>
        <div className="relative">
          <h1 className="text-5xl font-black leading-tight">One login.<br />Four worlds.<br /><span className="text-indigo-200">One intelligence.</span></h1>
          <div className="mt-6 space-y-3 text-indigo-100">
            {["📊 Admin sees the whole coaching at a glance", "🧠 Every student gets success probability + risk", "🎯 Every weakness becomes a daily action plan", "👨‍👩‍👦 Parents see simple, honest progress"].map((t) => (
              <div key={t} className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3 text-sm font-semibold">{t}</div>
            ))}
          </div>
        </div>
        <div className="text-xs text-indigo-200 relative">ERP → Data → Analytics → Prediction → Action → Improvement</div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link href="/" className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 grid place-items-center text-xl">🎓</div>
            <span className="font-extrabold">VidyaSetu ERP</span>
          </Link>
          <h2 className="text-3xl font-black">Welcome back 👋</h2>
          <p className="text-slate-400 text-sm mt-1">Login to your role dashboard. {seedState && <span className="text-emerald-400">{seedState}</span>}</p>

          <form onSubmit={(e) => login(e)} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 tracking-wider">EMAIL</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 outline-none focus:border-indigo-400" placeholder="you@coaching.in" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 tracking-wider">PASSWORD</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 outline-none focus:border-indigo-400" placeholder="••••••••" />
            </div>
            {error && <div className="rounded-2xl bg-rose-500/10 border border-rose-400/30 text-rose-300 text-sm px-4 py-3">{error}</div>}
            <button disabled={loading} className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 font-extrabold hover:opacity-95 disabled:opacity-60">
              {loading ? "Logging in…" : "Login →"}
            </button>
          </form>

          <div className="mt-6">
            <div className="text-xs font-bold text-slate-500 tracking-widest mb-3">ONE-CLICK DEMO LOGIN</div>
            <div className="grid grid-cols-2 gap-3">
              {QUICK.map((q) => (
                <button key={q.role} onClick={() => login(undefined, q.email, q.pass)}
                  className={`rounded-2xl p-4 text-left bg-gradient-to-br ${q.grad} hover:scale-[1.02] transition`}>
                  <div className="text-2xl">{q.icon}</div>
                  <div className="font-extrabold mt-1">{q.role}</div>
                  <div className="text-[11px] opacity-80 truncate">{q.email}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6 text-center text-xs text-slate-500">New here? Demo data seeds automatically on first login.</div>
        </div>
      </div>
    </div>
  );
}
