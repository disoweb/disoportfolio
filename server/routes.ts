import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { setupAuth as setupReplitAuth } from "./replitAuth";
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
import { cacheManager, CacheKeys } from "./cache";
import { 
  checkRateLimit, 
  validateContentType, 
  sanitizeInput, 
  auditLog,
  authRateLimit,
  validateRequestSize,
  securityHeaders,
  getSecurityDelay,
  validateEmail,
  validateOrderId,
  validateUserId,
  sendSafeErrorResponse
} from "./security";
import * as schema from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - always use standard auth
  await setupAuth(app);

  // Create admin user if it doesn't exist - REQUIRE environment variable for security
  try {
    const adminEmail = 'admin@diso.com';
    const existingAdmin = await storage.getUserByEmail(adminEmail);
    if (!existingAdmin) {
      // SECURITY: Mandatory environment variable - no fallback password
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        throw new Error('ADMIN_PASSWORD environment variable must be set for admin user creation');
      }

      // Hash the password securely
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.default.hash(adminPassword, 12);

      await storage.createAdminUser(adminEmail, hashedPassword);
      auditLog('admin_user_created', 'system', { email: adminEmail });
    }
  } catch (error) {
    auditLog('admin_creation_failed', 'system', { error: (error as Error).message });
    throw error; // Fail startup if admin cannot be created securely
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

        // Enhanced order ID validation
        if (!validateOrderId(orderId)) {
          auditLog('security_violation', userId, { 
            type: 'invalid_order_id', 
            orderId: orderId?.substring(0, 10) + '...', 
            clientIP 
          });
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

      // Convert date strings to Date objects if they exist
      const updates = { ...req.body };
      if (updates.dueDate && typeof updates.dueDate === 'string') {
        updates.dueDate = new Date(updates.dueDate);
      }
      if (updates.startDate && typeof updates.startDate === 'string') {
        updates.startDate = new Date(updates.startDate);
      }

      // Debug: Log the updates being applied
      console.log('Updating project with:', { id, updates });

      const project = await storage.updateProject(id, updates);

      console.log('Updated project result:', project);
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
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    try {
      // Security: Rate limit callback attempts
      const { allowed, message } = checkRateLimit('payment_callback', clientIP);
      if (!allowed) {
        auditLog('payment_callback_rate_limited', undefined, { clientIP, message });
        return res.status(429).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Payment Processing</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
              .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .error { color: #dc3545; }
              .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2 class="error">Too Many Requests</h2>
              <p>Please wait before trying again.</p>
              <a href="/" class="btn">Return to Home</a>
            </div>
          </body>
          </html>
        `);
      }

      const { reference, trxref, status } = req.query;
      const paymentReference = (reference || trxref) as string;

      // Security: Validate payment reference format
      if (!paymentReference || !/^PSK_\d+_[a-z0-9]+$/i.test(paymentReference)) {
        auditLog('payment_callback_invalid_reference', undefined, { clientIP, reference: paymentReference });
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Payment Error</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
              .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .error { color: #dc3545; }
              .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2 class="error">Invalid Payment Reference</h2>
              <p>The payment reference provided is not valid.</p>
              <a href="/" class="btn">Return to Home</a>
            </div>
          </body>
          </html>
        `);
      }

      if (paymentReference) {
        // Verify payment with Paystack before confirming success
        try {
          const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
          if (!paystackSecretKey) {
            throw new Error('Payment service not configured');
          }

          const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${paymentReference}`, {
            headers: {
              Authorization: `Bearer ${paystackSecretKey}`,
            },
          });

          if (!verifyResponse.ok) {
            throw new Error(`Paystack API error: ${verifyResponse.status}`);
          }

          const verifyData = await verifyResponse.json();

          if (verifyData.status && verifyData.data.status === 'success') {
            // Payment verified, use the centralized success handler
            await storage.handleSuccessfulPayment(verifyData.data);
            auditLog('payment_callback_success', undefined, { 
              clientIP, 
              orderId: verifyData.data.metadata?.orderId,
              amount: verifyData.data.amount,
              reference: paymentReference
            });

            // Enhanced success page with better UX
            return res.send(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>Payment Successful</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                  .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                  .success { color: #28a745; }
                  .btn { display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                  .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #28a745; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
                  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
                <script>
                  setTimeout(function() {
                    window.location.href = '/?payment=success&clear_payment=true#dashboard';
                  }, 3000);
                </script>
              </head>
              <body>
                <div class="container">
                  <h2 class="success">✅ Payment Successful!</h2>
                  <p>Your payment has been processed successfully.</p>
                  <div class="spinner"></div>
                  <p>Redirecting you to your dashboard...</p>
                  <a href="/?payment=success&clear_payment=true#dashboard" class="btn">Go to Dashboard Now</a>
                </div>
              </body>
              </html>
            `);
          } else {
            auditLog('payment_callback_failed', undefined, { 
              clientIP, 
              reference: paymentReference,
              status: verifyData.data?.status || 'unknown'
            });
            
            return res.send(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>Payment Failed</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                  .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                  .error { color: #dc3545; }
                  .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                  .btn-retry { background: #ffc107; color: #212529; }
                </style>
                <script>
                  setTimeout(function() {
                    window.location.href = '/?payment=failed&clear_payment=true#dashboard';
                  }, 5000);
                </script>
              </head>
              <body>
                <div class="container">
                  <h2 class="error">❌ Payment Failed</h2>
                  <p>Your payment was not successful. You can try again or contact support if you continue to experience issues.</p>
                  <a href="/services" class="btn btn-retry">Try Again</a>
                  <a href="/?payment=failed&clear_payment=true#dashboard" class="btn">Go to Dashboard</a>
                </div>
              </body>
              </html>
            `);
          }
        } catch (verifyError) {
          auditLog('payment_callback_verify_error', undefined, { 
            clientIP, 
            reference: paymentReference,
            error: (verifyError as Error).message
          });
          
          return res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Payment Error</title>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .error { color: #dc3545; }
                .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
              </style>
              <script>
                setTimeout(function() {
                  window.location.href = '/?payment=error&clear_payment=true#dashboard';
                }, 5000);
              </script>
            </head>
            <body>
              <div class="container">
                <h2 class="error">⚠️ Payment Processing Error</h2>
                <p>There was an error processing your payment. Please contact support with reference: ${paymentReference}</p>
                <a href="/?payment=error&clear_payment=true#dashboard" class="btn">Go to Dashboard</a>
              </div>
            </body>
            </html>
          `);
        }
      } else {
        auditLog('payment_callback_no_reference', undefined, { clientIP });
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Payment Error</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
              .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .error { color: #dc3545; }
              .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2 class="error">Missing Payment Reference</h2>
              <p>No payment reference was provided.</p>
              <a href="/" class="btn">Return to Home</a>
            </div>
          </body>
          </html>
        `);
      }
    } catch (error) {
      auditLog('payment_callback_error', undefined, { 
        clientIP, 
        error: (error as Error).message
      });
      
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Error</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .error { color: #dc3545; }
            .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 class="error">System Error</h2>
            <p>There was a system error processing your payment callback. Please contact support.</p>
            <a href="/" class="btn">Return to Home</a>
          </div>
        </body>
        </html>
      `);
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

  // Admin settings routes
  app.get("/api/admin/settings", async (req, res) => {
    try {
      const existingSettings = await db.select().from(schema.settings).where(eq(schema.settings.id, "default")).limit(1);

      const settings = {
        whatsappNumber: existingSettings[0]?.whatsappNumber || "+2348065343725"
      };

      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/admin/settings", isAuthenticated, async (req: any, res) => {
    try {
      const { whatsappNumber } = req.body;

      if (!whatsappNumber) {
        return res.status(400).json({ error: "WhatsApp number is required" });
      }

      // Validate phone number format (improved validation)
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      const trimmedNumber = whatsappNumber.trim();
      if (!phoneRegex.test(trimmedNumber)) {
        return res.status(400).json({ error: "Invalid phone number format. Use international format starting with + followed by country code (e.g., +2348065343725)" });
      }

      // Check if settings exist
      const existingSettings = await db.select().from(schema.settings).where(eq(schema.settings.id, "default")).limit(1);

      if (existingSettings.length > 0) {
        // Update existing settings
        await db.update(schema.settings)
          .set({ 
            whatsappNumber,
            updatedAt: new Date()
          })
          .where(eq(schema.settings.id, "default"));
      } else {
        // Create new settings
        await db.insert(schema.settings).values({
          id: "default",
          whatsappNumber,
        });
      }

      res.json({ 
        message: "WhatsApp number updated successfully",
        whatsappNumber       });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
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

      // Convert date strings to Date objects if they exist
      const updates = { ...req.body };
      if (updates.dueDate && typeof updates.dueDate === 'string') {
        updates.dueDate = new Date(updates.dueDate);
      }
      if (updates.startDate && typeof updates.startDate === 'string') {
        updates.startDate = new Date(updates.startDate);
      }

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

  // Admin project deletion (only for cancelled projects)
  app.delete('/api/admin/projects/:id', isAuthenticated, securityHeaders, validateContentType, validateRequestSize(), authRateLimit('project_delete'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        auditLog('unauthorized_project_delete_attempt', userId, { projectId: req.params.id });
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_project_delete');
      }

      const { id } = req.params;

      // Validate project ID format
      if (!id || typeof id !== 'string' || id.length < 10) {
        return sendSafeErrorResponse(res, 400, new Error("Invalid project ID"), 'invalid_project_id');
      }

      // Get project to verify it's cancelled
      const project = await storage.getProjectById(id);
      if (!project) {
        return sendSafeErrorResponse(res, 404, new Error("Project not found"), 'project_not_found');
      }

      if (project.status !== 'cancelled') {
        auditLog('project_delete_denied_not_cancelled', userId, { projectId: id, currentStatus: project.status });
        return sendSafeErrorResponse(res, 400, new Error("Only cancelled projects can be deleted"), 'project_not_cancelled');
      }

      await storage.deleteProject(id);
      auditLog('project_deleted', userId, { projectId: id, projectName: project.projectName });

      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      sendSafeErrorResponse(res, 500, error, 'project_delete_error');
    }
  });

  // Admin create new project
  app.post('/api/admin/projects', isAuthenticated, securityHeaders, validateContentType, validateRequestSize(), authRateLimit('project_create'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        auditLog('unauthorized_project_create_attempt', userId);
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_project_create');
      }

      // Validate and sanitize input
      const projectData = {
        ...req.body,
        projectName: sanitizeInput(req.body.projectName || ''),
        userId: sanitizeInput(req.body.userId || ''),
        description: sanitizeInput(req.body.description || ''),
        notes: sanitizeInput(req.body.notes || '')
      };

      const validatedProject = insertProjectSchema.parse(projectData);
      const project = await storage.createProject(validatedProject);

      auditLog('project_created', userId, { 
        projectId: project.id, 
        projectName: project.projectName,
        targetUserId: project.userId 
      });

      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return sendSafeErrorResponse(res, 400, new Error("Invalid project data"), 'invalid_project_data');
      }
      console.error("Error creating project:", error);
      sendSafeErrorResponse(res, 500, error, 'project_create_error');
    }
  });

  // Admin update order status and payment
  app.patch('/api/admin/orders/:id', isAuthenticated, securityHeaders, validateContentType, validateRequestSize(), authRateLimit('order_update'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        auditLog('unauthorized_order_update_attempt', userId, { orderId: req.params.id });
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_order_update');
      }

      const { id } = req.params;
      const { status, paymentId } = req.body;

      // Validate order ID
      if (!validateOrderId(id)) {
        return sendSafeErrorResponse(res, 400, new Error("Invalid order ID"), 'invalid_order_id');
      }

      // Sanitize inputs
      const sanitizedStatus = sanitizeInput(status || '');
      const sanitizedPaymentId = sanitizeInput(paymentId || '');

      const updates: any = {};
      if (sanitizedStatus) updates.status = sanitizedStatus;
      if (sanitizedPaymentId) updates.paymentId = sanitizedPaymentId;

      const updatedOrder = await storage.updateOrderStatus(id, sanitizedStatus);

      auditLog('order_updated_by_admin', userId, { 
        orderId: id, 
        newStatus: sanitizedStatus,
        paymentId: sanitizedPaymentId 
      });

      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order:", error);
      sendSafeErrorResponse(res, 500, error, 'order_update_error');
    }
  });

  // Admin service package CRUD operations
  app.get('/api/admin/services', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_service_access');
      }

      const services = await storage.getAllServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching admin services:", error);
      sendSafeErrorResponse(res, 500, error, 'service_fetch_error');
    }
  });

  app.post('/api/admin/services', isAuthenticated, securityHeaders, validateContentType, validateRequestSize(), authRateLimit('service_create'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        auditLog('unauthorized_service_create_attempt', userId);
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_service_create');
      }

      // Sanitize input data
      const serviceData = {
        ...req.body,
        name: sanitizeInput(req.body.name || ''),
        description: sanitizeInput(req.body.description || ''),
        category: sanitizeInput(req.body.category || ''),
        features: Array.isArray(req.body.features) ? req.body.features.map((f: string) => sanitizeInput(f)) : []
      };

      const validatedService = insertServiceSchema.parse(serviceData);
      const service = await storage.createService(validatedService);

      auditLog('service_created', userId, { 
        serviceId: service.id, 
        serviceName: service.name 
      });

      res.json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return sendSafeErrorResponse(res, 400, new Error("Invalid service data"), 'invalid_service_data');
      }
      console.error("Error creating service:", error);
      sendSafeErrorResponse(res, 500, error, 'service_create_error');
    }
  });

  app.patch('/api/admin/services/:id', isAuthenticated, securityHeaders, validateContentType, validateRequestSize(), authRateLimit('service_update'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        auditLog('unauthorized_service_update_attempt', userId, { serviceId: req.params.id });
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_service_update');
      }

      const { id } = req.params;

      // Sanitize update data
      const updates = {
        ...req.body,
        name: req.body.name ? sanitizeInput(req.body.name) : undefined,
        description: req.body.description ? sanitizeInput(req.body.description) : undefined,
        category: req.body.category ? sanitizeInput(req.body.category) : undefined,
        features: Array.isArray(req.body.features) ? req.body.features.map((f: string) => sanitizeInput(f)) : undefined
      };

      // Remove undefined values
      Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

      const updatedService = await storage.updateService(id, updates);

      auditLog('service_updated', userId, { 
        serviceId: id, 
        updates: Object.keys(updates) 
      });

      res.json(updatedService);
    } catch (error) {
      console.error("Error updating service:", error);
      sendSafeErrorResponse(res, 500, error, 'service_update_error');
    }
  });

  app.delete('/api/admin/services/:id', isAuthenticated, securityHeaders, validateContentType, validateRequestSize(), authRateLimit('service_delete'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        auditLog('unauthorized_service_delete_attempt', userId, { serviceId: req.params.id });
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_service_delete');
      }

      const { id } = req.params;
      await storage.deleteService(id);

      auditLog('service_deleted', userId, { serviceId: id });

      res.json({ message: "Service deleted successfully" });
    } catch (error) {
      console.error("Error deleting service:", error);
      sendSafeErrorResponse(res, 500, error, 'service_delete_error');
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

  // Redis-cached ultra-fast client stats with multi-tier caching
  app.get('/api/client/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const cacheKey = CacheKeys.userStats(userId);
      
      // Try Redis cache first for instant response
      const cachedStats = await cacheManager.get(cacheKey);
      if (cachedStats) {
        res.set({
          'Cache-Control': 'public, max-age=30, s-maxage=60',
          'X-Cache': 'HIT'
        });
        return res.json(cachedStats);
      }
      
      // Cache miss - compute fresh data with parallel queries
      const optimizedStats = await cacheManager.getOrSet(
        cacheKey,
        async () => {
          const [userOrders, userProjects] = await Promise.all([
            db.select({
              status: orders.status,
              totalPrice: orders.totalPrice
            }).from(orders).where(eq(orders.userId, userId)),
            
            db.select({
              status: schema.projects.status
            }).from(schema.projects).where(eq(schema.projects.userId, userId))
          ]);

          const paidOrders = userOrders.filter(o => o.status === 'paid');
          const activeProjects = userProjects.filter(p => p.status === 'active').length;
          const completedProjects = userProjects.filter(p => p.status === 'completed').length;
          
          const totalSpent = paidOrders.reduce((sum, order) => {
            const price = typeof order.totalPrice === 'string' ? parseInt(order.totalPrice) : (order.totalPrice || 0);
            return sum + price;
          }, 0);

          return {
            activeProjects: activeProjects,
            completedProjects: completedProjects,
            totalSpent: totalSpent,
            newMessages: 0
          };
        },
        30 // 30 second cache
      );

      res.set({
        'Cache-Control': 'public, max-age=30, s-maxage=60',
        'X-Cache': 'MISS'
      });
      
      res.json(optimizedStats);
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

  // Referral System API Routes

  // Generate referral code for user
  app.post('/api/referrals/generate-code', isAuthenticated, securityHeaders, authRateLimit('referral_code'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log('Generating referral code for user:', userId);
      
      const user = await storage.getUser(userId);

      if (!user) {
        console.error('User not found for referral code generation:', userId);
        return sendSafeErrorResponse(res, 404, new Error("User not found"), 'user_not_found');
      }

      // Check if user already has a referral code
      if (user.referralCode) {
        console.log('User already has referral code:', user.referralCode);
        return res.json({ referralCode: user.referralCode });
      }

      const referralCode = await storage.generateReferralCode(userId);
      console.log('Generated new referral code:', referralCode);

      auditLog('referral_code_generated', userId, { referralCode });

      res.json({ referralCode });
    } catch (error) {
      console.error("Error generating referral code:", error);
      sendSafeErrorResponse(res, 500, error, 'referral_code_error');
    }
  });

  // Get user's referral data (earnings, stats, etc.)
  app.get('/api/referrals/my-data', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return sendSafeErrorResponse(res, 404, new Error("User not found"), 'user_not_found');
      }

      const [earnings, referrals, settings] = await Promise.all([
        storage.getUserReferralEarnings(userId),
        storage.getUserReferrals(userId),
        storage.getReferralSettings()
      ]);

      res.json({
        referralCode: user.referralCode,
        earnings,
        referrals,
        settings: {
          commissionPercentage: settings.commissionPercentage,
          minimumWithdrawal: settings.minimumWithdrawal,
          isActive: settings.isActive,
          baseUrl: process.env.REFERRAL_BASE_URL || settings.baseUrl
        }
      });
    } catch (error) {
      console.error("Error fetching referral data:", error);
      sendSafeErrorResponse(res, 500, error, 'referral_data_error');
    }
  });

  // Get user's withdrawal requests
  app.get('/api/referrals/withdrawals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const withdrawals = await storage.getUserWithdrawalRequests(userId);
      res.json(withdrawals);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      sendSafeErrorResponse(res, 500, error, 'withdrawal_fetch_error');
    }
  });

  // Create withdrawal request
  app.post('/api/referrals/request-withdrawal', isAuthenticated, securityHeaders, validateContentType, validateRequestSize(), authRateLimit('withdrawal_request'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { amount, paymentDetails } = req.body;
      const paymentMethod = "manual"; // Default payment method

      // Validate amount
      if (!amount || amount <= 0) {
        return sendSafeErrorResponse(res, 400, new Error("Invalid withdrawal amount"), 'invalid_amount');
      }

      // Get user's earnings to check available balance
      const earnings = await storage.getUserReferralEarnings(userId);
      if (!earnings) {
        return sendSafeErrorResponse(res, 404, new Error("No earnings found"), 'no_earnings');
      }

      const availableBalance = parseFloat(earnings.availableBalance);
      const withdrawalAmount = parseFloat(amount);

      // Check minimum withdrawal
      const settings = await storage.getReferralSettings();
      const minimumWithdrawal = parseFloat(settings.minimumWithdrawal);

      if (withdrawalAmount < minimumWithdrawal) {
        return res.status(400).json({ 
          error: `Minimum withdrawal amount is $${minimumWithdrawal}` 
        });
      }

      if (withdrawalAmount > availableBalance) {
        return res.status(400).json({ 
          error: "Insufficient balance" 
        });
      }

      // Sanitize inputs
      const sanitizedPaymentMethod = sanitizeInput(paymentMethod);

      const withdrawal = await storage.createWithdrawalRequest({
        userId,
        amount: withdrawalAmount.toFixed(2),
        paymentMethod: sanitizedPaymentMethod,
        paymentDetails,
        status: "pending"
      });

      auditLog('withdrawal_requested', userId, { 
        withdrawalId: withdrawal.id, 
        amount: withdrawalAmount,
        paymentMethod: sanitizedPaymentMethod 
      });

      res.json(withdrawal);
    } catch (error) {
      console.error("Error creating withdrawal request:", error);
      sendSafeErrorResponse(res, 500, error, 'withdrawal_create_error');
    }
  });

  // Register with referral code
  app.post('/api/referrals/register', securityHeaders, validateContentType, validateRequestSize(), authRateLimit('referral_registration'), async (req: any, res) => {
    try {
      const { referralCode, userId } = req.body;

      if (!referralCode || !userId) {
        return sendSafeErrorResponse(res, 400, new Error("Missing referral code or user ID"), 'missing_data');
      }

      // Sanitize inputs
      const sanitizedReferralCode = sanitizeInput(referralCode);
      const sanitizedUserId = sanitizeInput(userId);

      // Validate user ID format
      if (!validateUserId(sanitizedUserId)) {
        return sendSafeErrorResponse(res, 400, new Error("Invalid user ID"), 'invalid_user_id');
      }

      // Find referrer by code
      const referrer = await storage.getUserByReferralCode(sanitizedReferralCode);
      if (!referrer) {
        return res.status(404).json({ error: "Invalid referral code" });
      }

      // Update user with referrer
      const user = await storage.getUser(sanitizedUserId);
      if (!user) {
        return sendSafeErrorResponse(res, 404, new Error("User not found"), 'user_not_found');
      }

      // Update user's referredBy field
      await db.update(schema.users)
        .set({ referredBy: referrer.id })
        .where(eq(schema.users.id, sanitizedUserId));

      auditLog('user_referred', sanitizedUserId, { 
        referrerId: referrer.id, 
        referralCode: sanitizedReferralCode 
      });

      res.json({ success: true, referrer: { id: referrer.id, email: referrer.email } });
    } catch (error) {
      console.error("Error processing referral registration:", error);
      sendSafeErrorResponse(res, 500, error, 'referral_registration_error');
    }
  });

  // Admin: Get all withdrawal requests
  app.get('/api/admin/withdrawals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_withdrawal_access');
      }

      const withdrawals = await storage.getAllWithdrawalRequests();
      res.json(withdrawals);
    } catch (error) {
      console.error("Error fetching admin withdrawals:", error);
      sendSafeErrorResponse(res, 500, error, 'admin_withdrawal_error');
    }
  });

  // Admin: Process withdrawal request
  app.patch('/api/admin/withdrawals/:id', isAuthenticated, securityHeaders, validateContentType, validateRequestSize(), authRateLimit('withdrawal_process'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        auditLog('unauthorized_withdrawal_process_attempt', userId, { withdrawalId: req.params.id });
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_withdrawal_process');
      }

      const { id } = req.params;
      const { status, notes } = req.body;

      // Sanitize inputs
      const sanitizedStatus = sanitizeInput(status);
      const sanitizedNotes = sanitizeInput(notes || '');

      // Validate status
      const validStatuses = ['pending', 'approved', 'completed', 'rejected'];
      if (!validStatuses.includes(sanitizedStatus)) {
        return sendSafeErrorResponse(res, 400, new Error("Invalid status"), 'invalid_status');
      }

      const withdrawal = await storage.processWithdrawal(id, userId, sanitizedStatus, sanitizedNotes);

      auditLog('withdrawal_processed', userId, { 
        withdrawalId: id, 
        newStatus: sanitizedStatus,
        notes: sanitizedNotes 
      });

      res.json(withdrawal);
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      sendSafeErrorResponse(res, 500, error, 'withdrawal_process_error');
    }
  });

  // Admin: Get referral settings
  app.get('/api/admin/referral-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_settings_access');
      }

      const settings = await storage.getReferralSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching referral settings:", error);
      sendSafeErrorResponse(res, 500, error, 'settings_fetch_error');
    }
  });

  // Admin: Update referral settings
  app.patch('/api/admin/referral-settings', isAuthenticated, securityHeaders, validateContentType, validateRequestSize(), authRateLimit('settings_update'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        auditLog('unauthorized_settings_update_attempt', userId);
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_settings_update');
      }

      const { commissionPercentage, minimumWithdrawal, payoutSchedule, isActive } = req.body;

      const updates: any = {};
      if (commissionPercentage !== undefined) {
        const percentage = parseFloat(commissionPercentage);
        if (percentage < 0 || percentage > 100) {
          return sendSafeErrorResponse(res, 400, new Error("Commission percentage must be between 0-100"), 'invalid_percentage');
        }
        updates.commissionPercentage = percentage.toFixed(2);
      }
      if (minimumWithdrawal !== undefined) {
        const minimum = parseFloat(minimumWithdrawal);
        if (minimum < 0) {
          return sendSafeErrorResponse(res, 400, new Error("Minimum withdrawal must be positive"), 'invalid_minimum');
        }
        updates.minimumWithdrawal = minimum.toFixed(2);
      }
      if (payoutSchedule !== undefined) {
        updates.payoutSchedule = sanitizeInput(payoutSchedule);
      }
      if (isActive !== undefined) {
        updates.isActive = Boolean(isActive);
      }

      const settings = await storage.updateReferralSettings(updates);

      auditLog('referral_settings_updated', userId, updates);

      res.json(settings);
    } catch (error) {
      console.error("Error updating referral settings:", error);
      sendSafeErrorResponse(res, 500, error, 'settings_update_error');
    }
  });

  // ============================================================================
  // SEO MANAGEMENT ROUTES
  // ============================================================================

  // Get SEO settings
  app.get('/api/seo/settings', async (req, res) => {
    try {
      const settings = await storage.getSeoSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching SEO settings:", error);
      sendSafeErrorResponse(res, 500, error, 'seo_settings_fetch_error');
    }
  });

  // Admin: Update SEO settings
  app.patch('/api/admin/seo/settings', isAuthenticated, securityHeaders, validateContentType, validateRequestSize(), authRateLimit('seo_settings'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        auditLog('unauthorized_seo_settings_attempt', userId);
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_seo_settings');
      }

      const {
        siteName, siteDescription, siteUrl, defaultMetaTitle,
        defaultMetaDescription, defaultKeywords, googleAnalyticsId,
        googleSearchConsoleId, googleTagManagerId, facebookPixelId,
        twitterHandle, organizationSchema, robotsTxt,
        sitemapEnabled, breadcrumbsEnabled, openGraphEnabled,
        twitterCardsEnabled, structuredDataEnabled
      } = req.body;

      const updates: any = {};      if (siteName !== undefined) updates.siteName = sanitizeInput(siteName);
      if (siteDescription !== undefined) updates.siteDescription = sanitizeInput(siteDescription);
      if (siteUrl !== undefined) updates.siteUrl = sanitizeInput(siteUrl);
      if (defaultMetaTitle !== undefined) updates.defaultMetaTitle = sanitizeInput(defaultMetaTitle);
      if (defaultMetaDescription !== undefined) updates.defaultMetaDescription = sanitizeInput(defaultMetaDescription);
      if (defaultKeywords !== undefined) updates.defaultKeywords = sanitizeInput(defaultKeywords);
      if (googleAnalyticsId !== undefined) updates.googleAnalyticsId = sanitizeInput(googleAnalyticsId);
      if (googleSearchConsoleId !== undefined) updates.googleSearchConsoleId = sanitizeInput(googleSearchConsoleId);
      if (googleTagManagerId !== undefined) updates.googleTagManagerId = sanitizeInput(googleTagManagerId);
      if (facebookPixelId !== undefined) updates.facebookPixelId = sanitizeInput(facebookPixelId);
      if (twitterHandle !== undefined) updates.twitterHandle = sanitizeInput(twitterHandle);
      if (organizationSchema !== undefined) updates.organizationSchema = organizationSchema;
      if (robotsTxt !== undefined) updates.robotsTxt = sanitizeInput(robotsTxt);
      if (sitemapEnabled !== undefined) updates.sitemapEnabled = Boolean(sitemapEnabled);
      if (breadcrumbsEnabled !== undefined) updates.breadcrumbsEnabled = Boolean(breadcrumbsEnabled);
      if (openGraphEnabled !== undefined) updates.openGraphEnabled = Boolean(openGraphEnabled);
      if (twitterCardsEnabled !== undefined) updates.twitterCardsEnabled = Boolean(twitterCardsEnabled);
      if (structuredDataEnabled !== undefined) updates.structuredDataEnabled = Boolean(structuredDataEnabled);

      const settings = await storage.updateSeoSettings(updates);
      auditLog('seo_settings_updated', userId, updates);
      res.json(settings);
    } catch (error) {
      console.error("Error updating SEO settings:", error);
      sendSafeErrorResponse(res, 500, error, 'seo_settings_update_error');
    }
  });

  // Get all SEO pages
  app.get('/api/admin/seo/pages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_seo_pages');
      }

      const pages = await storage.getAllSeoPages();
      res.json(pages);
    } catch (error) {
      console.error("Error fetching SEO pages:", error);
      sendSafeErrorResponse(res, 500, error, 'seo_pages_fetch_error');
    }
  });

  // Get SEO page by path
  app.get('/api/seo/pages/:path(*)', async (req, res) => {
    try {
      const path = '/' + (req.params.path || '');
      const page = await storage.getSeoPageByPath(path);

      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }

      res.json(page);
    } catch (error) {
      console.error("Error fetching SEO page:", error);
      sendSafeErrorResponse(res, 500, error, 'seo_page_fetch_error');
    }
  });

  // Admin: Create SEO page
  app.post('/api/admin/seo/pages', isAuthenticated, securityHeaders, validateContentType, validateRequestSize(), authRateLimit('seo_page_create'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        auditLog('unauthorized_seo_page_create_attempt', userId);
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_seo_page_create');
      }

      const {
        path, title, metaDescription, keywords, h1Tag, canonicalUrl,
        noIndex, noFollow, priority, changeFrequency, customMetaTags,
        openGraphData, twitterCardData, structuredData, contentType
      } = req.body;

      if (!path || !title) {
        return sendSafeErrorResponse(res, 400, new Error("Path and title are required"), 'missing_page_fields');
      }

      const pageData = {
        path: sanitizeInput(path),
        title: sanitizeInput(title),
        metaDescription: metaDescription ? sanitizeInput(metaDescription) : null,
        keywords: keywords ? sanitizeInput(keywords) : null,
        h1Tag: h1Tag ? sanitizeInput(h1Tag) : null,
        canonicalUrl: canonicalUrl ? sanitizeInput(canonicalUrl) : null,
        noIndex: Boolean(noIndex),
        noFollow: Boolean(noFollow),
        priority: priority ? parseFloat(priority) : 0.5,
        changeFrequency: changeFrequency || 'weekly',
        customMetaTags,
        openGraphData,
        twitterCardData,
        structuredData,
        contentType: contentType || 'page'
      };

      const newPage = await storage.createSeoPage(pageData);
      auditLog('seo_page_created', userId, { pageId: newPage.id, path: newPage.path });
      res.json(newPage);
    } catch (error) {
      console.error("Error creating SEO page:", error);
      sendSafeErrorResponse(res, 500, error, 'seo_page_create_error');
    }
  });

  // Admin: Update SEO page
  app.patch('/api/admin/seo/pages/:id', isAuthenticated, securityHeaders, validateContentType, validateRequestSize(), authRateLimit('seo_page_update'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        auditLog('unauthorized_seo_page_update_attempt', userId, { pageId: req.params.id });
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_seo_page_update');
      }

      const pageId = sanitizeInput(req.params.id);
      const {
        path, title, metaDescription, keywords, h1Tag, canonicalUrl,
        noIndex, noFollow, priority, changeFrequency, customMetaTags,
        openGraphData, twitterCardData, structuredData, contentType, isActive
      } = req.body;

      const updates: any = {};
      if (path !== undefined) updates.path = sanitizeInput(path);
      if (title !== undefined) updates.title = sanitizeInput(title);
      if (metaDescription !== undefined) updates.metaDescription = sanitizeInput(metaDescription);
      if (keywords !== undefined) updates.keywords = sanitizeInput(keywords);
      if (h1Tag !== undefined) updates.h1Tag = sanitizeInput(h1Tag);
      if (canonicalUrl !== undefined) updates.canonicalUrl = sanitizeInput(canonicalUrl);
      if (noIndex !== undefined) updates.noIndex = Boolean(noIndex);
      if (noFollow !== undefined) updates.noFollow = Boolean(noFollow);
      if (priority !== undefined) updates.priority = parseFloat(priority);
      if (changeFrequency !== undefined) updates.changeFrequency = sanitizeInput(changeFrequency);
      if (customMetaTags !== undefined) updates.customMetaTags = customMetaTags;
      if (openGraphData !== undefined) updates.openGraphData = openGraphData;
      if (twitterCardData !== undefined) updates.twitterCardData = twitterCardData;
      if (structuredData !== undefined) updates.structuredData = structuredData;
      if (contentType !== undefined) updates.contentType = sanitizeInput(contentType);
      if (isActive !== undefined) updates.isActive = Boolean(isActive);

      const updatedPage = await storage.updateSeoPage(pageId, updates);
      auditLog('seo_page_updated', userId, { pageId, updates });
      res.json(updatedPage);
    } catch (error) {
      console.error("Error updating SEO page:", error);
      sendSafeErrorResponse(res, 500, error, 'seo_page_update_error');
    }
  });

  // Admin: Update SEO rule
  app.patch('/api/admin/seo/rules/:id', isAuthenticated, securityHeaders, validateContentType, validateRequestSize(), authRateLimit('seo_rule_update'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        auditLog('unauthorized_seo_rule_update_attempt', userId, { ruleId: req.params.id });
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_seo_rule_update');
      }

      const ruleId = sanitizeInput(req.params.id);
      const { name, description, ruleType, conditions, actions, priority, isActive } = req.body;

      const updates: any = {};
      if (name !== undefined) updates.name = sanitizeInput(name);
      if (description !== undefined) updates.description = sanitizeInput(description);
      if (ruleType !== undefined) updates.ruleType = sanitizeInput(ruleType);
      if (conditions !== undefined) updates.conditions = conditions;
      if (actions !== undefined) updates.actions = actions;
      if (priority !== undefined) updates.priority = parseInt(priority);
      if (isActive !== undefined) updates.isActive = Boolean(isActive);

      const updatedRule = await storage.updateSeoRule(ruleId, updates);
      auditLog('seo_rule_updated', userId, { ruleId, updates });
      res.json(updatedRule);
    } catch (error) {
      console.error("Error updating SEO rule:", error);
      sendSafeErrorResponse(res, 500, error, 'seo_rule_update_error');
    }
  });

  // Admin: Delete SEO rule
  app.delete('/api/admin/seo/rules/:id', isAuthenticated, securityHeaders, authRateLimit('seo_rule_delete'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        auditLog('unauthorized_seo_rule_delete_attempt', userId, { ruleId: req.params.id });
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_seo_rule_delete');
      }

      const ruleId = sanitizeInput(req.params.id);
      await storage.deleteSeoRule(ruleId);
      auditLog('seo_rule_deleted', userId, { ruleId });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting SEO rule:", error);
      sendSafeErrorResponse(res, 500, error, 'seo_rule_delete_error');
    }
  });

  // Admin: Update SEO keyword
  app.patch('/api/admin/seo/keywords/:id', isAuthenticated, securityHeaders, validateContentType, validateRequestSize(), authRateLimit('seo_keyword_update'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        auditLog('unauthorized_seo_keyword_update_attempt', userId, { keywordId: req.params.id });
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_seo_keyword_update');
      }

      const keywordId = sanitizeInput(req.params.id);
      const {
        keyword, targetPage, searchVolume, difficulty,
        currentRanking, targetRanking, notes, isActive
      } = req.body;

      const updates: any = {};
      if (keyword !== undefined) updates.keyword = sanitizeInput(keyword);
      if (targetPage !== undefined) updates.targetPage = sanitizeInput(targetPage);
      if (searchVolume !== undefined) updates.searchVolume = parseInt(searchVolume);
      if (difficulty !== undefined) updates.difficulty = parseFloat(difficulty);
      if (currentRanking !== undefined) updates.currentRanking = parseInt(currentRanking);
      if (targetRanking !== undefined) updates.targetRanking = parseInt(targetRanking);
      if (notes !== undefined) updates.notes = sanitizeInput(notes);
      if (isActive !== undefined) updates.isActive = Boolean(isActive);

      const updatedKeyword = await storage.updateSeoKeyword(keywordId, updates);
      auditLog('seo_keyword_updated', userId, { keywordId, updates });
      res.json(updatedKeyword);
    } catch (error) {
      console.error("Error updating SEO keyword:", error);
      sendSafeErrorResponse(res, 500, error, 'seo_keyword_update_error');
    }
  });

  // Admin: Delete SEO keyword
  app.delete('/api/admin/seo/keywords/:id', isAuthenticated, securityHeaders, authRateLimit('seo_keyword_delete'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        auditLog('unauthorized_seo_keyword_delete_attempt', userId, { keywordId: req.params.id });
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_seo_keyword_delete');
      }

      const keywordId = sanitizeInput(req.params.id);
      await storage.deleteSeoKeyword(keywordId);
      auditLog('seo_keyword_deleted', userId, { keywordId });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting SEO keyword:", error);
      sendSafeErrorResponse(res, 500, error, 'seo_keyword_delete_error');
    }
  });

  // Admin: Delete SEO page
  app.delete('/api/admin/seo/pages/:id', isAuthenticated, securityHeaders, authRateLimit('seo_page_delete'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        auditLog('unauthorized_seo_page_delete_attempt', userId, { pageId: req.params.id });
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_seo_page_delete');
      }

      const pageId = sanitizeInput(req.params.id);
      await storage.deleteSeoPage(pageId);
      auditLog('seo_page_deleted', userId, { pageId });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting SEO page:", error);
      sendSafeErrorResponse(res, 500, error, 'seo_page_delete_error');
    }
  });

  // Get all SEO rules
  app.get('/api/admin/seo/rules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_seo_rules');
      }

      const rules = await storage.getAllSeoRules();
      res.json(rules);
    } catch (error) {
      console.error("Error fetching SEO rules:", error);
      sendSafeErrorResponse(res, 500, error, 'seo_rules_fetch_error');
    }
  });

  // Admin: Create SEO rule
  app.post('/api/admin/seo/rules', isAuthenticated, securityHeaders, validateContentType, validateRequestSize(), authRateLimit('seo_rule_create'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        auditLog('unauthorized_seo_rule_create_attempt', userId);
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_seo_rule_create');
      }

      const { name, description, ruleType, conditions, actions, priority } = req.body;

      if (!name || !ruleType) {
        return sendSafeErrorResponse(res, 400, new Error("Name and rule type are required"), 'missing_rule_fields');
      }

      const ruleData = {
        name: sanitizeInput(name),
        description: description ? sanitizeInput(description) : null,
        ruleType: sanitizeInput(ruleType),
        conditions,
        actions,
        priority: priority ? parseInt(priority) : 1
      };

      const newRule = await storage.createSeoRule(ruleData);
      auditLog('seo_rule_created', userId, { ruleId: newRule.id, name: newRule.name });
      res.json(newRule);
    } catch (error) {
      console.error("Error creating SEO rule:", error);
      sendSafeErrorResponse(res, 500, error, 'seo_rule_create_error');
    }
  });

  // Get all SEO keywords
  app.get('/api/admin/seo/keywords', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_seo_keywords');
      }

      const keywords = await storage.getAllSeoKeywords();
      res.json(keywords);
    } catch (error) {
      console.error("Error fetching SEO keywords:", error);
      sendSafeErrorResponse(res, 500, error, 'seo_keywords_fetch_error');
    }
  });

  // Admin: Create SEO keyword
  app.post('/api/admin/seo/keywords', isAuthenticated, securityHeaders, validateContentType, validateRequestSize(), authRateLimit('seo_keyword_create'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        auditLog('unauthorized_seo_keyword_create_attempt', userId);
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_seo_keyword_create');
      }

      const {
        keyword, targetPage, searchVolume, difficulty,
        currentRanking, targetRanking, notes
      } = req.body;

      if (!keyword) {
        return sendSafeErrorResponse(res, 400, new Error("Keyword is required"), 'missing_keyword');
      }

      const keywordData = {
        keyword: sanitizeInput(keyword),
        targetPage: targetPage ? sanitizeInput(targetPage) : null,
        searchVolume: searchVolume ? parseInt(searchVolume) : null,
        difficulty: difficulty ? parseFloat(difficulty) : null,
        currentRanking: currentRanking ? parseInt(currentRanking) : null,
        targetRanking: targetRanking ? parseInt(targetRanking) : null,
        notes: notes ? sanitizeInput(notes) : null
      };

      const newKeyword = await storage.createSeoKeyword(keywordData);
      auditLog('seo_keyword_created', userId, { keywordId: newKeyword.id, keyword: newKeyword.keyword });
      res.json(newKeyword);
    } catch (error) {
      console.error("Error creating SEO keyword:", error);
      sendSafeErrorResponse(res, 500, error, 'seo_keyword_create_error');
    }
  });

  // Get all SEO audits
  app.get('/api/admin/seo/audits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_seo_audits');
      }

      const audits = await storage.getAllSeoAudits();
      res.json(audits);
    } catch (error) {
      console.error("Error fetching SEO audits:", error);
      sendSafeErrorResponse(res, 500, error, 'seo_audits_fetch_error');
    }
  });

  // Admin: Create SEO audit
  app.post('/api/admin/seo/audits', isAuthenticated, securityHeaders, validateContentType, validateRequestSize(), authRateLimit('seo_audit_create'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        auditLog('unauthorized_seo_audit_create_attempt', userId);
        return sendSafeErrorResponse(res, 403, new Error("Unauthorized"), 'unauthorized_seo_audit_create');
      }

      const {
        auditType, page, score, issues, recommendations, notes
      } = req.body;

      if (!auditType) {
        return sendSafeErrorResponse(res, 400, new Error("Audit type is required"), 'missing_audit_type');
      }

      const auditData = {
        auditType: sanitizeInput(auditType),
        page: page ? sanitizeInput(page) : null,
        score: score ? parseInt(score) : null,
        issues,
        recommendations,
        performedBy: userId,
        notes: notes ? sanitizeInput(notes) : null
      };

      const newAudit = await storage.createSeoAudit(auditData);
      auditLog('seo_audit_created', userId, { auditId: newAudit.id, auditType: newAudit.auditType });
      res.json(newAudit);
    } catch (error) {
      console.error("Error creating SEO audit:", error);
      sendSafeErrorResponse(res, 500, error, 'seo_audit_create_error');
    }
  });

  // Generate sitemap.xml
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const settings = await storage.getSeoSettings();
      const pages = await storage.getAllSeoPages();

      if (!settings.sitemapEnabled) {
        return res.status(404).send('Sitemap disabled');
      }

      let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

      // Add pages from database
      for (const page of pages.filter(p => p.isActive && !p.noIndex)) {
        const lastmod = page.updatedAt ? new Date(page.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        sitemap += `
  <url>
    <loc>${settings.siteUrl}${page.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changeFrequency}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
      }

      sitemap += `
</urlset>`;

      res.set('Content-Type', 'application/xml');
      res.send(sitemap);
    } catch (error) {
      console.error("Error generating sitemap:", error);
      res.status(500).send('Error generating sitemap');
    }
  });

  // Generate robots.txt
  app.get('/robots.txt', async (req, res) => {
    try {
      const settings = await storage.getSeoSettings();

      let robotsTxt = settings.robotsTxt || `User-agent: *
Disallow: /admin
Disallow: /api
Allow: /

Sitemap: ${settings.siteUrl}/sitemap.xml`;

      res.set('Content-Type', 'text/plain');
      res.send(robotsTxt);
    } catch (error) {
      console.error("Error generating robots.txt:", error);
      res.status(500).send('Error generating robots.txt');
    }
  });

  // Track SEO analytics
  app.post('/api/seo/analytics', async (req, res) => {
    try {
      const { page, date, views, referrer, userAgent } = req.body;

      if (!page || !date) {
        return sendSafeErrorResponse(res, 400, new Error("Page and date are required"), 'missing_analytics_data');
      }

      // Check if record exists for this page and date
      const existingRecord = await storage.getSeoAnalyticsByPageAndDate(sanitizeInput(page), sanitizeInput(date));

      if (existingRecord) {
        // Update existing record
        await storage.updateSeoAnalytics(existingRecord.id, {
          views: (existingRecord.views || 0) + (views || 1)
        });
      } else {
        // Create new record
        await storage.createSeoAnalytics({
          page: sanitizeInput(page),
          date: sanitizeInput(date),
          views: views || 1,
          clicks: 0,
          impressions: 0
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking SEO analytics:", error);
      res.status(500).json({ error: "Failed to track analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}