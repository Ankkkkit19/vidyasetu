import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  real,
  boolean,
  timestamp,
  date,
  jsonb,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 160 }).notNull().unique(),
  password: varchar("password", { length: 200 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("student"),
  phone: varchar("phone", { length: 20 }),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  duration: varchar("duration", { length: 60 }),
  targetExam: varchar("target_exam", { length: 60 }),
  totalFees: integer("total_fees").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const batches = pgTable("batches", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  courseId: integer("course_id"),
  teacherId: integer("teacher_id"),
  schedule: varchar("schedule", { length: 200 }),
  room: varchar("room", { length: 60 }),
  capacity: integer("capacity").default(40),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  rollNo: varchar("roll_no", { length: 30 }),
  batchId: integer("batch_id"),
  courseId: integer("course_id"),
  targetExam: varchar("target_exam", { length: 60 }),
  enrollmentDate: date("enrollment_date"),
  gender: varchar("gender", { length: 12 }),
  dob: date("dob"),
  address: text("address"),
  parentName: varchar("parent_name", { length: 120 }),
  parentPhone: varchar("parent_phone", { length: 20 }),
  studyHours: real("study_hours").default(4),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teachers = pgTable("teachers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  subjects: varchar("subjects", { length: 250 }),
  qualification: varchar("qualification", { length: 160 }),
  experienceYears: integer("experience_years").default(0),
  status: varchar("status", { length: 20 }).default("active"),
});

export const parents = pgTable("parents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  studentId: integer("student_id"),
  relation: varchar("relation", { length: 30 }).default("Father"),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  batchId: integer("batch_id"),
  date: date("date").notNull(),
  status: varchar("status", { length: 12 }).notNull().default("present"),
  markedBy: integer("marked_by"),
});

export const tests = pgTable("tests", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  subject: varchar("subject", { length: 80 }).notNull(),
  chapter: varchar("chapter", { length: 120 }),
  difficulty: varchar("difficulty", { length: 20 }).default("Medium"),
  totalMarks: integer("total_marks").default(100),
  negativeMarking: varchar("negative_marking", { length: 20 }).default("No"),
  durationMin: integer("duration_min").default(60),
  examDate: date("exam_date"),
  batchId: integer("batch_id"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const testResults = pgTable("test_results", {
  id: serial("id").primaryKey(),
  testId: integer("test_id").notNull(),
  studentId: integer("student_id").notNull(),
  marksObtained: real("marks_obtained").default(0),
  accuracy: real("accuracy").default(0),
  attemptedPct: real("attempted_pct").default(0),
  correct: integer("correct").default(0),
  wrong: integer("wrong").default(0),
  skipped: integer("skipped").default(0),
  timeTakenMin: integer("time_taken_min").default(0),
  percentile: real("percentile").default(0),
  rank: integer("rank").default(0),
});

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  subject: varchar("subject", { length: 80 }).notNull(),
  topic: varchar("topic", { length: 120 }),
  description: text("description"),
  totalMarks: integer("total_marks").default(20),
  deadline: date("deadline"),
  batchId: integer("batch_id"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull(),
  studentId: integer("student_id").notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  submittedAt: timestamp("submitted_at"),
  marks: real("marks"),
  feedback: text("feedback"),
});

export const fees = pgTable("fees", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  total: integer("total").default(0),
  paid: integer("paid").default(0),
  discount: integer("discount").default(0),
  dueDate: date("due_date"),
  status: varchar("status", { length: 20 }).default("pending"),
});

export const feePayments = pgTable("fee_payments", {
  id: serial("id").primaryKey(),
  feeId: integer("fee_id").notNull(),
  amount: integer("amount").notNull(),
  method: varchar("method", { length: 30 }).default("Cash"),
  receiptNo: varchar("receipt_no", { length: 40 }),
  paidAt: timestamp("paid_at").defaultNow(),
});

export const remarks = pgTable("remarks", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  teacherId: integer("teacher_id"),
  type: varchar("type", { length: 30 }).default("academic"),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  probability: real("probability").default(0),
  riskLevel: varchar("risk_level", { length: 12 }).default("medium"),
  positiveFactors: jsonb("positive_factors").default([]),
  negativeFactors: jsonb("negative_factors").default([]),
  trend: varchar("trend", { length: 20 }).default("stable"),
  predictedAt: timestamp("predicted_at").defaultNow(),
});

export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  priority: varchar("priority", { length: 12 }).default("medium"),
  subject: varchar("subject", { length: 80 }),
  estimatedMin: integer("estimated_min").default(30),
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message"),
  type: varchar("type", { length: 30 }).default("info"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const studyTasks = pgTable("study_tasks", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  subject: varchar("subject", { length: 80 }),
  topic: varchar("topic", { length: 120 }),
  durationMin: integer("duration_min").default(45),
  priority: varchar("priority", { length: 12 }).default("medium"),
  dueDate: date("due_date"),
  status: varchar("status", { length: 20 }).default("pending"),
});
