import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, Mail, Lock, User, Building2, Phone } from "lucide-react";
import { FaGoogle, FaTwitter } from "react-icons/fa";
import { SiReplit } from "react-icons/si";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [redirectHandled, setRedirectHandled] = useState(false);

  // Handle pending checkout completion and redirect if already logged in
  useEffect(() => {
    if (!isLoading && user && !redirectHandled) {
      const urlParams = new URLSearchParams(window.location.search);
      const checkoutParam = urlParams.get('checkout');
      const sessionToken = sessionStorage.getItem('checkoutSessionToken');
      
      console.log('Auth page - User authenticated, checking for checkout data');
      console.log('Auth page - Checkout URL param:', checkoutParam);
      console.log('Auth page - Session token:', sessionToken);
      
      const tokenToUse = checkoutParam || sessionToken;
      
      if (tokenToUse) {
        // Fetch checkout session from database
        fetch(`/api/checkout-sessions/${tokenToUse}`)
        .then(res => res.json())
        .then(sessionData => {
          if (sessionData && !sessionData.error) {
            console.log('Auth page - Found checkout session:', sessionData);
            
            // Update session with user ID
            fetch(`/api/checkout-sessions/${tokenToUse}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: user.id }),
            }).catch(console.error);
            
            // Add session stabilization flags
            sessionStorage.setItem('auth_completed', 'true');
            sessionStorage.setItem('auth_timestamp', Date.now().toString());
            sessionStorage.setItem('checkout_ready_for_payment', 'true');
            
            setRedirectHandled(true);
            
            // Build checkout URL with session token to go directly to payment step
            const params = new URLSearchParams({
              service: sessionData.serviceId,
              checkout: tokenToUse,
              step: 'payment' // Direct to payment step
            });
            
            console.log('🔄 AUTH: Redirecting to auto-payment with session:', tokenToUse);
            console.log('🔄 AUTH: Setting auto_submit_payment flag to true');
            
            // Set flag for auto-payment and redirect immediately
            sessionStorage.setItem('auto_submit_payment', 'true');
            
            console.log('🔄 AUTH: Redirecting to:', `/checkout?${params.toString()}`);
            console.log('🔄 AUTH: sessionStorage after setting flag:', {
              auto_submit_payment: sessionStorage.getItem('auto_submit_payment'),
              checkoutSessionToken: sessionStorage.getItem('checkoutSessionToken')
            });
            
            // Use window.location.href for immediate redirect to ensure it works
            window.location.href = `/checkout?${params.toString()}`;
          } else {
            console.log('Auth page - No valid checkout session found');
            sessionStorage.removeItem('checkoutSessionToken');
            setRedirectHandled(true);
            setLocation("/dashboard");
          }
        })
        .catch(error => {
          console.error('Auth page - Error fetching checkout session:', error);
          sessionStorage.removeItem('checkoutSessionToken');
          setRedirectHandled(true);
          setLocation("/dashboard");
        });
      } else {
        // No checkout session, redirect to dashboard
        setRedirectHandled(true);
        setLocation("/dashboard");
      }
    }
  }, [user, isLoading, redirectHandled, setLocation]);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      companyName: "",
      phone: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      console.log('🚀 [LOGIN MUTATION] Starting login request');
      console.log('🚀 [LOGIN MUTATION] Login data:', { email: data.email, password: '[HIDDEN]' });
      
      const response = await apiRequest("POST", "/api/auth/login", data);
      const result = await response.json();
      
      console.log('🚀 [LOGIN MUTATION] Login response received:', result);
      return result;
    },
    onSuccess: async (data) => {
      console.log('🚀 [LOGIN SUCCESS] Login successful, user data:', data.user);
      
      queryClient.setQueryData(["/api/auth/user"], data.user);
      toast({ title: "Welcome back!", description: "You've been successfully logged in." });
      
      console.log('🚀 [LOGIN SUCCESS] Waiting for session establishment...');
      // Wait a moment for session to be fully established
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check for checkout token in URL parameters first (priority)
      const urlParams = new URLSearchParams(window.location.search);
      const checkoutToken = urlParams.get('checkout');
      const serviceId = urlParams.get('service');
      const price = urlParams.get('price');
      const addons = urlParams.get('addons');
      
      console.log('🔄 AUTH: Post-login redirect check:', {
        checkoutToken,
        serviceId,
        price,
        addons
      });
      
      if (checkoutToken && serviceId) {
        // User came from checkout flow - redirect to payment step with auto-submit
        console.log('🔄 AUTH: Checkout token found, setting up auto-payment redirect');
        
        sessionStorage.setItem('auto_submit_payment', 'true');
        console.log('🔄 AUTH: Set auto_submit_payment flag to true');
        
        const addonsParam = addons ? `&addons=${addons}` : '';
        const redirectUrl = `/checkout?service=${serviceId}&price=${price}&step=payment&checkout=${checkoutToken}${addonsParam}`;
        
        console.log('🔄 AUTH: Redirecting to payment step:', redirectUrl);
        
        setTimeout(() => {
          setLocation(redirectUrl);
        }, 100);
        return;
      }
      
      // Fallback: Check for pending checkout
      const pendingCheckout = sessionStorage.getItem('pendingCheckout');
      if (pendingCheckout) {
        try {
          const checkoutData = JSON.parse(pendingCheckout);
          const redirectUrl = checkoutData.returnUrl || '/checkout';
          
          setTimeout(() => {
            setLocation(redirectUrl);
          }, 100);
        } catch (error) {
          setLocation("/dashboard");
        }
      } else {
        setLocation("/dashboard");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      const response = await apiRequest("POST", "/api/auth/register", data);
      return response.json();
    },
    onSuccess: async (data) => {
      console.log('🚀 [REGISTER SUCCESS] User created:', data.user.email);
      
      // Set the user data in React Query cache
      queryClient.setQueryData(["/api/auth/user"], data.user);
      toast({ title: "Welcome!", description: "Your account has been created successfully." });
      
      console.log('🚀 [REGISTER SUCCESS] Waiting for session establishment...');
      // Wait longer for session to be fully established with database
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check for checkout session token first
      const checkoutSessionToken = sessionStorage.getItem('checkoutSessionToken');
      console.log('🔄 AUTH: Checking for checkout session token:', checkoutSessionToken);
      
      if (checkoutSessionToken) {
        try {
          console.log('🔄 AUTH: Making authenticated request to fetch checkout session');
          
          // Fetch the checkout session data with credentials
          const response = await fetch(`/api/checkout-sessions/${checkoutSessionToken}`, {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          console.log('🔄 AUTH: Checkout session fetch response status:', response.status);
          
          if (response.ok) {
            const sessionData = await response.json();
            console.log('🔄 AUTH: Found checkout session:', sessionData);
            
            // Build redirect URL with all the service data
            const params = new URLSearchParams({
              service: sessionData.serviceId,
              price: sessionData.serviceData.price,
              step: 'payment',
              checkout: checkoutSessionToken
            });
            
            if (sessionData.selectedAddOns && sessionData.selectedAddOns.length > 0) {
              params.set('addons', JSON.stringify(sessionData.selectedAddOns));
            }
            
            // Set auto-submit flag for immediate payment
            sessionStorage.setItem('auto_submit_payment', 'true');
            console.log('🔄 AUTH: Set auto_submit_payment flag, redirecting to checkout with URL:', `/checkout?${params.toString()}`);
            
            // Use a short delay then redirect
            setTimeout(() => {
              window.location.href = `/checkout?${params.toString()}`;
            }, 100);
            return;
          } else {
            console.log('🔄 AUTH: Checkout session fetch failed:', response.status);
          }
        } catch (error) {
          console.error('🔄 AUTH: Error fetching checkout session:', error);
        }
        
        // Clear invalid token
        sessionStorage.removeItem('checkoutSessionToken');
      }
      
      // No checkout session, redirect to dashboard
      console.log('🔄 AUTH: No pending checkout, redirecting to dashboard');
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again with different information.",
        variant: "destructive",
      });
    },
  });

  const onLoginSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterForm) => {
    registerMutation.mutate(data);
  };

  const handleSocialLogin = (provider: string) => {
    window.location.href = `/api/auth/${provider}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            DiSO Webs
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isLogin ? "Welcome back to your digital home" : "Start your digital journey with us"}
          </p>
        </div>

        <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold text-center">
              {isLogin ? "Sign In" : "Create Account"}
            </CardTitle>
            <CardDescription className="text-center">
              {isLogin 
                ? "Enter your credentials to access your account" 
                : "Fill in your details to get started"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">

            {/* Login Form */}
            {isLogin ? (
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      className="pl-10 h-11"
                      {...loginForm.register("email")}
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-red-500">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="pl-10 pr-10 h-11"
                      {...loginForm.register("password")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-11 px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-red-500">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            ) : (
              /* Register Form */
              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="firstName"
                        placeholder="First name"
                        className="pl-10 h-11"
                        {...registerForm.register("firstName")}
                      />
                    </div>
                    {registerForm.formState.errors.firstName && (
                      <p className="text-sm text-red-500">{registerForm.formState.errors.firstName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Last name"
                      className="h-11"
                      {...registerForm.register("lastName")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      className="pl-10 h-11"
                      {...registerForm.register("email")}
                    />
                  </div>
                  {registerForm.formState.errors.email && (
                    <p className="text-sm text-red-500">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      className="pl-10 pr-10 h-11"
                      {...registerForm.register("password")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-11 px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-red-500">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      className="pl-10 h-11"
                      {...registerForm.register("confirmPassword")}
                    />
                  </div>
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-500">{registerForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name (Optional)</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="companyName"
                      placeholder="Your company name"
                      className="pl-10 h-11"
                      {...registerForm.register("companyName")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Your phone number"
                      className="pl-10 h-11"
                      {...registerForm.register("phone")}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            )}

            {/* Toggle between login/register */}
            <div className="text-center pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto font-semibold text-blue-600 hover:text-blue-700"
                  onClick={() => setIsLogin(!isLogin)}
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </Button>
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-11 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-950 border-gray-200 dark:border-gray-700"
                onClick={() => handleSocialLogin("google")}
              >
                <FaGoogle className="mr-2 h-4 w-4 text-red-500" />
                Continue with Google
              </Button>

              <Button
                variant="outline"
                className="w-full h-11 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950 border-gray-200 dark:border-gray-700"
                onClick={() => handleSocialLogin("twitter")}
              >
                <FaTwitter className="mr-2 h-4 w-4 text-blue-500" />
                Continue with Twitter
              </Button>

              <Button
                variant="outline"
                className="w-full h-11 text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-950 border-gray-200 dark:border-gray-700"
                onClick={() => handleSocialLogin("replit")}
              >
                <SiReplit className="mr-2 h-4 w-4 text-orange-500" />
                Continue with Replit
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}