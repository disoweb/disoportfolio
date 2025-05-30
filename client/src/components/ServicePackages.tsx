import React from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star } from "lucide-react";

export default function ServicePackages() {
  const [, setLocation] = useLocation();

  const packages = [
    {
      id: "basic-website",
      title: "Basic Website",
      price: "₦150,000",
      duration: "1-2 weeks",
      description: "Perfect for small businesses and personal portfolios",
      features: [
        "Up to 5 pages",
        "Responsive design",
        "Contact form",
        "Basic SEO optimization",
        "Social media integration",
        "1 month free maintenance"
      ],
      popular: false,
      badge: "Starter"
    },
    {
      id: "ecommerce",
      title: "E-commerce Solution",
      price: "₦400,000",
      duration: "3-4 weeks", 
      description: "Complete online store with payment integration",
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
      popular: true,
      badge: "Most Popular"
    },
    {
      id: "web-app",
      title: "Custom Web Application",
      price: "From ₦800,000",
      duration: "6-12 weeks",
      description: "Tailored solutions for complex business needs",
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
      popular: false,
      badge: "Enterprise"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {packages.map((pkg, index) => (
        <Card key={index} className="bg-white shadow-md rounded-lg overflow-hidden">
          <CardHeader className="p-4">
            <CardTitle className="text-lg font-semibold text-gray-800">{pkg.title}</CardTitle>
            <CardDescription className="text-sm text-gray-600">{pkg.description}</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <ul>
              {pkg.features.map((feature, i) => (
                <li key={i} className="flex items-center py-2">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <div className="p-4 border-t border-gray-200">
            <div className="text-xl font-bold text-blue-600">{pkg.price}</div>
            <div className="text-gray-500">Duration: {pkg.duration}</div>
            <div className="mt-4">
              <Badge className={pkg.popular ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}>
                {pkg.badge}
              </Badge>
            </div>
            <div className="flex space-x-3">
                    <Button 
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      onClick={() => setLocation('/contact')}
                    >
                      Get Started
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setLocation(`/service/${pkg.id}`)}
                    >
                      Learn More
                    </Button>
                  </div>
          </div>
        </Card>
      ))}
    </div>
  );
}