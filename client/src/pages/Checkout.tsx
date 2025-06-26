import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CheckoutForm from "@/components/CheckoutForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Clock, Calendar, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function Checkout() {
  const [location, setLocation] = useLocation();
  const [serviceData, setServiceData] = useState<any>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState<number>(0);

  // Parse URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const serviceId = urlParams.get('service');
  const price = urlParams.get('price');
  const addons = urlParams.get('addons');

  // Fetch service data
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/services"],
  });

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
    
    if (serviceId && services.length > 0) {
      const service = (services as any[]).find((s: any) => s.id === serviceId);
      if (service) {
        setServiceData(service);
        setTotalPrice(price ? parseInt(price) : service.price);
      }
    }
    
    if (addons) {
      setSelectedAddOns(addons.split(',').filter(addon => addon.length > 0));
    }
  }, [serviceId, services, price, addons]);

  if (!serviceId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Service Not Found</h1>
            <p className="text-gray-600 mb-6">The service you're trying to purchase could not be found.</p>
            <Button onClick={() => setLocation('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (servicesLoading || !serviceData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Loading checkout...</h1>
            <p className="text-gray-600">Please wait while we prepare your order.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Calculate add-on costs
  const addOnsCost = selectedAddOns.reduce((sum, addonName) => {
    const addon = serviceData?.addOns?.find((a: any) => a.name === addonName);
    return sum + (addon ? addon.price : 0);
  }, 0);

  const basePrice = serviceData?.price || 0;
  const finalTotal = basePrice + addOnsCost;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Services
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Order</h1>
          <p className="text-gray-600">Fill out the form below to get started with your project</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="mr-2 h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{serviceData?.name || 'Service'}</h3>
                  <p className="text-gray-600 text-sm mt-1">{serviceData?.description || 'Service description'}</p>
                </div>

                <div className="flex items-center text-gray-600">
                  <Clock className="mr-2 h-4 w-4" />
                  <span className="text-sm">{serviceData?.duration || 'N/A'}</span>
                </div>

                <div className="flex items-center text-gray-600">
                  <Calendar className="mr-2 h-4 w-4" />
                  <span className="text-sm">Delivery: {serviceData?.deliveryDate || 'TBD'}</span>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base Price:</span>
                    <span className="font-medium">₦{basePrice.toLocaleString()}</span>
                  </div>

                  {selectedAddOns.length > 0 && (
                    <>
                      <div className="text-sm font-medium text-gray-700 mt-3 mb-2">Add-ons:</div>
                      {selectedAddOns.map((addonName) => {
                        const addon = serviceData.addOns?.find((a: any) => a.name === addonName);
                        return addon ? (
                          <div key={addonName} className="flex justify-between text-sm">
                            <span className="text-gray-600 flex items-center">
                              <Plus className="mr-1 h-3 w-3" />
                              {addon.name}
                            </span>
                            <span className="text-gray-700">₦{addon.price.toLocaleString()}</span>
                          </div>
                        ) : null;
                      })}
                    </>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-blue-600">₦{finalTotal.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Checkout Form */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent>
                <CheckoutForm 
                  service={{
                    id: serviceId,
                    name: serviceData.name,
                    price: finalTotal.toString(),
                    description: serviceData.description
                  }}
                  onSuccess={() => {
                    setLocation('/dashboard');
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}