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
  const { user } = useAuth();

  // Parse URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const serviceId = urlParams.get('service');
  const price = urlParams.get('price');
  const addons = urlParams.get('addons');

  // Initialize state with pending checkout data if available
  const initializeFromPendingCheckout = () => {
    const pendingCheckout = sessionStorage.getItem('pendingCheckout');
    if (pendingCheckout) {
      try {
        const checkoutData = JSON.parse(pendingCheckout);
        if (checkoutData.service) {
          return {
            serviceData: checkoutData.service,
            selectedAddOns: checkoutData.selectedAddOns || [],
            totalPrice: checkoutData.totalPrice || 0
          };
        }
      } catch (error) {
        console.error('Error parsing pending checkout:', error);
      }
    }
    return {
      serviceData: null,
      selectedAddOns: [],
      totalPrice: 0
    };
  };

  const initialState = initializeFromPendingCheckout();
  const [serviceData, setServiceData] = useState<any>(initialState.serviceData);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(initialState.selectedAddOns);
  const [totalPrice, setTotalPrice] = useState<number>(initialState.totalPrice);

  // Fetch service data
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/services"],
  });

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
    
    console.log('🔍 [CHECKOUT PAGE] === CHECKOUT PAGE USEEFFECT START ===');
    console.log('🔍 [CHECKOUT PAGE] URL serviceId:', serviceId);
    console.log('🔍 [CHECKOUT PAGE] URL price:', price);
    console.log('🔍 [CHECKOUT PAGE] URL addons:', addons);
    console.log('🔍 [CHECKOUT PAGE] Services loaded:', Array.isArray(services) ? services.length : 'not array');
    console.log('🔍 [CHECKOUT PAGE] Current serviceData state:', serviceData);
    console.log('🔍 [CHECKOUT PAGE] Current totalPrice state:', totalPrice);
    console.log('🔍 [CHECKOUT PAGE] Current selectedAddOns state:', selectedAddOns);
    
    // If service data already loaded from initial state, skip URL processing
    if (serviceData) {
      console.log('🔍 [CHECKOUT PAGE] ✅ Service data already loaded from pending checkout');
      return;
    }
    
    // Fallback to URL params if no initial service data
    if (!serviceId) {
      console.log('🔍 [CHECKOUT PAGE] ❌ No serviceId in URL, no service data available');
      return; // No service data available
    }
    
    if (serviceId && Array.isArray(services) && services.length > 0) {
      const service = services.find((s: any) => s.id === serviceId);

      
      if (service) {
        setServiceData(service);
        const servicePrice = price ? parseInt(price) : (service.price || parseInt(service.priceUsd || '0'));

        setTotalPrice(servicePrice);
      }
    }
    
    if (addons) {
      setSelectedAddOns(addons.split(',').filter(addon => addon.length > 0));
    }
  }, [serviceId, services, price, addons]);

  // Debug render conditions
  console.log('🔍 [CHECKOUT PAGE] === RENDER CONDITIONS CHECK ===');
  console.log('🔍 [CHECKOUT PAGE] serviceId from URL:', serviceId);
  console.log('🔍 [CHECKOUT PAGE] serviceData state:', serviceData);
  console.log('🔍 [CHECKOUT PAGE] Service data exists:', !!serviceData);
  console.log('🔍 [CHECKOUT PAGE] Will show Service Not Found?', !serviceId && !serviceData);
  
  // Also check pending checkout during render
  const pendingCheckoutAtRender = sessionStorage.getItem('pendingCheckout');
  console.log('🔍 [CHECKOUT PAGE] Pending checkout at render:', !!pendingCheckoutAtRender);

  if (!serviceId && !serviceData) {
    console.log('🔍 [CHECKOUT PAGE] ❌ Showing Service Not Found page');
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

  // Calculate pricing
  const basePrice = serviceData?.price || 0;
  const addOnTotal = selectedAddOns.reduce((total, addonName) => {
    const addon = serviceData?.addOns?.find((a: any) => a.name === addonName);
    return total + (addon?.price || 0);
  }, 0);
  const finalTotal = basePrice + addOnTotal;

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