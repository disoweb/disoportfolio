import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Clock, Calendar, Plus } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CheckoutForm from "@/components/CheckoutForm";
import { useAuth } from "@/hooks/useAuth";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const [serviceData, setServiceData] = useState<any>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const { user } = useAuth();

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
    
    // First priority: Check for pending checkout data (for post-auth users)
    const pendingCheckout = sessionStorage.getItem('pendingCheckout');
    console.log('Checkout page - Pending checkout data:', pendingCheckout ? 'Found' : 'Not found');
    console.log('Checkout page - Service ID from URL:', serviceId);
    console.log('Checkout page - Current serviceData:', serviceData ? 'Set' : 'Not set');
    
    if (pendingCheckout && !serviceData) {
      try {
        const checkoutData = JSON.parse(pendingCheckout);
        console.log('Checkout page - Parsed checkout data:', checkoutData);
        if (checkoutData.service) {
          console.log('Checkout page - Setting service data from pending checkout');
          setServiceData(checkoutData.service);
          setTotalPrice(checkoutData.totalPrice || 0);
          setSelectedAddOns(checkoutData.selectedAddOns || []);
          return; // Exit early since we got data from pending checkout
        }
      } catch (error) {
        console.error('Error parsing pending checkout:', error);
        sessionStorage.removeItem('pendingCheckout');
      }
    }
    
    // Second priority: Use URL parameters to find service
    if (serviceId && Array.isArray(services) && services.length > 0) {
      const service = services.find((s: any) => s.id === serviceId);
      
      if (service) {
        setServiceData(service);
        
        // Parse add-ons from URL first
        let selectedAddonsList: string[] = [];
        if (addons) {
          selectedAddonsList = addons.split(',').filter(addon => addon.length > 0);
          setSelectedAddOns(selectedAddonsList);
        }
        
        // Set total price from URL or calculate based on service + add-ons
        if (price) {
          const servicePrice = parseInt(price, 10);
          setTotalPrice(servicePrice);
        } else {
          // Calculate price from service + addons
          const basePrice = service.price || parseInt(service.priceUsd || '0');
          const addonPrice = selectedAddonsList.reduce((total, addonName) => {
            const addon = service.addOns?.find((a: any) => a.name === addonName);
            const addonCost = addon?.price || 0;
            return total + addonCost;
          }, 0);
          const calculatedTotal = basePrice + addonPrice;
          setTotalPrice(calculatedTotal);
        }
      }
    }
  }, [serviceId, services, price, addons, serviceData]);

  // Only show error if no serviceId AND no serviceData AND no pending checkout
  if (!serviceId && !serviceData && !sessionStorage.getItem('pendingCheckout')) {
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

  if (servicesLoading || (!serviceData && serviceId)) {
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

  // Calculate pricing - use totalPrice from URL if provided, otherwise calculate from service + addons
  const basePrice = serviceData?.price || 0;
  const addOnTotal = selectedAddOns.reduce((total, addonName) => {
    const addon = serviceData?.addOns?.find((a: any) => a.name === addonName);
    return total + (addon?.price || 0);
  }, 0);
  // Use totalPrice from URL (which includes addons) or calculate manually
  const finalTotal = totalPrice > 0 ? totalPrice : basePrice + addOnTotal;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-3 py-4 max-w-lg">
        <div className="mb-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            className="mb-2 h-8 px-2"
            size="sm"
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back
          </Button>
          
          <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
        </div>

        {/* Streamlined Checkout Form */}
        <CheckoutForm 
          service={{
            id: serviceData.id,
            name: serviceData.name,
            price: finalTotal.toString(),
            description: serviceData.description,
          }}
          totalPrice={finalTotal}
          selectedAddOns={selectedAddOns}
          onSuccess={() => {
            // Don't redirect here - let CheckoutForm handle the flow
            // If payment URL exists, CheckoutForm will show loader and redirect to Paystack
            // If no payment URL, CheckoutForm will show success message
          }}
        />
      </div>

      <Footer />
    </div>
  );
}