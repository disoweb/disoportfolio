import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import CheckoutForm from "./CheckoutForm";

interface ServicePackage {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  popular?: boolean;
  category: 'launch' | 'growth' | 'elite';
}

const packages: ServicePackage[] = [
  {
    id: 'launch',
    name: 'Launch',
    description: 'Perfect for startups and small businesses',
    price: 2999,
    category: 'launch',
    features: [
      '5-page responsive website',
      'Mobile optimization',
      'Basic SEO setup',
      'Contact form integration',
      '3 months support'
    ]
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'Ideal for growing businesses',
    price: 4999,
    category: 'growth',
    popular: true,
    features: [
      '10-page responsive website',
      'E-commerce integration',
      'CMS integration',
      'Analytics setup',
      '6 months support',
      'Payment gateway setup'
    ]
  },
  {
    id: 'elite',
    name: 'Elite',
    description: 'For enterprises and complex projects',
    price: 9999,
    category: 'elite',
    features: [
      'Unlimited pages',
      'Custom web application',
      'API integrations',
      'Priority support',
      '12 months support',
      'Advanced security'
    ]
  }
];

export default function ServicePackages() {
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  const handleSelectPackage = (pkg: ServicePackage) => {
    setSelectedPackage(pkg);
    setShowCheckout(true);
  };

  return (
    <>
      <div className="grid md:grid-cols-3 gap-8">
        {packages.map((pkg) => (
          <Card 
            key={pkg.id} 
            className={`relative transition-all duration-200 hover:shadow-lg ${
              pkg.popular ? 'border-blue-600 shadow-lg scale-105' : 'hover:border-blue-300'
            }`}
          >
            {pkg.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1">
                  Most Popular
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">{pkg.name}</CardTitle>
              <p className="text-slate-600 mb-6">{pkg.description}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-blue-600">${pkg.price.toLocaleString()}</span>
                <span className="text-slate-500"> one-time</span>
              </div>
            </CardHeader>
            
            <CardContent>
              <ul className="space-y-4 mb-8">
                {pkg.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className={`w-full ${
                  pkg.popular 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-slate-900 hover:bg-slate-800'
                }`}
                onClick={() => handleSelectPackage(pkg)}
              >
                Select {pkg.name}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Checkout Modal */}
      {showCheckout && selectedPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CheckoutForm 
              selectedPackage={selectedPackage}
              onClose={() => {
                setShowCheckout(false);
                setSelectedPackage(null);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
