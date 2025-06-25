import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  uuid,
  decimal,
  boolean,
  pgEnum,
  integer,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import crypto from "crypto";

// Define enums first
export const userRoleEnum = pgEnum("user_role", ["client", "admin", "pm"]);
export const serviceCategoryEnum = pgEnum("service_category", ["launch", "growth", "elite", "custom"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "paid", "in_progress", "complete", "cancelled"]);
export const projectStatusEnum = pgEnum("project_status", ["not_started", "active", "paused", "completed"]);
export const paymentStatusEnum = pgEnum("payment_status", ["succeeded", "failed", "refunded"]);
export const supportStatusEnum = pgEnum("support_status", ["open", "in_progress", "resolved"]);

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: varchar("email").unique().notNull(),
  password: varchar("password"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default("client"),
  phone: varchar("phone"),
  companyName: varchar("company_name"),
  provider: varchar("provider").default("local"),
  providerId: varchar("provider_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name").notNull(),
  description: text("description").notNull(),
  priceUsd: decimal("price_usd").notNull(),
  category: serviceCategoryEnum("category").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  serviceId: uuid("service_id").references(() => services.id),
  customRequest: text("custom_request"),
  totalPrice: varchar("total_price").notNull(), // Changed to varchar for easier handling
  status: orderStatusEnum("status").default("pending"),
  paymentId: uuid("payment_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  projectName: varchar("project_name"),
  currentStage: varchar("current_stage").default("Discovery"),
  notes: text("notes"),
  startDate: date("start_date"),
  dueDate: date("due_date"),
  status: projectStatusEnum("status").default("not_started"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectStages = pgTable("project_stages", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull(),
  isComplete: boolean("is_complete").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  senderId: varchar("sender_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  isAdmin: boolean("is_admin").default(false),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  amount: decimal("amount").notNull(),
  currency: varchar("currency").default("USD"),
  provider: varchar("provider").notNull(),
  providerId: varchar("provider_id").notNull(),
  status: paymentStatusEnum("status").notNull(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  fileUrl: text("file_url").notNull(),
  filename: varchar("filename").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const supportRequests = pgTable("support_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  projectId: uuid("project_id").references(() => projects.id),
  subject: varchar("subject").notNull(),
  description: text("description").notNull(),
  status: supportStatusEnum("status").default("open"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  actionType: varchar("action_type").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  projects: many(projects),
  messages: many(messages),
  payments: many(payments),
  files: many(files),
  notifications: many(notifications),
  supportRequests: many(supportRequests),
  auditLogs: many(auditLogs),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  service: one(services, { fields: [orders.serviceId], references: [services.id] }),
  projects: many(projects),
  payments: many(payments),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  order: one(orders, { fields: [projects.orderId], references: [orders.id] }),
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  stages: many(projectStages),
  messages: many(messages),
  files: many(files),
}));

export const projectStagesRelations = relations(projectStages, ({ one }) => ({
  project: one(projects, { fields: [projectStages.projectId], references: [projects.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  project: one(projects, { fields: [messages.projectId], references: [projects.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

export const filesRelations = relations(files, ({ one }) => ({
  project: one(projects, { fields: [files.projectId], references: [projects.id] }),
  uploadedBy: one(users, { fields: [files.uploadedBy], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const supportRequestsRelations = relations(supportRequests, ({ one }) => ({
  user: one(users, { fields: [supportRequests.userId], references: [users.id] }),
  project: one(projects, { fields: [supportRequests.projectId], references: [projects.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  sentAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  uploadedAt: true,
});

export const insertSupportRequestSchema = createInsertSchema(supportRequests).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;
export type InsertSupportRequest = z.infer<typeof insertSupportRequestSchema>;
export type SupportRequest = typeof supportRequests.$inferSelect;
export type ProjectStage = typeof projectStages.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
