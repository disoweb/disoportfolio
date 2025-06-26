import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rate limiting for logout endpoint
const logoutAttempts = new Map();
const LOGOUT_RATE_LIMIT = 5; // max attempts per minute
const LOGOUT_WINDOW = 60000; // 1 minute

// Add secure logout route before any auth middleware to avoid passport conflicts
app.post("/api/auth/logout", (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  // Rate limiting check
  const attempts = logoutAttempts.get(clientIP) || { count: 0, timestamp: now };
  if (now - attempts.timestamp > LOGOUT_WINDOW) {
    attempts.count = 0;
    attempts.timestamp = now;
  }
  
  if (attempts.count >= LOGOUT_RATE_LIMIT) {
    return res.status(429).json({ message: "Too many logout attempts. Try again later." });
  }
  
  attempts.count++;
  logoutAttempts.set(clientIP, attempts);
  
  // Validate Content-Type to prevent CSRF
  if (!req.is('application/json')) {
    return res.status(415).json({ message: "Invalid content type" });
  }
  
  // Check if user is actually logged in
  if (!req.session || !req.session.passport || !req.session.passport.user) {
    res.clearCookie('connect.sid', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    return res.json({ message: "Already logged out" });
  }

  // Store user ID for audit logging
  const userId = req.session.passport.user;
  
  // Destroy session securely
  req.session.destroy((err) => {
    if (err) {
      console.error(`Session destroy error for user ${userId}:`, err);
      return res.status(500).json({ message: "Error destroying session" });
    }
    
    // Clear cookie with all security attributes
    res.clearCookie('connect.sid', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    
    // Add security headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY'
    });
    
    console.log(`User ${userId} logged out successfully from IP ${clientIP}`);
    res.json({ message: "Logged out successfully" });
  });
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
