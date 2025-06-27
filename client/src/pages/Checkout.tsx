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
  const [sessionData, setSessionData] = useState<any>(null);
  const { user } = useAuth();

  // Parse URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const serviceId = urlParams.get('service');
  const price = urlParams.get('price');
  const addons = urlParams.get('addons');
  const checkoutParam = urlParams.get('checkout');
  const stepParam = urlParams.get('step');
  

  
  // Check if coming from authentication with ready-for-payment state
  const isReadyForPayment = sessionStorage.getItem('checkout_ready_for_payment') === 'true';

  // Fetch service data
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/services"],
  });

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
    
    // Clear any stale payment states
    sessionStorage.removeItem('payment_in_progress');
    sessionStorage.removeItem('checkout_ready_for_payment');
    
    console.log('Checkout page - URL params:', {
      serviceId,
      price,
      addons,
      checkout: checkoutParam
    });
    
    // First priority: Restore from database checkout session if available
    const sessionToken = sessionStorage.getItem('checkoutSessionToken') || checkoutParam;
    if (sessionToken && !serviceData) {
      console.log('Checkout page - Fetching session from database:', sessionToken);
      
      fetch(`/api/checkout-sessions/${sessionToken}`)
      .then(res => res.json())
      .then(fetchedSessionData => {
        if (fetchedSessionData && !fetchedSessionData.error) {

          
          setSessionData(fetchedSessionData); // Store session data for CheckoutForm
          
          const service = fetchedSessionData.serviceData;
          if (service) {
            setServiceData({
              ...service,
              price: service.price || parseInt(service.priceUsd || '0')
            });
            setTotalPrice(fetchedSessionData.totalPrice || 0);
            setSelectedAddOns(fetchedSessionData.selectedAddOns || []);
            

          }
        }
      })
      .catch(error => {
        // Clean up invalid session token on error
        sessionStorage.removeItem('checkoutSessionToken');
      });
    }
    
    // Second priority: Load service from URL parameters and API
    if (serviceId && Array.isArray(services) && services.length > 0 && !serviceData) {
      const service = services.find((s: any) => s.id === serviceId);
      
      if (service) {
        console.log('Checkout page - Found service from API:', service);
        
        // Transform service data to ensure consistent price handling
        const transformedService = {
          ...service,
          price: service.price || parseInt(service.priceUsd || '0')
        };
        
        setServiceData(transformedService);
        
        // Parse add-ons from URL
        let selectedAddonsList: string[] = [];
        if (addons) {
          selectedAddonsList = addons.split(',').filter(addon => addon.length > 0);
          setSelectedAddOns(selectedAddonsList);
        }
        
        // Set total price from URL or calculate
        if (price) {
          const servicePrice = parseInt(price, 10);
          setTotalPrice(servicePrice);
        } else {
          // Calculate price from service + addons
          const basePrice = transformedService.price;
          const addonPrice = selectedAddonsList.reduce((total, addonName) => {
            const addon = service.addOns?.find((a: any) => a.name === addonName);
            return total + (addon?.price || 0);
          }, 0);
          setTotalPrice(basePrice + addonPrice);
        }
        
        console.log('Checkout page - Service data set from URL params');
      } else {
        console.log('Checkout page - Service not found in API response');
      }
    }
  }, [serviceId, services, price, addons, serviceData]);

  // Only show error if we have no way to get service data
  const hasPendingCheckout = sessionStorage.getItem('pendingCheckout');
  
  console.log('Checkout page - Checking error conditions:', {
    serviceId: !!serviceId,
    serviceData: !!serviceData,
    hasPendingCheckout: !!hasPendingCheckout,
    hasCheckoutParam: !!checkoutParam,
    servicesLoading
  });
  
  if (!serviceId && !serviceData && !hasPendingCheckout && !checkoutParam && !servicesLoading) {
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
          sessionData={sessionData}
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