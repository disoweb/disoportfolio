import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { eq, desc, and, or, like, sql } from "drizzle-orm";
import * as schema from "../shared/schema";
import { nanoid } from "nanoid";

const {
  users,
  services,
  orders,
  projects,
  checkoutSessions,
  referrals,
  referralEarnings,
  withdrawalRequests,
  seoAudits
} = schema;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export class Storage {
  // User management
  async createUser(userData: any) {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async getUserById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async createAdminUser(email: string, hashedPassword: string) {
    const [user] = await db.insert(users).values({
      email,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    }).returning();
    return user;
  }

  // Service management
  async getAllServices() {
    return await db.select().from(services).orderBy(desc(services.createdAt));
  }

  async getServiceById(id: string) {
    const [service] = await db.select().from(services).where(eq(services.id, id)).limit(1);
    return service;
  }

  async createService(serviceData: any) {
    const [service] = await db.insert(services).values(serviceData).returning();
    return service;
  }

  async updateService(id: string, serviceData: any) {
    const [service] = await db.update(services).set(serviceData).where(eq(services.id, id)).returning();
    return service;
  }

  async deleteService(id: string) {
    const [service] = await db.delete(services).where(eq(services.id, id)).returning();
    return service;
  }

  // Order management
  async createOrder(orderData: any) {
    const [order] = await db.insert(orders).values(orderData).returning();
    return order;
  }

  async getOrderById(id: string) {
    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return order;
  }

  async getUserOrders(userId: string, options: any = {}) {
    let query = db
      .select({
        id: orders.id,
        serviceId: orders.serviceId,
        serviceName: orders.serviceName,
        customRequest: orders.customRequest,
        priceUsd: orders.priceUsd,
        contactName: orders.contactName,
        contactEmail: orders.contactEmail,
        contactPhone: orders.contactPhone,
        companyName: orders.companyName,
        status: orders.status,
        createdAt: orders.createdAt,
        addons: orders.addons,
      })
      .from(orders)
      .where(eq(orders.userId, userId));

    if (options.status) {
      query = query.where(eq(orders.status, options.status));
    }

    return await query.orderBy(desc(orders.createdAt));
  }

  async updateOrderStatus(id: string, status: string) {
    const [order] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return order;
  }

  async deleteOrder(id: string) {
    const [order] = await db.delete(orders).where(eq(orders.id, id)).returning();
    return order;
  }

  // Project management
  async createProject(projectData: any) {
    const [project] = await db.insert(projects).values(projectData).returning();
    return project;
  }

  async getUserProjects(userId: string) {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt));
  }

  async getAllProjects() {
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
      })
      .from(projects)
      .orderBy(desc(projects.createdAt));
  }

  async updateProject(id: string, projectData: any) {
    const [project] = await db.update(projects).set(projectData).where(eq(projects.id, id)).returning();
    return project;
  }

  async deleteProject(id: string) {
    const [project] = await db.delete(projects).where(eq(projects.id, id)).returning();
    return project;
  }

  // Checkout session management
  async createCheckoutSession(sessionData: any) {
    const [session] = await db.insert(checkoutSessions).values(sessionData).returning();
    return session;
  }

  async getCheckoutSession(token: string) {
    const [session] = await db.select().from(checkoutSessions).where(eq(checkoutSessions.token, token)).limit(1);
    return session;
  }

  async deleteCheckoutSession(token: string) {
    const [session] = await db.delete(checkoutSessions).where(eq(checkoutSessions.token, token)).returning();
    return session;
  }

  // Referral system
  async createReferralCode(codeData: any) {
    const [code] = await db.insert(referralCodes).values(codeData).returning();
    return code;
  }

  async getReferralCodeByCode(code: string) {
    const [referralCode] = await db.select().from(referralCodes).where(eq(referralCodes.code, code)).limit(1);
    return referralCode;
  }

  async getReferralCodeByUserId(userId: string) {
    const [referralCode] = await db.select().from(referralCodes).where(eq(referralCodes.userId, userId)).limit(1);
    return referralCode;
  }

  async createEarning(earningData: any) {
    const [earning] = await db.insert(earnings).values(earningData).returning();
    return earning;
  }

  async getUserEarnings(userId: string) {
    return await db
      .select()
      .from(earnings)
      .where(eq(earnings.userId, userId))
      .orderBy(desc(earnings.createdAt));
  }

  async createWithdrawalRequest(requestData: any) {
    const [request] = await db.insert(withdrawalRequests).values(requestData).returning();
    return request;
  }

  async getUserWithdrawalRequests(userId: string) {
    return await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.userId, userId))
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async getAllWithdrawalRequests() {
    return await db
      .select()
      .from(withdrawalRequests)
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async updateWithdrawalRequest(id: string, requestData: any) {
    const [request] = await db.update(withdrawalRequests).set(requestData).where(eq(withdrawalRequests.id, id)).returning();
    return request;
  }

  // Payment processing
  async initializePayment(params: any) {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      throw new Error("Payment service not configured");
    }

    // Validate parameters
    if (!params.orderId || !params.email || !params.userId || params.amount <= 0) {
      throw new Error('Invalid payment parameters');
    }

    const reference = "PSK_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11);

    try {
      const requestBody = {
        email: params.email,
        amount: params.amount * 100, // Convert to kobo
        reference,
        callback_url: `${process.env.PAYSTACK_CALLBACK_URL || 'https://disoweb.onrender.com'}/payment-success`,
        currency: "NGN",
        metadata: {
          orderId: params.orderId,
          userId: params.userId,
        },
      };

      const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Paystack API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status) {
        return {
          success: true,
          authorization_url: data.data.authorization_url,
          reference: data.data.reference,
        };
      } else {
        throw new Error(data.message || "Payment initialization failed");
      }
    } catch (error) {
      console.error("Payment initialization error:", error);
      throw new Error("Failed to initialize payment");
    }
  }

  // SEO audits
  async createSeoAudit(auditData: any) {
    const [audit] = await db.insert(seoAudits).values(auditData).returning();
    return audit;
  }

  async getSeoAuditById(id: string) {
    const [audit] = await db.select().from(seoAudits).where(eq(seoAudits.id, id)).limit(1);
    return audit;
  }

  // Utility methods
  extractProjectDataFromOrder(order: any) {
    const projectName = order.serviceName || order.customRequest || "New Project";
    const description = order.customRequest || `${order.serviceName} project for ${order.contactName}`;
    
    // Calculate project timeline based on service
    const now = new Date();
    const dueDate = new Date(now);
    
    // Default to 4 weeks for most projects
    let weeksToAdd = 4;
    
    if (order.serviceName) {
      if (order.serviceName.toLowerCase().includes('landing')) weeksToAdd = 2;
      else if (order.serviceName.toLowerCase().includes('ecommerce')) weeksToAdd = 6;
      else if (order.serviceName.toLowerCase().includes('custom')) weeksToAdd = 8;
    }
    
    dueDate.setDate(dueDate.getDate() + (weeksToAdd * 7));

    return {
      id: nanoid(),
      orderId: order.id,
      userId: order.userId,
      projectName,
      description,
      currentStage: "Discovery",
      notes: `Project created from order: ${order.id}`,
      startDate: now,
      dueDate,
      status: "active",
      createdAt: now,
    };
  }

  async ensureProjectsForPaidOrders(userId: string) {
    try {
      // Get all paid orders for the user
      const paidOrders = await db
        .select()
        .from(orders)
        .where(and(eq(orders.userId, userId), eq(orders.status, "paid")));

      // Get existing projects for this user
      const existingProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, userId));

      const existingOrderIds = new Set(existingProjects.map(p => p.orderId));

      // Create projects for paid orders that don't have projects
      for (const order of paidOrders) {
        if (!existingOrderIds.has(order.id)) {
          const projectData = this.extractProjectDataFromOrder(order);
          await this.createProject(projectData);
        }
      }
    } catch (error) {
      console.error('Error ensuring projects for paid orders:', error);
    }
  }

  async handleSuccessfulPayment(orderData: any) {
    try {
      // Update order status to paid
      await this.updateOrderStatus(orderData.orderId, "paid");

      // Create project for the order
      const order = await this.getOrderById(orderData.orderId);
      if (order) {
        const projectData = this.extractProjectDataFromOrder(order);
        await this.createProject(projectData);

        // Handle referral commission if user was referred
        if (order.referredBy) {
          const referralCode = await this.getReferralCodeByUserId(order.referredBy);
          if (referralCode) {
            const commissionRate = 0.1; // 10% commission
            const commissionAmount = order.priceUsd * commissionRate;

            await this.createEarning({
              id: nanoid(),
              userId: order.referredBy,
              amount: commissionAmount.toString(),
              source: "referral",
              description: `Referral commission from order ${order.id}`,
              createdAt: new Date(),
            });
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error("Error handling successful payment:", error);
      throw error;
    }
  }
}

export const storage = new Storage();