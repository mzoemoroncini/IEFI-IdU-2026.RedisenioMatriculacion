import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const enrollments = sqliteTable("enrollments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requestId: text("request_id").notNull().unique(),
  courseId: text("course_id").notNull(),
  courseName: text("course_name").notNull(),
  enrollmentDate: text("enrollment_date").notNull(),
  lastName: text("last_name").notNull(),
  firstName: text("first_name").notNull(),
  sex: text("sex").notNull(),
  address: text("address").notNull(),
  locality: text("locality").notNull(),
  registeredAt: text("registered_at").notNull(),
});
