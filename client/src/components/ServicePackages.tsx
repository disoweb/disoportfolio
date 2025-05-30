import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  ArrowRight,
  Clock,
  Users,
  TrendingUp,
  AlertTriangle,
  Star,
  Calculator,
  CreditCard,
  Shield,
  Calendar,
} from "lucide-react";

const services = [
  {
    id: "landing",
    name: "Landing Page",
    description: "Perfect for showcasing your business",
    price: 150000,
    originalPrice: 200000,
    duration: "3-5 days",
    deliveryDate: "2025-02-05",
    spots: 8,
    totalSpots: 10,
    features: [
      "Responsive design",
      "Contact form",
      "SEO optimization",
      "Basic analytics",
      "Social media integration",
      "1 month support",
    ],
    addOns: [
      { name: "WhatsApp Integration", price: 15000 },
      { name: "Live Chat Widget", price: 25000 },
      { name: "Advanced Analytics", price: 20000 },
    ],
    recommended: false,
    category: "startup",
    industry: ["tech", "consulting", "portfolio"],
  },
  {
    id: "ecommerce",
    name: "E-commerce Website",
    description: "Complete online store solution",
    price: 450000,
    originalPrice: 600000,
    duration: "2-3 weeks",
    deliveryDate: "2025-02-20",
    spots: 3,
    totalSpots: 5,
    features: [
      "Product catalog",
      "Shopping cart",
      "Payment integration",
      "Order management",
      "Inventory tracking",
      "Customer accounts",
      "Mobile responsive",
      "3 months support",
    ],
    addOns: [
      { name: "Multi-vendor Support", price: 100000 },
      { name: "Advanced Reporting", price: 50000 },
      { name: "Email Marketing Integration", price: 35000 },
    ],
    recommended: true,
    category: "business",
    industry: ["retail", "fashion", "electronics"],
  },
  {
    id: "webapp",
    name: "Web Application",
    description: "Custom functionality for your needs",
    price: 800000,
    originalPrice: 1000000,
    duration: "4-6 weeks",
    deliveryDate: "2025-03-15",
    spots: 2,
    totalSpots: 3,
    features: [
      "Custom development",
      "User authentication",
      "Database integration",
      "API development",
      "Admin dashboard",
      "Advanced security",
      "6 months support",
    ],
    addOns: [
      { name: "Mobile App", price: 400000 },
      { name: "Third-party Integrations", price: 150000 },
      { name: "Advanced Security", price: 100000 },
    ],
    recommended: false,
    category: "enterprise",
    industry: ["saas", "healthcare", "fintech"],
  },
];

const industryRecommendations = {
  tech: ["webapp", "landing"],
  retail: ["ecommerce", "landing"],
  consulting: ["landing", "webapp"],
  healthcare: ["webapp", "landing"],
  finance: ["webapp", "landing"],
  education: ["webapp", "landing"],
  restaurant: ["ecommerce", "landing"],
};

function PricingCalculator({
  service,
  onPriceUpdate,
}: {
  service: any;
  onPriceUpdate: (total: number) => void;
}) {
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [installmentPlan, setInstallmentPlan] = useState(false);

  const totalPrice =
    service.price +
    selectedAddOns.reduce((sum, addonName) => {
      const addon = service.addOns.find((a: any) => a.name === addonName);
      return sum + (addon?.price || 0);
    }, 0);

  const savings = service.originalPrice - service.price;
  const savingsPercentage = Math.round((savings / service.originalPrice) * 100);

  useEffect(() => {
    onPriceUpdate(totalPrice);
  }, [totalPrice]);

  const toggleAddOn = (addonName: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(addonName)
        ? prev.filter((name) => name !== addonName)
        : [...prev, addonName],
    );
  };

  return (
    <div className="space-y-4">
      {/* Base Price */}
      <div className="flex items-center justify-between">
        <span className="font-medium">{service.name}</span>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-slate-500 line-through">
            ₦{service.originalPrice.toLocaleString()}
          </span>
          <span className="font-bold">₦{service.price.toLocaleString()}</span>
          <Badge variant="destructive" className="text-xs">
            -{savingsPercentage}%
          </Badge>
        </div>
      </div>

      {/* Add-ons */}
      {service.addOns.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            Recommended Add-ons:
          </p>
          {service.addOns.map((addon: any) => (
            <div
              key={addon.name}
              className="flex items-center justify-between p-2 border rounded"
            >
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={addon.name}
                  checked={selectedAddOns.includes(addon.name)}
                  onChange={() => toggleAddOn(addon.name)}
                  className="rounded"
                />
                <label htmlFor={addon.name} className="text-sm">
                  {addon.name}
                </label>
              </div>
              <span className="text-sm font-medium">
                +₦{addon.price.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Installment Option */}
      <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded">
        <input
          type="checkbox"
          id="installment"
          checked={installmentPlan}
          onChange={(e) => setInstallmentPlan(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="installment" className="text-sm">
          Pay in 3 installments ({(totalPrice / 3).toLocaleString()}/month)
        </label>
        <CreditCard className="h-4 w-4 text-blue-600" />
      </div>

      {/* Total */}
      <Separator />
      <div className="flex items-center justify-between text-lg font-bold">
        <span>Total</span>
        <span>₦{totalPrice.toLocaleString()}</span>
      </div>

      {installmentPlan && (
        <p className="text-xs text-slate-600">
          First payment: ₦{Math.ceil(totalPrice / 3).toLocaleString()} •
          Remaining: 2 monthly payments
        </p>
      )}
    </div>
  );
}

function ROICalculator({ service }: { service: any }) {
  const [monthlyRevenue, setMonthlyRevenue] = useState(500000);

  const projectedIncrease =
    service.id === "ecommerce" ? 40 : service.id === "webapp" ? 35 : 25;
  const monthlyIncrease = (monthlyRevenue * projectedIncrease) / 100;
  const roiMonths = Math.ceil(service.price / monthlyIncrease);

  return (
    <div className="bg-green-50 p-4 rounded-lg">
      <h4 className="font-semibold text-green-800 mb-2 flex items-center">
        <Calculator className="h-4 w-4 mr-1" />
        ROI Calculator
      </h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Expected revenue increase:</span>
          <span className="font-medium">+{projectedIncrease}%</span>
        </div>
        <div className="flex justify-between">
          <span>Monthly revenue boost:</span>
          <span className="font-medium">
            ₦{monthlyIncrease.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between text-green-700 font-bold">
          <span>ROI breakeven:</span>
          <span>{roiMonths} months</span>
        </div>
      </div>
    </div>
  );
}

export default function ServicePackages() {
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [priceUpdates, setPriceUpdates] = useState<{ [key: string]: number }>(
    {},
  );

  // Wrap handlePriceUpdate in useCallback to prevent infinite loops
  const handlePriceUpdate = useCallback((serviceId: string, price: number) => {
    setPriceUpdates((prev) => ({ ...prev, [serviceId]: price }));
  }, []);

  const getRecommendedServices = () => {
    if (!selectedIndustry) return services;
    const recommended =
      industryRecommendations[
        selectedIndustry as keyof typeof industryRecommendations
      ] || [];
    return services
      .map((service) => ({
        ...service,
        recommended: recommended.includes(service.id),
      }))
      .sort((a, b) => (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0));
  };

  const recommendedServices = getRecommendedServices();

  return (
    <div className="space-y-8">
      {/* Industry Selection */}
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4">What's your industry?</h3>
        <div className="flex flex-wrap justify-center gap-2">
          {Object.keys(industryRecommendations).map((industry) => (
            <Button
              key={industry}
              variant={selectedIndustry === industry ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedIndustry(industry)}
              className="capitalize"
            >
              {industry}
            </Button>
          ))}
        </div>
        {selectedIndustry && (
          <p className="text-sm text-blue-600 mt-2">
            ✨ Showing personalized recommendations for {selectedIndustry}{" "}
            businesses
          </p>
        )}
      </div>

      {/* Services Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {recommendedServices.map((service) => (
          <Card
            key={service.id}
            className={`relative ${
              service.recommended ? "ring-2 ring-blue-500" : ""
            }`}
          >
            {service.recommended && (
              <Badge className="absolute -top-2 left-4 bg-blue-600">
                <Star className="h-3 w-3 mr-1" />
                Recommended for you
              </Badge>
            )}

            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{service.name}</CardTitle>
                {service.spots <= 3 && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {service.spots} left
                  </Badge>
                )}
              </div>
              <CardDescription>{service.description}</CardDescription>

              {/* Delivery Info */}
              <div className="flex items-center space-x-4 text-sm text-slate-600">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {service.duration}
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  By {new Date(service.deliveryDate).toLocaleDateString()}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Pricing Calculator */}
              <PricingCalculator
                service={service}
                onPriceUpdate={(price) => handlePriceUpdate(service.id, price)}
              />

              {/* Features */}
              <div className="space-y-2">
                <p className="font-medium text-sm">What's included:</p>
                <div className="grid grid-cols-1 gap-1">
                  {service.features.slice(0, 4).map((feature, index) => (
                    <div key={index} className="flex items-center text-sm">
                      <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </div>
                  ))}
                  {service.features.length > 4 && (
                    <p className="text-xs text-slate-500">
                      +{service.features.length - 4} more features
                    </p>
                  )}
                </div>
              </div>

              {/* ROI Calculator */}
              <ROICalculator service={service} />

              {/* Availability Alert */}
              {service.spots <= 5 && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    Only {service.spots} spots available this month!
                  </AlertDescription>
                </Alert>
              )}

              {/* CTA Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={() =>
                  (window.location.href = `/services/${service.id}`)
                }
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              {/* Trust Signals */}
              <div className="flex items-center justify-center space-x-2 text-xs text-slate-500">
                <Shield className="h-3 w-3" />
                <span>30-day guarantee</span>
                <span>•</span>
                <span>Secure payment</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Social Proof */}
      <div className="text-center py-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <div className="flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center">
            <Users className="h-4 w-4 text-blue-600 mr-1" />
            <span>500+ projects delivered</span>
          </div>
          <div className="flex items-center">
            <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
            <span>98% client satisfaction</span>
          </div>
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-500 mr-1" />
            <span>4.9/5 average rating</span>
          </div>
        </div>
      </div>
    </div>
  );
}