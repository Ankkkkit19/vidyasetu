// ─── Student Intelligence Engine ───
// Rule-based ML-style model combining academic + behaviour + trend signals.
// Mirrors the spec: Academic Data + Behaviour Data + Historical trend →
// success probability, risk level, factors, recommendations, study plan.

export interface TestPoint {
  id: number;
  title: string;
  subject: string;
  chapter?: string | null;
  totalMarks: number;
  examDate?: string | null;
  marksObtained: number;
  accuracy: number;
  attemptedPct: number;
}

export interface IntelligenceInput {
  attendancePct: number;
  attendanceRecentPct: number; // last 10 records
  testAvgPct: number;
  recentAvgPct: number; // last 3 tests
  accuracyAvg: number;
  assignmentCompletion: number;
  studyHours: number;
  subjectAvgs: Record<string, number>;
  subjectTrends: Record<string, number>; // slope: +ve improving
  monthlyTrend: { month: string; avg: number }[];
  mockParticipation: number; // 0..1
}

export interface IntelligenceResult {
  probability: number;
  riskLevel: "low" | "medium" | "high";
  trend: "improving" | "declining" | "stable";
  positiveFactors: string[];
  negativeFactors: string[];
  recommendations: {
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    subject: string;
    estimatedMin: number;
  }[];
  studyPlan: {
    title: string;
    subject: string;
    topic: string;
    durationMin: number;
    priority: "high" | "medium" | "low";
    reason: string;
  }[];
  insight: string;
}

export function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export function computeIntelligence(input: IntelligenceInput, targetExam = "JEE 2027"): IntelligenceResult {
  const {
    attendancePct,
    attendanceRecentPct,
    testAvgPct,
    recentAvgPct,
    accuracyAvg,
    assignmentCompletion,
    studyHours,
    subjectAvgs,
    subjectTrends,
    monthlyTrend,
    mockParticipation,
  } = input;

  // Weighted probability model (explainable, like sklearn logistic output)
  // weights sum ~ 1
  let score =
    testAvgPct * 0.34 +
    recentAvgPct * 0.14 +
    attendancePct * 0.16 +
    assignmentCompletion * 0.12 +
    accuracyAvg * 0.1 +
    clamp((studyHours / 6) * 100, 0, 100) * 0.07 +
    mockParticipation * 100 * 0.07;

  // Trend adjustment
  const trendSlope = trendSlopeOf(monthlyTrend.map((m) => m.avg));
  if (trendSlope > 1.2) score += 4;
  else if (trendSlope > 0.4) score += 1.5;
  else if (trendSlope < -1.2) score -= 6;
  else if (trendSlope < -0.4) score -= 2.5;

  // Attendance crash penalty (early warning)
  const attendanceDrop = attendancePct - attendanceRecentPct;
  if (attendanceDrop > 12) score -= 6;
  else if (attendanceDrop > 6) score -= 3;

  // Recent perf crash penalty
  const perfDrop = testAvgPct - recentAvgPct;
  if (perfDrop > 12) score -= 7;
  else if (perfDrop > 6) score -= 3.5;
  else if (perfDrop < -5) score += 2;

  score = clamp(Math.round(score), 3, 98);

  // Risk level
  let riskLevel: "low" | "medium" | "high" = "medium";
  const weakSubjects = Object.entries(subjectAvgs).filter(([, v]) => v < 55);
  const criticalWeak = Object.entries(subjectAvgs).filter(([, v]) => v < 45);
  if (score >= 72 && attendancePct >= 80 && recentAvgPct >= testAvgPct - 5 && criticalWeak.length === 0)
    riskLevel = "low";
  if (
    score < 55 ||
    attendanceRecentPct < 70 ||
    recentAvgPct < 50 ||
    criticalWeak.length >= 1 ||
    (perfDrop > 12 && recentAvgPct < 60) ||
    (attendanceDrop > 12 && attendanceRecentPct < 75)
  )
    riskLevel = "high";
  else if (score >= 72) riskLevel = "low";

  const trend: IntelligenceResult["trend"] =
    trendSlope > 0.4 ? "improving" : trendSlope < -0.4 ? "declining" : "stable";

  // Factors
  const positiveFactors: string[] = [];
  const negativeFactors: string[] = [];

  if (attendancePct >= 85) positiveFactors.push(`Attendance excellent: ${attendancePct.toFixed(0)}%`);
  else if (attendancePct >= 75) positiveFactors.push(`Attendance satisfactory: ${attendancePct.toFixed(0)}%`);
  else negativeFactors.push(`Attendance low: ${attendancePct.toFixed(0)}% (target 85%+)`);

  if (attendanceDrop > 6)
    negativeFactors.push(`Attendance declining: ${attendancePct.toFixed(0)}% → ${attendanceRecentPct.toFixed(0)}% recent`);

  if (assignmentCompletion >= 80) positiveFactors.push(`Assignment completion strong: ${assignmentCompletion.toFixed(0)}%`);
  else if (assignmentCompletion >= 60) positiveFactors.push(`Assignment completion: ${assignmentCompletion.toFixed(0)}%`);
  else negativeFactors.push(`Assignment completion low: ${assignmentCompletion.toFixed(0)}%`);

  if (mockParticipation >= 0.8) positiveFactors.push(`Mock-test participation: High`);
  else if (mockParticipation < 0.5) negativeFactors.push(`Mock-test participation low — attempt more mocks`);

  if (accuracyAvg >= 75) positiveFactors.push(`Accuracy sharp: ${accuracyAvg.toFixed(0)}%`);
  else if (accuracyAvg < 55) negativeFactors.push(`Accuracy weak: ${accuracyAvg.toFixed(0)}% — focus on concept clarity`);

  if (studyHours >= 5) positiveFactors.push(`Study consistency: ${studyHours.toFixed(1)} hrs/day`);
  else if (studyHours < 3) negativeFactors.push(`Study consistency low: ${studyHours.toFixed(1)} hrs/day`);

  for (const [subj, avg] of Object.entries(subjectAvgs)) {
    const slope = subjectTrends[subj] ?? 0;
    if (avg >= 70 && slope >= 0) positiveFactors.push(`${subj} strong & stable (${avg.toFixed(0)}%)`);
    else if (slope > 2) positiveFactors.push(`${subj} improving (+${slope.toFixed(1)}%/test)`);
    else if (avg < 55) negativeFactors.push(`${subj} weak (${avg.toFixed(0)}%) — needs focused practice`);
    else if (slope < -2) negativeFactors.push(`${subj} declining (${slope.toFixed(1)}%/test) — revise basics`);
  }

  if (perfDrop > 6) negativeFactors.push(`Recent test average dipped ${testAvgPct.toFixed(0)}% → ${recentAvgPct.toFixed(0)}%`);
  if (perfDrop < -5) positiveFactors.push(`Recent form rising: ${testAvgPct.toFixed(0)}% → ${recentAvgPct.toFixed(0)}%`);

  // Recommendations
  const sortedSubjects = Object.entries(subjectAvgs).sort((a, b) => a[1] - b[1]);
  const recommendations: IntelligenceResult["recommendations"] = [];
  sortedSubjects.slice(0, 2).forEach(([subj, avg], i) => {
    recommendations.push({
      title: i === 0 ? `Priority repair: ${subj}` : `Consolidate: ${subj}`,
      description:
        avg < 50
          ? `Score ${avg.toFixed(0)}% in ${subj}. Do 30 min concept revision + 20 mixed questions daily for 7 days, then attempt a ${subj} sectional mock.`
          : `Score ${avg.toFixed(0)}% in ${subj}. Increase practice by 30 min/day and attempt 2 additional ${subj} tests this week.`,
      priority: i === 0 ? "high" : "medium",
      subject: subj,
      estimatedMin: i === 0 ? 45 : 30,
    });
  });
  if (attendanceRecentPct < 78)
    recommendations.push({
      title: "Restore attendance rhythm",
      description: "Attendance below 75% triggers auto-alert. Attend all scheduled classes for next 2 weeks; catch up via recordings.",
      priority: "high",
      subject: "Discipline",
      estimatedMin: 20,
    });
  if (accuracyAvg < 60)
    recommendations.push({
      title: "Accuracy bootcamp",
      description: "Solve 15 questions with timer, review every wrong answer in an error notebook. Target 70%+ accuracy.",
      priority: "medium",
      subject: "Exam Skills",
      estimatedMin: 40,
    });
  if (assignmentCompletion < 75)
    recommendations.push({
      title: "Clear assignment backlog",
      description: "Complete pending assignments oldest-first. 2 per day until backlog is zero.",
      priority: "medium",
      subject: "Consistency",
      estimatedMin: 60,
    });
  if (recommendations.length === 0 || score > 80)
    recommendations.push({
      title: "Push to topper bracket",
      description: "Attempt 1 full-length mock weekly under exam conditions and analyse mistakes topic-wise.",
      priority: "low",
      subject: "Advanced",
      estimatedMin: 90,
    });

  // Study plan (today's priority)
  const studyPlan: IntelligenceResult["studyPlan"] = sortedSubjects.slice(0, 3).map(([subj, avg], i) => ({
    title: i === 0 ? `${subj} — weakest chapter drill` : i === 1 ? `${subj} — revision + PYQs` : `${subj} — speed practice`,
    subject: subj,
    topic: i === 0 ? "High-weightage weak chapter" : "Mixed revision",
    durationMin: i === 0 ? 45 : i === 1 ? 30 : 45,
    priority: (i === 0 ? "high" : i === 1 ? "medium" : "low") as "high" | "medium" | "low",
    reason: `${subj} avg ${avg.toFixed(0)}%`,
  }));

  const insight =
    riskLevel === "high"
      ? `Needs urgent intervention for ${targetExam}. Decline detected — teacher counselling recommended this week.`
      : riskLevel === "low"
        ? `On track for ${targetExam} at ${score}%. Keep the rhythm; push mocks to convert to a top rank.`
        : `Moderate chance for ${targetExam} (${score}%). Fix weakest subject to unlock +8–12% probability.`;

  return { probability: score, riskLevel, trend, positiveFactors, negativeFactors, recommendations, studyPlan, insight };
}

function trendSlopeOf(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((y, x) => {
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) ** 2;
  });
  return den === 0 ? 0 : num / den;
}

export function pct(marks: number, total: number) {
  if (!total) return 0;
  return Math.round((marks / total) * 1000) / 10;
}
