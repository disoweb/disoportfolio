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
    mutationFn: async (data: PaymentForm) => {
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
        selectedAddOns: selectedAddOns,
        totalAmount: totalPrice,
      };

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
        // Clear any pending checkout data since we're proceeding to payment
        localStorage.removeItem('checkout_contact_data');
        sessionStorage.removeItem('pendingCheckout');
        
        // Show payment loader instead of immediate redirect
        setShowPaymentLoader(true);
        
        // Redirect to Paystack after loader completes
        setTimeout(() => {
          window.location.href = data.paymentUrl;
        }, 3500); // Give loader time to complete animation
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
    // Prevent auto-submit if already processing
    if (user && !orderMutation.isPending) {
      const pendingCheckout = sessionStorage.getItem('pendingCheckout');
      
      if (pendingCheckout) {
        try {
          const checkoutData = JSON.parse(pendingCheckout);
          
          // Remove pending checkout immediately to prevent race conditions
          sessionStorage.removeItem('pendingCheckout');
          
          // Restore the checkout state
          if (checkoutData.contactData) {
            setContactData(checkoutData.contactData);
            setCurrentStep(2);
            
            // Auto-submit the payment after ensuring user is properly authenticated
            setTimeout(() => {
              if (!user || !user.email) {
                toast({
                  title: "Authentication Error",
                  description: "Please log in again to complete your order.",
                  variant: "destructive",
                });
                setLocation('/auth');
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
              
              const combinedData = { 
                ...contactDataToUse, 
                paymentMethod: "paystack" as const,
                timeline: checkoutData.paymentData?.timeline || "2-4 weeks"
              };
              orderMutation.mutate(combinedData);
            }, 500);
          }
        } catch (error) {
          sessionStorage.removeItem('pendingCheckout');
        }
      }
    }
  }, [user, orderMutation.isPending, currentStep, setLocation, toast]);

  const onContactSubmit = (data: ContactForm) => {
    // Store contact data persistently
    storeFormData('checkout_contact_data', data);
    setContactData(data);
    setCurrentStep(2);
  };

  const onPaymentSubmit = (data: PaymentForm) => {
    if (!contactData) return;
    

    
    // Check if user is authenticated
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
      

      sessionStorage.setItem('pendingCheckout', JSON.stringify(checkoutData));
      
      // Redirect to auth page

      setLocation('/auth');
      return;
    }
    
    // User is authenticated, proceed with order

    
    // Ensure email is populated from authenticated user if missing
    const finalContactData = { ...contactData };
    if (!finalContactData.email && user.email) {
      finalContactData.email = user.email;
    }
    
    const combinedData = { 
      ...finalContactData, 
      ...data 
    };
    

    orderMutation.mutate(combinedData);
  };

  // Show payment loader when processing payment
  if (showPaymentLoader) {
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

        {currentStep === 1 && (
          <form onSubmit={contactForm.handleSubmit(onContactSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name *
              </Label>
              <Input
                id="fullName"
                {...contactForm.register("fullName")}
                className="h-10"
                placeholder="Enter your full name"
              />
              {contactForm.formState.errors.fullName && (
                <p className="text-sm text-red-600">{contactForm.formState.errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                {...contactForm.register("email")}
                className="h-10"
                placeholder="Enter your email address"
              />
              {contactForm.formState.errors.email && (
                <p className="text-sm text-red-600">{contactForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number *
              </Label>
              <Input
                id="phone"
                type="tel"
                {...contactForm.register("phone")}
                className="h-10"
                placeholder="Enter your phone number"
              />
              {contactForm.formState.errors.phone && (
                <p className="text-sm text-red-600">{contactForm.formState.errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company (Optional)
              </Label>
              <Input
                id="company"
                {...contactForm.register("company")}
                className="h-10"
                placeholder="Enter your company name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectDescription" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Project Description *
              </Label>
              <Textarea
                id="projectDescription"
                {...contactForm.register("projectDescription")}
                className="min-h-20"
                placeholder="Please describe your project requirements, goals, and any specific features you need..."
              />
              {contactForm.formState.errors.projectDescription && (
                <p className="text-sm text-red-600">{contactForm.formState.errors.projectDescription.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-10">
              Continue to Payment
            </Button>
          </form>
        )}

        {currentStep === 2 && (
          <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <h3 className="font-medium text-gray-900">Contact Information</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Name:</strong> {contactData?.fullName}</p>
                <p><strong>Email:</strong> {contactData?.email}</p>
                <p><strong>Phone:</strong> {contactData?.phone}</p>
                {contactData?.company && <p><strong>Company:</strong> {contactData.company}</p>}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Timeline Preference *</Label>
                <Select onValueChange={(value) => paymentForm.setValue("timeline", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your preferred timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-2 weeks">1-2 weeks</SelectItem>
                    <SelectItem value="2-4 weeks">2-4 weeks</SelectItem>
                    <SelectItem value="1-2 months">1-2 months</SelectItem>
                    <SelectItem value="2+ months">2+ months</SelectItem>
                  </SelectContent>
                </Select>
                {paymentForm.formState.errors.timeline && (
                  <p className="text-sm text-red-600">{paymentForm.formState.errors.timeline.message}</p>
                )}
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Order Summary</h3>
              
              <div className="flex justify-between items-center text-blue-800">
                <span>{service.name} Package</span>
                <span>₦{totalPrice.toLocaleString()}</span>
              </div>
              
              <div className="border-t border-blue-200 mt-2 pt-2">
                <div className="flex justify-between items-center font-semibold text-blue-900">
                  <span>Total</span>
                  <span className="text-lg">₦{totalPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">
                <CreditCard className="inline h-4 w-4 mr-2" />
                Secure Payment
              </h4>
              <p className="text-sm text-gray-600">
                You'll be redirected to Paystack to complete your payment securely. We accept all major credit cards and bank transfers.
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(1)}
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