import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import SEOHead from "@/components/SEOHead";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(5);
  const [match, params] = useRoute("/payment-success");

  useEffect(() => {
    // Extract query parameters from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference') || urlParams.get('trxref');
    const status = urlParams.get('status');

    // Validate that this is a legitimate payment success redirect
    if (!reference || !reference.match(/^PSK_\d+_[a-z0-9]+$/i)) {
      // Redirect to home if invalid reference
      setLocation('/');
      return;
    }

    // Start countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setLocation('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [setLocation]);

  const handleGoToDashboard = () => {
    setLocation('/dashboard');
  };

  return (
    <>
      <SEOHead 
        title="Payment Successful - DiSO Webs"
        description="Your payment has been processed successfully. Welcome to DiSO Webs!"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          {/* Logo */}
          <div className="text-2xl font-bold text-blue-600 mb-8">
            DiSO Webs
          </div>
          
          {/* Success Icon */}
          <div className="text-6xl mb-6">
            ✅
          </div>
          
          {/* Success Message */}
          <h1 className="text-2xl font-bold text-green-600 mb-4">
            Payment Successful!
          </h1>
          
          <p className="text-gray-600 mb-6">
            Your payment has been processed successfully. We'll start working on your project soon.
          </p>
          
          {/* Loading Spinner */}
          <div className="flex justify-center mb-4">
            <div className="w-10 h-10 border-4 border-gray-200 border-top-4 border-t-green-500 rounded-full animate-spin"></div>
          </div>
          
          {/* Redirect Message */}
          <p className="text-gray-500 mb-2">
            Redirecting you to your dashboard...
          </p>
          
          {/* Countdown */}
          <div className="text-sm text-gray-400 mb-6">
            {countdown} seconds
          </div>
          
          {/* Manual Redirect Button */}
          <button
            onClick={handleGoToDashboard}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Go to Dashboard Now
          </button>
        </div>
      </div>
    </>
  );
}