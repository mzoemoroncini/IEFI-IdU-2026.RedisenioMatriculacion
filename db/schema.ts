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
  provinceId: text("province_id"),
  provinceName: text("province_name"),
  localityId: text("locality_id"),
  searchKey: text("search_key"),
  updatedAt: text("updated_at"),
  deletedAt: text("deleted_at"),
  version: integer("version").notNull().default(1),
});

export const courses = sqliteTable("courses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameKey: text("name_key").notNull().unique(),
  position: integer("position").notNull().default(0),
  createdAt: text("created_at").notNull(),
  deletedAt: text("deleted_at"),
  version: integer("version").notNull().default(1),
});

export const authSessions=sqliteTable('auth_sessions',{
 tokenHash:text('token_hash').primaryKey(),email:text('email').notNull(),role:text('role').notNull(),credentialKey:text('credential_key').notNull(),expiresAt:integer('expires_at').notNull()
});
export const authLimits=sqliteTable('auth_limits',{
 bucket:text('bucket').primaryKey(),window:integer('window').notNull(),attempts:integer('attempts').notNull()
});

export const demoEnrollments = sqliteTable("demo_enrollments", {
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
  provinceId: text("province_id"),
  provinceName: text("province_name"),
  localityId: text("locality_id"),
  searchKey: text("search_key"),
  updatedAt: text("updated_at"),
  deletedAt: text("deleted_at"),
  version: integer("version").notNull().default(1),
});

export const demoCourses = sqliteTable("demo_courses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameKey: text("name_key").notNull().unique(),
  position: integer("position").notNull().default(0),
  createdAt: text("created_at").notNull(),
  deletedAt: text("deleted_at"),
  version: integer("version").notNull().default(1),
});

