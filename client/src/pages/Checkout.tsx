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

  // Robust service data initialization with multiple fallbacks
  const initializeServiceData = () => {
    // First check: Direct pending checkout access
    if (typeof window !== 'undefined') {
      const pendingCheckout = sessionStorage.getItem('pendingCheckout');
      if (pendingCheckout) {
        try {
          const checkoutData = JSON.parse(pendingCheckout);
          console.log('🔍 [INIT] Found pending checkout data:', checkoutData);
          if (checkoutData.service) {
            console.log('🔍 [INIT] Using service from pending checkout:', checkoutData.service.name);
            return {
              serviceData: checkoutData.service,
              selectedAddOns: checkoutData.selectedAddOns || [],
              totalPrice: checkoutData.totalPrice || 0
            };
          }
        } catch (error) {
          console.error('🔍 [INIT] Error parsing pending checkout:', error);
        }
      }
      
      // Second check: Look for backup service data
      const backupService = sessionStorage.getItem('backup_service_data');
      if (backupService) {
        try {
          const serviceData = JSON.parse(backupService);
          console.log('🔍 [INIT] Using backup service data:', serviceData);
          return {
            serviceData: serviceData.service,
            selectedAddOns: serviceData.selectedAddOns || [],
            totalPrice: serviceData.totalPrice || 0
          };
        } catch (error) {
          console.error('🔍 [INIT] Error parsing backup service:', error);
        }
      }
    }
    
    console.log('🔍 [INIT] No service data found, using defaults');
    return {
      serviceData: null,
      selectedAddOns: [],
      totalPrice: 0
    };
  };

  const initialState = initializeServiceData();
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
    console.log('🔍 [CHECKOUT PAGE] Current serviceData state:', serviceData);
    console.log('🔍 [CHECKOUT PAGE] Service data loaded from pending checkout:', !!serviceData);
    
    // Only process URL params if no service data from pending checkout
    if (!serviceData && serviceId && Array.isArray(services) && services.length > 0) {
      console.log('🔍 [CHECKOUT PAGE] Loading service from URL params');
      const service = services.find((s: any) => s.id === serviceId);
      if (service) {
        setServiceData(service);
        const servicePrice = price ? parseInt(price) : (service.price || parseInt(service.priceUsd || '0'));
        setTotalPrice(servicePrice);
        
        if (addons) {
          setSelectedAddOns(addons.split(',').filter(addon => addon.length > 0));
        }
      }
    }
  }, [serviceId, services, price, addons, serviceData]);

  // Debug render conditions
  console.log('🔍 [CHECKOUT PAGE] === RENDER CONDITIONS CHECK ===');
  console.log('🔍 [CHECKOUT PAGE] serviceId from URL:', serviceId);
  console.log('🔍 [CHECKOUT PAGE] serviceData state:', serviceData);
  console.log('🔍 [CHECKOUT PAGE] Service data exists:', !!serviceData);
  console.log('🔍 [CHECKOUT PAGE] Will show Service Not Found?', !serviceId && !serviceData);
  
  // Also check pending checkout during render
  const pendingCheckoutAtRender = sessionStorage.getItem('pendingCheckout');
  console.log('🔍 [CHECKOUT PAGE] Pending checkout at render:', !!pendingCheckoutAtRender);

  // Check if we should show Service Not Found - but be more lenient with pending checkout
  const shouldShowServiceNotFound = !serviceId && !serviceData && !sessionStorage.getItem('pendingCheckout');
  
  if (shouldShowServiceNotFound) {
    console.log('🔍 [CHECKOUT PAGE] ❌ Showing Service Not Found page - no service data and no pending checkout');
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
  
  // If no service data but pending checkout exists, show loading while we restore it
  if (!serviceData && sessionStorage.getItem('pendingCheckout')) {
    // Try to restore service data immediately
    const pendingCheckout = sessionStorage.getItem('pendingCheckout');
    if (pendingCheckout) {
      try {
        const checkoutData = JSON.parse(pendingCheckout);
        if (checkoutData.service) {
          console.log('🔍 [CHECKOUT PAGE] ✅ Restoring service data from pending checkout during render');
          setServiceData(checkoutData.service);
          setTotalPrice(checkoutData.totalPrice || 0);
          setSelectedAddOns(checkoutData.selectedAddOns || []);
        }
      } catch (error) {
        console.error('Error restoring service data:', error);
      }
    }
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Restoring checkout...</p>
        </div>
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