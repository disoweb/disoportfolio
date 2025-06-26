import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

  // Step 1: Contact Form
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

  // Step 2: Payment Form
  const paymentForm = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: "paystack",
    },
  });

  const orderMutation = useMutation({
    mutationFn: async (data: ContactForm & PaymentForm) => {
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

      return await apiRequest("POST", "/api/orders", orderData);
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

  const onContactSubmit = (data: ContactForm) => {
    setContactData(data);
    setCurrentStep(2);
  };

  const onPaymentSubmit = (data: PaymentForm) => {
    if (contactData) {
      orderMutation.mutate({ ...contactData, ...data });
    }
  };

  const goBackToStep1 = () => {
    setCurrentStep(1);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">
            {currentStep === 1 ? "Contact Details" : "Payment"}
          </CardTitle>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className={`flex items-center ${currentStep === 1 ? 'text-blue-600' : 'text-green-600'}`}>
              <User className="h-4 w-4 mr-1" />
              <span>Step 1</span>
            </div>
            <ArrowRight className="h-4 w-4" />
            <div className={`flex items-center ${currentStep === 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <CreditCard className="h-4 w-4 mr-1" />
              <span>Step 2</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Order Summary - Always Visible */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-lg mb-2">{service.name}</h3>
          <p className="text-gray-600 text-sm mb-4">{service.description}</p>
          {selectedAddOns.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium mb-1">Add-ons:</p>
              <ul className="text-sm text-gray-600">
                {selectedAddOns.map((addon, index) => (
                  <li key={index}>• {addon}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Total:</span>
            <span className="text-2xl font-bold text-blue-600">
              ₦{totalPrice.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Step 1: Contact Details */}
        {currentStep === 1 && (
          <form onSubmit={contactForm.handleSubmit(onContactSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name *</label>
                  <Input
                    {...contactForm.register("fullName")}
                    placeholder="John Doe"
                  />
                  {contactForm.formState.errors.fullName && (
                    <p className="text-red-500 text-sm mt-1">
                      {contactForm.formState.errors.fullName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email *</label>
                  <Input
                    {...contactForm.register("email")}
                    type="email"
                    placeholder="john@example.com"
                  />
                  {contactForm.formState.errors.email && (
                    <p className="text-red-500 text-sm mt-1">
                      {contactForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Phone *</label>
                  <Input
                    {...contactForm.register("phone")}
                    placeholder="+234 123 456 7890"
                  />
                  {contactForm.formState.errors.phone && (
                    <p className="text-red-500 text-sm mt-1">
                      {contactForm.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Company</label>
                  <Input
                    {...contactForm.register("company")}
                    placeholder="Company Name (Optional)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Project Description *</label>
                <Textarea
                  {...contactForm.register("projectDescription")}
                  placeholder="Describe your project requirements, goals, and any specific features you need..."
                  className="min-h-[100px]"
                />
                {contactForm.formState.errors.projectDescription && (
                  <p className="text-red-500 text-sm mt-1">
                    {contactForm.formState.errors.projectDescription.message}
                  </p>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full py-3 text-lg">
              Continue to Payment
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        )}

        {/* Step 2: Payment */}
        {currentStep === 2 && (
          <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Payment Method</h3>
              
              <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-blue-900">Secure Payment via Paystack</h4>
                    <p className="text-sm text-blue-700">
                      Pay securely with your debit card, bank transfer, or other payment methods
                    </p>
                  </div>
                </div>
              </div>

              {contactData && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Contact Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                    <p><strong>Name:</strong> {contactData.fullName}</p>
                    <p><strong>Email:</strong> {contactData.email}</p>
                    <p><strong>Phone:</strong> {contactData.phone}</p>
                    {contactData.company && <p><strong>Company:</strong> {contactData.company}</p>}
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={goBackToStep1}
                className="flex-1 py-3"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              
              <Button
                type="submit"
                className="flex-1 py-3 text-lg"
                disabled={orderMutation.isPending}
              >
                {orderMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    Pay ₦{totalPrice.toLocaleString()}
                    <CreditCard className="ml-2 h-4 w-4" />
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