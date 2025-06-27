import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { 
  checkRateLimit, 
  securityHeaders, 
  validateContentType, 
  auditLog, 
  clearSessionSecurely,
  validateRequestSize 
} from "./security";

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Apply security headers globally
app.use(securityHeaders);

// Add payment success route before Vite middleware to ensure Express handles it
app.get('/payment-success', async (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  
  try {
    // Security: Rate limit callback attempts
    const { allowed, message } = checkRateLimit('payment_callback', clientIP);
    if (!allowed) {
      auditLog('payment_callback_rate_limited', undefined, { clientIP, message });
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>DiSO Webs - Payment Processing</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link rel="icon" type="image/x-icon" href="/favicon.ico">
          <style>
            body { 
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
              text-align: center; 
              padding: 50px 20px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container { 
              max-width: 500px; 
              background: white; 
              padding: 40px; 
              border-radius: 16px; 
              box-shadow: 0 20px 40px rgba(0,0,0,0.15);
              text-align: center;
            }
            .logo { 
              font-size: 24px; 
              font-weight: 700; 
              color: #3b82f6; 
              margin-bottom: 30px;
            }
            .error { color: #dc3545; margin-bottom: 20px; }
            .btn { 
              display: inline-block; 
              padding: 14px 28px; 
              background: #3b82f6; 
              color: white; 
              text-decoration: none; 
              border-radius: 8px; 
              margin-top: 20px;
              font-weight: 600;
              transition: background-color 0.2s;
            }
            .btn:hover { background: #2563eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">DiSO Webs</div>
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
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>DiSO Webs - Payment Error</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link rel="icon" type="image/x-icon" href="/favicon.ico">
          <style>
            body { 
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
              text-align: center; 
              padding: 50px 20px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container { 
              max-width: 500px; 
              background: white; 
              padding: 40px; 
              border-radius: 16px; 
              box-shadow: 0 20px 40px rgba(0,0,0,0.15);
            }
            .logo { 
              font-size: 24px; 
              font-weight: 700; 
              color: #3b82f6; 
              margin-bottom: 30px;
            }
            .error { color: #dc3545; margin-bottom: 20px; }
            .btn { 
              display: inline-block; 
              padding: 14px 28px; 
              background: #3b82f6; 
              color: white; 
              text-decoration: none; 
              border-radius: 8px; 
              margin-top: 20px;
              font-weight: 600;
              transition: background-color 0.2s;
            }
            .btn:hover { background: #2563eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">DiSO Webs</div>
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

        // Import storage here to avoid circular dependency
        const { storage } = await import('./storage');

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

          // Professional success page
          return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>DiSO Webs - Payment Successful</title>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <link rel="icon" type="image/x-icon" href="/favicon.ico">
              <style>
                body { 
                  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
                  text-align: center; 
                  padding: 50px 20px; 
                  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                  margin: 0;
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
                .container { 
                  max-width: 500px; 
                  background: white; 
                  padding: 40px; 
                  border-radius: 16px; 
                  box-shadow: 0 20px 40px rgba(0,0,0,0.15);
                }
                .logo { 
                  font-size: 24px; 
                  font-weight: 700; 
                  color: #3b82f6; 
                  margin-bottom: 30px;
                }
                .success { color: #10b981; margin-bottom: 20px; }
                .icon { font-size: 48px; margin-bottom: 20px; }
                .btn { 
                  display: inline-block; 
                  padding: 14px 28px; 
                  background: #10b981; 
                  color: white; 
                  text-decoration: none; 
                  border-radius: 8px; 
                  margin-top: 20px;
                  font-weight: 600;
                  transition: background-color 0.2s;
                }
                .btn:hover { background: #059669; }
                .spinner { 
                  border: 4px solid #f3f3f3; 
                  border-top: 4px solid #10b981; 
                  border-radius: 50%; 
                  width: 40px; 
                  height: 40px; 
                  animation: spin 1s linear infinite; 
                  margin: 20px auto; 
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .countdown { color: #6b7280; font-size: 14px; margin-top: 10px; }
              </style>
              <script>
                let countdown = 5;
                function updateCountdown() {
                  document.getElementById('countdown').innerText = countdown + ' seconds';
                  countdown--;
                  if (countdown < 0) {
                    window.location.href = '/dashboard';
                  }
                }
                setInterval(updateCountdown, 1000);
                updateCountdown();
              </script>
            </head>
            <body>
              <div class="container">
                <div class="logo">DiSO Webs</div>
                <div class="icon">✅</div>
                <h2 class="success">Payment Successful!</h2>
                <p>Your payment has been processed successfully. We'll start working on your project soon.</p>
                <div class="spinner"></div>
                <p>Redirecting you to your dashboard...</p>
                <div class="countdown" id="countdown">5 seconds</div>
                <a href="/dashboard" class="btn">Go to Dashboard Now</a>
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
              <title>DiSO Webs - Payment Failed</title>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <link rel="icon" type="image/x-icon" href="/favicon.ico">
              <style>
                body { 
                  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
                  text-align: center; 
                  padding: 50px 20px; 
                  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                  margin: 0;
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
                .container { 
                  max-width: 500px; 
                  background: white; 
                  padding: 40px; 
                  border-radius: 16px; 
                  box-shadow: 0 20px 40px rgba(0,0,0,0.15);
                }
                .logo { 
                  font-size: 24px; 
                  font-weight: 700; 
                  color: #3b82f6; 
                  margin-bottom: 30px;
                }
                .error { color: #dc2626; margin-bottom: 20px; }
                .icon { font-size: 48px; margin-bottom: 20px; }
                .btn { 
                  display: inline-block; 
                  padding: 14px 28px; 
                  color: white; 
                  text-decoration: none; 
                  border-radius: 8px; 
                  margin: 10px;
                  font-weight: 600;
                  transition: background-color 0.2s;
                }
                .btn-retry { background: #f59e0b; }
                .btn-retry:hover { background: #d97706; }
                .btn-dashboard { background: #3b82f6; }
                .btn-dashboard:hover { background: #2563eb; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="logo">DiSO Webs</div>
                <div class="icon">❌</div>
                <h2 class="error">Payment Failed</h2>
                <p>Your payment was not successful. You can try again or contact support if you continue to experience issues.</p>
                <a href="/services" class="btn btn-retry">Try Again</a>
                <a href="/dashboard" class="btn btn-dashboard">Go to Dashboard</a>
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
        
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>DiSO Webs - Payment Error</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link rel="icon" type="image/x-icon" href="/favicon.ico">
            <style>
              body { 
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
                text-align: center; 
                padding: 50px 20px; 
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                margin: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container { 
                max-width: 500px; 
                background: white; 
                padding: 40px; 
                border-radius: 16px; 
                box-shadow: 0 20px 40px rgba(0,0,0,0.15);
              }
              .logo { 
                font-size: 24px; 
                font-weight: 700; 
                color: #3b82f6; 
                margin-bottom: 30px;
              }
              .error { color: #d97706; margin-bottom: 20px; }
              .icon { font-size: 48px; margin-bottom: 20px; }
              .btn { 
                display: inline-block; 
                padding: 14px 28px; 
                background: #3b82f6; 
                color: white; 
                text-decoration: none; 
                border-radius: 8px; 
                margin-top: 20px;
                font-weight: 600;
                transition: background-color 0.2s;
              }
              .btn:hover { background: #2563eb; }
              .reference { 
                background: #f3f4f6; 
                padding: 10px; 
                border-radius: 6px; 
                font-family: monospace; 
                font-size: 12px; 
                color: #6b7280; 
                margin: 15px 0;
                word-break: break-all;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">DiSO Webs</div>
              <div class="icon">⚠️</div>
              <h2 class="error">Payment Processing Error</h2>
              <p>There was an error processing your payment. Please contact support with this reference:</p>
              <div class="reference">${paymentReference}</div>
              <a href="/dashboard" class="btn">Go to Dashboard</a>
            </div>
          </body>
          </html>
        `);
      }
    } else {
      auditLog('payment_callback_no_reference', undefined, { clientIP });
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>DiSO Webs - Payment Error</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link rel="icon" type="image/x-icon" href="/favicon.ico">
          <style>
            body { 
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
              text-align: center; 
              padding: 50px 20px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container { 
              max-width: 500px; 
              background: white; 
              padding: 40px; 
              border-radius: 16px; 
              box-shadow: 0 20px 40px rgba(0,0,0,0.15);
            }
            .logo { 
              font-size: 24px; 
              font-weight: 700; 
              color: #3b82f6; 
              margin-bottom: 30px;
            }
            .error { color: #dc3545; margin-bottom: 20px; }
            .btn { 
              display: inline-block; 
              padding: 14px 28px; 
              background: #3b82f6; 
              color: white; 
              text-decoration: none; 
              border-radius: 8px; 
              margin-top: 20px;
              font-weight: 600;
              transition: background-color 0.2s;
            }
            .btn:hover { background: #2563eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">DiSO Webs</div>
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
    
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>DiSO Webs - System Error</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="icon" type="image/x-icon" href="/favicon.ico">
        <style>
          body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
            text-align: center; 
            padding: 50px 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container { 
            max-width: 500px; 
            background: white; 
            padding: 40px; 
            border-radius: 16px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.15);
          }
          .logo { 
            font-size: 24px; 
            font-weight: 700; 
            color: #3b82f6; 
            margin-bottom: 30px;
          }
          .error { color: #dc3545; margin-bottom: 20px; }
          .btn { 
            display: inline-block; 
            padding: 14px 28px; 
            background: #3b82f6; 
            color: white; 
            text-decoration: none; 
            border-radius: 8px; 
            margin-top: 20px;
            font-weight: 600;
            transition: background-color 0.2s;
          }
          .btn:hover { background: #2563eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">DiSO Webs</div>
          <h2 class="error">System Error</h2>
          <p>There was a system error processing your payment callback. Please contact support.</p>
          <a href="/" class="btn">Return to Home</a>
        </div>
      </body>
      </html>
    `);
  }
});

// Add secure logout route before any auth middleware to avoid passport conflicts
app.post("/api/auth/logout", validateContentType, (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Rate limiting check
  const rateCheck = checkRateLimit('logout', clientIP);
  if (!rateCheck.allowed) {
    return res.status(429).json({ message: rateCheck.message });
  }
  
  // Check if user is actually logged in
  if (!req.session || !(req.session as any).passport || !(req.session as any).passport.user) {
    clearSessionSecurely(res);
    return res.json({ message: "Already logged out" });
  }

  // Store user ID for audit logging
  const userId = (req.session as any).passport.user;
  
  // Destroy session securely
  req.session.destroy((err) => {
    if (err) {
      auditLog('logout_error', userId, { error: err.message, clientIP });
      return res.status(500).json({ message: "Error destroying session" });
    }
    
    clearSessionSecurely(res);
    auditLog('logout_success', userId, { clientIP });
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
