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

export default function CheckoutForm({ service, totalPrice, selectedAddOns, onSuccess }: CheckoutFormProps): JSX.Element {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [contactData, setContactData] = useState<ContactForm | null>(null);
  const [showPaymentLoader, setShowPaymentLoader] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Store form data helper
  const storeFormData = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to store form data:', error);
    }
  };

  // Order mutation for payment processing
  const orderMutation = useMutation({
    mutationFn: async (data: ContactForm & PaymentForm & { 
      overrideSelectedAddOns?: string[]; 
      overrideTotalAmount?: number; 
    }) => {
      console.log('🔄 [ORDER MUTATION] Starting payment process with data:', data);
      
      const response = await apiRequest('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: service.id,
          contactInfo: {
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            company: data.company || ""
          },
          projectDetails: {
            description: data.projectDescription
          },
          selectedAddOns: data.overrideSelectedAddOns || selectedAddOns,
          totalAmount: data.overrideTotalAmount || totalPrice
        }),
      });

      console.log('🔄 [ORDER MUTATION] Server response:', response);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to process order');
      }

      // Extract Paystack URL and redirect
      const paystackUrl = response.data?.paymentUrl || response.paymentUrl;
      if (paystackUrl) {
        console.log('🔄 [ORDER MUTATION] Redirecting to Paystack:', paystackUrl);
        // Clear the payment loader flag before redirect
        sessionStorage.removeItem('payment_in_progress');
        // Redirect to Paystack
        window.location.href = paystackUrl;
      } else {
        throw new Error('Payment URL not received from server');
      }

      return response;
    },
    onSuccess: (data) => {
      console.log('🔄 [ORDER MUTATION] Payment URL received successfully');
      // Success handled in mutationFn with redirect
    },
    onError: (error: any) => {
      console.error('🔄 [ORDER MUTATION] Payment failed:', error);
      setShowPaymentLoader(false);
      sessionStorage.removeItem('payment_in_progress');
      
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle pending checkout completion after authentication
  useEffect(() => {
    console.log('🔄 [USE EFFECT] Auth flow useEffect triggered - user:', !!user, 'isPending:', orderMutation.isPending);
    
    if (user && !orderMutation.isPending) {
      const pendingCheckout = sessionStorage.getItem('pendingCheckout');
      console.log('🔄 [USE EFFECT] Pending checkout found:', !!pendingCheckout);
      
      if (pendingCheckout) {
        try {
          const checkoutData = JSON.parse(pendingCheckout);
          console.log('🔄 [USE EFFECT] Parsed checkout data:', checkoutData);
          
          // Remove pending checkout immediately to prevent race conditions
          sessionStorage.removeItem('pendingCheckout');
          
          // Set global payment flag IMMEDIATELY to show payment loader
          sessionStorage.setItem('payment_in_progress', 'true');
          
          // Show payment loader immediately - no checkout form
          setShowPaymentLoader(true);
          
          // Trigger immediate payment processing without showing checkout form
          setTimeout(() => {
            console.log('🔄 [AUTO-SUBMIT] Starting auto-submit process after authentication');
            
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
            
            // Prepare and submit the payment data immediately from stored checkout data
            const combinedData = {
              ...checkoutData.contactData,
              paymentMethod: "paystack" as const,
              timeline: "2-4 weeks",
              overrideSelectedAddOns: checkoutData.selectedAddOns || [],
              overrideTotalAmount: checkoutData.totalPrice || totalPrice
            };
            
            console.log('🔄 [AUTO-SUBMIT] Submitting order mutation with data:', combinedData);
            orderMutation.mutate(combinedData);
          }, 50); // Immediate processing for authenticated users
        } catch (error) {
          sessionStorage.removeItem('pendingCheckout');
        }
      }
    }
  }, [user, orderMutation.isPending, selectedAddOns, totalPrice, toast, setLocation]);

  const onContactSubmit = (data: ContactForm) => {
    // Store contact data persistently
    storeFormData('checkout_contact_data', data);
    setContactData(data);
    setCurrentStep(2);
  };

  const onPaymentSubmit = (data: PaymentForm) => {
    if (!contactData) return;
    
    const combinedData = { 
      ...contactData, 
      paymentMethod: data.paymentMethod,
      timeline: data.timeline,
      overrideSelectedAddOns: selectedAddOns,
      overrideTotalAmount: totalPrice
    };
    
    // Store checkout data for auth flow
    const checkoutData = {
      serviceId: service.id,
      contactData: contactData,
      selectedAddOns: selectedAddOns,
      totalPrice: totalPrice
    };
    
    if (!user) {
      // Store checkout data for after authentication
      sessionStorage.setItem('pendingCheckout', JSON.stringify(checkoutData));
      console.log('🔄 [PAYMENT SUBMIT] User not authenticated, storing checkout data and redirecting to auth');
      setLocation('/auth');
      return;
    }
    
    // Show loader immediately for authenticated users
    setShowPaymentLoader(true);
    
    console.log('🔄 [PAYMENT SUBMIT] PaymentLoader visible, submitting order');
    orderMutation.mutate(combinedData);
  };
  
  // Show payment loader if payment is in progress
  if (showPaymentLoader || orderMutation.isPending) {
    return (
      <PaymentLoader 
        serviceName={service.name}
        amount={totalPrice}
        onComplete={() => {
          setShowPaymentLoader(false);
          onSuccess();
        }}
      />
    );
  }
  
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Checkout</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle>Secure Checkout</CardTitle>
              <CardDescription>Complete your order for {service.name}</CardDescription>
            </div>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              1
            </div>
            <div className={`h-1 w-16 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {currentStep === 1 ? (
            <ContactFormStep onSubmit={onContactSubmit} />
          ) : (
            <PaymentFormStep 
              onSubmit={onPaymentSubmit}
              service={service}
              totalPrice={totalPrice}
              selectedAddOns={selectedAddOns}
              isLoading={orderMutation.isPending}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ContactFormStep({ onSubmit }: { onSubmit: (data: ContactForm) => void }) {
  const form = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      company: "",
      projectDescription: "",
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fullName" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Full Name *
          </Label>
          <Input
            id="fullName"
            {...form.register("fullName")}
            placeholder="Enter your full name"
          />
          {form.formState.errors.fullName && (
            <p className="text-sm text-red-500">{form.formState.errors.fullName.message}</p>
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
            {...form.register("email")}
            placeholder="Enter your email"
          />
          {form.formState.errors.email && (
            <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Phone Number *
          </Label>
          <Input
            id="phone"
            {...form.register("phone")}
            placeholder="Enter your phone number"
          />
          {form.formState.errors.phone && (
            <p className="text-sm text-red-500">{form.formState.errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="company" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Company (Optional)
          </Label>
          <Input
            id="company"
            {...form.register("company")}
            placeholder="Enter company name"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="projectDescription" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Project Description *
        </Label>
        <Textarea
          id="projectDescription"
          {...form.register("projectDescription")}
          placeholder="Describe your project requirements, goals, and any specific features you need..."
          rows={4}
        />
        {form.formState.errors.projectDescription && (
          <p className="text-sm text-red-500">{form.formState.errors.projectDescription.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full">
        Continue to Payment
      </Button>
    </form>
  );
}

function PaymentFormStep({ 
  onSubmit, 
  service, 
  totalPrice, 
  selectedAddOns, 
  isLoading 
}: { 
  onSubmit: (data: PaymentForm) => void;
  service: any;
  totalPrice: number;
  selectedAddOns: string[];
  isLoading: boolean;
}) {
  const form = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: "paystack",
      timeline: "",
    },
  });

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-3">Order Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>{service.name}</span>
            <span>₦{totalPrice.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-semibold pt-2 border-t">
            <span>Total</span>
            <span>₦{totalPrice.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-3">
          <Label>Project Timeline</Label>
          <Select onValueChange={(value) => form.setValue("timeline", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select your preferred timeline" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1-2 weeks">1-2 weeks (Rush - +20%)</SelectItem>
              <SelectItem value="2-4 weeks">2-4 weeks (Standard)</SelectItem>
              <SelectItem value="1-2 months">1-2 months (Extended)</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.timeline && (
            <p className="text-sm text-red-500">{form.formState.errors.timeline.message}</p>
          )}
        </div>

        <div className="space-y-3">
          <Label>Payment Method</Label>
          <RadioGroup defaultValue="paystack" onValueChange={(value) => form.setValue("paymentMethod", value as "paystack")}>
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <RadioGroupItem value="paystack" id="paystack" />
              <Label htmlFor="paystack" className="flex-1">
                <div className="flex items-center justify-between">
                  <span>Pay with Paystack</span>
                  <span className="text-sm text-gray-500">Cards, Bank Transfer, USSD</span>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Processing..." : `Pay ₦${totalPrice.toLocaleString()}`}
        </Button>
      </form>
    </div>
  );
}