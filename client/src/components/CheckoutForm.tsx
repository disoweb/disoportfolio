import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, CreditCard, User } from "lucide-react";

// Step 1: Contact Details Schema
const contactSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  company: z.string().optional(),
  projectDescription: z.string().min(10, "Please provide project details (minimum 10 characters)"),
});

// Step 2: Payment Schema
const paymentSchema = z.object({
  paymentMethod: z.literal("paystack", { required_error: "Payment method is required" }),
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
      console.log('🔍 [CHECKOUT FORM] Auto-populating email from authenticated user:', user.email);
      contactForm.setValue('email', user.email);
    }
  }, [user, contactForm]);

  // Restore contact data if it exists (from previous session or auth flow)
  useEffect(() => {
    console.log('🔍 [CHECKOUT FORM] Restore data effect triggered');
    console.log('🔍 [CHECKOUT FORM] storedContactData:', storedContactData);
    console.log('🔍 [CHECKOUT FORM] contactData:', contactData);
    
    // First check for pending checkout data (priority for auth flow)
    const pendingCheckout = sessionStorage.getItem('pendingCheckout');
    if (pendingCheckout && !contactData) {
      try {
        const checkoutData = JSON.parse(pendingCheckout);
        console.log('🔍 [CHECKOUT FORM] Found pending checkout data:', checkoutData);
        
        if (checkoutData.contactData) {
          console.log('🔍 [CHECKOUT FORM] Restoring contact data from pending checkout');
          setContactData(checkoutData.contactData);
          contactForm.reset(checkoutData.contactData);
          setCurrentStep(2);
          return;
        }
      } catch (error) {
        console.error('🔍 [CHECKOUT FORM] Error parsing pending checkout:', error);
      }
    }
    
    // Fallback to localStorage data
    if (storedContactData && !contactData) {
      console.log('🔍 [CHECKOUT FORM] Restoring contact data from localStorage');
      setContactData(storedContactData);
      contactForm.reset(storedContactData);
      setCurrentStep(2);
    }
  }, [storedContactData, contactData, contactForm]);

  const orderMutation = useMutation({
    mutationFn: async (data: ContactForm & PaymentForm) => {
      console.log('🚀 [ORDER MUTATION] Starting order submission');
      console.log('🚀 [ORDER MUTATION] Input data:', data);
      
      const orderData = {
        serviceId: service.id,
        customerInfo: {
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          company: data.company,
        },
        projectDetails: {
          description: data.projectDescription,
        },
        selectedAddOns: selectedAddOns,
        totalAmount: totalPrice,
      };

      console.log('🚀 [ORDER MUTATION] Sending order data:', orderData);
      
      try {
        const response = await apiRequest("POST", "/api/orders", orderData);
        console.log('🚀 [ORDER MUTATION] Order response received:', response);
        return response;
      } catch (error) {
        console.error('🚀 [ORDER MUTATION] Order failed:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        toast({
          title: "Order placed successfully!",
          description: "We'll contact you soon to discuss your project.",
        });
        onSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: "Order failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle pending checkout completion after authentication
  useEffect(() => {
    console.log('🚀 [AUTH EFFECT] Authentication state changed');
    console.log('🚀 [AUTH EFFECT] - User authenticated:', !!user);
    console.log('🚀 [AUTH EFFECT] - User email:', user?.email);
    console.log('🚀 [AUTH EFFECT] - Loading state:', !user);
    console.log('🚀 [AUTH EFFECT] - Current step:', currentStep);
    
    if (user) {
      console.log('🚀 [AUTH EFFECT] User is authenticated, checking for pending checkout');
      
      const pendingCheckout = sessionStorage.getItem('pendingCheckout');
      console.log('🚀 [AUTH EFFECT] Raw sessionStorage pendingCheckout:', pendingCheckout);
      
      if (pendingCheckout) {
        try {
          const checkoutData = JSON.parse(pendingCheckout);
          console.log('🔍 [AUTH EFFECT] Parsed checkout data:', checkoutData);
          
          console.log('🔍 [AUTH EFFECT] Found pending checkout, will remove after processing');
          
          // Restore the checkout state
          if (checkoutData.contactData) {
            console.log('🔍 [AUTH EFFECT] Restoring checkout state');
            setContactData(checkoutData.contactData);
            setCurrentStep(2);
            
            // Auto-submit the payment after ensuring user is properly authenticated
            setTimeout(async () => {
              console.log('🔍 [AUTH EFFECT] Auto-submitting payment');
              
              // Verify user is still authenticated before proceeding
              try {
                const authCheck = await apiRequest("GET", "/api/auth/user");
                const currentUser = await authCheck.json();
                console.log('🔍 [AUTH EFFECT] Auth check result:', currentUser);
                
                if (!currentUser || !currentUser.email) {
                  console.error('🔍 [AUTH EFFECT] User not authenticated, aborting auto-submit');
                  toast({
                    title: "Authentication Error",
                    description: "Please log in again to complete your order.",
                    variant: "destructive",
                  });
                  setLocation('/auth');
                  return;
                }
                
                // Ensure email is populated from authenticated user if missing
                const contactData = { ...checkoutData.contactData };
                if (!contactData.email && currentUser.email) {
                  console.log('🔍 [AUTH EFFECT] Populating missing email from user:', currentUser.email);
                  contactData.email = currentUser.email;
                }
                
                // Validate that we have all required fields
                if (!contactData.fullName || !contactData.email || !contactData.projectDescription) {
                  console.error('🔍 [AUTH EFFECT] Missing required contact data:', contactData);
                  toast({
                    title: "Incomplete Information",
                    description: "Please fill out all required contact information.",
                    variant: "destructive",
                  });
                  setCurrentStep(1);
                  return;
                }
                
                const combinedData = { 
                  ...contactData, 
                  paymentMethod: "paystack",
                  ...(checkoutData.paymentData || {})
                };
                console.log('🔍 [AUTH EFFECT] Combined data for order:', combinedData);
                orderMutation.mutate(combinedData);
                
                // Remove pending checkout data after successful submission
                sessionStorage.removeItem('pendingCheckout');
                console.log('🔍 [AUTH EFFECT] Removed pending checkout from storage after order submission');
                
              } catch (error) {
                console.error('🔍 [AUTH EFFECT] Auth check failed:', error);
                toast({
                  title: "Authentication Error",
                  description: "Please log in again to complete your order.",
                  variant: "destructive",
                });
                setLocation('/auth');
              }
            }, 1000);
          }
        } catch (error) {
          console.error('🔍 [AUTH EFFECT] Error restoring pending checkout:', error);
          sessionStorage.removeItem('pendingCheckout');
        }
      } else {
        console.log('🔍 [AUTH EFFECT] No pending checkout found');
      }
    }
  }, [user, orderMutation]);

  const onContactSubmit = (data: ContactForm) => {
    // Store contact data persistently
    storeFormData('checkout_contact_data', data);
    setContactData(data);
    setCurrentStep(2);
  };

  const onPaymentSubmit = (data: PaymentForm) => {
    if (!contactData) return;
    
    console.log('🔍 [CHECKOUT DEBUG] Payment submit initiated');
    console.log('🔍 [CHECKOUT DEBUG] User authenticated:', !!user);
    console.log('🔍 [CHECKOUT DEBUG] Contact data:', contactData);
    console.log('🔍 [CHECKOUT DEBUG] Payment data:', data);
    
    // Check if user is authenticated
    if (!user) {
      console.log('🔍 [CHECKOUT DEBUG] User not authenticated, storing checkout data');
      
      // Store checkout data in sessionStorage and redirect to login
      const checkoutData = {
        service,
        totalPrice,
        selectedAddOns,
        contactData,
        paymentData: data,
        returnUrl: window.location.pathname + window.location.search,
        timestamp: Date.now()
      };
      
      sessionStorage.setItem('pendingCheckout', JSON.stringify(checkoutData));
      console.log('🔍 [CHECKOUT DEBUG] Stored pending checkout:', checkoutData);
      
      setLocation('/auth');
      return;
    }
    
    console.log('🔍 [CHECKOUT DEBUG] User authenticated, proceeding with order');
    const combinedData = { ...contactData, ...data };
    orderMutation.mutate(combinedData);
  };

  const goBackToStep1 = () => {
    setCurrentStep(1);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {currentStep === 1 ? "Contact Details" : "Payment"}
          </CardTitle>
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <div className={`flex items-center ${currentStep === 1 ? 'text-blue-600' : 'text-green-600'}`}>
              <User className="h-3 w-3 mr-1" />
              <span>1</span>
            </div>
            <ArrowRight className="h-3 w-3" />
            <div className={`flex items-center ${currentStep === 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <CreditCard className="h-3 w-3 mr-1" />
              <span>2</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Compact Order Summary */}
        <div className="bg-gray-50 p-3 rounded-lg mb-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{service.name}</h3>
              {selectedAddOns.length > 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  +{selectedAddOns.length} add-on{selectedAddOns.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-blue-600">
                ₦{totalPrice.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Step 1: Contact Details */}
        {currentStep === 1 && (
          <form onSubmit={contactForm.handleSubmit(onContactSubmit)} className="space-y-3">
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Full Name *</label>
                  <Input
                    {...contactForm.register("fullName")}
                    placeholder="John Doe"
                    className="h-9 text-sm"
                  />
                  {contactForm.formState.errors.fullName && (
                    <p className="text-red-500 text-xs mt-1">
                      {contactForm.formState.errors.fullName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Email *</label>
                  <Input
                    {...contactForm.register("email")}
                    type="email"
                    placeholder="john@example.com"
                    className="h-9 text-sm"
                  />
                  {contactForm.formState.errors.email && (
                    <p className="text-red-500 text-xs mt-1">
                      {contactForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Phone *</label>
                  <Input
                    {...contactForm.register("phone")}
                    placeholder="+234 123 456 7890"
                    className="h-9 text-sm"
                  />
                  {contactForm.formState.errors.phone && (
                    <p className="text-red-500 text-xs mt-1">
                      {contactForm.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Company</label>
                  <Input
                    {...contactForm.register("company")}
                    placeholder="Company (Optional)"
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Project Description *</label>
                <Textarea
                  {...contactForm.register("projectDescription")}
                  placeholder="Brief description of your project requirements..."
                  className="min-h-[60px] text-sm resize-none"
                  rows={3}
                />
                {contactForm.formState.errors.projectDescription && (
                  <p className="text-red-500 text-xs mt-1">
                    {contactForm.formState.errors.projectDescription.message}
                  </p>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full h-10 text-sm">
              Continue to Payment
              <ArrowRight className="ml-2 h-3 w-3" />
            </Button>
          </form>
        )}

        {/* Step 2: Payment */}
        {currentStep === 2 && (
          <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-3">
            <div className="space-y-3">
              <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-sm text-blue-900">Secure Payment via Paystack</h4>
                    <p className="text-xs text-blue-700">
                      Debit card, bank transfer, and other payment methods
                    </p>
                  </div>
                </div>
              </div>

              {contactData && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium text-xs mb-2">Contact Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-gray-600">
                    <p><strong>Name:</strong> {contactData.fullName}</p>
                    <p><strong>Email:</strong> {contactData.email}</p>
                    <p><strong>Phone:</strong> {contactData.phone}</p>
                    {contactData.company && <p><strong>Company:</strong> {contactData.company}</p>}
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={goBackToStep1}
                className="flex-1 h-10 text-sm"
              >
                <ArrowLeft className="mr-1 h-3 w-3" />
                Back
              </Button>
              
              <Button
                type="submit"
                className="flex-1 h-10 text-sm"
                disabled={orderMutation.isPending}
              >
                {orderMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    Pay ₦{totalPrice.toLocaleString()}
                    <CreditCard className="ml-1 h-3 w-3" />
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              By proceeding, you agree to our terms of service. 
              Your payment is processed securely by Paystack.
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}