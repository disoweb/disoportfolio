import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, CreditCard, Shield, Clock } from "lucide-react";

interface PaymentLoaderProps {
  serviceName: string;
  amount: number;
  onComplete?: () => void;
}

export default function PaymentLoader({ serviceName, amount, onComplete }: PaymentLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { icon: CreditCard, text: "Preparing your order", duration: 1000 },
    { icon: Shield, text: "Securing payment gateway", duration: 1500 },
    { icon: Clock, text: "Redirecting to Paystack", duration: 800 }
  ];

  useEffect(() => {
    let progressTimer: NodeJS.Timeout;
    let stepTimer: NodeJS.Timeout;
    
    // Animate progress bar
    const startProgress = () => {
      progressTimer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressTimer);
            onComplete?.();
            return 100;
          }
          return prev + 2;
        });
      }, 60);
    };

    // Animate steps
    const animateSteps = () => {
      let stepIndex = 0;
      const nextStep = () => {
        if (stepIndex < steps.length) {
          setCurrentStep(stepIndex);
          stepIndex++;
          stepTimer = setTimeout(nextStep, steps[stepIndex - 1]?.duration || 1000);
        }
      };
      nextStep();
    };

    startProgress();
    animateSteps();

    return () => {
      clearInterval(progressTimer);
      clearTimeout(stepTimer);
    };
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl border-0">
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Processing Payment</h2>
            <p className="text-slate-600">Please wait while we prepare your secure checkout</p>
          </div>

          {/* Order Summary */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-slate-900 mb-2">Order Summary</h3>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">{serviceName}</span>
              <span className="font-bold text-green-600">₦{amount.toLocaleString()}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div 
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                    isActive ? 'bg-blue-50 border border-blue-200' : 
                    isCompleted ? 'bg-green-50 border border-green-200' : 
                    'bg-slate-50 opacity-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-green-500' : 
                    isActive ? 'bg-blue-500' : 'bg-slate-300'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4 text-white" />
                    ) : (
                      <StepIcon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    )}
                  </div>
                  <span className={`font-medium ${
                    isActive ? 'text-blue-900' : 
                    isCompleted ? 'text-green-900' : 
                    'text-slate-500'
                  }`}>
                    {step.text}
                  </span>
                  {isActive && (
                    <div className="ml-auto">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Security Notice */}
          <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800 font-medium">
                Secured by 256-bit SSL encryption
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}