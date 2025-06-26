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
  insertPaymentSchema,
  insertServiceSchema,
  payments,
  orders
} from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { eq } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - always use standard auth
  await setupAuth(app);

  // Create admin user if it doesn't exist
  try {
    const adminEmail = 'admin@diso.com';
    const existingAdmin = await storage.getUserByEmail(adminEmail);
    if (!existingAdmin) {
      await storage.createAdminUser(adminEmail, 'cea2b08fd0f11a23107ab63868650344b443e037ae8459b9d25e3244a631bd9085bab88b5cd1968d01e65253fd3ca764b576d25e1e34151879289066b1ef0e5c.17d61126bae3ba14d657423bd934201e');
      console.log('Admin user created successfully');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }

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

  // Admin service management routes
  app.get('/api/admin/services', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const services = await storage.getAllServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching all services:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.get('/api/admin/services/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const service = await storage.getServiceById(req.params.id);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }

      res.json(service);
    } catch (error) {
      console.error("Error fetching service:", error);
      res.status(500).json({ message: "Failed to fetch service" });
    }
  });

  app.post('/api/admin/services', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const serviceData = insertServiceSchema.parse({
        ...req.body,
        addOns: typeof req.body.addOns === 'string' ? req.body.addOns : JSON.stringify(req.body.addOns)
      });

      const service = await storage.createService(serviceData);
      res.json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid service data", errors: error.errors });
      }
      console.error("Error creating service:", error);
      res.status(500).json({ message: "Failed to create service" });
    }
  });

  app.put('/api/admin/services/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const updateData = { ...req.body };
      if (updateData.addOns && typeof updateData.addOns !== 'string') {
        updateData.addOns = JSON.stringify(updateData.addOns);
      }

      const service = await storage.updateService(req.params.id, updateData);
      res.json(service);
    } catch (error) {
      console.error("Error updating service:", error);
      res.status(500).json({ message: "Failed to update service" });
    }
  });

  app.delete('/api/admin/services/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteService(req.params.id);
      res.json({ message: "Service deleted successfully" });
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ message: "Failed to delete service" });
    }
  });

  // Orders routes
  app.post('/api/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      const orderData = insertOrderSchema.parse({
        ...req.body,
        userId,
      });
      
      const order = await storage.createOrder(orderData);
      
      // Initialize payment with Paystack
      try {
        const paymentUrl = await storage.initializePayment({
          orderId: order.id,
          amount: Number(order.totalPrice),
          email: user?.email || req.body.customerInfo?.email,
          userId: userId
        });
        
        res.json({ ...order, paymentUrl });
      } catch (paymentError) {
        console.error("Payment initialization failed:", paymentError);
        // Return order without payment URL if payment fails
        res.json(order);
      }
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
      // Try to get user ID from different possible sources
      const userId = req.user?.id || req.user?.claims?.sub;
      
      if (!userId) {
        console.error("No user ID found in request:", req.user);
        return res.status(401).json({ message: "User ID not found" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        console.error("User not found for ID:", userId);
        return res.status(401).json({ message: "User not found" });
      }
      
      console.log("Projects request - User role:", user.role, "User ID:", userId);
      
      // If admin, return all projects with user and order details
      if (user?.role === 'admin') {
        const projects = await storage.getAllProjects();
        console.log("Returning", projects.length, "projects for admin");
        res.json(projects);
      } else {
        // Regular users only see their own projects
        const projects = await storage.getUserProjects(userId);
        console.log("Returning", projects.length, "projects for user", userId);
        res.json(projects);
      }
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

  // Test route to verify callback endpoint is working
  app.get('/api/payments/test-callback', (req, res) => {
    res.json({ message: 'Callback endpoint is working', timestamp: new Date().toISOString() });
  });

  // Payment callback route (for redirect after payment)
  app.get('/api/payments/callback', async (req, res) => {
    console.log('Payment callback received:', req.query);
    
    try {
      const { reference, trxref, status } = req.query;
      const paymentReference = (reference || trxref) as string;
      
      console.log(`Processing callback for reference: ${paymentReference}, status: ${status}`);
      
      if (paymentReference) {
        // Verify payment with Paystack before confirming success
        try {
          const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
          const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${paymentReference}`, {
            headers: {
              Authorization: `Bearer ${paystackSecretKey}`,
            },
          });
          
          const verifyData = await verifyResponse.json();
          console.log('Paystack verification response:', verifyData);
          
          if (verifyData.status && verifyData.data.status === 'success') {
            // Payment verified, update records
            const orderId = verifyData.data.metadata?.orderId;
            console.log(`Payment successful for order: ${orderId}`);
            
            if (orderId) {
              // Update payment status
              await db.update(payments).set({
                status: "succeeded" as any,
                paidAt: new Date(),
              }).where(eq(payments.providerId, paymentReference));
              
              // Update order status  
              await db.update(orders).set({
                status: "paid" as any
              }).where(eq(orders.id, orderId));
              
              console.log(`Payment verified and updated for order: ${orderId}`);
            }
            
            // Redirect to dashboard with success
            return res.redirect('/?payment=success#dashboard');
          } else {
            console.log('Payment verification failed:', verifyData);
            return res.redirect('/?payment=failed#dashboard');
          }
        } catch (verifyError) {
          console.error("Error verifying payment:", verifyError);
          return res.redirect('/?payment=error#dashboard');
        }
      } else {
        console.log('No payment reference provided in callback');
        return res.redirect('/?payment=failed#dashboard');
      }
    } catch (error) {
      console.error("Error handling payment callback:", error);
      return res.redirect('/?payment=error#dashboard');
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

  // Admin project management routes
  app.get('/api/admin/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching admin projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.patch('/api/admin/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const updates = req.body;
      
      const updatedProject = await storage.updateProject(id, updates);
      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.post('/api/admin/projects/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const { status } = req.body;
      
      const updatedProject = await storage.updateProject(id, { status });
      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project status:", error);
      res.status(500).json({ message: "Failed to update project status" });
    }
  });

  // Project update route for regular users and admins
  app.patch("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.claims?.sub;
      const userRole = req.user?.claims?.role;
      
      // Check if user has access to update this project
      if (userRole !== 'admin') {
        const hasAccess = await storage.userHasProjectAccess(userId, id);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      const updatedProject = await storage.updateProject(id, req.body);
      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
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

  // Add missing /api/client/stats endpoint
  app.get('/api/client/stats', async (req, res) => {
    try {
      // Return mock stats for now - can be enhanced later
      const stats = {
        activeProjects: 0,
        completedProjects: 0,
        totalSpent: 0,
        newMessages: 0
      };
      res.json(stats);
    } catch (error) {
      console.error("Error fetching client stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}