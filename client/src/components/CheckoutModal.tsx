import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { CreditCard, ArrowLeft, User, Mail, Phone, Building2, FileText, CheckCircle, Clock, X } from "lucide-react";
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

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: {
    id: string;
    name: string;
    price: string;
    description: string;
  };
  totalPrice: number;
  selectedAddOns: string[];
  onSuccess?: () => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  service,
  totalPrice,
  selectedAddOns,
  onSuccess
}: CheckoutModalProps) {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [contactData, setContactData] = useState<ContactForm | null>(null);
  const [showPaymentLoader, setShowPaymentLoader] = useState(false);
  const [showStreamlinedConfirmation, setShowStreamlinedConfirmation] = useState(false);
  const [paymentCooldown, setPaymentCooldown] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  const contactForm = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      fullName: "",
      email: "",
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

  // Helper functions for local storage
  const storeFormData = (key: string, data: any) => {
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to store form data:', error);
    }
  };

  const getStoredFormData = (key: string) => {
    try {
      const stored = sessionStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to retrieve form data:', error);
      return null;
    }
  };

  const orderMutation = useMutation({
    mutationFn: async (data: PaymentForm & { 
      overrideSelectedAddOns?: string[], 
      overrideTotalAmount?: number 
    }) => {
      const orderData = {
        serviceId: service.id,
        serviceData: {
          id: service.id,
          name: service.name,
          price: service.price,
          description: service.description
        },
        contactData: contactData!,
        paymentMethod: data.paymentMethod,
        timeline: data.timeline,
        selectedAddOns: data.overrideSelectedAddOns || selectedAddOns,
        totalPrice: data.overrideTotalAmount || totalPrice,
      };

      // Mark payment attempt
      sessionStorage.setItem('last_payment_attempt', Date.now().toString());

      const response = await apiRequest("POST", "/api/orders", orderData);
      return response;
    },
    onSuccess: (data: any) => {
      if (data.paymentUrl) {
        // Redirect to Paystack
        setTimeout(() => {
          window.location.href = data.paymentUrl;
        }, 100);
      } else {
        toast({
          title: "Order Created",
          description: "Your order has been created successfully!",
        });
        onSuccess?.();
        onClose();
      }
    },
    onError: (error) => {
      console.error("Order creation failed:", error);
      setShowPaymentLoader(false);
      setShowStreamlinedConfirmation(false);
      
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Check for payment cancellation on modal open
  useEffect(() => {
    if (!isOpen) return;

    const urlParams = new URLSearchParams(window.location.search);
    const cancelled = urlParams.get('cancelled');
    const paymentCancelled = sessionStorage.getItem('payment_cancelled');
    
    if (cancelled === 'true' || paymentCancelled === 'true') {
      sessionStorage.removeItem('payment_cancelled');
      sessionStorage.removeItem('auto_submit_payment');
      
      const lastPaymentAttempt = sessionStorage.getItem('last_payment_attempt');
      const now = Date.now();
      
      if (lastPaymentAttempt) {
        const timeSinceLastAttempt = now - parseInt(lastPaymentAttempt);
        const remainingCooldown = Math.max(0, 30000 - timeSinceLastAttempt);
        if (remainingCooldown > 0) {
          setPaymentCooldown(Math.ceil(remainingCooldown / 1000));
        }
      }
      
      toast({
        title: "Payment Cancelled",
        description: "Please try again when you're ready.",
      });
    }

    // Load stored form data if available
    const storedContactData = getStoredFormData('checkout_contact_data');
    if (storedContactData) {
      contactForm.reset(storedContactData);
      setContactData(storedContactData);
      setCurrentStep(2);
    }
  }, [isOpen]);

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
    storeFormData('checkout_contact_data', data);
    setContactData(data);
    setCurrentStep(2);
  };

  const onPaymentSubmit = (data: PaymentForm) => {
    if (!contactData) return;
    
    if (!user) {
      // Create checkout session and redirect to auth
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

      fetch("/api/checkout-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createSessionData),
      })
      .then(res => res.json())
      .then(result => {
        if (result.sessionToken) {
          sessionStorage.setItem('checkoutSessionToken', result.sessionToken);
          sessionStorage.removeItem('auth_completed');
          sessionStorage.removeItem('auth_timestamp');
          
          onClose(); // Close modal before redirect
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

    // Proceed with payment for authenticated users
    setShowPaymentLoader(true);
    orderMutation.mutate(data);
  };

  const handleClose = () => {
    if (showPaymentLoader || orderMutation.isPending) {
      return; // Prevent closing during payment
    }
    onClose();
    setCurrentStep(1);
    setContactData(null);
    setShowStreamlinedConfirmation(false);
    setShowPaymentLoader(false);
    contactForm.reset();
    paymentForm.reset();
  };

  // Show payment loader when processing payment
  if (showPaymentLoader || orderMutation.isPending) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <PaymentLoader
            serviceName={service.name}
            amount={totalPrice}
            onComplete={() => {
              // Redirect handled in onSuccess
            }}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-4 w-4" />
            Complete Your Order
          </DialogTitle>
          <p className="text-sm text-gray-600">
            {currentStep === 1 
              ? "Provide your contact information" 
              : "Review and proceed with payment"
            }
          </p>
        </DialogHeader>

        {currentStep === 1 ? (
          <form onSubmit={contactForm.handleSubmit(onContactSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-sm font-medium">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="fullName"
                  {...contactForm.register("fullName")}
                  className="pl-10 h-9"
                  placeholder="Your full name"
                />
              </div>
              {contactForm.formState.errors.fullName && (
                <p className="text-xs text-red-500">{contactForm.formState.errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  {...contactForm.register("email")}
                  className="pl-10 h-9"
                  placeholder="your@email.com"
                />
              </div>
              {contactForm.formState.errors.email && (
                <p className="text-xs text-red-500">{contactForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-medium">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  {...contactForm.register("phone")}
                  className="pl-10 h-9"
                  placeholder="+234 123 456 7890"
                />
              </div>
              {contactForm.formState.errors.phone && (
                <p className="text-xs text-red-500">{contactForm.formState.errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="company" className="text-sm font-medium">Company (Optional)</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="company"
                  {...contactForm.register("company")}
                  className="pl-10 h-9"
                  placeholder="Your company name"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="projectDescription" className="text-sm font-medium">Project Description *</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Textarea
                  id="projectDescription"
                  {...contactForm.register("projectDescription")}
                  className="pl-10 min-h-[70px] text-sm resize-none"
                  placeholder="Brief description of your project..."
                />
              </div>
              {contactForm.formState.errors.projectDescription && (
                <p className="text-xs text-red-500">{contactForm.formState.errors.projectDescription.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-10">
              Continue to Payment
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Order Summary */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <h3 className="font-semibold mb-2 text-sm">Order Summary</h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>Service:</span>
                  <span className="font-medium">{service.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Contact:</span>
                  <span className="font-medium truncate ml-2">{contactData?.fullName}</span>
                </div>
                <div className="flex justify-between font-semibold text-sm">
                  <span>Total:</span>
                  <span>₦{totalPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Project Timeline</Label>
                <Select onValueChange={(value) => paymentForm.setValue("timeline", value)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-2 weeks">1-2 weeks (Rush)</SelectItem>
                    <SelectItem value="2-4 weeks">2-4 weeks (Standard)</SelectItem>
                    <SelectItem value="4-6 weeks">4-6 weeks (Extended)</SelectItem>
                    <SelectItem value="6+ weeks">6+ weeks (Complex)</SelectItem>
                  </SelectContent>
                </Select>
                {paymentForm.formState.errors.timeline && (
                  <p className="text-xs text-red-500">{paymentForm.formState.errors.timeline.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Payment Method</Label>
                <RadioGroup value="paystack" className="grid grid-cols-1">
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="paystack" id="paystack" />
                    <Label htmlFor="paystack" className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">Paystack</div>
                          <div className="text-xs text-gray-500">Secure card & bank payments</div>
                        </div>
                        <div className="text-xs text-green-600 font-medium">Recommended</div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center gap-1.5 h-9 px-3"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 h-9"
                  disabled={paymentCooldown > 0}
                >
                  {paymentCooldown > 0 ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-sm">Wait {paymentCooldown}s</span>
                    </span>
                  ) : (
                    <span className="text-sm">Pay ₦{totalPrice.toLocaleString()}</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}