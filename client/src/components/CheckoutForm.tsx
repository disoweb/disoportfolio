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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { CreditCard, ArrowLeft, User, Mail, Phone, Building2, FileText, CheckCircle, Clock } from "lucide-react";
import PaymentLoader from "@/components/PaymentLoader";

const contactSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  company: z.string().optional(),
  projectDescription: z.string().min(10, "Please provide a detailed project description"),
});

const paymentSchema = z.object({
  paymentMethod: z.literal("paystack"),
  timeline: z.string().min(1, "Please select a timeline"),
});

type ContactForm = z.infer<typeof contactSchema>;
type PaymentForm = z.infer<typeof paymentSchema>;

// Helper functions for form data persistence
function storeFormData(key: string, data: any) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    // Silently handle storage errors in production
  }
}

function getStoredFormData(key: string) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    // Return null for any storage retrieval errors
    return null;
  }
}

interface CheckoutFormProps {
  service: {
    id: string;
    name: string;
    price: string;
    description: string;
  };
  totalPrice: number;
  selectedAddOns: string[];
  sessionData?: any;
  isPostAuthRedirect?: boolean;
  onSuccess: () => void;
}

export default function CheckoutForm({ service, totalPrice, selectedAddOns, sessionData, isPostAuthRedirect, onSuccess }: CheckoutFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [contactData, setContactData] = useState<ContactForm | null>(null);
  const [showPaymentLoader, setShowPaymentLoader] = useState(false);
  const [showStreamlinedConfirmation, setShowStreamlinedConfirmation] = useState(false);
  const [paymentCooldown, setPaymentCooldown] = useState(0);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // Step 1: Contact Form with persistent data
  const storedContactData = getStoredFormData('checkout_contact_data');
  const contactForm = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: storedContactData || {
      fullName: "",
      email: user?.email || "",
      phone: "",
      company: "",
      projectDescription: "",
    },
  });

  // Step 2: Payment Form
  const paymentForm = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: "paystack",
    },
  });

  // Auto-save form data as user types
  const watchedValues = contactForm.watch();
  useEffect(() => {
    const timer = setTimeout(() => {
      const formData = contactForm.getValues();
      if (Object.values(formData).some(value => value !== "")) {
        storeFormData('checkout_contact_data', formData);
      }
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(timer);
  }, [watchedValues, contactForm]);

  // Auto-populate email when user becomes authenticated
  useEffect(() => {
    if (user?.email && !contactForm.getValues().email) {
      contactForm.setValue('email', user.email);
    }
  }, [user, contactForm]);

  const orderMutation = useMutation({
    mutationFn: async (data: PaymentForm & { 
      overrideSelectedAddOns?: string[]; 
      overrideTotalAmount?: number 
    }) => {
      if (!contactData) throw new Error("Contact data is missing");
      
      const orderData = {
        serviceId: service.id,
        contactInfo: {
          fullName: contactData.fullName,
          email: contactData.email,
          phone: contactData.phone,
          company: contactData.company,
        },
        projectDetails: {
          description: contactData.projectDescription,
        },
        selectedAddOns: data.overrideSelectedAddOns || selectedAddOns,
        totalAmount: data.overrideTotalAmount || totalPrice,
      };

      // Enhanced authentication verification for all users
      const authCompleted = sessionStorage.getItem('auth_completed');
      const authTimestamp = sessionStorage.getItem('auth_timestamp');
      
      // If user just completed auth, add extra verification time
      if (authCompleted === 'true' && authTimestamp) {
        const timeSinceAuth = Date.now() - parseInt(authTimestamp);
        if (timeSinceAuth < 10000) { // Within 10 seconds of auth completion
          // Wait for session to fully stabilize
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
        // Clear the auth flags after use
        sessionStorage.removeItem('auth_completed');
        sessionStorage.removeItem('auth_timestamp');
      }
      
      // Multiple verification attempts for all users
      let authVerified = false;
      let lastError = null;
      
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const authCheck = await fetch("/api/auth/user", { 
            credentials: "include",
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });
          
          if (authCheck.ok) {
            const userData = await authCheck.json();
            if (userData && userData.id) {
              console.log(`🔐 AUTH CHECK: Authentication verified on attempt ${attempt + 1}`);
              authVerified = true;
              break;
            }
          } else {
            lastError = `HTTP ${authCheck.status}: ${authCheck.statusText}`;
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Network error';
          console.log(`🔐 AUTH CHECK: Attempt ${attempt + 1} failed:`, lastError);
        }
        
        // Progressive delay between attempts
        if (attempt < 4) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
      
      if (!authVerified) {
        console.error('🔐 AUTH CHECK: All authentication attempts failed. Last error:', lastError);
        throw new Error("Authentication required - session may have expired. Please log in again.");
      }

      try {
        const response = await apiRequest("POST", "/api/orders", orderData);
        const responseData = await response.json();
        return responseData;
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Failed to create order');
      }
    },
    onSuccess: (data) => {
      if (data && data.paymentUrl) {
        // Clear stored form data and pending checkout on successful order
        localStorage.removeItem('checkout_contact_data');
        sessionStorage.removeItem('pendingCheckout');
        sessionStorage.removeItem('checkoutSessionToken');
        sessionStorage.removeItem('auto_submit_payment');
        
        // Clear payment loader state
        sessionStorage.removeItem('payment_in_progress');
        
        // Immediate redirect to Paystack
        window.location.href = data.paymentUrl;
        onSuccess();
      } else {
        toast({
          title: "Payment Error",
          description: "Failed to initialize payment. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      // Hide loader on error
      setShowPaymentLoader(false);
      
      if (error.message.includes("Authentication") || error.message.includes("session")) {
        // Store current form data before redirect
        if (contactData) {
          storeFormData('checkout_contact_data', contactData);
        }
        
        // Create checkout session for recovery
        const createSessionData = {
          serviceId: service.id,
          serviceData: {
            id: service.id,
            name: service.name,
            price: service.price,
            description: service.description
          },
          contactData: contactData || getStoredFormData('checkout_contact_data'),
          selectedAddOns,
          totalPrice,
          userId: null
        };

        fetch("/api/checkout-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createSessionData),
        })
        .then(res => res.json())
        .then(result => {
          if (result.sessionToken) {
            sessionStorage.setItem('checkoutSessionToken', result.sessionToken);
          }
        })
        .catch(() => {
          // Silent failure - user can try again
        });
        
        toast({
          title: "Session Expired",
          description: "Your session has expired. Redirecting to login...",
          variant: "destructive",
        });
        
        setTimeout(() => {
          const sessionToken = sessionStorage.getItem('checkoutSessionToken');
          const redirectUrl = sessionToken ? `/auth?checkout=${sessionToken}` : "/auth";
          window.location.href = redirectUrl;
        }, 2000);
      } else {
        toast({
          title: "Order failed",
          description: error.message || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Streamlined auto-payment with immediate submission after auth
  useEffect(() => {
    if (!user || orderMutation.isPending) {
      return;
    }

    // Check if user is coming back from a cancelled payment
    const urlParams = new URLSearchParams(window.location.search);
    const cancelled = urlParams.get('cancelled');
    const paymentCancelled = sessionStorage.getItem('payment_cancelled');
    
    if (cancelled === 'true' || paymentCancelled === 'true') {
      // Clear the cancellation flags
      sessionStorage.removeItem('payment_cancelled');
      sessionStorage.removeItem('auto_submit_payment');
      
      // Remove cancelled param from URL
      urlParams.delete('cancelled');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
      
      // Don't auto-submit if payment was cancelled
      return;
    }

    const autoSubmitPayment = sessionStorage.getItem('auto_submit_payment');
    const stepParam = urlParams.get('step');
    
    // Check if we've already attempted payment recently
    const lastPaymentAttempt = sessionStorage.getItem('last_payment_attempt');
    const now = Date.now();
    if (lastPaymentAttempt) {
      const timeSinceLastAttempt = now - parseInt(lastPaymentAttempt);
      // If less than 30 seconds since last attempt, don't auto-submit
      if (timeSinceLastAttempt < 30000) {
        return;
      }
    }

    // Check multiple conditions for auto-submission
    const shouldAutoSubmit = autoSubmitPayment === 'true' || 
      (stepParam === 'payment' && sessionData?.contactData) ||
      (stepParam === 'payment' && getStoredFormData('checkout_contact_data'));
    
    // Use sessionData if available, otherwise fall back to stored data
    const contactInfo = sessionData?.contactData || getStoredFormData('checkout_contact_data');
    
    if (shouldAutoSubmit && contactInfo) {
      // Clear the flag to prevent replay
      sessionStorage.removeItem('auto_submit_payment');
      
      // Mark payment attempt
      sessionStorage.setItem('last_payment_attempt', now.toString());
      
      // Set contact data for UI display
      setContactData(contactInfo);
      
      // Show streamlined confirmation UI
      setShowStreamlinedConfirmation(true);
      setCurrentStep(2);
      
      // Auto-proceed to payment after user sees confirmation
      setTimeout(() => {
        setShowPaymentLoader(true);
        orderMutation.mutate({
          paymentMethod: 'paystack',
          timeline: 'standard',
          overrideSelectedAddOns: sessionData?.selectedAddOns || selectedAddOns,
          overrideTotalAmount: sessionData?.totalPrice || totalPrice
        });
      }, 2500); // Give user 2.5s to see the confirmation
    } else if (stepParam === 'payment' && contactInfo && lastPaymentAttempt) {
      // User returned from cancelled payment - show form but don't auto-submit
      setContactData(contactInfo);
      setShowStreamlinedConfirmation(true);
      setCurrentStep(2);
      
      // Calculate remaining cooldown
      const timeSinceLastAttempt = now - parseInt(lastPaymentAttempt);
      const remainingCooldown = Math.max(0, 30000 - timeSinceLastAttempt);
      if (remainingCooldown > 0) {
        setPaymentCooldown(Math.ceil(remainingCooldown / 1000));
      }
      
      // Show a message that they need to manually proceed
      toast({
        title: "Payment Cancelled",
        description: "Please click 'Proceed to Payment' when you're ready to try again.",
      });
    }
  }, [user, sessionData, orderMutation, selectedAddOns, totalPrice]);

  // Countdown timer for payment cooldown
  useEffect(() => {
    if (paymentCooldown > 0) {
      const timer = setTimeout(() => {
        setPaymentCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [paymentCooldown]);



  const onContactSubmit = (data: ContactForm) => {
    // Store contact data persistently
    storeFormData('checkout_contact_data', data);
    setContactData(data);
    setCurrentStep(2);
  };

  const onPaymentSubmit = (data: PaymentForm) => {
    if (!contactData) return;
    
    // Check if user is authenticated before proceeding with payment
    if (!user) {
      // Create checkout session in database
      const createSessionData = {
        serviceId: service.id,
        serviceData: {
          id: service.id,
          name: service.name,
          price: service.price,
          description: service.description
        },
        contactData,
        selectedAddOns,
        totalPrice,
        userId: null
      };

      // Create database session
      fetch("/api/checkout-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createSessionData),
      })
      .then(res => res.json())
      .then(result => {
        if (result.sessionToken) {
          // Store session token for auth redirect
          sessionStorage.setItem('checkoutSessionToken', result.sessionToken);
          
          // Clear any existing auth flags
          sessionStorage.removeItem('auth_completed');
          sessionStorage.removeItem('auth_timestamp');
          
          // Redirect to auth with session token
          setLocation(`/auth?checkout=${result.sessionToken}`);
        } else {
          toast({
            title: "Error",
            description: "Failed to create checkout session. Please try again.",
            variant: "destructive",
          });
        }
      })
      .catch(error => {
        toast({
          title: "Error", 
          description: "Failed to create checkout session. Please try again.",
          variant: "destructive",
        });
      });
      
      return;
    }
    
    // User is authenticated, proceed with payment
    setShowPaymentLoader(true);
    
    const combinedData = { 
      ...contactData, 
      ...data 
    };
    
    // Submit the order immediately - the loader will persist until Paystack redirect
    orderMutation.mutate(combinedData);
  };

  // Show payment loader when processing payment - this should take priority over everything
  if (showPaymentLoader || orderMutation.isPending) {
    return (
      <PaymentLoader
        serviceName={service.name}
        amount={totalPrice}
        onComplete={() => {
          // This will be called when the loader animation completes
          // The actual redirect happens in the timeout above
        }}
      />
    );
  }

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Complete Your Order
        </CardTitle>
        <CardDescription>
          {currentStep === 1 
            ? "Please provide your contact information to get started" 
            : "Review your details and proceed with payment"
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {currentStep === 1 ? (
          <form onSubmit={contactForm.handleSubmit(onContactSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="fullName"
                  {...contactForm.register("fullName")}
                  className="pl-10"
                  placeholder="Your full name"
                />
              </div>
              {contactForm.formState.errors.fullName && (
                <p className="text-sm text-red-500">{contactForm.formState.errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  {...contactForm.register("email")}
                  className="pl-10"
                  placeholder="your@email.com"
                />
              </div>
              {contactForm.formState.errors.email && (
                <p className="text-sm text-red-500">{contactForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  {...contactForm.register("phone")}
                  className="pl-10"
                  placeholder="+234 123 456 7890"
                />
              </div>
              {contactForm.formState.errors.phone && (
                <p className="text-sm text-red-500">{contactForm.formState.errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company (Optional)</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="company"
                  {...contactForm.register("company")}
                  className="pl-10"
                  placeholder="Your company name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectDescription">Project Description *</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Textarea
                  id="projectDescription"
                  {...contactForm.register("projectDescription")}
                  className="pl-10 min-h-[100px]"
                  placeholder="Tell us about your project requirements, goals, and any specific features you need..."
                />
              </div>
              {contactForm.formState.errors.projectDescription && (
                <p className="text-sm text-red-500">{contactForm.formState.errors.projectDescription.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full">
              Continue to Payment
            </Button>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Service:</span>
                  <span>{service.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Contact:</span>
                  <span>{contactData?.fullName} ({contactData?.email})</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>₦{totalPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-6">
              <div className="space-y-4">
                <Label>Project Timeline</Label>
                <Select onValueChange={(value) => paymentForm.setValue("timeline", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select expected timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-2 weeks">1-2 weeks (Rush delivery)</SelectItem>
                    <SelectItem value="2-4 weeks">2-4 weeks (Standard)</SelectItem>
                    <SelectItem value="4-6 weeks">4-6 weeks (Extended)</SelectItem>
                    <SelectItem value="6+ weeks">6+ weeks (Complex project)</SelectItem>
                  </SelectContent>
                </Select>
                {paymentForm.formState.errors.timeline && (
                  <p className="text-sm text-red-500">{paymentForm.formState.errors.timeline.message}</p>
                )}
              </div>

              <div className="space-y-4">
                <Label>Payment Method</Label>
                <RadioGroup value="paystack" className="grid grid-cols-1 gap-4">
                  <div className="flex items-center space-x-2 border rounded-lg p-4">
                    <RadioGroupItem value="paystack" id="paystack" />
                    <Label htmlFor="paystack" className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Paystack</div>
                          <div className="text-sm text-gray-500">Secure payment with cards, bank transfer, USSD</div>
                        </div>
                        <div className="text-sm text-green-600 font-medium">Recommended</div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={paymentCooldown > 0}
                >
                  {paymentCooldown > 0 ? (
                    <span className="flex items-center justify-center gap-2">
                      <Clock className="h-4 w-4" />
                      Wait {paymentCooldown}s
                    </span>
                  ) : (
                    `Pay ₦${totalPrice.toLocaleString()}`
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </CardContent>
    </Card>

      {/* Streamlined Payment Confirmation for Post-Auth Users */}
      {showStreamlinedConfirmation && contactData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md mx-auto bg-white shadow-2xl">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back!</h2>
                <p className="text-gray-600">Your information is saved. Proceeding to payment...</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service:</span>
                    <span className="font-medium">{service.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium">{contactData.fullName}</span>
                  </div>
                  {selectedAddOns.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Add-ons:</span>
                      <span className="font-medium">{selectedAddOns.length} selected</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="font-semibold text-gray-900">Total:</span>
                    <span className="font-bold text-green-600">₦{totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <span className="text-sm font-medium">Redirecting to secure payment...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}