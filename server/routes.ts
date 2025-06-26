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
import { 
  checkRateLimit, 
  validateContentType, 
  sanitizeInput, 
  auditLog,
  authRateLimit,
  validateRequestSize,
  securityHeaders,
  getSecurityDelay
} from "./security";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - always use standard auth
  await setupAuth(app);

  // Create admin user if it doesn't exist - use environment variable for password
  try {
    const adminEmail = 'admin@diso.com';
    const existingAdmin = await storage.getUserByEmail(adminEmail);
    if (!existingAdmin) {
      const adminPassword = process.env.ADMIN_PASSWORD || 'TempAdmin123!@#';
      console.log('Creating admin user with environment password...');
      
      // Hash the password securely
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      await storage.createAdminUser(adminEmail, hashedPassword);
      console.log('Admin user created successfully');
      
      if (!process.env.ADMIN_PASSWORD) {
        console.warn('⚠️  WARNING: Using temporary admin password. Set ADMIN_PASSWORD environment variable for production!');
      }
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }

  // No need for separate auth routes as they're handled in setupAuth

  // Security middleware is applied in server/index.ts globally
  
  // Services routes with rate limiting
  app.get('/api/services', authRateLimit('api'), async (req, res) => {
    try {
      const services = await storage.getActiveServices();
      
      // Remove sensitive internal data before sending to client
      const publicServices = services.map(service => ({
        ...service,
        // Don't expose internal flags or sensitive data
        createdAt: undefined,
        updatedAt: undefined
      }));
      
      res.json(publicServices);
    } catch (error) {
      console.error("Error fetching services:", error);
      auditLog('api_error', undefined, { endpoint: '/api/services', error: (error as Error).message });
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
  app.post('/api/orders', authRateLimit('payment'), validateContentType, validateRequestSize(1048576), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const clientIP = req.ip || req.connection.remoteAddress;
      const orderData = req.body;
      
      // Input validation and sanitization - handle both formats
      const hasContactInfo = orderData.contactInfo || (orderData.fullName && orderData.email);
      const hasTotalAmount = orderData.totalAmount || orderData.totalPrice;
      
      if (!orderData.serviceId || !hasContactInfo || !hasTotalAmount) {
        auditLog('order_validation_failed', userId, { reason: 'missing_required_fields', clientIP });
        return res.status(400).json({ message: "Missing required order data" });
      }

      // Validate amount is reasonable (between ₦100 and ₦10,000,000)
      const amount = parseInt(orderData.totalAmount?.toString() || orderData.totalPrice?.toString() || '0');
      if (isNaN(amount) || amount < 100 || amount > 10000000) {
        auditLog('order_validation_failed', userId, { reason: 'invalid_amount', amount, clientIP });
        return res.status(400).json({ message: "Invalid order amount" });
      }

      // Sanitize and validate contact info - handle both direct fields and nested contactInfo
      const contactInfo = {
        fullName: sanitizeInput((orderData.contactInfo && orderData.contactInfo.fullName) || orderData.fullName || ''),
        email: sanitizeInput((orderData.contactInfo && orderData.contactInfo.email) || orderData.email || ''),
        phone: sanitizeInput((orderData.contactInfo && orderData.contactInfo.phone) || orderData.phone || ''),
        company: sanitizeInput((orderData.contactInfo && orderData.contactInfo.company) || orderData.company || '')
      };

      // Validate email format using simple regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactInfo.email)) {
        auditLog('order_validation_failed', userId, { reason: 'invalid_email', clientIP });
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Sanitize project details - handle both formats
      const projectDetails = {
        description: sanitizeInput((orderData.projectDetails && orderData.projectDetails.description) || orderData.projectDescription || '')
      };

      // Sanitize and validate add-ons - handle both formats
      let selectedAddOns: string[] = [];
      const addOnsData = orderData.selectedAddOns || orderData.overrideSelectedAddOns || [];
      if (Array.isArray(addOnsData)) {
        selectedAddOns = addOnsData
          .filter((addon: any) => typeof addon === 'string' && addon.trim().length > 0)
          .map((addon: string) => sanitizeInput(addon));
      }

      // Build comprehensive custom request data with add-ons
      const customRequestData = {
        contactInfo,
        projectDetails,
        selectedAddOns,
        timeline: sanitizeInput(orderData.timeline || ''),
        paymentMethod: sanitizeInput(orderData.paymentMethod || 'paystack')
      };
      
      // Prepare validated order data
      const validatedOrderData = {
        userId,
        serviceId: sanitizeInput(orderData.serviceId),
        customRequest: JSON.stringify(customRequestData),
        totalPrice: amount.toString(),
        status: 'pending' as const,
      };
      
      // Create the order
      const order = await storage.createOrder(validatedOrderData);
      auditLog('order_created', userId, { 
        orderId: order.id, 
        amount, 
        serviceId: orderData.serviceId,
        addOnsCount: selectedAddOns.length,
        clientIP 
      });
      
      // Initialize payment
      if (order?.id) {
        try {
          const paymentUrl = await storage.initializePayment({
            orderId: order.id,
            amount,
            email: contactInfo.email,
            userId,
          });
          
          auditLog('payment_initialized', userId, { orderId: order.id, amount, clientIP });
          res.json({ ...order, paymentUrl });
        } catch (paymentError) {
          auditLog('payment_initialization_failed', userId, { 
            orderId: order.id, 
            error: (paymentError as Error).message, 
            clientIP 
          });
          res.json(order);
        }
      } else {
        auditLog('order_creation_failed', userId, { clientIP });
        res.status(500).json({ message: "Failed to create order" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        auditLog('order_validation_failed', req.user?.id, { errors: error.errors, clientIP: req.ip });
        return res.status(400).json({ message: "Invalid order data", errors: error.errors });
      }
      auditLog('order_error', req.user?.id, { error: (error as Error).message, clientIP: req.ip });
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.get('/api/orders', authRateLimit('api'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const clientIP = req.ip || req.connection.remoteAddress;

      if (!user) {
        auditLog('unauthorized_orders_access', userId, { clientIP });
        return res.status(401).json({ message: "User not found" });
      }

      let orders;
      if (user.role === 'admin') {
        orders = await storage.getAllOrders();
        auditLog('admin_orders_accessed', userId, { clientIP });
      } else {
        orders = await storage.getUserOrders(userId);
        auditLog('user_orders_accessed', userId, { clientIP });
      }
      res.json(orders);
    } catch (error) {
      auditLog('orders_fetch_error', req.user?.id, { error: (error as Error).message, clientIP: req.ip });
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Cancel pending order
  app.delete('/api/orders/:orderId', authRateLimit('api'), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { orderId } = req.params;
      const clientIP = req.ip || req.connection.remoteAddress;
      
      // Security check: additional rate limiting for order cancellation
      const rateCheck = checkRateLimit('order_cancel', clientIP);
      if (!rateCheck.allowed) {
        auditLog('rate_limit_exceeded', userId, { action: 'order_cancel', ip: clientIP });
        return res.status(429).json({ message: rateCheck.message });
      }

      const order = await storage.cancelOrder(orderId, userId);
      auditLog('order_cancelled', userId, { orderId, totalPrice: order.totalPrice, clientIP });
      
      res.json({ message: "Order cancelled successfully", order });
    } catch (error) {
      console.error("Error cancelling order:", error);
      auditLog('order_cancel_failed', req.user?.id, { orderId: req.params.orderId, error: (error as Error).message, clientIP: req.ip });
      
      if ((error as Error).message.includes('not found') || (error as Error).message.includes('not authorized')) {
        return res.status(404).json({ message: "Order not found or not authorized" });
      }
      if ((error as Error).message.includes('cannot be cancelled')) {
        return res.status(400).json({ message: "Order cannot be cancelled" });
      }
      res.status(500).json({ message: "Failed to cancel order" });
    }
  });

  // Reactivate payment for pending order
  app.post('/api/orders/:orderId/reactivate-payment', 
    authRateLimit('payment_reactivation'), 
    validateContentType, 
    validateRequestSize(1024), 
    isAuthenticated, 
    async (req: any, res) => {
      try {
        const userId = req.user?.id || req.user;
        const { orderId } = req.params;
        const clientIP = req.ip || req.connection.remoteAddress;
        
        // Validate order ID format
        if (!orderId || typeof orderId !== 'string' || orderId.length < 10) {
          return res.status(400).json({ message: "Invalid order ID format" });
        }
        
        // Security delay for payment operations
        const delay = getSecurityDelay(1);
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const paymentUrl = await storage.reactivatePayment(orderId, userId);
        auditLog('payment_reactivated', userId, { orderId, clientIP });
        
        res.json({ paymentUrl });
      } catch (error) {
        const userId = req.user?.id || req.user;
        auditLog('payment_reactivation_failed', userId, { 
          orderId: req.params.orderId, 
          error: (error as Error).message, 
          clientIP: req.ip 
        });
        
        if ((error as Error).message.includes('not found') || (error as Error).message.includes('not authorized')) {
          return res.status(404).json({ message: "Order not found or not authorized" });
        }
        if ((error as Error).message.includes('cannot reactivate')) {
          return res.status(400).json({ message: "Payment cannot be reactivated for this order" });
        }
        res.status(500).json({ message: "Failed to reactivate payment" });
      }
    });

  app.patch('/api/orders/:id/status', authRateLimit('admin'), validateContentType, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const clientIP = req.ip || req.connection.remoteAddress;

      if (user?.role !== 'admin') {
        auditLog('unauthorized_order_update', userId, { orderId: req.params.id, clientIP });
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const { status } = req.body;

      // Validate order ID format (UUID)
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        auditLog('invalid_order_id', userId, { orderId: id, clientIP });
        return res.status(400).json({ message: "Invalid order ID format" });
      }

      // Validate status
      const validStatuses = ['pending', 'paid', 'in_progress', 'complete', 'cancelled'];
      if (!validStatuses.includes(status)) {
        auditLog('invalid_order_status', userId, { orderId: id, status, clientIP });
        return res.status(400).json({ message: "Invalid order status" });
      }

      const order = await storage.updateOrderStatus(id, sanitizeInput(status));
      auditLog('order_status_updated', userId, { orderId: id, newStatus: status, clientIP });
      res.json(order);
    } catch (error) {
      auditLog('order_update_error', req.user?.id, { orderId: req.params.id, error: (error as Error).message, clientIP: req.ip });
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

        res.json(projects);
      } else {
        // Regular users only see their own projects
        const projects = await storage.getUserProjects(userId);
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

    
    try {
      const { reference, trxref, status } = req.query;
      const paymentReference = (reference || trxref) as string;
      
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
          
          if (verifyData.status && verifyData.data.status === 'success') {
            // Payment verified, update records
            const orderId = verifyData.data.metadata?.orderId;
            
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
            
            // Redirect to dashboard with success and clear payment flag
            return res.redirect('/?payment=success&clear_payment=true#dashboard');
          } else {
            console.log('Payment verification failed:', verifyData);
            return res.redirect('/?payment=failed&clear_payment=true#dashboard');
          }
        } catch (verifyError) {
          console.error("Error verifying payment:", verifyError);
          return res.redirect('/?payment=error&clear_payment=true#dashboard');
        }
      } else {
        console.log('No payment reference provided in callback');
        return res.redirect('/?payment=failed&clear_payment=true#dashboard');
      }
    } catch (error) {
      console.error("Error handling payment callback:", error);
      return res.redirect('/?payment=error&clear_payment=true#dashboard');
    }
  });

  app.post('/api/payments/webhook', authRateLimit('payment'), validateRequestSize(), async (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    try {
      // Verify webhook signature from Paystack
      const hash = req.headers['x-paystack-signature'];
      const body = JSON.stringify(req.body);

      if (!hash) {
        auditLog('webhook_no_signature', undefined, { clientIP });
        return res.status(400).json({ message: "Missing signature" });
      }

      const hashString = Array.isArray(hash) ? hash[0] : hash;
      if (!await storage.verifyPaystackWebhook(hashString, body)) {
        auditLog('webhook_invalid_signature', undefined, { clientIP, hash: hashString.substring(0, 10) + '***' });
        return res.status(400).json({ message: "Invalid signature" });
      }

      const { event, data } = req.body;

      if (event === 'charge.success') {
        auditLog('webhook_payment_success', undefined, { 
          clientIP, 
          orderId: data?.metadata?.orderId,
          amount: data?.amount 
        });
        await storage.handleSuccessfulPayment(data);
      }

      res.json({ status: 'success' });
    } catch (error) {
      auditLog('webhook_error', undefined, { error: (error as Error).message, clientIP });
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
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      // Check if user has access to update this project
      if (userRole !== 'admin' && userId) {
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

      const { serviceId, spots } = req.body;
      // Update service availability logic would go here
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
  app.get('/api/client/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get user's orders to count paid orders as active projects
      const userOrders = await storage.getUserOrders(userId);
      const paidOrders = userOrders.filter((order: any) => order.status === 'paid');
      
      // Get actual projects
      const userProjects = await storage.getUserProjects(userId);
      const completedProjects = userProjects.filter((project: any) => project.status === 'completed');
      
      const stats = {
        activeProjects: paidOrders.length, // Paid orders count as active projects
        completedProjects: completedProjects.length,
        totalSpent: paidOrders.reduce((sum: number, order: any) => {
          const price = typeof order.totalPrice === 'string' ? parseInt(order.totalPrice) : (order.totalPrice || 0);
          return sum + price;
        }, 0),
        newMessages: 0 // Can be enhanced later with actual message count
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching client stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Checkout session routes
  app.post("/api/checkout-sessions", async (req, res) => {
    try {
      const sessionData = req.body;
      console.log('Creating checkout session with data:', sessionData);
      
      // Generate unique session token
      const sessionToken = `checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Set expiration to 2 hours from now
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
      
      const checkoutSession = await storage.createCheckoutSession({
        sessionToken,
        serviceId: sessionData.serviceId,
        serviceData: sessionData.serviceData,
        contactData: sessionData.contactData || null,
        selectedAddOns: sessionData.selectedAddOns || [],
        totalPrice: sessionData.totalPrice,
        userId: sessionData.userId || null,
        expiresAt,
      });
      
      console.log('Created checkout session:', checkoutSession);
      res.json({ sessionToken: checkoutSession.sessionToken });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.get("/api/checkout-sessions/:sessionToken", async (req, res) => {
    try {
      const { sessionToken } = req.params;
      const session = await storage.getCheckoutSession(sessionToken);
      
      if (!session) {
        return res.status(404).json({ error: "Checkout session not found" });
      }
      
      // Check if session has expired
      if (new Date() > session.expiresAt) {
        await storage.deleteCheckoutSession(sessionToken);
        return res.status(410).json({ error: "Checkout session expired" });
      }
      
      res.json(session);
    } catch (error) {
      console.error("Error fetching checkout session:", error);
      res.status(500).json({ error: "Failed to fetch checkout session" });
    }
  });

  app.put("/api/checkout-sessions/:sessionToken", async (req, res) => {
    try {
      const { sessionToken } = req.params;
      const updates = req.body;
      
      const updatedSession = await storage.updateCheckoutSession(sessionToken, updates);
      res.json(updatedSession);
    } catch (error) {
      console.error("Error updating checkout session:", error);
      res.status(500).json({ error: "Failed to update checkout session" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}