
import React, { useState } from "react";
import { useLocation } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CheckoutForm from "@/components/CheckoutForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, Clock, DollarSign, Users, ArrowLeft, Star, MessageCircle, Phone } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/hooks/useAuth";

const serviceData = {
  "basic-website": {
    title: "Basic Website Package",
    price: "₦150,000",
    duration: "1-2 weeks",
    description: "Perfect for small businesses and personal portfolios. A clean, professional website that establishes your online presence.",
    features: [
      "Up to 5 pages",
      "Responsive design",
      "Contact form",
      "Basic SEO optimization",
      "Social media integration",
      "1 month free maintenance"
    ],
    ideal: ["Small businesses", "Personal portfolios", "Service providers", "Local businesses"],
    deliverables: [
      "Fully functional website",
      "Mobile-responsive design",
      "Contact form setup",
      "Basic analytics setup",
      "Training documentation"
    ],
    process: [
      "Discovery call and requirements gathering",
      "Design mockups and approval",
      "Development and testing",
      "Content integration",
      "Launch and handover"
    ],
    faq: [
      {
        question: "How long does it take to complete?",
        answer: "Typically 1-2 weeks from approval of design mockups, depending on content readiness and feedback cycles."
      },
      {
        question: "What if I need more pages later?",
        answer: "Additional pages can be added for ₦15,000 each. We offer flexible expansion options."
      },
      {
        question: "Do you provide hosting?",
        answer: "We can recommend hosting providers and help with setup. Hosting costs are separate and typically range from ₦15,000-₦30,000 annually."
      },
      {
        question: "Can I update the content myself?",
        answer: "Yes, we can integrate a user-friendly CMS that allows you to update content easily."
      }
    ]
  },
  "ecommerce": {
    title: "E-commerce Solution",
    price: "₦400,000",
    duration: "3-4 weeks",
    description: "Complete online store solution with payment integration, inventory management, and customer portal.",
    features: [
      "Unlimited products",
      "Payment gateway integration",
      "Inventory management",
      "Customer accounts",
      "Order tracking",
      "Admin dashboard",
      "SEO optimization",
      "3 months support"
    ],
    ideal: ["Online retailers", "Product-based businesses", "Digital stores", "Subscription services"],
    deliverables: [
      "Full e-commerce website",
      "Payment system integration",
      "Admin dashboard",
      "Customer portal",
      "Product catalog",
      "Order management system"
    ],
    process: [
      "Business analysis and planning",
      "Payment gateway setup",
      "Design and user experience",
      "Development and integration",
      "Testing and optimization",
      "Launch and training"
    ],
    faq: [
      {
        question: "Which payment methods are supported?",
        answer: "We integrate Paystack, Flutterwave, and bank transfers. Credit cards, bank transfers, and USSD payments are supported."
      },
      {
        question: "Can I manage inventory?",
        answer: "Yes, the admin dashboard includes complete inventory management with stock alerts and reporting."
      },
      {
        question: "Is there a transaction fee?",
        answer: "Payment gateway fees apply (typically 1.5-2.9% + ₦100 per transaction). No additional fees from us."
      },
      {
        question: "Can customers track their orders?",
        answer: "Yes, customers get automated email updates and can track orders through their account portal."
      }
    ]
  },
  "web-app": {
    title: "Custom Web Application",
    price: "From ₦800,000",
    duration: "6-12 weeks",
    description: "Tailored web applications built to solve your specific business challenges with advanced functionality.",
    features: [
      "Custom functionality",
      "User authentication",
      "Database integration",
      "API development",
      "Third-party integrations",
      "Admin panel",
      "Advanced security",
      "6 months support"
    ],
    ideal: ["SaaS platforms", "Business automation", "Custom workflows", "Enterprise solutions"],
    deliverables: [
      "Custom web application",
      "User management system",
      "API documentation",
      "Admin dashboard",
      "Database architecture",
      "Security implementation"
    ],
    process: [
      "Requirements analysis",
      "System architecture design",
      "Database design",
      "Backend development",
      "Frontend development",
      "Testing and deployment"
    ],
    faq: [
      {
        question: "How do you determine the final price?",
        answer: "Price depends on complexity, features, and timeline. We provide detailed quotes after requirements analysis."
      },
      {
        question: "Can the application scale?",
        answer: "Yes, we build with scalability in mind using modern cloud architecture and best practices."
      },
      {
        question: "Do you provide ongoing maintenance?",
        answer: "Yes, we offer maintenance packages starting from ₦50,000/month including updates, security patches, and support."
      },
      {
        question: "Can you integrate with existing systems?",
        answer: "Absolutely. We specialize in API integrations and can connect with most existing business systems."
      }
    ]
  }
};

export default function ServiceDetails() {
  const [location, setLocation] = useLocation();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const { user } = useAuth();
  const serviceId = location.split('/service/')[1];
  const service = serviceData[serviceId as keyof typeof serviceData];

  if (!service) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Service Not Found</h1>
          <Button onClick={() => setLocation('/services')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Services
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button
            variant="ghost"
            onClick={() => setLocation('/services')}
            className="mb-4 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Services
          </Button>
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{service.title}</h1>
              <p className="text-lg text-gray-600 mt-2">{service.description}</p>
              <div className="flex items-center space-x-6 mt-4">
                <div className="flex items-center text-green-600">
                  <DollarSign className="h-5 w-5 mr-1" />
                  <span className="font-semibold">{service.price}</span>
                </div>
                <div className="flex items-center text-blue-600">
                  <Clock className="h-5 w-5 mr-1" />
                  <span>{service.duration}</span>
                </div>
                <div className="flex items-center text-yellow-600">
                  <Star className="h-5 w-5 mr-1" />
                  <span>4.9/5 rating</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 lg:mt-0 space-y-3">
              <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="lg" 
                    className="w-full sm:flex-1 lg:w-auto bg-blue-600 hover:bg-blue-700 h-11 sm:h-12"
                    onClick={() => {
                      if (!user) {
                        setLocation('/auth');
                      } else {
                        setIsCheckoutOpen(true);
                      }
                    }}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    <span className="text-sm sm:text-base">Get Started</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
                  <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl">Order {service.title}</DialogTitle>
                  </DialogHeader>
                  <CheckoutForm 
                    service={{
                      id: serviceId,
                      name: service.title,
                      price: service.price,
                      description: service.description
                    }}
                    onSuccess={() => {
                      setIsCheckoutOpen(false);
                      setLocation('/dashboard');
                    }}
                  />
                </DialogContent>
              </Dialog>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full sm:flex-1 lg:w-auto h-11 sm:h-12"
                onClick={() => setLocation('/contact')}
              >
                <Phone className="mr-2 h-4 w-4" />
                <span className="text-sm sm:text-base">Request Quote</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Features */}
            <Card>
              <CardHeader>
                <CardTitle>What's Included</CardTitle>
                <CardDescription>Everything you get with this package</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {service.features.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Process */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">Our Process</CardTitle>
                <CardDescription>How we deliver your project</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {service.process.map((step, index) => (
                    <div key={index} className="flex items-start space-x-3 sm:space-x-4">
                      <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm">
                        {index + 1}
                      </div>
                      <p className="text-sm sm:text-base text-gray-700 pt-1">{step}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* FAQ */}
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <CardDescription>Common questions about this service</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {service.faq.map((item, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                      <AccordionContent className="text-gray-600">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 order-first lg:order-last">
            {/* Quick Info */}
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="font-semibold text-gray-900 text-sm sm:text-base">Price</div>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">{service.price}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm sm:text-base">Timeline</div>
                  <div className="text-gray-600 text-sm sm:text-base">{service.duration}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm sm:text-base">Support</div>
                  <div className="text-gray-600 text-sm sm:text-base">Included</div>
                </div>
                <Button 
                  className="w-full h-11 sm:h-12 text-sm sm:text-base" 
                  onClick={() => {
                    if (!user) {
                      setLocation('/auth');
                    } else {
                      setIsCheckoutOpen(true);
                    }
                  }}
                >
                  Get Started Today
                </Button>
              </CardContent>
            </Card>

            {/* Ideal For */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Ideal For</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {service.ideal.map((item, index) => (
                    <Badge key={index} variant="secondary" className="text-xs sm:text-sm">
                      {item}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Deliverables */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Deliverables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {service.deliverables.map((item, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-600">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
