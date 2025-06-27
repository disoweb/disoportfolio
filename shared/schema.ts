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
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "succeeded", "failed", "refunded"]);
export const supportStatusEnum = pgEnum("support_status", ["open", "in_progress", "resolved"]);
export const withdrawalStatusEnum = pgEnum("withdrawal_status", ["pending", "approved", "completed", "rejected"]);
export const referralStatusEnum = pgEnum("referral_status", ["pending", "confirmed", "paid"]);

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
  referralCode: varchar("referral_code").unique(), // Unique referral code for each user
  referredBy: varchar("referred_by").references(() => users.id), // Who referred this user
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("password_reset_tokens_token_idx").on(table.token),
  index("password_reset_tokens_user_id_idx").on(table.userId),
]);

export const services = pgTable("services", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description").notNull(),
  priceUsd: varchar("price_usd").notNull(), // Price as string for easier handling
  originalPriceUsd: varchar("original_price_usd"),
  duration: varchar("duration").notNull(), // e.g., "2-3 weeks"
  spotsRemaining: integer("spots_remaining").notNull(),
  totalSpots: integer("total_spots").notNull(),
  features: text("features").notNull(), // JSON string of features
  addOns: text("add_ons").notNull(), // JSON string of add-ons
  recommended: boolean("recommended").default(false),
  category: serviceCategoryEnum("category").notNull(),
  industry: text("industry").notNull(), // JSON string of industries
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  serviceId: varchar("service_id").references(() => services.id),
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
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  status: projectStatusEnum("status").default("not_started"),
  timelineWeeks: integer("timeline_weeks").default(4),
  timelineDays: integer("timeline_days"), // Total days for the project
  progressPercentage: integer("progress_percentage").default(0),
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

// Checkout sessions table for reliable data persistence
export const checkoutSessions = pgTable("checkout_sessions", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionToken: varchar("session_token").notNull().unique(), // Unique session identifier
  serviceId: varchar("service_id").notNull(),
  serviceData: jsonb("service_data").notNull(), // Complete service object
  contactData: jsonb("contact_data"), // Contact form data
  selectedAddOns: jsonb("selected_add_ons").default("[]"), // Array of selected add-ons
  totalPrice: integer("total_price").notNull(),
  userId: varchar("user_id"), // Optional - set after authentication
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // Auto-expire after 2 hours
});

// Referral system tables
export const referralSettings = pgTable("referral_settings", {
  id: varchar("id").primaryKey().default("default"),
  commissionPercentage: decimal("commission_percentage", { precision: 5, scale: 2 }).default("10.00"), // Default 10%
  minimumWithdrawal: decimal("minimum_withdrawal", { precision: 10, scale: 2 }).default("50.00"), // Minimum $50
  payoutSchedule: varchar("payout_schedule").default("monthly"), // weekly, monthly, manual
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const referrals = pgTable("referrals", {
  id: uuid("id").primaryKey().defaultRandom(),
  referrerId: varchar("referrer_id").references(() => users.id).notNull(), // Who made the referral
  referredUserId: varchar("referred_user_id").references(() => users.id).notNull(), // Who was referred
  orderId: uuid("order_id").references(() => orders.id), // Order that triggered the referral
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  commissionPercentage: decimal("commission_percentage", { precision: 5, scale: 2 }).notNull(),
  status: referralStatusEnum("status").default("pending"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method").notNull(), // bank_transfer, paypal, etc.
  paymentDetails: jsonb("payment_details").notNull(), // Account details
  status: withdrawalStatusEnum("status").default("pending"),
  adminNotes: text("admin_notes"),
  processedAt: timestamp("processed_at"),
  processedBy: varchar("processed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const referralEarnings = pgTable("referral_earnings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  totalEarned: decimal("total_earned", { precision: 10, scale: 2 }).default("0.00"),
  totalWithdrawn: decimal("total_withdrawn", { precision: 10, scale: 2 }).default("0.00"),
  pendingEarnings: decimal("pending_earnings", { precision: 10, scale: 2 }).default("0.00"),
  availableBalance: decimal("available_balance", { precision: 10, scale: 2 }).default("0.00"),
  totalReferrals: integer("total_referrals").default(0),
  successfulReferrals: integer("successful_referrals").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  orders: many(orders),
  projects: many(projects),
  messages: many(messages),
  payments: many(payments),
  files: many(files),
  notifications: many(notifications),
  supportRequests: many(supportRequests),
  auditLogs: many(auditLogs),
  referralsMade: many(referrals, { relationName: "referrer" }),
  referralsReceived: many(referrals, { relationName: "referred" }),
  withdrawalRequests: many(withdrawalRequests),
  earnings: one(referralEarnings),
  referredBy: one(users, { fields: [users.referredBy], references: [users.id] }),
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

export const checkoutSessionsRelations = relations(checkoutSessions, ({ one }) => ({
  service: one(services, { fields: [checkoutSessions.serviceId], references: [services.id] }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, { fields: [referrals.referrerId], references: [users.id], relationName: "referrer" }),
  referredUser: one(users, { fields: [referrals.referredUserId], references: [users.id], relationName: "referred" }),
  order: one(orders, { fields: [referrals.orderId], references: [orders.id] }),
}));

export const withdrawalRequestsRelations = relations(withdrawalRequests, ({ one }) => ({
  user: one(users, { fields: [withdrawalRequests.userId], references: [users.id] }),
  processedBy: one(users, { fields: [withdrawalRequests.processedBy], references: [users.id] }),
}));

export const referralEarningsRelations = relations(referralEarnings, ({ one }) => ({
  user: one(users, { fields: [referralEarnings.userId], references: [users.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export const insertCheckoutSessionSchema = createInsertSchema(checkoutSessions).omit({
  id: true,
  createdAt: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export const insertReferralSettingsSchema = createInsertSchema(referralSettings).omit({
  updatedAt: true,
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
});

export const insertWithdrawalRequestSchema = createInsertSchema(withdrawalRequests).omit({
  id: true,
  createdAt: true,
});

export const insertReferralEarningsSchema = createInsertSchema(referralEarnings).omit({
  id: true,
  updatedAt: true,
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
export type InsertCheckoutSession = z.infer<typeof insertCheckoutSessionSchema>;
export type CheckoutSession = typeof checkoutSessions.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type InsertReferralSettings = z.infer<typeof insertReferralSettingsSchema>;
export type ReferralSettings = typeof referralSettings.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertWithdrawalRequest = z.infer<typeof insertWithdrawalRequestSchema>;
export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
export type InsertReferralEarnings = z.infer<typeof insertReferralEarningsSchema>;
export type ReferralEarnings = typeof referralEarnings.$inferSelect;

export const settings = pgTable("settings", {
  id: text("id").primaryKey().default("default"),
  whatsappNumber: text("whatsapp_number"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;