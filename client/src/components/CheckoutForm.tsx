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

  // Handle auto-submit after authentication
  useEffect(() => {
    const autoSubmit = sessionStorage.getItem('auto_submit_payment');
    const storedContactData = getStoredFormData('checkout_contact_data');
    
    if (autoSubmit && storedContactData && user && !orderMutation.isPending) {
      console.log('🤖 [AUTO SUBMIT] Triggering automatic payment after authentication');
      
      // Clear the auto-submit flag
      sessionStorage.removeItem('auto_submit_payment');
      
      // Ensure form state is properly set
      if (!contactData) {
        setContactData(storedContactData);
        contactForm.reset(storedContactData);
      }
      
      // Auto-submit the payment with default timeline
      const paymentData = {
        paymentMethod: "paystack" as const,
        timeline: "standard", // Default timeline for auto-submit
      };
      
      console.log('🤖 [AUTO SUBMIT] Submitting payment with data:', paymentData);
      orderMutation.mutate(paymentData);
    }
  }, [user, contactData, orderMutation, contactForm]);

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

      try {
        console.log('🔄 [ORDER MUTATION] Sending order data to server:', orderData);
        const response = await apiRequest("POST", "/api/orders", orderData);
        const responseData = await response.json();
        console.log('🔄 [ORDER MUTATION] Server response received:', responseData);
        console.log('🔄 [ORDER MUTATION] Payment URL in response:', responseData.paymentUrl);
        return responseData;
      } catch (error) {
        console.error('🔄 [ORDER MUTATION] Error creating order:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to create order');
      }
    },
    onSuccess: (data) => {
      console.log('✅ [ORDER SUCCESS] Order mutation successful, response data:', data);
      if (data && data.paymentUrl) {
        console.log('✅ [ORDER SUCCESS] Payment URL found, showing loader and redirecting to Paystack');
        // Clear any pending checkout data since we're proceeding to payment
        localStorage.removeItem('checkout_contact_data');
        sessionStorage.removeItem('pendingCheckout');
        
        // Show payment loader and redirect to Paystack immediately
        setShowPaymentLoader(true);
        
        // Set a flag to prevent any other redirects and show global loader
        sessionStorage.setItem('payment_in_progress', 'true');
        
        console.log('✅ [ORDER SUCCESS] Redirecting to Paystack URL:', data.paymentUrl);
        
        // Clear all checkout-related data before redirect
        sessionStorage.removeItem('pendingCheckout');
        sessionStorage.removeItem('backup_service_data');
        
        // Force immediate redirect to Paystack
        setTimeout(() => {
          window.location.href = data.paymentUrl;
        }, 100);
      } else {
        console.log('✅ [ORDER SUCCESS] No payment URL, showing success message');
        toast({
          title: "Order placed successfully!",
          description: "We'll contact you soon to discuss your project.",
        });
        // For non-payment orders, don't call onSuccess which might redirect
        // Just show a success message and stay on page
      }
    },
    onError: (error) => {
      // Hide loader on error
      setShowPaymentLoader(false);
      
      toast({
        title: "Order failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle auto-payment after authentication - only when on checkout page
  useEffect(() => {
    const currentPath = window.location.pathname;
    console.log('🔄 [CHECKOUT FORM] === AUTO-PAYMENT USEEFFECT START ===');
    console.log('🔄 [CHECKOUT FORM] Current path:', currentPath);
    console.log('🔄 [CHECKOUT FORM] User exists:', !!user);
    console.log('🔄 [CHECKOUT FORM] Order mutation pending:', orderMutation.isPending);
    
    if (currentPath !== '/checkout' || !user || orderMutation.isPending) {
      console.log('🔄 [CHECKOUT FORM] ❌ Exiting early - conditions not met');
      return;
    }
    
    const pendingCheckout = sessionStorage.getItem('pendingCheckout');
    console.log('🔄 [CHECKOUT FORM] Pending checkout exists:', !!pendingCheckout);
    console.log('🔄 [CHECKOUT FORM] Pending checkout raw:', pendingCheckout);
    
    if (pendingCheckout) {
      try {
        const checkoutData = JSON.parse(pendingCheckout);
        console.log('🔄 [CHECKOUT FORM] ✅ Parsed pending checkout data:', checkoutData);
        console.log('🔄 [CHECKOUT FORM] Contact data exists:', !!checkoutData.contactData);
        console.log('🔄 [CHECKOUT FORM] Service data exists:', !!checkoutData.service);
        console.log('🔄 [CHECKOUT FORM] Selected addons:', checkoutData.selectedAddOns);
        console.log('🔄 [CHECKOUT FORM] Total price:', checkoutData.totalPrice);
        
        if (checkoutData.contactData) {
          console.log('🔄 [CHECKOUT FORM] ✅ Starting auto-payment process');
          
          // Show payment loader immediately
          setShowPaymentLoader(true);
          sessionStorage.setItem('payment_in_progress', 'true');
          
          setTimeout(() => {
            const contactDataToUse = { ...checkoutData.contactData };
            if (!contactDataToUse.email && user.email) {
              contactDataToUse.email = user.email;
            }
            
            const combinedData = { 
              ...contactDataToUse, 
              paymentMethod: "paystack" as const,
              timeline: checkoutData.paymentData?.timeline || "2-4 weeks",
              overrideSelectedAddOns: checkoutData.selectedAddOns || [],
              overrideTotalAmount: checkoutData.totalPrice || totalPrice
            };
            
            console.log('🔄 [CHECKOUT FORM] ✅ Submitting order with combined data:', combinedData);
            orderMutation.mutate(combinedData);
          }, 100);
        } else {
          console.log('🔄 [CHECKOUT FORM] ❌ No contact data in pending checkout');
        }
      } catch (error) {
        console.error('🔄 [CHECKOUT FORM] ❌ Error processing pending checkout:', error);
        sessionStorage.removeItem('pendingCheckout');
      }
    } else {
      console.log('🔄 [CHECKOUT FORM] ❌ No pending checkout found');
    }
  }, [user, orderMutation.isPending, totalPrice]);

  const onContactSubmit = (data: ContactForm) => {
    // Store contact data persistently
    storeFormData('checkout_contact_data', data);
    setContactData(data);
    setCurrentStep(2);
  };

  const onPaymentSubmit = (data: PaymentForm) => {
    if (!contactData) return;
    
    // Check if user is authenticated first
    if (!user) {
      // Store all checkout data in sessionStorage for later restoration
      const checkoutData = {
        service,
        totalPrice,
        selectedAddOns,
        contactData,
        paymentData: data,
        returnUrl: `/checkout?service=${service.id}&price=${totalPrice}&addons=${selectedAddOns.join(',')}`,
        timestamp: Date.now()
      };
      
      // Store primary checkout data
      sessionStorage.setItem('pendingCheckout', JSON.stringify(checkoutData));
      
      // Store backup service data as failsafe
      const backupServiceData = {
        service,
        totalPrice,
        selectedAddOns,
        timestamp: Date.now()
      };
      sessionStorage.setItem('backup_service_data', JSON.stringify(backupServiceData));
      
      console.log('💾 [CHECKOUT FORM] Stored checkout data and backup service data');
      
      // Redirect to auth page
      setLocation('/auth');
      return;
    }
    
    // User is authenticated - show loader immediately and proceed with payment
    setShowPaymentLoader(true);
    
    // Prepare the final data
    const finalContactData = { ...contactData };
    if (!finalContactData.email && user.email) {
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
    console.log('🔄 [RENDER] Showing PaymentLoader - showPaymentLoader:', showPaymentLoader, 'isPending:', orderMutation.isPending);
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