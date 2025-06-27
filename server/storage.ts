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
  checkoutSessions,
  passwordResetTokens,
  referrals,
  referralEarnings,
  referralSettings,
  withdrawalRequests,
  seoSettings,
  seoPages,
  seoRules,
  seoKeywords,
  seoAnalytics,
  seoAudits,
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
  type CheckoutSession,
  type InsertCheckoutSession,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type Referral,
  type InsertReferral,
  type ReferralEarnings,
  type InsertReferralEarnings,
  type ReferralSettings,
  type InsertReferralSettings,
  type WithdrawalRequest,
  type InsertWithdrawalRequest,
  type SeoSettings,
  type InsertSeoSettings,
  type SeoPage,
  type InsertSeoPage,
  type SeoRule,
  type InsertSeoRule,
  type SeoKeyword,
  type InsertSeoKeyword,
  type SeoAnalytics,
  type InsertSeoAnalytics,
  type SeoAudit,
  type InsertSeoAudit,
} from "@shared/schema";

// Debug schema information
console.log('🔍 DEBUG: Schema info loaded');
console.log('🔍 DEBUG: passwordResetTokens table structure available');
console.log('🔍 DEBUG: users table structure available');
import { db } from "./db";
import { eq, desc, and, count, sum, sql, lt, gte, lte } from "drizzle-orm";
import crypto from "crypto";

// Interface for storage operations
export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Password reset functionality
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenAsUsed(token: string): Promise<void>;
  cleanupExpiredPasswordResetTokens(): Promise<void>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;


  getActiveServices(): Promise<Service[]>;
  getAllServices(): Promise<Service[]>;
  getServiceById(id: string): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, updates: Partial<InsertService>): Promise<Service>;
  deleteService(id: string): Promise<void>;

  createOrder(order: InsertOrder): Promise<Order>;
  getUserOrders(userId: string): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  updateOrderStatus(orderId: string, status: string): Promise<Order>;
  cancelOrder(orderId: string, userId: string): Promise<Order>;
  reactivatePayment(orderId: string, userId: string): Promise<string>;

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
  getWorkloadStatus(): Promise<any>;

  handleContactForm(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<void>;
  handleQuoteRequest(data: any): Promise<void>;

  // Checkout session management
  createCheckoutSession(session: InsertCheckoutSession): Promise<CheckoutSession>;
  getCheckoutSession(sessionToken: string): Promise<CheckoutSession | undefined>;
  updateCheckoutSession(sessionToken: string, updates: Partial<InsertCheckoutSession>): Promise<CheckoutSession>;
  deleteCheckoutSession(sessionToken: string): Promise<void>;
  cleanupExpiredCheckoutSessions(): Promise<void>;

  // Admin project management
  getProjectById(id: string): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;
  
  // Referral system methods
  generateReferralCode(userId: string): Promise<string>;
  getUserByReferralCode(referralCode: string): Promise<User | undefined>;
  createReferral(referral: InsertReferral): Promise<Referral>;
  processReferralEarning(orderId: string): Promise<void>;
  getUserReferrals(userId: string): Promise<Referral[]>;
  getUserReferralEarnings(userId: string): Promise<ReferralEarnings | undefined>;
  updateReferralEarnings(userId: string, updates: Partial<InsertReferralEarnings>): Promise<ReferralEarnings>;
  getReferralSettings(): Promise<ReferralSettings>;
  updateReferralSettings(updates: Partial<InsertReferralSettings>): Promise<ReferralSettings>;
  createWithdrawalRequest(request: InsertWithdrawalRequest): Promise<WithdrawalRequest>;
  getUserWithdrawalRequests(userId: string): Promise<WithdrawalRequest[]>;
  getAllWithdrawalRequests(): Promise<WithdrawalRequest[]>;
  updateWithdrawalRequest(id: string, updates: Partial<InsertWithdrawalRequest>): Promise<WithdrawalRequest>;
  processWithdrawal(id: string, adminId: string, status: string, notes?: string): Promise<WithdrawalRequest>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    console.log('🔍 DEBUG: getUserByEmail called with:', email.substring(0, 5) + '***');
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      console.log('🔍 DEBUG: getUserByEmail result:', user ? {
        id: user.id,
        email: user.email.substring(0, 5) + '***',
        provider: user.provider,
        idType: typeof user.id
      } : 'null');
      return user;
    } catch (error) {
      console.error('🔍 DEBUG: getUserByEmail error:', error);
      throw error;
    }
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async createAdminUser(email: string, hashedPassword: string): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        id: 'admin-user-001',
        email,
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        provider: 'local'
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          role: 'admin'
        }
      })
      .returning();
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

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));
  }

  // Password reset token operations
  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    console.log('🔍 DEBUG: createPasswordResetToken called with:');
    console.log('  userId:', userId, '(type:', typeof userId, ')');
    console.log('  token length:', token.length);
    console.log('  expiresAt:', expiresAt.toISOString());
    
    const resetTokenId = crypto.randomUUID();
    console.log('🔍 DEBUG: Generated reset token ID:', resetTokenId);
    
    const insertData = {
      id: resetTokenId,
      userId,
      token,
      expiresAt,
      used: false
    };
    console.log('🔍 DEBUG: Insert data:', {
      ...insertData,
      token: 'HIDDEN',
      userId: userId.substring(0, 8) + '***'
    });
    
    try {
      console.log('🔍 DEBUG: Executing database insert...');
      const [passwordResetToken] = await db
        .insert(passwordResetTokens)
        .values(insertData)
        .returning();
      console.log('🔍 DEBUG: Database insert successful, returned:', {
        ...passwordResetToken,
        token: 'HIDDEN'
      });
      return passwordResetToken;
    } catch (error) {
      console.error('🔍 DEBUG: Database insert failed:');
      console.error('Error:', error);
      console.error('Insert data that failed:', {
        ...insertData,
        token: 'HIDDEN',
        userId: userId.substring(0, 8) + '***'
      });
      throw error;
    }
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [passwordResetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return passwordResetToken;
  }

  async markPasswordResetTokenAsUsed(token: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
  }

  async cleanupExpiredPasswordResetTokens(): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(lt(passwordResetTokens.expiresAt, new Date()));
  }

  // Service operations
  async getActiveServices(): Promise<Service[]> {
    const result = await db
      .select()
      .from(services)
      .where(eq(services.isActive, true))
      .orderBy(services.createdAt);

    return result.map(service => ({
      ...service,
      price: parseInt(service.priceUsd),
      originalPrice: service.originalPriceUsd ? parseInt(service.originalPriceUsd) : undefined,
      features: typeof service.features === 'string' ? JSON.parse(service.features) : service.features,
      industry: typeof service.industry === 'string' ? JSON.parse(service.industry) : service.industry,
      addOns: JSON.parse(service.addOns)
    }));
  }

  async getAllServices(): Promise<Service[]> {
    const result = await db
      .select()
      .from(services)
      .orderBy(services.createdAt);

    return result.map(service => ({
      ...service,
      price: parseInt(service.priceUsd),
      originalPrice: service.originalPriceUsd ? parseInt(service.originalPriceUsd) : undefined,
      features: typeof service.features === 'string' ? JSON.parse(service.features) : service.features,
      industry: typeof service.industry === 'string' ? JSON.parse(service.industry) : service.industry,
      addOns: JSON.parse(service.addOns)
    }));
  }

  async getServiceById(id: string): Promise<Service | undefined> {
    const [service] = await db
      .select()
      .from(services)
      .where(eq(services.id, id));

    if (!service) return undefined;

    return {
      ...service,
      features: typeof service.features === 'string' ? JSON.parse(service.features) : service.features,
      industry: typeof service.industry === 'string' ? JSON.parse(service.industry) : service.industry,
      addOns: JSON.parse(service.addOns)
    };
  }

  async updateService(id: string, updates: Partial<InsertService>): Promise<Service> {
    const updateData = { ...updates };
    if (updateData.addOns && typeof updateData.addOns !== 'string') {
      updateData.addOns = JSON.stringify(updateData.addOns);
    }

    const [updatedService] = await db
      .update(services)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(services.id, id))
      .returning();

    return {
      ...updatedService,
      addOns: JSON.parse(updatedService.addOns)
    };
  }

  async deleteService(id: string): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  async createService(service: InsertService): Promise<Service> {
    const serviceData = {
      id: crypto.randomUUID(),
      name: service.name,
      description: service.description,
      priceUsd: service.priceUsd,
      originalPriceUsd: service.originalPriceUsd,
      duration: service.duration,
      spotsRemaining: service.spotsRemaining,
      totalSpots: service.totalSpots,
      features: typeof service.features === 'string' ? service.features : JSON.stringify(service.features),
      addOns: typeof service.addOns === 'string' ? service.addOns : JSON.stringify(service.addOns),
      recommended: service.recommended,
      category: service.category,
      industry: typeof service.industry === 'string' ? service.industry : JSON.stringify(service.industry),
      isActive: service.isActive
    };

    const [newService] = await db.insert(services).values([serviceData]).returning();
    return newService;
  }

  // Order operations
  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async getUserOrders(userId: string): Promise<Order[]> {
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
        // Include service information
        serviceName: services.name,
        serviceCategory: services.category,
        // Include user information for display
        contactName: sql`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`.as('contactName'),
        contactEmail: users.email,
        contactPhone: users.phone,
        companyName: users.companyName,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .leftJoin(services, eq(orders.serviceId, services.id))
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

  async cancelOrder(orderId: string, userId: string): Promise<Order> {
    // First, verify the order exists and belongs to the user
    const [existingOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!existingOrder) {
      throw new Error('Order not found');
    }

    if (existingOrder.userId !== userId) {
      throw new Error('Order not authorized for this user');
    }

    if (existingOrder.status !== 'pending') {
      throw new Error('Order cannot be cancelled - only pending orders can be cancelled');
    }

    // Update order status to cancelled
    const [cancelledOrder] = await db
      .update(orders)
      .set({ 
        status: 'cancelled' as any
      })
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .returning();

    return cancelledOrder;
  }

  async reactivatePayment(orderId: string, userId: string): Promise<string> {
    // First, verify the order exists and belongs to the user
    const [existingOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!existingOrder) {
      throw new Error('Order not found');
    }

    if (existingOrder.userId !== userId) {
      throw new Error('Order not authorized for this user');
    }

    if (existingOrder.status !== 'pending') {
      throw new Error('Payment cannot reactivate - order is not in pending status');
    }

    // Get user details for payment
    const user = await this.getUser(userId);
    if (!user || !user.email) {
      throw new Error('User email not found');
    }

    // Initialize payment using existing order data


    try {
      const paymentUrl = await this.initializePayment({
        orderId: existingOrder.id,
        amount: parseInt(existingOrder.totalPrice),
        email: user.email,
        userId: existingOrder.userId,
      });

      return paymentUrl;
    } catch (error) {
      throw error;
    }
  }

  // Project operations
  async getUserProjects(userId: string): Promise<any[]> {
    try {
      // First, ensure all paid orders have corresponding projects
      await this.ensureProjectsForPaidOrders(userId);

      const results = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, userId))
        .orderBy(desc(projects.createdAt));

      return results.map(project => ({
        ...project,
        order: { service: { name: null } }
      }));
    } catch (error) {
      throw new Error(`Failed to fetch user projects: ${(error as Error).message}`);
    }
  }

  parseServiceDuration(duration: string | null): { weeks: number; days: number } {
    if (!duration) return { weeks: 4, days: 28 }; // Default 4 weeks

    // Extract numbers from duration string like "2-3 weeks", "1 week", "4-6 weeks"
    const weeksMatch = duration.match(/(\d+)(?:-(\d+))?\s*weeks?/i);
    if (weeksMatch) {
      const min = parseInt(weeksMatch[1]);
      const max = weeksMatch[2] ? parseInt(weeksMatch[2]) : min;
      const avgWeeks = Math.round((min + max) / 2);
      return { weeks: avgWeeks, days: avgWeeks * 7 };
    }

    // Extract numbers from duration string like "3-5 days", "4 days", "1-2 days"
    const daysMatch = duration.match(/(\d+)(?:-(\d+))?\s*days?/i);
    if (daysMatch) {
      const min = parseInt(daysMatch[1]);
      const max = daysMatch[2] ? parseInt(daysMatch[2]) : min;
      const avgDays = Math.round((min + max) / 2);
      return { weeks: Math.ceil(avgDays / 7), days: avgDays };
    }

    // If no match, try to extract just numbers (assume weeks)
    const numberMatch = duration.match(/(\d+)/);
    if (numberMatch) {
      const weeks = parseInt(numberMatch[1]);
      return { weeks, days: weeks * 7 };
    }

    return { weeks: 4, days: 28 }; // Default fallback
  }

  private extractProjectDataFromOrder(order: any): any {
    // Use actual order creation date as project start date
    const startDate = order.createdAt ? new Date(order.createdAt) : new Date();
    const dueDate = new Date(startDate);

    // Calculate timeline based on service duration or custom timeline
    const timeline = this.parseServiceDuration(order.serviceDuration);
    let timelineWeeks = timeline.weeks;
    let timelineDays = timeline.days;
    let projectName = order.serviceName || 'Custom Project';
    let notes = '';
    let currentStage = 'Discovery';
    let progressPercentage = Math.floor(Math.random() * 15) + 5; // Random 5-20%

    // Parse custom request for additional data
    if (order.customRequest) {
      try {
        // Handle JSON format from checkout system
        const customData = JSON.parse(order.customRequest);
        if (customData.projectDetails?.description) {
          notes = customData.projectDetails.description;
        }
        if (customData.contactInfo?.fullName) {
          projectName = `${projectName} - ${customData.contactInfo.fullName}`;
        }
      } catch (e) {
        // Handle text format from custom requests
        const customText = order.customRequest;

        // Extract service name if specified
        const serviceMatch = customText.match(/Service:\s*([^\n]+)/i);
        if (serviceMatch) {
          projectName = serviceMatch[1].trim();
        }

        // Extract timeline from custom request
        const timelineMatch = customText.match(/Timeline:\s*([^\n]+)/i);
        if (timelineMatch) {
          const customTimeline = timelineMatch[1].trim();
          const customTimelineData = this.parseCustomTimeline(customTimeline);
          if (customTimelineData > 0) {
            timelineWeeks = customTimelineData;
            timelineDays = customTimelineData * 7;
          }
        }

        // Use custom request as notes
        notes = customText;
      }
    }

    // Calculate progress based on actual time elapsed since order
    const totalDays = timelineDays;
    const daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const timeProgress = Math.min(Math.round((daysSinceStart / totalDays) * 100), 95);

    // Create realistic progress based on time elapsed and add some randomness
    const baseProgress = Math.max(timeProgress * 0.4, 5); // Minimum 5% progress
    const randomVariation = Math.floor(Math.random() * 15); // 0-15% random
    progressPercentage = Math.min(Math.floor(baseProgress + randomVariation), 85);

    // Set stage based on progress
    if (progressPercentage < 20) currentStage = 'Discovery';
    else if (progressPercentage < 40) currentStage = 'Design';
    else if (progressPercentage < 70) currentStage = 'Development';
    else if (progressPercentage < 90) currentStage = 'Testing';
    else currentStage = 'Launch';

    // Set due date to exact timestamp (order time + timeline days)
    dueDate.setDate(dueDate.getDate() + timelineDays);

    return {
      orderId: order.id,
      userId: order.userId,
      projectName: projectName,
      currentStage: currentStage,
      notes: notes,
      progressPercentage: progressPercentage,
      timelineWeeks: timelineWeeks,
      timelineDays: timelineDays,
      status: 'active',
      startDate: startDate, // Store full timestamp
      dueDate: dueDate, // Store full timestamp for accurate countdown
    };
  }

  parseCustomTimeline(timeline: string): number {
    if (!timeline) return 0;

    // Handle formats like "1-2months", "3 weeks", "2-4 weeks"
    const monthMatch = timeline.match(/(\d+)(?:-(\d+))?\s*months?/i);
    if (monthMatch) {
      const min = parseInt(monthMatch[1]);
      const max = monthMatch[2] ? parseInt(monthMatch[2]) : min;
      return Math.round((min + max) / 2) * 4; // Convert months to weeks
    }

    const weekMatch = timeline.match(/(\d+)(?:-(\d+))?\s*weeks?/i);
    if (weekMatch) {
      const min = parseInt(weekMatch[1]);
      const max = weekMatch[2] ? parseInt(weekMatch[2]) : min;
      return Math.round((min + max) / 2);
    }

    return 0;
  }

  async ensureProjectsForPaidOrders(userId: string): Promise<void> {
    try {
      // Get all paid orders for the user with complete service information
      const paidOrders = await db
        .select({
          id: orders.id,
          serviceId: orders.serviceId,
          userId: orders.userId,
          createdAt: orders.createdAt,
          totalPrice: orders.totalPrice,
          customRequest: orders.customRequest,
          serviceName: services.name,
          serviceDuration: services.duration,
          serviceCategory: services.category,
        })
        .from(orders)
        .leftJoin(services, eq(orders.serviceId, services.id))
        .where(and(eq(orders.userId, userId), eq(orders.status, 'paid')));

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

  async getAllProjects(): Promise<any[]> {
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
      throw new Error("Payment service not configured");
    }

    // Validate parameters
    if (!params.orderId || !params.email || !params.userId || params.amount <= 0) {
      throw new Error('Invalid payment parameters');
    }

    const reference = `PSK_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    try {
      const requestBody = {
        email: params.email,
        amount: params.amount * 100, // Convert to kobo
        reference,
        callback_url: `${process.env.PAYSTACK_CALLBACK_URL || `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}`}/api/payments/callback`,
        currency: "NGN",
        metadata: {
          orderId: params.orderId,
          userId: params.userId,
        },
      };

      const response = await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        throw new Error(`Paystack API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Paystack response:', JSON.stringify(data, null, 2));

      if (!data.status) {
        throw new Error(data.message || "Failed to initialize payment");
      }

      if (!data.data?.authorization_url) {
        throw new Error("No payment URL received from Paystack");
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

      console.log('✅ Payment URL success:', data.data.authorization_url);
      return data.data.authorization_url;
    } catch (error) {
      throw new Error(`Payment initialization failed: ${(error as Error).message}`);
    }
  }

  async verifyPaystackWebhook(
    signature: string,
    body: string,
  ): Promise<boolean> {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      return false;
    }

    const crypto = require('crypto');
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

    // Create and activate project for paid orders
    const orderResult = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (orderResult.length > 0) {
      const order = orderResult[0];

      // Extract timeline from custom request
      const timelineMatch = order.customRequest?.match(/Timeline: ([^\n]+)/);
      let timelineWeeks = 4; // default

      if (timelineMatch) {
        const timelineText = timelineMatch[1].toLowerCase();
        if (timelineText.includes('1-2') || timelineText.includes('1-2weeks')) {
          timelineWeeks = 2;
        } else if (timelineText.includes('2-4') || timelineText.includes('2-4weeks')) {
          timelineWeeks = 4;
        } else if (timelineText.includes('1month') || timelineText.includes('1-2months')) {
          timelineWeeks = 8;
        } else if (timelineText.includes('3months') || timelineText.includes('2-3months')) {
          timelineWeeks = 12;
        }
      }

      const serviceName = order.customRequest?.split('\n')[0]?.replace('Service: ', '') || 'Custom Project';
      const startDate = new Date();
      const estimatedEndDate = new Date();
      const timelineDays = timelineWeeks * 7;
      estimatedEndDate.setDate(startDate.getDate() + timelineDays);

      // Check if project already exists
      const existingProject = await db
        .select()
        .from(projects)
        .where(eq(projects.orderId, orderId))
        .limit(1);

      if (existingProject.length === 0) {
        await db.insert(projects).values({
          orderId: order.id,
          userId: order.userId,
          projectName: serviceName,
          notes: order.customRequest || 'Project created from service order',
          status: 'active',
          startDate: startDate,
          dueDate: estimatedEndDate,
          timelineWeeks,
          timelineDays: timelineDays,
          progressPercentage: 0,
        });
      } else {
        // Update existing project to active status
        await db
          .update(projects)
          .set({
            status: 'active',
            startDate: startDate,
            dueDate: estimatedEndDate,
            timelineWeeks,
            timelineDays: timelineDays,
          })
          .where(eq(projects.id, existingProject[0].id));
      }
    }

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

    // Process referral earnings if applicable
    await this.processReferralEarning(orderId);
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
      .select({ value: sql<number>`COALESCE(SUM(CAST(${orders.totalPrice} AS NUMERIC)), 0)` })
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
  }

  // Checkout session management
  async createCheckoutSession(session: InsertCheckoutSession): Promise<CheckoutSession> {
    try {
      const [newSession] = await db
        .insert(checkoutSessions)
        .values(session)
        .returning();
      return newSession;
    } catch (error) {
      console.error('DatabaseStorage: Error creating session:', error);
      throw error;
    }
  }

  async getCheckoutSession(sessionToken: string): Promise<CheckoutSession | undefined> {
    try {
      const [session] = await db
        .select()
        .from(checkoutSessions)
        .where(eq(checkoutSessions.sessionToken, sessionToken));
      return session;
    } catch (error) {
      console.error('DatabaseStorage: Error getting session:', error);
      throw error;
    }
  }

  async updateCheckoutSession(sessionToken: string, updates: Partial<InsertCheckoutSession>): Promise<CheckoutSession> {
    try {
      const [updatedSession] = await db
        .update(checkoutSessions)
        .set(updates)
        .where(eq(checkoutSessions.sessionToken, sessionToken))
        .returning();
      return updatedSession;
    } catch (error) {
      console.error('DatabaseStorage: Error updating session:', error);
      throw error;
    }
  }

  async deleteCheckoutSession(sessionToken: string): Promise<void> {
    try {
      await db
        .delete(checkoutSessions)
        .where(eq(checkoutSessions.sessionToken, sessionToken));
    } catch (error) {
      console.error('DatabaseStorage: Error deleting session:', error);
      throw error;
    }
  }

  async cleanupExpiredCheckoutSessions(): Promise<void> {
    try {
      const now = new Date();
      await db
        .delete(checkoutSessions)
        .where(lt(checkoutSessions.expiresAt, now));
    } catch (error) {
      console.error('DatabaseStorage: Error cleaning up sessions:', error);
      throw error;
    }
  }

  async getWorkloadStatus(): Promise<any> {
    try {
      const projects = await this.getAllProjects();
      const totalActiveProjects = projects.filter(p => p.status === 'active').length;
      const capacity = 10; // Example capacity
      const thisWeekProjects = projects.filter(p => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(p.createdAt) >= weekAgo;
      }).length;

      return {
        totalActiveProjects,
        capacity,
        thisWeekProjects,
        estimatedDelivery: "2-3 weeks"
      };
    } catch (error) {
      console.error('Error getting workload status:', error);
      return {
        totalActiveProjects: 0,
        capacity: 10,
        thisWeekProjects: 0,
        estimatedDelivery: "Unknown"
      };
    }
  }

  // Admin project management methods
  async getProjectById(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Referral system methods
  async generateReferralCode(userId: string): Promise<string> {
    let referralCode: string;
    let isUnique = false;
    
    while (!isUnique) {
      referralCode = `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const existing = await this.getUserByReferralCode(referralCode);
      if (!existing) {
        isUnique = true;
      }
    }

    // Update user with referral code
    await db.update(users).set({ referralCode }).where(eq(users.id, userId));
    
    // Initialize referral earnings for the user
    await db.insert(referralEarnings).values({
      userId,
      totalEarned: "0.00",
      totalWithdrawn: "0.00",
      pendingEarnings: "0.00",
      availableBalance: "0.00",
      totalReferrals: 0,
      successfulReferrals: 0,
    }).onConflictDoNothing();
    
    return referralCode!;
  }

  async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, referralCode));
    return user;
  }

  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [newReferral] = await db.insert(referrals).values(referral).returning();
    
    // Update referrer's stats
    await db
      .update(referralEarnings)
      .set({
        totalReferrals: sql`${referralEarnings.totalReferrals} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(referralEarnings.userId, referral.referrerId));
    
    return newReferral;
  }

  async processReferralEarning(orderId: string): Promise<void> {
    // Get the order and check if it has a referral
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) return;

    // Get the user who made the order
    const [orderUser] = await db.select().from(users).where(eq(users.id, order.userId));
    if (!orderUser?.referredBy) return;

    // Get referral settings
    const settings = await this.getReferralSettings();
    const commissionPercentage = parseFloat(settings.commissionPercentage);
    const orderAmount = parseFloat(order.totalPrice);
    const commissionAmount = (orderAmount * commissionPercentage) / 100;

    // Create referral record
    await this.createReferral({
      referrerId: orderUser.referredBy,
      referredUserId: orderUser.id,
      orderId: order.id,
      commissionAmount: commissionAmount.toFixed(2),
      commissionPercentage: commissionPercentage.toFixed(2),
      status: "confirmed",
    });

    // Update referrer's earnings
    await db
      .update(referralEarnings)
      .set({
        totalEarned: sql`${referralEarnings.totalEarned} + ${commissionAmount}`,
        availableBalance: sql`${referralEarnings.availableBalance} + ${commissionAmount}`,
        successfulReferrals: sql`${referralEarnings.successfulReferrals} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(referralEarnings.userId, orderUser.referredBy));
  }

  async getUserReferrals(userId: string): Promise<Referral[]> {
    return await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, userId))
      .orderBy(desc(referrals.createdAt));
  }

  async getUserReferralEarnings(userId: string): Promise<ReferralEarnings | undefined> {
    const [earnings] = await db
      .select()
      .from(referralEarnings)
      .where(eq(referralEarnings.userId, userId));
    
    if (!earnings) {
      // Create initial earnings record
      const [newEarnings] = await db
        .insert(referralEarnings)
        .values({
          userId,
          totalEarned: "0.00",
          totalWithdrawn: "0.00",
          pendingEarnings: "0.00",
          availableBalance: "0.00",
          totalReferrals: 0,
          successfulReferrals: 0,
        })
        .returning();
      return newEarnings;
    }
    
    return earnings;
  }

  async updateReferralEarnings(userId: string, updates: Partial<InsertReferralEarnings>): Promise<ReferralEarnings> {
    const [updatedEarnings] = await db
      .update(referralEarnings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(referralEarnings.userId, userId))
      .returning();
    return updatedEarnings;
  }

  async getReferralSettings(): Promise<ReferralSettings> {
    const [settings] = await db
      .select()
      .from(referralSettings)
      .where(eq(referralSettings.id, "default"));
    
    if (!settings) {
      // Create default settings
      const [newSettings] = await db
        .insert(referralSettings)
        .values({
          id: "default",
          commissionPercentage: "10.00",
          minimumWithdrawal: "50.00",
          payoutSchedule: "monthly",
          isActive: true,
        })
        .returning();
      return newSettings;
    }
    
    return settings;
  }

  async updateReferralSettings(updates: Partial<InsertReferralSettings>): Promise<ReferralSettings> {
    const [updatedSettings] = await db
      .update(referralSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(referralSettings.id, "default"))
      .returning();
    return updatedSettings;
  }

  async createWithdrawalRequest(request: InsertWithdrawalRequest): Promise<WithdrawalRequest> {
    const [newRequest] = await db.insert(withdrawalRequests).values(request).returning();
    return newRequest;
  }

  async getUserWithdrawalRequests(userId: string): Promise<WithdrawalRequest[]> {
    return await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.userId, userId))
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async getAllWithdrawalRequests(): Promise<WithdrawalRequest[]> {
    return await db
      .select()
      .from(withdrawalRequests)
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async updateWithdrawalRequest(id: string, updates: Partial<InsertWithdrawalRequest>): Promise<WithdrawalRequest> {
    const [updatedRequest] = await db
      .update(withdrawalRequests)
      .set(updates)
      .where(eq(withdrawalRequests.id, id))
      .returning();
    return updatedRequest;
  }

  // SEO Management Methods
  async getSeoSettings(): Promise<SeoSettings> {
    const [settings] = await db
      .select()
      .from(seoSettings)
      .where(eq(seoSettings.id, "global"));
    
    if (!settings) {
      // Create default settings
      const [newSettings] = await db
        .insert(seoSettings)
        .values({
          id: "global",
          siteName: "DiSO Webs",
          siteDescription: "Professional web development and digital solutions",
          siteUrl: process.env.SITE_URL || "https://disoweb.replit.app",
          defaultMetaTitle: "DiSO Webs - Professional Web Development Services",
          defaultMetaDescription: "Transform your digital presence with DiSO Webs. We create stunning websites, web applications, and digital solutions that drive results.",
          defaultKeywords: "web development, website design, digital solutions, web applications, responsive design",
        })
        .returning();
      return newSettings;
    }
    
    return settings;
  }

  async updateSeoSettings(updates: Partial<InsertSeoSettings>): Promise<SeoSettings> {
    const [updatedSettings] = await db
      .update(seoSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(seoSettings.id, "global"))
      .returning();
    return updatedSettings;
  }

  async getAllSeoPages(): Promise<SeoPage[]> {
    return await db
      .select()
      .from(seoPages)
      .orderBy(seoPages.path);
  }

  async getSeoPageByPath(path: string): Promise<SeoPage | null> {
    const [page] = await db
      .select()
      .from(seoPages)
      .where(eq(seoPages.path, path));
    return page || null;
  }

  async createSeoPage(pageData: InsertSeoPage): Promise<SeoPage> {
    const [newPage] = await db.insert(seoPages).values(pageData).returning();
    return newPage;
  }

  async updateSeoPage(id: string, updates: Partial<InsertSeoPage>): Promise<SeoPage> {
    const [updatedPage] = await db
      .update(seoPages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(seoPages.id, id))
      .returning();
    return updatedPage;
  }

  async deleteSeoPage(id: string): Promise<void> {
    await db.delete(seoPages).where(eq(seoPages.id, id));
  }

  async getAllSeoRules(): Promise<SeoRule[]> {
    return await db
      .select()
      .from(seoRules)
      .orderBy(desc(seoRules.priority), seoRules.name);
  }

  async createSeoRule(ruleData: InsertSeoRule): Promise<SeoRule> {
    const [newRule] = await db.insert(seoRules).values(ruleData).returning();
    return newRule;
  }

  async updateSeoRule(id: string, updates: Partial<InsertSeoRule>): Promise<SeoRule> {
    const [updatedRule] = await db
      .update(seoRules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(seoRules.id, id))
      .returning();
    return updatedRule;
  }

  async deleteSeoRule(id: string): Promise<void> {
    await db.delete(seoRules).where(eq(seoRules.id, id));
  }

  async getAllSeoKeywords(): Promise<SeoKeyword[]> {
    return await db
      .select()
      .from(seoKeywords)
      .orderBy(desc(seoKeywords.searchVolume), seoKeywords.keyword);
  }

  async createSeoKeyword(keywordData: InsertSeoKeyword): Promise<SeoKeyword> {
    const [newKeyword] = await db.insert(seoKeywords).values(keywordData).returning();
    return newKeyword;
  }

  async updateSeoKeyword(id: string, updates: Partial<InsertSeoKeyword>): Promise<SeoKeyword> {
    const [updatedKeyword] = await db
      .update(seoKeywords)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(seoKeywords.id, id))
      .returning();
    return updatedKeyword;
  }

  async deleteSeoKeyword(id: string): Promise<void> {
    await db.delete(seoKeywords).where(eq(seoKeywords.id, id));
  }

  async createSeoAnalytics(analyticsData: InsertSeoAnalytics): Promise<SeoAnalytics> {
    const [newAnalytics] = await db.insert(seoAnalytics).values(analyticsData).returning();
    return newAnalytics;
  }

  async getSeoAnalyticsByPage(page: string, startDate?: string, endDate?: string): Promise<SeoAnalytics[]> {
    const conditions = [eq(seoAnalytics.page, page)];
    
    if (startDate) {
      conditions.push(gte(seoAnalytics.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(seoAnalytics.date, endDate));
    }

    return await db
      .select()
      .from(seoAnalytics)
      .where(and(...conditions))
      .orderBy(desc(seoAnalytics.date));
  }

  async createSeoPage(pageData: InsertSeoPage): Promise<SeoPage> {
    const [newPage] = await db.insert(seoPages).values(pageData).returning();
    return newPage;
  }

  async updateSeoPage(id: string, updates: Partial<InsertSeoPage>): Promise<SeoPage> {
    const [updatedPage] = await db
      .update(seoPages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(seoPages.id, id))
      .returning();
    return updatedPage;
  }

  async deleteSeoPage(id: string): Promise<void> {
    await db.delete(seoPages).where(eq(seoPages.id, id));
  }

  async getAllSeoAudits(): Promise<SeoAudit[]> {
    return await db
      .select()
      .from(seoAudits)
      .orderBy(desc(seoAudits.createdAt));
  }

  async createSeoAudit(auditData: InsertSeoAudit): Promise<SeoAudit> {
    const [newAudit] = await db.insert(seoAudits).values(auditData).returning();
    return newAudit;
  }

  async updateSeoAudit(id: string, updates: Partial<InsertSeoAudit>): Promise<SeoAudit> {
    const [updatedAudit] = await db
      .update(seoAudits)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(seoAudits.id, id))
      .returning();
    return updatedAudit;
  }

  async getSeoAnalyticsByPageAndDate(page: string, date: string): Promise<SeoAnalytics | null> {
    const [analytics] = await db
      .select()
      .from(seoAnalytics)
      .where(and(eq(seoAnalytics.page, page), eq(seoAnalytics.date, date)))
      .limit(1);
    return analytics || null;
  }

  async updateSeoAnalytics(id: string, updates: Partial<InsertSeoAnalytics>): Promise<SeoAnalytics> {
    const [updatedAnalytics] = await db
      .update(seoAnalytics)
      .set(updates)
      .where(eq(seoAnalytics.id, id))
      .returning();
    return updatedAnalytics;
      .orderBy(desc(seoAnalytics.date));
  }

  async getAllSeoAudits(): Promise<SeoAudit[]> {
    return await db
      .select()
      .from(seoAudits)
      .orderBy(desc(seoAudits.createdAt));
  }

  async createSeoAudit(auditData: InsertSeoAudit): Promise<SeoAudit> {
    const [newAudit] = await db.insert(seoAudits).values(auditData).returning();
    return newAudit;
  }

  async updateSeoAudit(id: string, updates: Partial<InsertSeoAudit>): Promise<SeoAudit> {
    const [updatedAudit] = await db
      .update(seoAudits)
      .set(updates)
      .where(eq(seoAudits.id, id))
      .returning();
    return updatedAudit;
  }

  async getSeoAuditById(id: string): Promise<SeoAudit | null> {
    const [audit] = await db
      .select()
      .from(seoAudits)
      .where(eq(seoAudits.id, id));
    return audit || null;
  }

  async processWithdrawal(id: string, adminId: string, status: string, notes?: string): Promise<WithdrawalRequest> {
    const [withdrawal] = await db
      .update(withdrawalRequests)
      .set({
        status: status as any,
        processedAt: new Date(),
        processedBy: adminId,
        adminNotes: notes,
      })
      .where(eq(withdrawalRequests.id, id))
      .returning();

    // If approved/completed, update user's earnings
    if (status === "completed") {
      const amount = parseFloat(withdrawal.amount);
      await db
        .update(referralEarnings)
        .set({
          totalWithdrawn: sql`${referralEarnings.totalWithdrawn} + ${amount}`,
          availableBalance: sql`${referralEarnings.availableBalance} - ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(referralEarnings.userId, withdrawal.userId));
    }

    return withdrawal;
  }
}

// Export a singleton instance for easy import
export const storage = new DatabaseStorage();