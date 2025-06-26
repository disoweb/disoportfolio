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

interface CheckoutFormProps {
  service: {
    id: string;
    name: string;
    price: string;
    description: string;
  };
  totalPrice: number;
  selectedAddOns: string[];
  onSuccess: () => void;
}

export default function CheckoutForm({ service, totalPrice, selectedAddOns, onSuccess }: CheckoutFormProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [contactData, setContactData] = useState<ContactForm | null>(null);
  const [showPaymentLoader, setShowPaymentLoader] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Utility functions for persistent storage
  const getStoredFormData = (key: string) => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const { data, timestamp } = JSON.parse(stored);
        const twentyFourHours = 24 * 60 * 60 * 1000;
        if (Date.now() - timestamp < twentyFourHours) {
          return data;
        } else {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      localStorage.removeItem(key);
    }
    return null;
  };

  const storeFormData = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      // Ignore storage errors
    }
  };

  // Auto-populate user email if authenticated
  const contactForm = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      fullName: "",
      email: user?.email || "",
      phone: "",
      company: "",
      projectDescription: "",
    },
  });

  const paymentForm = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: "paystack",
      timeline: "",
    },
  });

  // Restore contact data on component mount
  useEffect(() => {
    const storedContactData = getStoredFormData('checkout_contact_data');
    
    if (storedContactData && !contactData) {
      contactForm.reset(storedContactData);
      setContactData(storedContactData);
      setCurrentStep(2);
    }
  }, [contactForm, contactData]);

  const orderMutation = useMutation({
    mutationFn: async (data: PaymentForm & { 
      overrideSelectedAddOns?: string[], 
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

      // Verify authentication before submitting order
      const authCheck = await fetch("/api/auth/user", { 
        credentials: "include",
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!authCheck.ok || authCheck.status === 401) {
        throw new Error("Authentication required - please log in again");
      }
      
      const userData = await authCheck.json();
      if (!userData || !userData.id) {
        throw new Error("Authentication required - please log in again");
      }
      
      try {
        const response = await apiRequest("POST", "/api/orders", orderData);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create order');
        }
        return await response.json();
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Failed to create order');
      }
    },
    onSuccess: (data) => {
      if (data && data.paymentUrl) {
        // Clear stored form data and pending checkout on successful order
        localStorage.removeItem('checkout_contact_data');
        sessionStorage.removeItem('pendingCheckout');
        
        // Show payment loader and redirect to Paystack
        setShowPaymentLoader(true);
        sessionStorage.setItem('payment_in_progress', 'true');
        
        // Immediate redirect to Paystack
        setTimeout(() => {
          window.location.href = data.paymentUrl;
        }, 100);
      } else {
        toast({
          title: "Order placed successfully!",
          description: "We'll contact you soon to discuss your project.",
        });
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
          
          // Restore the checkout state and addon information
          if (checkoutData.contactData) {
            setContactData(checkoutData.contactData);
            setCurrentStep(2);
            
            // Restore addon information if it exists

            
            // Show loader immediately before any async operations

            setShowPaymentLoader(true);
            
            // Set global payment flag to prevent dashboard flash
            sessionStorage.setItem('payment_in_progress', 'true');
            
            // Force app to re-render with payment loader immediately
            window.dispatchEvent(new Event('storage'));
            
            // Auto-submit the payment after ensuring user is properly authenticated
            setTimeout(() => {

              if (!user || !user.email) {
                toast({
                  title: "Authentication Error",
                  description: "Please log in again to complete your order.",
                  variant: "destructive",
                });
                return;
              }
              
              // Check if mutation is already running
              if (orderMutation.isPending) {
                return;
              }
              
              // Ensure email is populated from authenticated user if missing
              const contactDataToUse = { ...checkoutData.contactData };
              if (!contactDataToUse.email && user.email) {
                contactDataToUse.email = user.email;
              }
              
              // Validate that we have all required fields
              if (!contactDataToUse.fullName || !contactDataToUse.email || !contactDataToUse.projectDescription) {
                toast({
                  title: "Incomplete Information",
                  description: "Please fill out all required contact information.",
                  variant: "destructive",
                });
                setCurrentStep(1);
                return;
              }
              
              // PaymentLoader is already showing, just log for debugging
              
              // Robust session verification and submission for pending checkout
              const verifySessionAndSubmit = async () => {
                try {
                  // Multiple authentication checks with progressive delays
                  let authenticationValid = false;
                  const maxAttempts = 5;
                  
                  for (let attempt = 0; attempt < maxAttempts; attempt++) {
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
                        authenticationValid = true;
                        break;
                      }
                    }
                    
                    // Progressive backoff: 300ms, 600ms, 1200ms, 2400ms
                    if (attempt < maxAttempts - 1) {
                      const delay = 300 * Math.pow(2, attempt);
                      await new Promise(resolve => setTimeout(resolve, delay));
                    }
                  }
                  
                  if (!authenticationValid) {
                    throw new Error("Session verification failed after multiple attempts");
                  }
                  
                  // Prepare and submit the payment data
                  const combinedData = { 
                    ...contactDataToUse, 
                    paymentMethod: "paystack" as const,
                    timeline: checkoutData.paymentData?.timeline || "2-4 weeks",
                    overrideSelectedAddOns: checkoutData.selectedAddOns || [],
                    overrideTotalAmount: checkoutData.totalPrice || totalPrice
                  };
                  
                  orderMutation.mutate(combinedData);
                } catch (error) {
                  console.error('Pending checkout session verification failed:', error);
                  setShowPaymentLoader(false);
                  sessionStorage.removeItem('payment_in_progress');
                  toast({
                    title: "Authentication Error",
                    description: "Please log in again to complete your order.",
                    variant: "destructive",
                  });
                  setLocation('/auth');
                }
              };
              
              // Delay to allow session to stabilize, then verify and submit
              setTimeout(verifySessionAndSubmit, 2000);
            }, 100); // Minimal delay to ensure PaymentLoader renders
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

  const onContactSubmit = (data: ContactForm) => {
    // Store contact data persistently
    storeFormData('checkout_contact_data', data);
    setContactData(data);
    setCurrentStep(2);
  };

  const onPaymentSubmit = (data: PaymentForm) => {
    if (!contactData) return;
    
    // Always proceed with payment if we're at step 2 - user must be authenticated to reach this step
    // The authentication check happens at component mount and in useEffect
    
    // Show loader immediately and proceed with payment
    setShowPaymentLoader(true);
    
    // Prepare the final data
    const finalContactData = { ...contactData };
    if (!finalContactData.email && user?.email) {
      finalContactData.email = user.email;
    }
    
    const combinedData = { 
      ...finalContactData, 
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
          Secure Checkout
        </CardTitle>
        <CardDescription>
          Complete your order for {service.name}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            1
          </div>
          <div className={`h-0.5 w-16 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            2
          </div>
        </div>

        {/* Step 1: Contact Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* Order Summary - Step 1 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3">Order Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>{service.name}</span>
                  <span>₦{totalPrice.toLocaleString()}</span>
                </div>
                {selectedAddOns.length > 0 && (
                  <>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p className="font-medium">Add-ons:</p>
                      {selectedAddOns.map((addonName, index) => (
                        <div key={index} className="flex justify-between pl-2">
                          <span>• {addonName}</span>
                          <span>Included</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {selectedAddOns.length === 0 && (
                  <div className="text-sm text-gray-500">
                    No add-ons selected
                  </div>
                )}
                <div className="border-t pt-2 font-semibold">
                  <div className="flex justify-between">
                    <span>Total</span>
                    <span>₦{totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={contactForm.handleSubmit(onContactSubmit)} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Contact Information</h3>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectDescription">Project Description *</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Textarea
                  id="projectDescription"
                  {...contactForm.register("projectDescription")}
                  className="pl-10 min-h-[100px]"
                  placeholder="Describe your project requirements, goals, and any specific features you need..."
                />
              </div>
              {contactForm.formState.errors.projectDescription && (
                <p className="text-sm text-red-500">{contactForm.formState.errors.projectDescription.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full">
              Continue to Payment
              <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
            </Button>
          </form>
        </div>
        )}

        {/* Step 2: Payment Information */}
        {currentStep === 2 && contactData && (
          <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Payment Details</h3>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3">Order Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>{service.name}</span>
                  <span>₦{totalPrice.toLocaleString()}</span>
                </div>
                {selectedAddOns.length > 0 && (
                  <div className="text-sm text-gray-600">
                    <p>Add-ons: {selectedAddOns.join(", ")}</p>
                  </div>
                )}
                <div className="border-t pt-2 font-semibold">
                  <div className="flex justify-between">
                    <span>Total</span>
                    <span>₦{totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Selection */}
            <div className="space-y-2">
              <Label>Project Timeline</Label>
              <Select onValueChange={(value) => paymentForm.setValue("timeline", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your preferred timeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-2 weeks">1-2 weeks</SelectItem>
                  <SelectItem value="2-4 weeks">2-4 weeks</SelectItem>
                  <SelectItem value="4-6 weeks">4-6 weeks</SelectItem>
                  <SelectItem value="6+ weeks">6+ weeks</SelectItem>
                </SelectContent>
              </Select>
              {paymentForm.formState.errors.timeline && (
                <p className="text-sm text-red-500">{paymentForm.formState.errors.timeline.message}</p>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <RadioGroup value="paystack" className="flex items-center space-x-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="paystack" id="paystack" />
                  <Label htmlFor="paystack" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Secure Payment via Paystack
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-sm text-gray-600">
                Pay securely with your debit card, bank transfer, or other payment methods via Paystack.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={orderMutation.isPending}
              >
                {orderMutation.isPending ? "Processing..." : `Pay ₦${totalPrice.toLocaleString()}`}
                <CreditCard className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}