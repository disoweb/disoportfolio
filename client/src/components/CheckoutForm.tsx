import { useState, useEffect } from 'react';
import { useLocation as useWouterLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import PaymentLoader from './PaymentLoader';

const contactSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  company: z.string().optional(),
  projectDescription: z.string().min(10, 'Please provide a brief description of your project')
});

const paymentSchema = z.object({
  timeline: z.string().min(1, 'Please select a timeline'),
  paymentMethod: z.literal('paystack')
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
  const { user } = useAuth();
  const [, setLocation] = useWouterLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [contactData, setContactData] = useState<ContactForm | null>(null);
  const [showPaymentLoader, setShowPaymentLoader] = useState(false);

  // Store form data persistently
  const storeFormData = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to store form data:', error);
    }
  };

  // Restore form data
  const restoreFormData = (key: string) => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to restore form data:', error);
      return null;
    }
  };

  const contactForm = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      fullName: '',
      email: user?.email || '',
      phone: '',
      company: '',
      projectDescription: ''
    }
  });

  const paymentForm = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      timeline: '',
      paymentMethod: 'paystack'
    }
  });

  // Restore saved contact data on mount
  useEffect(() => {
    const savedContactData = restoreFormData('checkout_contact_data');
    if (savedContactData) {
      contactForm.reset(savedContactData);
      setContactData(savedContactData);
      setCurrentStep(2);
    }
  }, [contactForm]);

  const orderMutation = useMutation({
    mutationFn: async (data: ContactForm & PaymentForm & { 
      overrideSelectedAddOns?: string[]; 
      overrideTotalAmount?: number; 
    }) => {
      console.log('💳 [CHECKOUT] Submitting order with data:', data);
      
      const orderData = {
        serviceId: service.id,
        contactInfo: {
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          company: data.company || ''
        },
        projectDetails: {
          description: data.projectDescription
        },
        selectedAddOns: data.overrideSelectedAddOns || selectedAddOns,
        totalAmount: data.overrideTotalAmount || totalPrice
      };

      console.log('💳 [CHECKOUT] Final order data being sent:', orderData);
      
      const response = await apiRequest('POST', '/api/orders', orderData);

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to create order: ${errorData}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log('✅ [ORDER SUCCESS] Order created successfully:', data);
      if (data && data.paymentUrl) {
        console.log('✅ [ORDER SUCCESS] Redirecting to Paystack:', data.paymentUrl);
        
        // Clear stored data since we're proceeding to payment
        localStorage.removeItem('checkout_contact_data');
        sessionStorage.removeItem('pendingCheckout');
        
        // Set payment flag and redirect immediately
        sessionStorage.setItem('payment_in_progress', 'true');
        window.location.href = data.paymentUrl;
      } else {
        console.log('✅ [ORDER SUCCESS] No payment URL, showing success message');
        toast({
          title: "Order placed successfully!",
          description: "We'll contact you shortly to discuss your project.",
        });
        onSuccess();
      }
    },
    onError: (error) => {
      console.error('❌ [ORDER ERROR] Order creation failed:', error);
      setShowPaymentLoader(false);
      sessionStorage.removeItem('payment_in_progress');
      toast({
        title: "Order failed",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Handle pending checkout completion after authentication
  useEffect(() => {
    console.log('🔄 [USE EFFECT] Auth flow triggered - user:', !!user, 'isPending:', orderMutation.isPending);
    
    if (user && !orderMutation.isPending) {
      const pendingCheckout = sessionStorage.getItem('pendingCheckout');
      console.log('🔄 [USE EFFECT] Pending checkout found:', !!pendingCheckout);
      
      if (pendingCheckout) {
        try {
          const checkoutData = JSON.parse(pendingCheckout);
          console.log('🔄 [USE EFFECT] Parsed checkout data:', checkoutData);
          
          // Remove pending checkout immediately
          sessionStorage.removeItem('pendingCheckout');
          
          // Set payment flags immediately to show loader
          sessionStorage.setItem('payment_in_progress', 'true');
          setShowPaymentLoader(true);
          
          // Process payment directly without showing checkout form
          console.log('🔄 [AUTO-SUBMIT] Processing payment directly, bypassing checkout form');
          
          // Validate user authentication
          if (!user.email) {
            toast({
              title: "Authentication Error",
              description: "Please log in again to complete your order.",
              variant: "destructive",
            });
            setLocation('/auth');
            return;
          }
          
          // Prepare payment data immediately
          const contactDataToUse = { ...checkoutData.contactData };
          if (!contactDataToUse.email && user.email) {
            contactDataToUse.email = user.email;
          }
          
          // Validate required fields
          if (!contactDataToUse.fullName || !contactDataToUse.email || !contactDataToUse.projectDescription) {
            toast({
              title: "Incomplete Information",
              description: "Please fill out all required contact information.",
              variant: "destructive",
            });
            setShowPaymentLoader(false);
            sessionStorage.removeItem('payment_in_progress');
            return;
          }
          
          // Submit payment immediately
          const combinedData = { 
            ...contactDataToUse, 
            paymentMethod: "paystack" as const,
            timeline: checkoutData.paymentData?.timeline || "2-4 weeks",
            overrideSelectedAddOns: checkoutData.selectedAddOns || [],
            overrideTotalAmount: checkoutData.totalPrice || totalPrice
          };
          
          console.log('🔄 [AUTO-SUBMIT] Submitting payment data:', combinedData);
          orderMutation.mutate(combinedData);
          
        } catch (error) {
          console.error('🔄 [AUTO-SUBMIT] Error processing pending checkout:', error);
          sessionStorage.removeItem('pendingCheckout');
          setShowPaymentLoader(false);
          sessionStorage.removeItem('payment_in_progress');
        }
      }
    }
  }, [user, orderMutation.isPending, totalPrice, setLocation, toast, orderMutation]);

  const onContactSubmit = (data: ContactForm) => {
    storeFormData('checkout_contact_data', data);
    setContactData(data);
    setCurrentStep(2);
  };

  const onPaymentSubmit = (data: PaymentForm) => {
    if (!contactData) return;
    
    // Check if user is authenticated first
    if (!user) {
      // Store all checkout data for after authentication
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
    
    // User is authenticated - show loader and proceed with payment
    setShowPaymentLoader(true);
    
    // Prepare the final data
    const finalContactData = { ...contactData };
    if (!finalContactData.email && user.email) {
      finalContactData.email = user.email;
    }
    
    const combinedData = { ...finalContactData, ...data };
    orderMutation.mutate(combinedData);
  };

  // Show PaymentLoader if it's active or if authenticated user has pending checkout
  const pendingCheckout = typeof window !== 'undefined' && sessionStorage.getItem('pendingCheckout');
  const shouldShowLoader = showPaymentLoader || orderMutation.isPending || (user && pendingCheckout);
  
  if (shouldShowLoader) {
    return (
      <PaymentLoader 
        serviceName={service.name}
        amount={totalPrice}
        onComplete={onSuccess}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              💳
            </div>
            Secure Checkout
          </CardTitle>
          <CardDescription>
            Complete your order for {service.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${currentStep >= 1 ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground'}`}>
                1
              </div>
              <span className="hidden sm:inline">Contact</span>
            </div>
            <div className="flex-1 mx-4">
              <Progress value={currentStep >= 2 ? 100 : 0} className="h-2" />
            </div>
            <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${currentStep >= 2 ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground'}`}>
                2
              </div>
              <span className="hidden sm:inline">Payment</span>
            </div>
          </div>

          {/* Step 1: Contact Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Contact Information</h3>
                <p className="text-sm text-muted-foreground">
                  Tell us about yourself and your project requirements.
                </p>
              </div>

              <Form {...contactForm}>
                <form onSubmit={contactForm.handleSubmit(onContactSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={contactForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={contactForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter your email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={contactForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={contactForm.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your company name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={contactForm.control}
                    name="projectDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Description *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Briefly describe your project requirements, goals, and any specific features you need."
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full">
                    Continue to Payment
                  </Button>
                </form>
              </Form>
            </div>
          )}

          {/* Step 2: Payment Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Payment Details</h3>
                <p className="text-sm text-muted-foreground">
                  Review your order and complete payment.
                </p>
              </div>

              {/* Order Summary */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-3">Order Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{service.name}</span>
                    <span>₦{totalPrice.toLocaleString()}</span>
                  </div>
                  {selectedAddOns.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Add-ons: {selectedAddOns.join(', ')}
                    </div>
                  )}
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>₦{totalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Form {...paymentForm}>
                <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">
                  <FormField
                    control={paymentForm.control}
                    name="timeline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Timeline</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your preferred timeline" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1-2 weeks">1-2 weeks (Rush - +20%)</SelectItem>
                            <SelectItem value="2-4 weeks">2-4 weeks (Standard)</SelectItem>
                            <SelectItem value="4-6 weeks">4-6 weeks (Extended)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <h4 className="font-semibold">Payment Method</h4>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <div className="w-4 h-4 rounded-full bg-primary"></div>
                      <span>Paystack (Cards, Bank Transfer, USSD)</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setCurrentStep(1)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={orderMutation.isPending}
                    >
                      {orderMutation.isPending ? 'Processing...' : 'Complete Payment'}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}