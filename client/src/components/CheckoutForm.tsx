import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";

const checkoutSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  company: z.string().optional(),
  projectDescription: z.string().min(10, "Please provide project details"),
  timeline: z.string().min(1, "Timeline is required"),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

interface ServicePackage {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'launch' | 'growth' | 'elite';
}

interface CheckoutFormProps {
  selectedPackage: ServicePackage;
  onClose: () => void;
}

const timelines = [
  { value: "2-4weeks", label: "2-4 weeks" },
  { value: "1-2months", label: "1-2 months" },
  { value: "3-4months", label: "3-4 months" },
  { value: "flexible", label: "Flexible" },
  { value: "asap", label: "ASAP (Rush - +25%)" },
];

export default function CheckoutForm({ selectedPackage, onClose }: CheckoutFormProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : "",
      email: user?.email || "",
    },
  });

  const timeline = watch("timeline");
  const isRush = timeline === "asap";
  const rushFee = isRush ? selectedPackage.price * 0.25 : 0;
  const totalPrice = selectedPackage.price + rushFee;

  const createOrderMutation = useMutation({
    mutationFn: async (data: CheckoutForm & { serviceId: string; totalPrice: number }) => {
      const response = await apiRequest("POST", "/api/orders", {
        serviceId: data.serviceId,
        totalPrice: data.totalPrice,
        customRequest: `${data.projectDescription}\n\nTimeline: ${data.timeline}\nContact: ${data.fullName} (${data.email})${data.phone ? `, ${data.phone}` : ""}${data.company ? `\nCompany: ${data.company}` : ""}`,
      });
      return response.json();
    },
    onSuccess: (order) => {
      // Initialize payment with Paystack
      initializePayment(order);
    },
    onError: (error: any) => {
      toast({
        title: "Error creating order",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async ({ orderId, amount, email }: { orderId: string; amount: number; email: string }) => {
      const response = await apiRequest("POST", "/api/payments/initialize", {
        orderId,
        amount: amount * 100, // Convert to kobo for Paystack
        email,
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to Paystack payment page
      window.location.href = data.paymentUrl;
    },
    onError: (error: any) => {
      toast({
        title: "Error initializing payment",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const initializePayment = (order: any) => {
    paymentMutation.mutate({
      orderId: order.id,
      amount: totalPrice,
      email: user?.email || watch("email"),
    });
  };

  const onSubmit = (data: CheckoutForm) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to place an order.",
        variant: "destructive",
      });
      // Redirect to login
      window.location.href = "/api/login";
      return;
    }

    createOrderMutation.mutate({
      ...data,
      serviceId: selectedPackage.id,
      totalPrice,
    });
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl font-bold">Complete Your Order</CardTitle>
            <p className="text-slate-600">
              Selected Package: <span className="font-semibold text-blue-600">{selectedPackage.name}</span>
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name *
                </label>
                <Input
                  {...register("fullName")}
                  placeholder="John Smith"
                  className={errors.fullName ? "border-red-500" : ""}
                />
                {errors.fullName && (
                  <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address *
                </label>
                <Input
                  {...register("email")}
                  type="email"
                  placeholder="john@company.com"
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone Number
                </label>
                <Input
                  {...register("phone")}
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company (Optional)
                </label>
                <Input
                  {...register("company")}
                  placeholder="Your Company"
                />
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Project Details</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Project Description *
              </label>
              <Textarea
                {...register("projectDescription")}
                rows={4}
                placeholder="Describe your project requirements, goals, and any specific features you need..."
                className={errors.projectDescription ? "border-red-500" : ""}
              />
              {errors.projectDescription && (
                <p className="text-red-500 text-sm mt-1">{errors.projectDescription.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Timeline Preference *
              </label>
              <Select onValueChange={(value) => setValue("timeline", value)}>
                <SelectTrigger className={errors.timeline ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select timeline" />
                </SelectTrigger>
                <SelectContent>
                  {timelines.map((timeline) => (
                    <SelectItem key={timeline.value} value={timeline.value}>
                      {timeline.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.timeline && (
                <p className="text-red-500 text-sm mt-1">{errors.timeline.message}</p>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-slate-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Order Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>{selectedPackage.name} Package</span>
                <span>${selectedPackage.price.toLocaleString()}</span>
              </div>
              {isRush && (
                <div className="flex justify-between items-center text-amber-600">
                  <span>Rush Fee (25%)</span>
                  <span>+${rushFee.toLocaleString()}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between items-center font-bold text-lg">
                <span>Total</span>
                <span className="text-blue-600">${totalPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Secure Payment:</strong> You'll be redirected to Paystack to complete your payment securely. 
              We accept all major credit cards and bank transfers.
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createOrderMutation.isPending || paymentMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {createOrderMutation.isPending || paymentMutation.isPending 
                ? "Processing..." 
                : "Proceed to Payment"
              }
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
