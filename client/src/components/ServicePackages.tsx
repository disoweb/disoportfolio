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
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
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
  Plus,
  ChevronUp,
  ChevronDown,
  Shield,
  Calendar,
  Heart,
} from "lucide-react";

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

// Utility function to calculate delivery date based on duration
function calculateDeliveryDate(duration: string): string {
  const today = new Date();
  const match = duration.match(/(\d+)(?:-(\d+))?\s*(days?|weeks?|months?)/i);
  
  if (!match) return today.toISOString().split('T')[0];
  
  const minValue = parseInt(match[1]);
  const maxValue = match[2] ? parseInt(match[2]) : minValue;
  const unit = match[3].toLowerCase();
  const averageValue = (minValue + maxValue) / 2;
  
  let daysToAdd = 0;
  if (unit.startsWith('day')) {
    daysToAdd = averageValue;
  } else if (unit.startsWith('week')) {
    daysToAdd = averageValue * 7;
  } else if (unit.startsWith('month')) {
    daysToAdd = averageValue * 30;
  }
  
  const deliveryDate = new Date(today);
  deliveryDate.setDate(today.getDate() + Math.ceil(daysToAdd));
  
  return deliveryDate.toISOString().split('T')[0];
}

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
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [isAddOnsExpanded, setIsAddOnsExpanded] = useState(false);

  const totalPrice = useMemo(() => {
    const addOnsCost = service.addOns
      .filter((addon) => selectedAddOns.includes(addon.name))
      .reduce((sum, addon) => sum + addon.price, 0);
    return service.price + addOnsCost;
  }, [service.price, service.addOns, selectedAddOns]);

  useEffect(() => {
    reportPriceUpdate(service.id, totalPrice);
  }, [service.id, totalPrice, reportPriceUpdate]);

  const handleAddOnChange = (addonName: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(addonName)
        ? prev.filter((name) => name !== addonName)
        : [...prev, addonName]
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-slate-600">Base Price:</span>
        <span className="text-sm font-bold text-slate-800">
          ₦{service.price.toLocaleString()}
        </span>
      </div>

      {service.addOns.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg border border-blue-200">
          <button
            onClick={() => setIsAddOnsExpanded(!isAddOnsExpanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center space-x-2">
              <Plus className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Add-ons ({service.addOns.length} available)
              </span>
            </div>
            {isAddOnsExpanded ? (
              <ChevronUp className="h-4 w-4 text-blue-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-blue-600" />
            )}
          </button>

          {isAddOnsExpanded && (
            <div className="mt-3 space-y-2">
              {service.addOns.map((addon) => (
                <div key={addon.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`${service.id}-${addon.name}`}
                      checked={selectedAddOns.includes(addon.name)}
                      onChange={() => handleAddOnChange(addon.name)}
                      className="rounded border-slate-300"
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

      <Separator />
      <div className="flex justify-between items-center">
        <span className="text-base font-bold text-slate-800">Total:</span>
        <span className="text-lg font-bold text-blue-600">
          ₦{totalPrice.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

function ROICalculator({ service }: { service: Service }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const roiMetrics = useMemo(() => {
    const monthlyValue = service.price * 0.1;
    const yearlyValue = monthlyValue * 12;
    const breakEvenMonths = Math.ceil(service.price / monthlyValue);

    return {
      monthlyValue: Math.round(monthlyValue),
      yearlyValue: Math.round(yearlyValue),
      breakEvenMonths,
      roi: Math.round(((yearlyValue - service.price) / service.price) * 100),
    };
  }, [service.price]);

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center space-x-2">
          <Calculator className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            ROI Calculator
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-green-600" />
        ) : (
          <ChevronDown className="h-4 w-4 text-green-600" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-600">Monthly Value:</span>
              <div className="font-semibold text-green-700">
                ₦{roiMetrics.monthlyValue.toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-slate-600">Yearly Value:</span>
              <div className="font-semibold text-green-700">
                ₦{roiMetrics.yearlyValue.toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-slate-600">Break-even:</span>
              <div className="font-semibold text-blue-700">
                {roiMetrics.breakEvenMonths} months
              </div>
            </div>
            <div>
              <span className="text-slate-600">Annual ROI:</span>
              <div className="font-semibold text-purple-700">
                {roiMetrics.roi}%
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-600 mt-2">
            *Estimates based on typical business growth patterns
          </div>
        </div>
      )}
    </div>
  );
}

export default function ServicePackages() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all");
  const [priceUpdates, setPriceUpdates] = useState<Record<string, number>>({});
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, string[]>>({});

  // Helper function to parse PostgreSQL arrays or JSON strings
  const parseArrayField = (field: string | any[]): string[] => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      // Handle PostgreSQL array format: {"item1","item2","item3"}
      if (field.startsWith('{') && field.endsWith('}')) {
        return field.slice(1, -1)
          .split(',')
          .map(item => item.replace(/^"/, '').replace(/"$/, '').trim())
          .filter(item => item.length > 0);
      }
      // Handle JSON array format: ["item1","item2","item3"]
      if (field.startsWith('[') && field.endsWith(']')) {
        try {
          return JSON.parse(field);
        } catch {
          return [field];
        }
      }
      // Single string fallback
      return [field];
    }
    return [];
  };

  // Fetch services from database
  const { data: servicesData = [], isLoading, error } = useQuery({
    queryKey: ['/api/services'],
    select: (data: any[]) => {
      console.log('Raw services data:', data);
      return data.map((service: any) => {
        try {
          const transformed = {
            id: service.id,
            name: service.name,
            description: service.description,
            price: parseInt(service.priceUsd) || 0,
            originalPrice: parseInt(service.originalPriceUsd) || parseInt(service.priceUsd) || 0,
            duration: service.duration || "4-6 weeks",
            deliveryDate: calculateDeliveryDate(service.duration || "4-6 weeks"),
            spots: service.spotsRemaining || 5,
            totalSpots: service.totalSpots || 10,
            features: parseArrayField(service.features),
            addOns: Array.isArray(service.addOns) ? service.addOns : [],
            recommended: service.recommended || false,
            category: service.category,
            industry: parseArrayField(service.industry)
          };
          console.log('Transformed service:', transformed);
          return transformed;
        } catch (err) {
          console.error('Error transforming service:', service, err);
          return null;
        }
      }).filter(Boolean);
    }
  });

  const industryRecommendations: Record<string, string[]> = {
    tech: ["webapp", "landing"],
    retail: ["ecommerce", "landing"],
    consulting: ["landing", "webapp"],
    healthcare: ["webapp", "landing", "hospital-management"],
    finance: ["webapp", "landing"],
    education: ["webapp", "landing"],
    restaurant: ["ecommerce", "landing"],
  };

  const recommendedServices = useMemo((): Service[] => {
    const baseServicesWithDynamicRecommended = servicesData.map((s) => ({
      ...s,
      recommended: false,
    }));
    
    if (selectedIndustry === "all") {
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
  }, [selectedIndustry, servicesData]);

  const handlePurchase = (serviceId: string) => {
    if (!user) {
      setLocation("/login");
      return;
    }

    const service = servicesData.find((s) => s.id === serviceId);
    if (!service) return;

    const finalPrice = priceUpdates[serviceId] || service.price;
    const addOns = selectedAddOns[serviceId] || [];

    // Navigate to checkout with service details
    setLocation(`/checkout?service=${serviceId}&price=${finalPrice}&addons=${addOns.join(',')}`);
  };

  const reportPriceUpdate = useCallback((serviceId: string, total: number) => {
    setPriceUpdates((prev) => ({ ...prev, [serviceId]: total }));
  }, []);

  const industries = [
    { id: "all", label: "All Industries", icon: "🌐" },
    { id: "tech", label: "Technology", icon: "💻" },
    { id: "retail", label: "Retail & E-commerce", icon: "🛒" },
    { id: "consulting", label: "Consulting", icon: "💼" },
    { id: "healthcare", label: "Healthcare", icon: "🏥" },
    { id: "finance", label: "Finance", icon: "💰" },
    { id: "education", label: "Education", icon: "📚" },
    { id: "restaurant", label: "Restaurant", icon: "🍽️" },
  ];

  if (isLoading) {
    return (
      <section className="py-6 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center">Loading services...</div>
        </div>
      </section>
    );
  }

  if (error) {
    console.error('Services query error:', error);
    return (
      <section className="py-6 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center text-red-600">
            Failed to load services: {error.message || 'Unknown error'}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-slate-50" id="service-packages">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">
            Choose Your Perfect Package
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-base">
            Professional web solutions tailored to your industry needs. Select your industry to see recommended packages.
          </p>
        </div>

        {/* Industry Selection */}
        <div className="mb-6">
          <div className="flex flex-wrap justify-center gap-2">
            {industries.map((industry) => (
              <button
                key={industry.id}
                onClick={() => setSelectedIndustry(industry.id)}
                className={`px-3 py-2 rounded-full text-xs font-medium transition-all ${
                  selectedIndustry === industry.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span className="mr-1">{industry.icon}</span>
                {industry.label}
              </button>
            ))}
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendedServices.map((service) => (
            <Card
              key={service.id}
              className={`relative transition-all duration-300 hover:shadow-lg ${
                service.recommended
                  ? "ring-2 ring-blue-500 shadow-lg"
                  : "hover:shadow-md"
              }`}
            >
              {service.recommended && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white px-3 py-1 text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    Recommended
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-800">
                      {service.name}
                    </CardTitle>
                    <CardDescription className="text-slate-600 text-sm">
                      {service.description}
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-xs text-slate-500">
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {service.duration}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {service.deliveryDate}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl font-bold text-blue-600">
                      ₦{(priceUpdates[service.id] || service.price).toLocaleString()}
                    </span>
                    {service.originalPrice > service.price && (
                      <span className="text-sm text-slate-500 line-through">
                        ₦{service.originalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-xs text-slate-500">
                    <Users className="h-3 w-3 mr-1" />
                    {service.spots}/{service.totalSpots} spots
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">
                    What's included:
                  </h4>
                  <ul className="space-y-1">
                    {service.features.slice(0, 4).map((feature, index) => (
                      <li key={index} className="flex items-center text-xs text-slate-600">
                        <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                    {service.features.length > 4 && (
                      <li className="text-xs text-slate-500 pl-5">
                        +{service.features.length - 4} more features
                      </li>
                    )}
                  </ul>
                </div>

                {service.addOns.length > 0 && (
                  <PricingCalculator
                    service={service}
                    reportPriceUpdate={reportPriceUpdate}
                    currentSelectedAddOns={selectedAddOns[service.id] || []}
                  />
                )}

                <ROICalculator service={service} />

                <div className="space-y-2">
                  <Button
                    onClick={() => handlePurchase(service.id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={service.spots === 0}
                  >
                    {service.spots === 0 ? (
                      "Sold Out"
                    ) : (
                      <>
                        Buy This Package
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>


                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {recommendedServices.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-600">No services available for the selected industry.</p>
          </div>
        )}
      </div>
    </section>
  );
}