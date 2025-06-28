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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import {
  CreditCard,
  ArrowLeft,
  User,
  Phone,
  FileText,
  Clock,
  X,
  Shield,
  Heart,
} from "lucide-react";
import PaymentLoader from "@/components/PaymentLoader";

const contactSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  projectDescription: z
    .string()
    .min(10, "Please provide a brief description of your project"),
});

const paymentSchema = z.object({
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
  onSuccess,
}: CheckoutModalProps) {
  // Don't render if service is null
  if (!service) {
    return null;
  }
  const [currentStep, setCurrentStep] = useState(1);
  const [showPaymentLoader, setShowPaymentLoader] = useState(false);
  const [paymentCooldown, setPaymentCooldown] = useState(0);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const contactForm = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      projectDescription: "",
    },
  });

  const paymentForm = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      timeline: "",
    },
  });

  // Payment cooldown effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (paymentCooldown > 0) {
      interval = setInterval(() => {
        setPaymentCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [paymentCooldown]);

  const handleClose = () => {
    setCurrentStep(1);
    contactForm.reset();
    paymentForm.reset();
    setShowPaymentLoader(false);
    onClose();
  };

  const onContactSubmit = (data: ContactForm) => {
    setCurrentStep(2);
  };

  const orderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      setShowPaymentLoader(true);

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
    onError: (error: any) => {
      setShowPaymentLoader(false);

      if (error.message?.includes("cancelled")) {
        setPaymentCooldown(30);
        toast({
          title: "Payment Cancelled",
          description: "You can try again in 30 seconds.",
          variant: "destructive",
        });
        return;
      }

      if (error.message?.includes("401")) {
        setLocation("/auth");
        return;
      }

      toast({
        title: "Error",
        description:
          error.message || "Failed to create order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onPaymentSubmit = async (data: PaymentForm) => {
    if (!user) {
      // Create checkout session for non-authenticated users
      try {
        const contactData = contactForm.getValues();
        const sessionData = {
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
          timeline: data.timeline
        };

        const response = await apiRequest("POST", "/api/checkout-sessions", sessionData);
        const responseData = await response.json();
        
        if (responseData.sessionToken) {
          // Redirect to auth with session token
          setLocation(`/auth?checkout=${responseData.sessionToken}`);
        } else {
          toast({
            title: "Error",
            description: "Failed to save checkout data. Please try again.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to save checkout data. Please try again.",
          variant: "destructive",
        });
      }
      return;
    }

    const contactData = contactForm.getValues();
    const orderData = {
      serviceId: service.id,
      serviceName: service.name,
      servicePrice: totalPrice,
      contactName: contactData.fullName,
      contactEmail: user?.email || "noemail@example.com",
      contactPhone: contactData.phone,
      companyName: "",
      projectDescription: contactData.projectDescription,
      customRequests: `Timeline: ${data.timeline}`,
      addOns: selectedAddOns,
      totalAmount: totalPrice,
    };

    orderMutation.mutate(orderData);
  };

  // Show payment loader when processing payment
  if (showPaymentLoader || orderMutation.isPending) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="w-full max-w-xs mx-auto">
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
      <DialogContent className="w-full max-w-xs mx-auto max-h-[80vh] overflow-y-auto p-0 rounded-xl">
        <DialogTitle className="sr-only">Order {service.name}</DialogTitle>
        <DialogDescription className="sr-only">
          Complete your order for {service.name} - ₦{totalPrice.toLocaleString()}
        </DialogDescription>
        {/* Header with service info and trust badges */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">
                  {service.name}
                </h3>
                <span className="text-xl font-bold text-blue-600">
                  ₦{totalPrice.toLocaleString()}
                </span>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-white/50 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <Shield className="w-3 h-3" />
              SSL Secured
            </div>
            <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              <Heart className="w-3 h-3" />
              Trusted by 500+ clients
            </div>
          </div>
        </div>

        {/* Form content */}
        <div className="p-4">


          {currentStep === 1 ? (
            <form
              onSubmit={contactForm.handleSubmit(onContactSubmit)}
              className="space-y-3"
            >
              <div className="space-y-1">
                <Label
                  htmlFor="fullName"
                  className="text-xs font-medium text-gray-700"
                >
                  Full Name *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="fullName"
                    {...contactForm.register("fullName")}
                    className="pl-10 h-9 text-sm"
                    placeholder="Your full name"
                  />
                </div>
                {contactForm.formState.errors.fullName && (
                  <p className="text-xs text-red-500">
                    {contactForm.formState.errors.fullName.message}
                  </p>
                )}
              </div>



              <div className="space-y-1">
                <Label
                  htmlFor="phone"
                  className="text-xs font-medium text-gray-700"
                >
                  Phone Number *
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    {...contactForm.register("phone")}
                    className="pl-10 h-9 text-sm"
                    placeholder="+234 xxx xxx xxxx"
                  />
                </div>
                {contactForm.formState.errors.phone && (
                  <p className="text-xs text-red-500">
                    {contactForm.formState.errors.phone.message}
                  </p>
                )}
              </div>



              <div className="space-y-1">
                <Label
                  htmlFor="projectDescription"
                  className="text-xs font-medium text-gray-700"
                >
                  Project Description *
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Textarea
                    id="projectDescription"
                    {...contactForm.register("projectDescription")}
                    className="pl-10 text-sm resize-none"
                    rows={3}
                    placeholder="Brief description of your project requirements..."
                  />
                </div>
                {contactForm.formState.errors.projectDescription && (
                  <p className="text-xs text-red-500">
                    {contactForm.formState.errors.projectDescription.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-9 bg-blue-600 hover:bg-blue-700"
              >
                Continue to Payment
              </Button>
            </form>
          ) : (
            <form
              onSubmit={paymentForm.handleSubmit(onPaymentSubmit)}
              className="space-y-3"
            >
              <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                <h4 className="font-medium text-sm text-slate-900">
                  Order Summary
                </h4>
                <div className="flex justify-between text-sm">
                  <span>Service:</span>
                  <span className="font-medium">{service.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total:</span>
                  <span className="font-bold text-blue-600">
                    ₦{totalPrice.toLocaleString()}
                  </span>
                </div>
                {selectedAddOns.length > 0 && (
                  <div className="text-xs text-slate-600">
                    Add-ons: {selectedAddOns.join(", ")}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-700">
                  Project Timeline
                </Label>
                <Select
                  onValueChange={(value) =>
                    paymentForm.setValue("timeline", value)
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-2 weeks">1-2 weeks (Rush)</SelectItem>
                    <SelectItem value="2-4 weeks">
                      2-4 weeks (Standard)
                    </SelectItem>
                    <SelectItem value="4-6 weeks">
                      4-6 weeks (Extended)
                    </SelectItem>
                    <SelectItem value="6+ weeks">6+ weeks (Complex)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="flex items-center gap-2 text-green-800 text-sm">
                  <Shield className="w-4 h-4" />
                  <span className="font-medium">
                    Secure Payment via Paystack
                  </span>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  Your payment is protected by bank-level encryption
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 h-9"
                >
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={orderMutation.isPending || paymentCooldown > 0}
                  className="flex-1 h-9 bg-blue-600 hover:bg-blue-700"
                >
                  {paymentCooldown > 0 ? (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Wait {paymentCooldown}s
                    </span>
                  ) : (
                    <span>Pay ₦{totalPrice.toLocaleString()}</span>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
