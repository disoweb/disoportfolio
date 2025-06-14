import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  ChevronDown,
  ChevronUp,
  Heart, // Added for the new social proof item
} from "lucide-react";

// Define types for better clarity
interface AddOn {
  name: string;
  price: number;
}

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  duration: string;
  deliveryDate: string;
  spots: number;
  totalSpots: number;
  features: string[];
  addOns: AddOn[];
  recommended: boolean;
  category: string;
  industry: string[];
}

const initialServices: Omit<Service, "recommended">[] = [
  {
    id: "landing",
    name: "Landing Page",
    description: "Perfect for showcasing your business",
    price: 150000,
    originalPrice: 200000,
    duration: "3-5 days",
    deliveryDate: "2025-02-05",
    spots: 2,
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
    spots: 4,
    totalSpots: 5,
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
    category: "enterprise",
    industry: ["saas", "healthcare", "fintech"],
  },
  {
    id: "hospital-management",
    name: "Hospital App",
    description: "Streamline hospital operations and patient care",
    price: 1200000,
    originalPrice: 1500000,
    duration: "6-8 weeks",
    deliveryDate: "2025-04-10",
    spots: 2,
    totalSpots: 3,
    features: [
      "Patient Registration & Management",
      "Appointment Scheduling",
      "Electronic Health Records (EHR)",
      "Billing & Invoicing",
      "Inventory Management (Pharmacy/Supplies)",
      "Staff Management & Payroll",
      "Reporting & Analytics",
      "Secure Data Handling (e.g., HIPAA-compliant design)",
      "6 months premium support",
    ],
    addOns: [
      { name: "Telemedicine Module", price: 300000 },
      { name: "Advanced Reporting & BI", price: 150000 },
      { name: "Patient Portal", price: 200000 },
      { name: "HL7/FHIR Integration Support", price: 250000 },
    ],
    category: "enterprise",
    industry: ["healthcare"],
  },
];

const industryRecommendations: Record<string, string[]> = {
  tech: ["webapp", "landing"],
  retail: ["ecommerce", "landing"],
  consulting: ["landing", "webapp"],
  healthcare: ["webapp", "landing", "hospital-management"],
  finance: ["webapp", "landing"],
  education: ["webapp", "landing"],
  restaurant: ["ecommerce", "landing"],
};

interface PricingCalculatorProps {
  service: Service;
  reportPriceUpdate: (serviceId: string, total: number) => void;
  currentSelectedAddOns: string[];
}

function PricingCalculator({
  service,
  reportPriceUpdate,
  currentSelectedAddOns,
}: PricingCalculatorProps) {
  const [installmentPlan, setInstallmentPlan] = useState(false);

  const basePrice = useMemo(() => {
    return (
      service.price +
      currentSelectedAddOns.reduce((sum, addonName) => {
        const addon = service.addOns.find((a) => a.name === addonName);
        return sum + (addon?.price || 0);
      }, 0)
    );
  }, [service.price, service.addOns, currentSelectedAddOns]);

  const totalPrice = useMemo(() => {
    return installmentPlan ? Math.round(basePrice * 1.3) : basePrice;
  }, [basePrice, installmentPlan]);

  const savings = service.originalPrice - service.price;
  const savingsPercentage = Math.round((savings / service.originalPrice) * 100);

  useEffect(() => {
    reportPriceUpdate(service.id, totalPrice);
  }, [service.id, totalPrice, reportPriceUpdate]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-slate-500 line-through">
            ₦{service.originalPrice.toLocaleString()}
          </span>
          <span className="font-bold">₦{service.price.toLocaleString()}</span>
          {savings > 0 && (
            <Badge variant="destructive" className="text-xs">
              -{savingsPercentage}%
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
        <input
          type="checkbox"
          id={`installment-${service.id}`}
          checked={installmentPlan}
          onChange={(e) => setInstallmentPlan(e.target.checked)}
          className="rounded accent-blue-600"
          aria-label={`Pay ${service.name} in installments`}
        />
        <label
          htmlFor={`installment-${service.id}`}
          className="text-sm flex-grow"
        >
          Pay in 3 Installments (₦{Math.ceil(totalPrice / 3).toLocaleString()}
          /month)
          {installmentPlan && (
            <>
              <span className="text-xs text-red-600 ml-1">(+30% fee)</span>
              <p className="text-xs text-slate-600 mt-1">
                First payment: ₦{Math.ceil(totalPrice / 3).toLocaleString()}{" "}
                <br />
                Remaining: 2 monthly payments
              </p>
            </>
          )}
        </label>
        <CreditCard className="h-4 w-4 text-blue-600 flex-shrink-0" />
      </div>

      <Separator />
      <div className="flex items-center justify-between text-lg font-bold">
        <span>Total</span>
        <span>₦{totalPrice.toLocaleString()}</span>
      </div>
    </div>
  );
}

function ROICalculator({ service }: { service: Service }) {
  const [monthlyRevenue, setMonthlyRevenue] = useState(500000);
  const [showROI, setShowROI] = useState(false);

  const projectedIncrease = useMemo(() => {
    switch (service.id) {
      case "ecommerce":
        return 40;
      case "webapp":
        return 35;
      case "hospital-management":
        return 50;
      default:
        return 25;
    }
  }, [service.id]);

  const monthlyIncrease = useMemo(
    () => (monthlyRevenue * projectedIncrease) / 100,
    [monthlyRevenue, projectedIncrease],
  );
  const roiMonths = useMemo(
    () =>
      monthlyIncrease > 0
        ? Math.ceil(service.price / monthlyIncrease)
        : Infinity,
    [service.price, monthlyIncrease],
  );

  return (
    <div className="bg-green-50 p-3 rounded-lg">
      <button
        onClick={() => setShowROI(!showROI)}
        className="w-full flex items-center justify-between text-left"
        aria-expanded={showROI}
        aria-controls={`roi-details-${service.id}`}
      >
        <h4 className="font-semibold text-green-800 flex items-center space-x-1">
          <Calculator className="h-4 w-4" />
          <span>ROI Calculator</span>
        </h4>
        {showROI ? (
          <ChevronUp className="h-4 w-4 text-green-800" />
        ) : (
          <ChevronDown className="h-4 w-4 text-green-800" />
        )}
      </button>

      {showROI && (
        <div
          id={`roi-details-${service.id}`}
          className="mt-3 space-y-2 text-sm"
        >
          <div className="flex items-center justify-between">
            <label
              htmlFor={`monthlyRevenue-${service.id}`}
              className="text-xs text-slate-700"
            >
              Current Avg. Monthly Revenue (₦):
            </label>
            <input
              type="number"
              id={`monthlyRevenue-${service.id}`}
              value={monthlyRevenue}
              onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
              className="w-24 p-1 border rounded text-xs text-right"
              step="10000"
              aria-label="Current Average Monthly Revenue"
            />
          </div>
          <div className="flex justify-between">
            <span>Expected revenue increase:</span>
            <span className="font-medium text-green-700">
              +{projectedIncrease}%
            </span>
          </div>
          <div className="flex justify-between">
            <span>Monthly revenue boost:</span>
            <span className="font-medium text-green-700">
              ₦{monthlyIncrease.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-green-700 font-bold">
            <span>ROI breakeven:</span>
            <span>
              {roiMonths === Infinity
                ? "N/A (check revenue/boost)"
                : `${roiMonths} months`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ServicePackages() {
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [priceUpdates, setPriceUpdates] = useState<{ [key: string]: number }>(
    {},
  );
  const [openAddOns, setOpenAddOns] = useState<Record<string, boolean>>({});
  const [selectedAddOns, setSelectedAddOns] = useState<
    Record<string, string[]>
  >({});

  const handlePriceUpdateCallback = useCallback(
    (serviceId: string, price: number) => {
      setPriceUpdates((prev) => ({ ...prev, [serviceId]: price }));
    },
    [],
  );

  const toggleAddOnsVisibility = useCallback((serviceId: string) => {
    setOpenAddOns((prev) => ({
      ...prev,
      [serviceId]: !prev[serviceId],
    }));
  }, []);

  const handleToggleAddOnForService = useCallback(
    (serviceId: string, addonName: string) => {
      setSelectedAddOns((prevSelectedAddOns) => {
        const currentAddonsForService = prevSelectedAddOns[serviceId] || [];
        const newAddonsForService = currentAddonsForService.includes(addonName)
          ? currentAddonsForService.filter((name) => name !== addonName)
          : [...currentAddonsForService, addonName];
        return {
          ...prevSelectedAddOns,
          [serviceId]: newAddonsForService,
        };
      });
    },
    [],
  );

  const recommendedServices = useMemo((): Service[] => {
    const baseServicesWithDynamicRecommended = initialServices.map((s) => ({
      ...s,
      recommended: false,
    }));
    if (!selectedIndustry) {
      return baseServicesWithDynamicRecommended
        .map((s) => ({
          ...s,
          recommended: s.category === "business" || s.category === "enterprise",
        }))
        .sort((a, b) => (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0));
    }

    const recommendedIds = industryRecommendations[selectedIndustry] || [];

    return baseServicesWithDynamicRecommended
      .map((service) => ({
        ...service,
        recommended: recommendedIds.includes(service.id),
      }))
      .sort((a, b) => (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0));
  }, [selectedIndustry]);

  return (
    <div className="space-y-8 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="text-center bg-slate-50 p-6 rounded-xl shadow">
        <h3 className="text-xl md:text-2xl font-semibold mb-4 text-slate-800">
          What's your industry?
        </h3>
        <div className="flex flex-wrap justify-center gap-2">
          {Object.keys(industryRecommendations).map((industry) => (
            <Button
              key={industry}
              variant={selectedIndustry === industry ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedIndustry(industry)}
              className="capitalize transition-all duration-150 ease-in-out hover:shadow-md"
            >
              {industry}
            </Button>
          ))}
        </div>
        {selectedIndustry && (
          <p className="text-sm text-blue-600 mt-3">
            ✨ Showing personalized recommendations for {selectedIndustry}{" "}
            businesses
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {recommendedServices.map((service) => {
          return (
            <Card
              key={service.id}
              className={`flex flex-col transition-all duration-300 ease-in-out hover:shadow-xl ${
                service.recommended
                  ? "ring-2 ring-blue-500 shadow-blue-200"
                  : "shadow-lg"
              } rounded-xl overflow-hidden`}
            >
              <CardHeader
                className={`relative p-4 md:p-6 bg-slate-50 ${
                  service.recommended ? "pt-10 md:pt-12" : ""
                }`}
              >
                {service.recommended && (
                  <Badge className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-blue-600 text-white px-3 py-1 rounded-full text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    Recommended
                  </Badge>
                )}
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg md:text-xl text-slate-800">
                    {service.name}
                  </CardTitle>
                  {service.spots <= 3 && service.spots > 0 && (
                    <Badge
                      variant="destructive"
                      className="text-xs whitespace-nowrap ml-2"
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {service.spots} left
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-sm text-slate-600 pt-1">
                  {service.description}
                </CardDescription>

                <div className="flex items-center space-x-4 text-xs md:text-sm text-slate-500 mt-3">
                  <div className="flex items-center">
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    {service.duration}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                    By{" "}
                    {new Date(service.deliveryDate).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", year: "numeric" },
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-grow space-y-4 p-4 md:p-6 flex flex-col">
                <PricingCalculator
                  service={service}
                  reportPriceUpdate={handlePriceUpdateCallback}
                  currentSelectedAddOns={selectedAddOns[service.id] || []}
                />

                <div className="space-y-2 pt-2">
                  <p className="font-medium text-sm text-slate-700">
                    What's included:
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {service.features.slice(0, 4).map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center text-sm text-slate-600"
                      >
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </div>
                    ))}
                    {service.features.length > 4 && (
                      <p className="text-xs text-slate-500 pl-6">
                        +{service.features.length - 4} more features
                      </p>
                    )}
                  </div>
                </div>

                {service.addOns.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => toggleAddOnsVisibility(service.id)}
                      className="flex items-center justify-between text-sm font-medium text-blue-600 hover:text-blue-700 w-full p-2 rounded-md hover:bg-blue-50 transition-colors"
                      aria-expanded={openAddOns[service.id] || false}
                      aria-controls={`addons-details-${service.id}`}
                    >
                      <span>Recommended Add-ons</span>
                      {openAddOns[service.id] ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>

                    {openAddOns[service.id] && (
                      <div
                        id={`addons-details-${service.id}`}
                        className="space-y-2 pt-1 pl-2 border-l-2 border-blue-100"
                      >
                        {service.addOns.map((addon) => (
                          <div
                            key={addon.name}
                            className="flex items-center justify-between p-2 border border-slate-200 rounded-md bg-white"
                          >
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`${service.id}-${addon.name}`}
                                checked={
                                  selectedAddOns[service.id]?.includes(
                                    addon.name,
                                  ) || false
                                }
                                onChange={() =>
                                  handleToggleAddOnForService(
                                    service.id,
                                    addon.name,
                                  )
                                }
                                className="rounded accent-blue-600"
                                aria-label={`Select add-on ${addon.name}`}
                              />
                              <label
                                htmlFor={`${service.id}-${addon.name}`}
                                className="text-sm text-slate-700"
                              >
                                {addon.name}
                              </label>
                            </div>
                            <span className="text-sm font-medium text-slate-600">
                              +₦{addon.price.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-auto space-y-4 pt-4">
                  <ROICalculator service={service} />

                  {service.id === "landing" && service.spots === 2 && (
                    <Alert className="border-orange-300 bg-orange-50 text-orange-800 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-xs md:text-sm">
                        Only 2 spots available this month! Secure yours now.
                      </AlertDescription>
                    </Alert>
                  )}
                  {service.spots > 0 &&
                    service.spots <= 5 &&
                    !(service.id === "landing" && service.spots === 2) && (
                      <Alert className="border-orange-300 bg-orange-50 text-orange-800 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-xs md:text-sm">
                          Only {service.spots} spots available this month!
                          Secure yours now.
                        </AlertDescription>
                      </Alert>
                    )}

                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-all duration-150 ease-in-out transform hover:scale-105"
                    size="lg"
                    onClick={() => {
                      console.log(
                        `Get Started with ${service.name}`,
                      ); /* Replace with actual navigation */
                    }}
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <div className="flex items-center justify-center space-x-3 text-xs text-slate-500 mt-3">
                    <div className="flex items-center">
                      <Shield className="h-3.5 w-3.5 text-green-600 mr-1" />
                      <span>30-day guarantee</span>
                    </div>
                    <span className="text-slate-300">•</span>
                    <div className="flex items-center">
                      <Shield className="h-3.5 w-3.5 text-green-600 mr-1" />
                      <span>Secure payment</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center py-8 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-xl shadow-md mt-8">
        {/* Updated social proof section layout */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-6 md:flex md:flex-row md:justify-around md:items-center text-sm text-slate-700 px-4">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start">
            <Users className="h-5 w-5 text-blue-600 mb-1 sm:mb-0 sm:mr-2" />
            <span className="text-center sm:text-left">
              <strong>800+</strong> projects delivered
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start">
            <TrendingUp className="h-5 w-5 text-green-600 mb-1 sm:mb-0 sm:mr-2" />
            <span className="text-center sm:text-left">
              <strong>98%</strong> client satisfaction
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start">
            <Star className="h-5 w-5 text-yellow-500 mb-1 sm:mb-0 sm:mr-2" />
            <span className="text-center sm:text-left">
              <strong>4.9/5</strong> average rating
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start">
            <Heart className="h-5 w-5 text-red-500 mb-1 sm:mb-0 sm:mr-2" />{" "}
            {/* New Item */}
            <span className="text-center sm:text-left">
              <strong>700+</strong> happy clients
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
