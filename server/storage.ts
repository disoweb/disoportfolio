import {
  users,
  services,
  orders,
  projects,
  projectStages,
  messages,
  payments,
  files,
  notifications,
  supportRequests,
  auditLogs,
  type User,
  type UpsertUser,
  type Service,
  type InsertService,
  type Order,
  type InsertOrder,
  type Project,
  type InsertProject,
  type Message,
  type InsertMessage,
  type Payment,
  type InsertPayment,
  type SupportRequest,
  type InsertSupportRequest,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count, sum, sql } from "drizzle-orm";
import crypto from "crypto";

// Interface for storage operations
export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;

  getActiveServices(): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;

  createOrder(order: InsertOrder): Promise<Order>;
  getUserOrders(userId: string): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  updateOrderStatus(orderId: string, status: string): Promise<Order>;

  getUserProjects(userId: string): Promise<Project[]>;
  getAllProjects(): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(projectId: string, updates: Partial<Project>): Promise<Project>;
  userHasProjectAccess(userId: string, projectId: string): Promise<boolean>;

  getProjectMessages(projectId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  initializePayment(params: {
    orderId: string;
    amount: number;
    email: string;
    userId: string;
  }): Promise<string>;
  verifyPaystackWebhook(signature: string, body: string): Promise<boolean>;
  handleSuccessfulPayment(paymentData: any): Promise<void>;

  getUserSupportRequests(userId: string): Promise<SupportRequest[]>;
  getAllSupportRequests(): Promise<SupportRequest[]>;
  createSupportRequest(request: InsertSupportRequest): Promise<SupportRequest>;

  getAnalytics(): Promise<any>;

  handleContactForm(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<void>;
  handleQuoteRequest(data: any): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Service operations
  async getActiveServices(): Promise<Service[]> {
    return await db
      .select()
      .from(services)
      .where(eq(services.isActive, true))
      .orderBy(services.createdAt);
  }

  async createService(service: InsertService): Promise<Service> {
    const [newService] = await db.insert(services).values(service).returning();
    return newService;
  }

  // Order operations
  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  async getAllOrders(): Promise<Order[]> {
    return await db
      .select({
        id: orders.id,
        userId: orders.userId,
        serviceId: orders.serviceId,
        customRequest: orders.customRequest,
        totalPrice: orders.totalPrice,
        status: orders.status,
        paymentId: orders.paymentId,
        createdAt: orders.createdAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        service: {
          id: services.id,
          name: services.name,
          category: services.category,
        },
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .leftJoin(services, eq(orders.serviceId, services.id))
      .orderBy(desc(orders.createdAt));
  }

  async updateOrderStatus(orderId: string, status: string): Promise<Order> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ status: status as any })
      .where(eq(orders.id, orderId))
      .returning();
    return updatedOrder;
  }

  // Project operations
  async getUserProjects(userId: string): Promise<Project[]> {
    return await db
      .select({
        id: projects.id,
        orderId: projects.orderId,
        userId: projects.userId,
        projectName: projects.projectName,
        currentStage: projects.currentStage,
        notes: projects.notes,
        startDate: projects.startDate,
        dueDate: projects.dueDate,
        status: projects.status,
        createdAt: projects.createdAt,
        order: {
          service: {
            name: services.name,
          },
        },
      })
      .from(projects)
      .leftJoin(orders, eq(projects.orderId, orders.id))
      .leftJoin(services, eq(orders.serviceId, services.id))
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt));
  }

  async getAllProjects(): Promise<Project[]> {
    return await db
      .select({
        id: projects.id,
        orderId: projects.orderId,
        userId: projects.userId,
        projectName: projects.projectName,
        currentStage: projects.currentStage,
        notes: projects.notes,
        startDate: projects.startDate,
        dueDate: projects.dueDate,
        status: projects.status,
        createdAt: projects.createdAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        order: {
          service: {
            name: services.name,
          },
        },
      })
      .from(projects)
      .leftJoin(users, eq(projects.userId, users.id))
      .leftJoin(orders, eq(projects.orderId, orders.id))
      .leftJoin(services, eq(orders.serviceId, services.id))
      .orderBy(desc(projects.createdAt));
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(
    projectId: string,
    updates: Partial<Project>,
  ): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, projectId))
      .returning();
    return updatedProject;
  }

  async userHasProjectAccess(
    userId: string,
    projectId: string,
  ): Promise<boolean> {
    const user = await this.getUser(userId);
    if (user?.role === "admin") return true;

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

    return !!project;
  }

  // Message operations
  async getProjectMessages(projectId: string): Promise<Message[]> {
    return await db
      .select({
        id: messages.id,
        projectId: messages.projectId,
        senderId: messages.senderId,
        content: messages.content,
        sentAt: messages.sentAt,
        isAdmin: messages.isAdmin,
        sender: {
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.projectId, projectId))
      .orderBy(messages.sentAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  // Payment operations
  async initializePayment(params: {
    orderId: string;
    amount: number;
    email: string;
    userId: string;
  }): Promise<string> {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      throw new Error("Paystack secret key not configured");
    }

    const reference = `PSK_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: params.email,
          amount: params.amount * 100, // Convert to kobo
          reference,
          callback_url: `${process.env.FRONTEND_URL || "http://localhost:5000"}/api/payments/callback`,
          currency: "NGN",
          metadata: {
            orderId: params.orderId,
            userId: params.userId,
          },
        }),
      },
    );

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || "Failed to initialize payment");
    }

    // Store payment record
    await db.insert(payments).values({
      userId: params.userId,
      orderId: params.orderId,
      amount: params.amount.toString(),
      currency: "NGN",
      provider: "paystack",
      providerId: reference,
      status: "pending" as any,
    });

    return data.data.authorization_url;
  }

  async verifyPaystackWebhook(
    signature: string,
    body: string,
  ): Promise<boolean> {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      return false;
    }

    const hash = crypto
      .createHmac("sha512", paystackSecretKey)
      .update(body, "utf8")
      .digest("hex");

    return hash === signature;
  }

  async handleSuccessfulPayment(paymentData: any): Promise<void> {
    const reference = paymentData.reference;
    const orderId = paymentData.metadata?.orderId;

    if (!orderId) {
      throw new Error("Order ID not found in payment metadata");
    }

    // Update payment status
    await db
      .update(payments)
      .set({
        status: "succeeded" as any,
        paidAt: new Date(),
      })
      .where(eq(payments.providerId, reference));

    // Update order status
    await db
      .update(orders)
      .set({ status: "paid" as any })
      .where(eq(orders.id, orderId));

    // Create project if it doesn't exist
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (order) {
      const existingProject = await db
        .select()
        .from(projects)
        .where(eq(projects.orderId, orderId));

      if (existingProject.length === 0) {
        await db.insert(projects).values({
          orderId: order.id,
          userId: order.userId,
          projectName: `Project for ${
            order.customRequest?.split("\n")[0] || "New Project"
          }`,
          currentStage: "Discovery",
          status: "active" as any,
        });
      }
    }
  }

  // Support operations
  async getUserSupportRequests(userId: string): Promise<SupportRequest[]> {
    return await db
      .select()
      .from(supportRequests)
      .where(eq(supportRequests.userId, userId))
      .orderBy(desc(supportRequests.createdAt));
  }

  async getAllSupportRequests(): Promise<SupportRequest[]> {
    return await db
      .select({
        id: supportRequests.id,
        userId: supportRequests.userId,
        projectId: supportRequests.projectId,
        subject: supportRequests.subject,
        description: supportRequests.description,
        status: supportRequests.status,
        createdAt: supportRequests.createdAt,
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(supportRequests)
      .leftJoin(users, eq(supportRequests.userId, users.id))
      .orderBy(desc(supportRequests.createdAt));
  }

  async createSupportRequest(
    request: InsertSupportRequest,
  ): Promise<SupportRequest> {
    const [newRequest] = await db
      .insert(supportRequests)
      .values(request)
      .returning();
    return newRequest;
  }

  // Analytics operations
  async getAnalytics(): Promise<any> {
    const [totalRevenue] = await db
      .select({ value: sum(orders.totalPrice) })
      .from(orders)
      .where(eq(orders.status, "paid"));

    const [totalClients] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, "client"));

    const [activeProjects] = await db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.status, "active"));

    const [newOrders] = await db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          eq(orders.status, "pending"),
          sql`${orders.createdAt} >= NOW() - INTERVAL '30 days'`,
        ),
      );

    return {
      totalRevenue: totalRevenue?.value || 0,
      totalClients: totalClients?.count || 0,
      activeProjects: activeProjects?.count || 0,
      newOrders: newOrders?.count || 0,
    };
  }

  // Contact and quote operations
  async handleContactForm(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<void> {
    // In a real implementation, you would send an email notification here
    console.log("Contact form submission:", data);

    // Create a system user if it doesn't exist
    const systemUser = await this.getUserByEmail("system@disowebs.com");
    if (!systemUser) {
      await this.createUser({
        id: "system",
        firstName: "System",
        lastName: "Admin",
        email: "system@disowebs.com",
        role: "admin",
      });
    }

    // Log audit trail
    await db.insert(auditLogs).values({
      userId: "system",
      actionType: "contact_form_submission",
      details: JSON.stringify(data),
    });
  }

  async handleQuoteRequest(data: any): Promise<void> {
    // Store the quote request without audit log for now
    // TODO: Create a separate quotes table for better data management
    console.log("Quote request submission:", data);
  }
}

// Export a singleton instance for easy import
export const storage = new DatabaseStorage();