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
import { useOAuthProviders } from "@/hooks/useOAuthProviders";
import { Eye, EyeOff, Mail, Lock, User, Building2, Phone, Users } from "lucide-react";
import { FaGoogle, FaTwitter, FaFacebook } from "react-icons/fa";
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
  referralCode: z.string().optional(),
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
  const { providers, hasAnyProvider } = useOAuthProviders();

  // Simple redirect for already authenticated users
  useEffect(() => {
    if (!isLoading && user) {
      // User is already authenticated, redirect to dashboard
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Pre-populate registration form with checkout data if available
  const getCheckoutContactData = async () => {
    const checkoutToken = sessionStorage.getItem('checkoutSessionToken');
    if (!checkoutToken) return {};
    
    try {
      // First try to fetch from database session
      const response = await fetch(`/api/checkout-sessions/${checkoutToken}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const sessionData = await response.json();
        if (sessionData.contactData) {
          const nameParts = sessionData.contactData.fullName?.split(' ') || [];
          return {
            email: sessionData.contactData.email || "",
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(' ') || "",
            companyName: sessionData.contactData.company || "",
            phone: sessionData.contactData.phone || "",
          };
        }
      }
    } catch (error) {
      console.log('Error fetching checkout session:', error);
    }
    
    // Fallback to session storage
    const storedData = sessionStorage.getItem('checkout_contact_data');
    if (storedData) {
      try {
        const contactData = JSON.parse(storedData);
        const nameParts = contactData.fullName?.split(' ') || [];
        return {
          email: contactData.email || "",
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(' ') || "",
          companyName: contactData.company || "",
          phone: contactData.phone || "",
        };
      } catch (error) {
        console.log('Error parsing checkout contact data:', error);
      }
    }
    return {};
  };

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
      referralCode: "",
    },
  });

  // Load checkout contact data and populate form when component mounts
  useEffect(() => {
    const loadCheckoutData = async () => {
      const checkoutData = await getCheckoutContactData();
      // Get referral code from URL
      const urlParams = new URLSearchParams(window.location.search);
      const referralCodeFromUrl = urlParams.get('ref') || "";
      
      if (Object.keys(checkoutData).length > 0) {
        registerForm.reset({
          email: checkoutData.email || "",
          password: "",
          confirmPassword: "",
          firstName: checkoutData.firstName || "",
          lastName: checkoutData.lastName || "",
          companyName: checkoutData.companyName || "",
          phone: checkoutData.phone || "",
          referralCode: referralCodeFromUrl,
        });
      } else {
        // Just set the referral code if no checkout data
        registerForm.setValue("referralCode", referralCodeFromUrl);
      }
    };
    
    if (!isLogin) {
      loadCheckoutData();
    }
  }, [isLogin, registerForm]);

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(["/api/auth/user"], data.user);
      toast({ title: "Welcome back!", description: "You've been successfully logged in." });
      
      // Simple redirect - check if user came from checkout
      const urlParams = new URLSearchParams(window.location.search);
      const checkoutToken = urlParams.get('checkout');
      
      if (checkoutToken) {
        // User came from checkout - redirect to payment step
        sessionStorage.setItem('auto_submit_payment', 'true');
        setLocation(`/checkout?step=payment&checkout=${checkoutToken}`);
      } else {
        // Regular login - go to dashboard
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
      // Check for referral code in URL or form
      const urlParams = new URLSearchParams(window.location.search);
      const referralCodeFromUrl = urlParams.get('ref');
      
      const registrationData = {
        ...data,
        referralCode: data.referralCode || referralCodeFromUrl || undefined
      };
      
      const response = await apiRequest("POST", "/api/auth/register", registrationData);
      return response.json();
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(["/api/auth/user"], data.user);
      toast({ title: "Welcome!", description: "Your account has been created successfully." });
      
      // Simple redirect logic - same as login
      const urlParams = new URLSearchParams(window.location.search);
      const checkoutToken = urlParams.get('checkout');
      
      if (checkoutToken) {
        sessionStorage.setItem('auto_submit_payment', 'true');
        setLocation(`/checkout?step=payment&checkout=${checkoutToken}`);
      } else {
        setLocation("/dashboard");
      }
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
          <h1 
            className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setLocation("/")}
          >
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

                <div className="space-y-2">
                  <Label htmlFor="referralCode">Referral Code (Optional)</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="referralCode"
                      placeholder="Enter referral code"
                      className="pl-10 h-11"
                      {...registerForm.register("referralCode")}
                    />
                  </div>
                  <p className="text-xs text-gray-500">If someone referred you, enter their code here</p>
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
            <div className="text-center pt-4 space-y-2">
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
              
              {isLogin && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Forgot your password?{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto font-semibold text-blue-600 hover:text-blue-700"
                    onClick={() => setLocation("/forgot-password")}
                  >
                    Reset it here
                  </Button>
                </p>
              )}
            </div>

            {hasAnyProvider && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">Or continue with</span>
                </div>
              </div>
            )}

            {/* Social Login Buttons - Dynamic Grid */}
            {hasAnyProvider && (
              <div className={`grid gap-3 ${
                Object.values(providers).filter(Boolean).length === 1 
                  ? 'grid-cols-1' 
                  : 'grid-cols-2'
              }`}>
                {providers.google && (
                  <Button
                    variant="outline"
                    className="h-12 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-950 border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-1 text-xs font-medium"
                    onClick={() => handleSocialLogin("google")}
                  >
                    <FaGoogle className="h-5 w-5 text-red-500" />
                    Google
                  </Button>
                )}

                {providers.facebook && (
                  <Button
                    variant="outline"
                    className="h-12 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950 border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-1 text-xs font-medium"
                    onClick={() => handleSocialLogin("facebook")}
                  >
                    <FaFacebook className="h-5 w-5 text-blue-600" />
                    Facebook
                  </Button>
                )}

                {providers.twitter && (
                  <Button
                    variant="outline"
                    className="h-12 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950 border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-1 text-xs font-medium"
                    onClick={() => handleSocialLogin("twitter")}
                  >
                    <FaTwitter className="h-5 w-5 text-blue-500" />
                    Twitter
                  </Button>
                )}

                {providers.replit && (
                  <Button
                    variant="outline"
                    className="h-12 text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-950 border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-1 text-xs font-medium"
                    onClick={() => handleSocialLogin("replit")}
                  >
                    <SiReplit className="h-5 w-5 text-orange-500" />
                    Replit
                  </Button>
                )}
              </div>
            )}
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