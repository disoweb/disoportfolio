import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { setupAuth as setupReplitAuth } from "./auth";
import { 
  insertOrderSchema, 
  insertProjectSchema, 
  insertMessageSchema,
  insertSupportRequestSchema,
  insertPaymentSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - always use standard auth
  setupAuth(app);

  // No need for separate auth routes as they're handled in setupAuth

  // Services routes
  app.get('/api/services', async (req, res) => {
    try {
      const services = await storage.getActiveServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  // Orders routes
  app.post('/api/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const orderData = insertOrderSchema.parse({
        ...req.body,
        userId,
      });
      const order = await storage.createOrder(orderData);
      res.json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order data", errors: error.errors });
      }
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.get('/api/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      let orders;
      if (user?.role === 'admin') {
        orders = await storage.getAllOrders();
      } else {
        orders = await storage.getUserOrders(userId);
      }
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.patch('/api/orders/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const { status } = req.body;
      const order = await storage.updateOrderStatus(id, status);
      res.json(order);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Projects routes
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      let projects;
      if (user?.role === 'admin') {
        projects = await storage.getAllProjects();
      } else {
        projects = await storage.getUserProjects(userId);
      }
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.patch('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const project = await storage.updateProject(id, req.body);
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Messages routes
  app.get('/api/projects/:projectId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { projectId } = req.params;

      // Check if user has access to this project
      const hasAccess = await storage.userHasProjectAccess(userId, projectId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const messages = await storage.getProjectMessages(projectId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/projects/:projectId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { projectId } = req.params;
      const user = await storage.getUser(userId);

      // Check if user has access to this project
      const hasAccess = await storage.userHasProjectAccess(userId, projectId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const messageData = insertMessageSchema.parse({
        ...req.body,
        projectId,
        senderId: userId,
        isAdmin: user?.role === 'admin',
      });

      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Payment routes
  app.post('/api/payments/initialize', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { orderId, amount, email } = req.body;

      const paymentUrl = await storage.initializePayment({
        orderId,
        amount,
        email,
        userId,
      });

      res.json({ paymentUrl });
    } catch (error) {
      console.error("Error initializing payment:", error);
      res.status(500).json({ message: "Failed to initialize payment" });
    }
  });

  app.post('/api/payments/webhook', async (req, res) => {
    try {
      // Verify webhook signature from Paystack
      const hash = req.headers['x-paystack-signature'];
      const body = JSON.stringify(req.body);

      if (!await storage.verifyPaystackWebhook(hash as string, body)) {
        return res.status(400).json({ message: "Invalid signature" });
      }

      const { event, data } = req.body;

      if (event === 'charge.success') {
        await storage.handleSuccessfulPayment(data);
      }

      res.json({ status: 'success' });
    } catch (error) {
      console.error("Error handling webhook:", error);
      res.status(500).json({ message: "Webhook error" });
    }
  });

  // Support requests routes
  app.get('/api/support-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      let supportRequests;
      if (user?.role === 'admin') {
        supportRequests = await storage.getAllSupportRequests();
      } else {
        supportRequests = await storage.getUserSupportRequests(userId);
      }
      res.json(supportRequests);
    } catch (error) {
      console.error("Error fetching support requests:", error);
      res.status(500).json({ message: "Failed to fetch support requests" });
    }
  });

  app.post('/api/support-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const supportRequestData = insertSupportRequestSchema.parse({
        ...req.body,
        userId,
      });

      const supportRequest = await storage.createSupportRequest(supportRequestData);
      res.json(supportRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid support request data", errors: error.errors });
      }
      console.error("Error creating support request:", error);
      res.status(500).json({ message: "Failed to create support request" });
    }
  });

  // Analytics routes (admin only)
  app.get('/api/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Workload management routes (admin only)
  app.get('/api/admin/workload', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const workload = await storage.getWorkloadStatus();
      res.json(workload);
    } catch (error) {
      console.error("Error fetching workload:", error);
      res.status(500).json({ message: "Failed to fetch workload" });
    }
  });

  app.post('/api/admin/availability', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { serviceId, spots, deliveryDate } = req.body;
      await storage.updateServiceAvailability(serviceId, spots, deliveryDate);
      res.json({ message: "Availability updated successfully" });
    } catch (error) {
      console.error("Error updating availability:", error);
      res.status(500).json({ message: "Failed to update availability" });
    }
  });

  // Contact form route (public)
  app.post('/api/contact', async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;

      // Basic validation
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: "All fields are required" });
      }

      await storage.handleContactForm({ name, email, subject, message });
      res.json({ message: "Contact form submitted successfully" });
    } catch (error) {
      console.error("Error handling contact form:", error);
      res.status(500).json({ message: "Failed to submit contact form" });
    }
  });

  // Quote request route (public)
  app.post('/api/quote-request', async (req, res) => {
    try {
      const quoteData = req.body;

      await storage.handleQuoteRequest(quoteData);
      res.json({ message: "Quote request submitted successfully" });
    } catch (error) {
      console.error("Error handling quote request:", error);
      res.status(500).json({ message: "Failed to submit quote request" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}