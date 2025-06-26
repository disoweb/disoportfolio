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
import { CreditCard, ArrowLeft, User, Mail, Phone, Building2, FileText } from "lucide-react";
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
    console.error('Failed to store form data:', error);
  }
}

function getStoredFormData(key: string) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to retrieve form data:', error);
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

      // Enhanced authentication verification for post-auth users
      const authCompleted = sessionStorage.getItem('auth_completed');
      const authTimestamp = sessionStorage.getItem('auth_timestamp');
      
      // If user just completed auth, add extra verification time
      if (authCompleted === 'true' && authTimestamp) {
        const timeSinceAuth = Date.now() - parseInt(authTimestamp);
        if (timeSinceAuth < 5000) { // Within 5 seconds of auth completion
          // Wait for session to fully stabilize
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        // Clear the auth flags after use
        sessionStorage.removeItem('auth_completed');
        sessionStorage.removeItem('auth_timestamp');
      }
      
      // Multiple verification attempts for recently authenticated users
      let authVerified = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        const authCheck = await fetch("/api/auth/user", { 
          credentials: "include",
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (authCheck.ok) {
          const userData = await authCheck.json();
          if (userData && userData.id) {
            authVerified = true;
            break;
          }
        }
        
        // Progressive delay between attempts
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        }
      }
      
      if (!authVerified) {
        throw new Error("Authentication required - please log in again");
      }

      try {
        console.log('💰 CHECKOUT-FORM: Making API request to /api/orders with data:', orderData);
        const response = await apiRequest("POST", "/api/orders", orderData);
        const responseData = await response.json();
        console.log('💰 CHECKOUT-FORM: API response received:', responseData);
        return responseData;
      } catch (error) {
        console.error('❌ ORDER-ERROR: API request failed:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to create order');
      }
    },
    onSuccess: (data) => {
      console.log('🎉 ORDER-SUCCESS: Payment order created successfully');
      console.log('🎉 ORDER-SUCCESS: Response data:', data);
      
      if (data && data.paymentUrl) {
        console.log('🎉 ORDER-SUCCESS: Payment URL received:', data.paymentUrl);
        
        // Clear stored form data and pending checkout on successful order
        localStorage.removeItem('checkout_contact_data');
        sessionStorage.removeItem('pendingCheckout');
        sessionStorage.removeItem('checkoutSessionToken');
        sessionStorage.removeItem('auto_submit_payment');
        
        // Clear payment loader state
        sessionStorage.removeItem('payment_in_progress');
        
        console.log('🎉 ORDER-SUCCESS: Cleaned up session storage');
        console.log('🎉 ORDER-SUCCESS: Redirecting to Paystack...');
        
        // Immediate redirect to Paystack
        window.location.href = data.paymentUrl;
        
        onSuccess();
      } else {
        console.error('❌ ORDER-ERROR: No payment URL in response');
        console.error('❌ ORDER-ERROR: Full response:', data);
      }
    },
    onError: (error) => {
      // Hide loader on error
      setShowPaymentLoader(false);
      
      if (error.message.includes("Authentication")) {
        toast({
          title: "Authentication Error",
          description: "Please log in again to complete your order.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 1500);
      } else {
        toast({
          title: "Order failed",
          description: error.message || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Handle pending checkout completion after authentication
  useEffect(() => {
    // Prevent auto-submit if already processing
    if (user && !orderMutation.isPending) {
      const pendingCheckout = sessionStorage.getItem('pendingCheckout');
      
      if (pendingCheckout) {
        try {
          const checkoutData = JSON.parse(pendingCheckout);
          
          // Remove pending checkout to prevent duplicate processing
          sessionStorage.removeItem('pendingCheckout');
          
          // Restore the checkout state for manual submission
          if (checkoutData.contactData) {
            setContactData(checkoutData.contactData);
            setCurrentStep(2); // Go directly to payment step
            
            // Auto-populate email from authenticated user if missing
            const updatedContactData = { ...checkoutData.contactData };
            if (!updatedContactData.email && user.email) {
              updatedContactData.email = user.email;
              setContactData(updatedContactData);
            }
            
            // Show success message that form data was restored
            toast({
              title: "Welcome back!",
              description: "Your checkout information has been restored. Please review and submit your payment.",
              variant: "default",
            });
          }
        } catch (error) {
          console.error('Error processing pending checkout:', error);
          sessionStorage.removeItem('pendingCheckout');
          setShowPaymentLoader(false);
          sessionStorage.removeItem('payment_in_progress');
        }
      }
    }
  }, [user, orderMutation.isPending, setLocation, toast]);

  // Check for post-authentication auto-payment
  useEffect(() => {
    const autoSubmitPayment = sessionStorage.getItem('auto_submit_payment');
    console.log('💰 CHECKOUT-FORM: Auto-payment useEffect triggered');
    console.log('💰 CHECKOUT-FORM: Conditions check:', {
      autoSubmitPayment,
      isPostAuthRedirect,
      hasSessionData: !!sessionData,
      hasContactData: !!sessionData?.contactData,
      hasUser: !!user,
      stepParam: new URLSearchParams(window.location.search).get('step'),
      orderMutationExists: !!orderMutation,
      userDetails: user ? { id: user.id, email: user.email } : null
    });
    
    // Check if we should auto-submit payment (either flag is set OR we have all required data for authenticated user)
    const shouldAutoSubmit = autoSubmitPayment === 'true' || 
      (isPostAuthRedirect && sessionData?.contactData && user && new URLSearchParams(window.location.search).get('step') === 'payment');
    
    if (shouldAutoSubmit) {
      console.log('💰 CHECKOUT-FORM: Should auto-submit payment - conditions met');
      
      if (!sessionData?.contactData) {
        console.log('❌ CHECKOUT-FORM: No contact data in sessionData');
        return;
      }
      
      if (!user) {
        console.log('❌ CHECKOUT-FORM: No user authenticated');
        return;
      }
      
      console.log('✅ CHECKOUT-FORM: All conditions met - Auto-submitting payment');
      console.log('💰 CHECKOUT-FORM: Contact data:', sessionData.contactData);
      console.log('💰 CHECKOUT-FORM: Session data:', {
        serviceId: sessionData.serviceId,
        totalPrice: sessionData.totalPrice,
        selectedAddOns: sessionData.selectedAddOns
      });
      
      setContactData(sessionData.contactData);
      setShowPaymentLoader(true);
      sessionStorage.setItem('payment_in_progress', 'true');
      sessionStorage.removeItem('auto_submit_payment');
      
      // Auto-submit payment directly without showing the form
      const paymentData = {
        paymentMethod: "paystack" as const,
        timeline: "standard",
        overrideSelectedAddOns: sessionData.selectedAddOns,
        overrideTotalAmount: sessionData.totalPrice
      };
      
      console.log('💰 CHECKOUT-FORM: Preparing payment submission with data:', paymentData);
      
      setTimeout(() => {
        console.log('💰 CHECKOUT-FORM: Calling orderMutation.mutate');
        orderMutation.mutate(paymentData);
      }, 1000);
    } else {
      console.log('💰 CHECKOUT-FORM: auto_submit_payment flag is not true:', autoSubmitPayment);
    }
  }, [isPostAuthRedirect, sessionData, user, orderMutation]);

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
        console.error('Error creating checkout session:', error);
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
                <Button type="submit" className="flex-1">
                  Pay ₦{totalPrice.toLocaleString()}
                </Button>
              </div>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}