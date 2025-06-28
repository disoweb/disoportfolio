import React, { useState, useEffect, useRef } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ServicePackages from "@/components/ServicePackages";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowRight,
  CheckCircle,
  Star,
  Users,
  Award,
  Zap,
  Shield,
  HeadphonesIcon,
  Globe,
  Smartphone,
  Rocket,
  Clock,
  TrendingUp,
  X,
  AlertCircle,
  ShoppingCart,
} from "lucide-react";

const liveNotifications = [
  "Chidi ordered E-commerce Website",
  "Sarah M. just completed Web App project",
  "Tech Solutions Ltd booked Custom Development",
  "Ahmad K. ordered Landing Page",
  "Grace O. just paid for E-commerce",
  "David Tech Hub booked Web App",
  "Fashion Store NG ordered E-commerce",
  "StartupCo just upgraded to Premium ",
];

const cities = [
  "Lagos",
  "Abuja",
  "Kano",
  "Ibadan",
  "Port Harcourt",
  "Kaduna",
  "Benin City",
  "Maiduguri",
  "Enugu",
  "Jos",
  "Ilorin",
  "Aba",
  "Oyo",
  "Awka",
  "Uyo",
  "Calabar",
  "Akure",
  "Sokoto",
  "Zaria",
  "Lokoja",
  "Ado-Ekiti",
  "Jalingo",
  "Damaturu",
  "Gombe",
  "Abakaliki",
  "Yola",
  "Asaba",
  "Makurdi",
  "Minna",
  "Bauchi",
  "Katsina",
  "Gusau",
  "Owerri",
  "Umuahia",
  "Pankshin",
  "Wukari",
  "Sapele",
  "Iseyin",
  "Ife",
  "Ikeja",
];

const urgencyMessages = [
  "Only 2 spots available this month!",
  "3 premium slots remaining",
  "Last 4 enterprise consultations available",
  "2 e-commerce projects left in queue",
];

const socialProofs = [
  "95% of tech startups choose our Web App package",
  "87% of e-commerce businesses prefer our E-commerce Plus",
  "92% of agencies recommend our Custom Development",
];

function getRandomCity() {
  return cities[Math.floor(Math.random() * cities.length)];
}

interface LiveNotificationProps {
  message: string;
  onClose: () => void;
  // Duration in milliseconds before another notification can appear (handled externally)
  duration?: number;
}

export function LiveNotification({
  message,
  onClose,
  duration = 10000,
}: LiveNotificationProps) {
  const [city, setCity] = useState(getRandomCity());

  // Optional: refresh city if notification stays longer than duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setCity(getRandomCity());
    }, duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <div className="fixed bottom-6 left-6 z-50 animate-in slide-in-from-bottom-full duration-500">
      <Alert className="bg-white border-green-200 shadow-lg max-w-[15rem] p-4 flex items-start space-x-3 rounded-md">
        <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
        <div className="flex flex-col">
          <span className="font-medium text-blue-600 break-words">
            {message}
          </span>
          <span className="text-xs text-green-600 mt-1">{city}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-auto p-1"
          onClick={onClose}
          aria-label="Close notification"
        >
          <X className="h-3 w-3" />
        </Button>
      </Alert>
    </div>
  );
}

// Animated Counter Component
interface AnimatedCounterProps {
  end: number;
  duration?: number;
  suffix?: string;
  isVisible: boolean;
}

function AnimatedCounter({ end, duration = 2000, suffix = "", isVisible }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (isVisible && !hasAnimated) {
      setHasAnimated(true);
      let startTime: number;
      
      const animateCount = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        
        setCount(Math.floor(progress * end));
        
        if (progress < 1) {
          requestAnimationFrame(animateCount);
        }
      };
      
      requestAnimationFrame(animateCount);
    }
  }, [isVisible, end, duration, hasAnimated]);

  return <span>{count}{suffix}</span>;
}

function UrgencyBanner() {
  const [currentMessage, setCurrentMessage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % urgencyMessages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white py-3 px-6 text-center border-b border-blue-200/20">
      <div className="flex items-center justify-center space-x-3 max-w-4xl mx-auto">
        <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium uppercase tracking-wide">Live</span>
        </div>
        <span className="text-sm font-medium">{urgencyMessages[currentMessage]}</span>
        <div className="hidden sm:flex items-center space-x-1 text-blue-100">
          <Clock className="h-3 w-3" />
          <span className="text-xs">Limited time</span>
        </div>
      </div>
    </div>
  );
}

function LiveProjectCounter() {
  const [count, setCount] = useState(127);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => prev + Math.floor(Math.random() * 3));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-6">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <div className="flex flex-col items-center justify-center">
          <div className="text-3xl font-bold flex items-center">
            {count}
            <TrendingUp className="h-6 w-6 text-green-500 ml-1" />
          </div>
          <div className="text-sm opacity-90">
            Projects completed this month
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 py-4">
      <div className="flex items-center space-x-2 bg-white rounded-lg px-4 py-2 shadow-sm border">
        <Shield className="h-5 w-5 text-green-600" />
        <span className="text-sm font-medium">SSL Secured</span>
      </div>
      <div className="flex items-center space-x-2 bg-white rounded-lg px-4 py-2 shadow-sm border">
        <Award className="h-5 w-5 text-blue-600" />
        <span className="text-sm font-medium">ISO 27001</span>
      </div>
      <div className="flex items-center space-x-2 bg-white rounded-lg px-4 py-2 shadow-sm border">
        <CheckCircle className="h-5 w-5 text-purple-600" />
        <span className="text-sm font-medium">Compliant</span>
      </div>
      <div className="flex items-center space-x-2 bg-white rounded-lg px-4 py-2 shadow-sm border">
        <Clock className="h-5 w-5 text-orange-600" />
        <span className="text-sm font-medium">99.9% Uptime</span>
      </div>
    </div>
  );
}

export default function Landing() {
  const [showNotification, setShowNotification] = useState(false);
  const [currentNotification, setCurrentNotification] = useState("");
  const [socialProofIndex, setSocialProofIndex] = useState(0);
  const [metricsVisible, setMetricsVisible] = useState(false);
  const [counters, setCounters] = useState({ projects: 0, satisfaction: 0, clients: 0 });
  const metricsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const showRandomNotification = () => {
      const randomNotification =
        liveNotifications[Math.floor(Math.random() * liveNotifications.length)];
      setCurrentNotification(randomNotification);
      setShowNotification(true);

      // Auto-close notification after 4 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 8000);
    };

    // Show first notification after 5 seconds
    const initialTimeout = setTimeout(showRandomNotification, 8000);

    // Then show notifications every 15-25 seconds
    const interval = setInterval(
      () => {
        if (!showNotification) {
          showRandomNotification();
        }
      },
      Math.random() * 10000 + 15000,
    );

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [showNotification]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSocialProofIndex((prev) => (prev + 1) % socialProofs.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Intersection Observer for metrics animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !metricsVisible) {
          setMetricsVisible(true);
          
          // Animate counters
          const animateCounter = (target: number, key: 'projects' | 'satisfaction' | 'clients') => {
            let current = 0;
            const increment = target / 60; // 60 frames for smooth animation
            const timer = setInterval(() => {
              current += increment;
              if (current >= target) {
                setCounters(prev => ({ ...prev, [key]: target }));
                clearInterval(timer);
              } else {
                setCounters(prev => ({ ...prev, [key]: Math.floor(current) }));
              }
            }, 33); // ~30fps
          };

          // Start animations with slight delays
          setTimeout(() => animateCounter(500, 'projects'), 100);
          setTimeout(() => animateCounter(98, 'satisfaction'), 300);
          setTimeout(() => animateCounter(150, 'clients'), 500);
        }
      },
      { threshold: 0.3 }
    );

    if (metricsRef.current) {
      observer.observe(metricsRef.current);
    }

    return () => {
      if (metricsRef.current) {
        observer.unobserve(metricsRef.current);
      }
    };
  }, [metricsVisible]);

  const handleNotificationClose = () => {
    setShowNotification(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <SEOHead
        title="DiSO Webs - Professional Web Development Services in Nigeria"
        description="Transform your business with stunning, high-performance websites. We deliver exceptional digital experiences for startups to enterprises without breaking the bank. Get started today!"
        keywords="web development, website design, Nigeria, Lagos, Abuja, e-commerce, web apps, landing pages, digital solutions, responsive design"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "DiSO Webs",
          "url": "https://disoweb.replit.app",
          "logo": "https://disoweb.replit.app/logo.png",
          "description": "Professional web development and digital solutions company",
          "address": {
            "@type": "PostalAddress",
            "addressCountry": "Nigeria"
          },
          "sameAs": [
            "https://twitter.com/disowebs",
            "https://linkedin.com/company/disowebs"
          ]
        }}
      />
      <UrgencyBanner />
      <Navigation />

      {/* Hero Section */}
      <section className="pt-10 pb-16 lg:pt-20 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Build Your Dream
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block">
                Website Today
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed max-w-3xl mx-auto">
              Transform your business with stunning, high-performance websites.
              From startups to enterprises, we deliver exceptional digital
              experiences that drive results without breaking the bank.
            </p>

            {/* Social Proof Rotating Message */}
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 inline-block">
                <p className="text-blue-800 text-sm font-medium">
                  ✨ {socialProofs[socialProofIndex]}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 px-8 py-6 text-lg w-auto relative"
                onClick={() => {
                  const servicesSection = document.getElementById('service-packages');
                  if (servicesSection) {
                    servicesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Buy Packages
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 text-xs"
                >
                  Claim Offer
                </Badge>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg w-auto"
                onClick={() => (window.location.href = "/contact")}
              >
                Schedule Free Consultation
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="mt-8 mb-6">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
                <div className="flex items-center text-sm text-slate-600">
                  <Shield className="h-4 w-4 mr-2 text-green-600" />
                  30-day money-back guarantee
                </div>
                <div className="flex items-center text-sm text-slate-600">
                  <CheckCircle className="h-4 w-4 mr-2 text-blue-600" />
                  Free consultation included
                </div>
                <div className="flex items-center text-sm text-slate-600">
                  <Clock className="h-4 w-4 mr-2 text-orange-600" />
                  7-day delivery guarantee
                </div>
              </div>
            </div>

            {/* Success Metrics */}
            <div ref={metricsRef} className="mt-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-12 max-w-4xl mx-auto">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{counters.projects}+</div>
                  <div className="text-sm text-slate-600">Projects Delivered</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{counters.satisfaction}%</div>
                  <div className="text-sm text-slate-600">Client Satisfaction</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">24/7</div>
                  <div className="text-sm text-slate-600">Support Available</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{counters.clients}+</div>
                  <div className="text-sm text-slate-600">Happy Clients</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-12 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-sm font-semibold text-gray-500 tracking-wide uppercase">
              Trusted by Leading Companies
            </h2>
            <p className="mt-2 text-lg text-gray-600">
              Join 500+ businesses that trust DiSO Webs for their digital transformation
            </p>
          </div>
          
          {/* Compact 2x2 Grid with High-Quality Logo Images */}
          <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
            {/* Google */}
            <div className="group flex items-center justify-center p-6 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300">
              <img 
                src="https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=100&h=100&fit=crop&crop=center"
                alt="Google"
                className="h-12 w-12 object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            
            {/* Microsoft */}
            <div className="group flex items-center justify-center p-6 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300">
              <img 
                src="https://images.unsplash.com/photo-1633419461186-7d40a38105ec?w=100&h=100&fit=crop&crop=center"
                alt="Microsoft"
                className="h-12 w-12 object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            
            {/* Apple */}
            <div className="group flex items-center justify-center p-6 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300">
              <img 
                src="https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=100&h=100&fit=crop&crop=center"
                alt="Apple"
                className="h-12 w-12 object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            
            {/* Amazon */}
            <div className="group flex items-center justify-center p-6 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300">
              <img 
                src="https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=100&h=100&fit=crop&crop=center"
                alt="Amazon"
                className="h-12 w-12 object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500">
              And hundreds more companies worldwide
            </p>
          </div>
        </div>
      </section>

      {/* Our Process Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-blue-600">
              Our Proven Process
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              We follow a streamlined approach to deliver exceptional results on time
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">1</div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Discovery</h3>
              <p className="text-gray-600">We understand your business goals and requirements through detailed consultation</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">2</div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Design</h3>
              <p className="text-gray-600">Create stunning mockups and prototypes that align with your brand identity</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">3</div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Development</h3>
              <p className="text-gray-600">Build your website using modern technologies and best practices</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold">4</div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Launch</h3>
              <p className="text-gray-600">Deploy your website and provide ongoing support for optimal performance</p>
            </div>
          </div>
        </div>
      </section>

      {/* Technologies Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-blue-600">
              Technologies We Master
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              We use cutting-edge technologies to build fast, secure, and scalable solutions
            </p>
          </div>
          
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center justify-items-center">
            {/* React */}
            <div className="flex flex-col items-center group">
              <div className="w-12 h-12 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="#61DAFB">
                  <path d="M12 10.11c1.03 0 1.87.84 1.87 1.89s-.84 1.85-1.87 1.85-1.87-.82-1.87-1.85.84-1.89 1.87-1.89M7.37 20c.63.38 2.01-.2 3.6-1.7-.52-.59-1.03-1.23-1.51-1.9a22.7 22.7 0 0 1-2.4-.36c-.51 2.14-.32 3.61.31 3.96m.71-5.74l-.29-.51c-.11.29-.22.58-.29.86.27.06.57.11.88.16l-.3-.51m6.54-.76l.81-1.5-.81-1.5c-.3-.53-.62-1-.91-1.47C13.17 9 12.6 9 12 9s-1.17 0-1.71.03c-.29.47-.61.94-.91 1.47L8.57 12l.81 1.5c.3.53.62 1 .91 1.47.54.03 1.11.03 1.71.03s1.17 0 1.71-.03c.29-.47.61-.94.91-1.47M12 6.78c-.19.22-.39.45-.59.72h1.18c-.2-.27-.4-.5-.59-.72m0 10.44c.19-.22.39-.45.59-.72h-1.18c.2.27.4.5.59.72M16.62 4c-.62-.38-2 .2-3.59 1.7.52.59 1.03 1.23 1.51 1.9.82.08 1.63.2 2.4.36.51-2.14.32-3.61-.32-3.96m-.7 5.74l.29.51c.11-.29.22-.58.29-.86-.27-.06-.57-.11-.88-.16l.3.51m1.45-7.05c1.47.84 1.63 3.05 1.01 5.63 2.54.75 4.37 1.99 4.37 3.68s-1.83 2.93-4.37 3.68c.62 2.58.46 4.79-1.01 5.63-1.46.84-3.45-.12-5.37-1.95-1.92 1.83-3.91 2.79-5.37 1.95-1.47-.84-1.63-3.05-1.01-5.63-2.54-.75-4.37-1.99-4.37-3.68s1.83-2.93 4.37-3.68c-.62-2.58-.46-4.79 1.01-5.63 1.46-.84 3.45.12 5.37 1.95 1.92-1.83 3.91-2.79 5.37-1.95z"/>
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-600">React</span>
            </div>
            
            {/* Next.js */}
            <div className="flex flex-col items-center group">
              <div className="w-12 h-12 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.572 0c-.176 0-.31.001-.358.007a19.76 19.76 0 0 1-.364.033C7.443.346 4.25 2.185 2.228 5.012a11.875 11.875 0 0 0-2.119 5.243c-.096.659-.108.854-.108 1.747s.012 1.089.108 1.748c.652 4.506 3.86 8.292 8.209 9.695.779.25 1.6.422 2.534.525.363.04 1.935.04 2.299 0 1.611-.178 2.977-.577 4.323-1.264.207-.106.246-.134.219-.158-.02-.013-.9-1.193-1.955-2.62l-1.919-2.592-2.404-3.558a338.739 338.739 0 0 0-2.422-3.556c-.009-.002-.018 1.579-.023 3.51-.007 3.38-.01 3.515-.052 3.595a.426.426 0 0 1-.206.214c-.075.037-.14.044-.495.044H7.81l-.108-.068a.438.438 0 0 1-.157-.171l-.05-.106.006-4.703.007-4.705.072-.092a.645.645 0 0 1 .174-.143c.096-.047.134-.051.54-.051.478 0 .558.018.682.154.035.038 1.337 1.999 2.895 4.361a10760.433 10760.433 0 0 0 4.735 7.17l1.9 2.879.096-.063a12.317 12.317 0 0 0 2.466-2.163 11.944 11.944 0 0 0 2.824-6.134c.096-.66.108-.854.108-1.748 0-.893-.012-1.088-.108-1.747C19.144 4.764 15.947 1.963 11.572 0z"/>
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-600">Next.js</span>
            </div>
            
            {/* TypeScript */}
            <div className="flex flex-col items-center group">
              <div className="w-12 h-12 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="#3178C6">
                  <path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z"/>
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-600">TypeScript</span>
            </div>
            
            {/* Node.js */}
            <div className="flex flex-col items-center group">
              <div className="w-12 h-12 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="#339933">
                  <path d="M12 0c6.623 0 12 5.377 12 12 0 6.623-5.377 12-12 12S0 18.623 0 12 5.377 0 12 0zm-.84 4.348c-.589 0-1.166.232-1.591.649L5.348 8.466c-.847.831-.847 2.188 0 3.019l4.221 3.469c.425.417 1.002.649 1.591.649.589 0 1.166-.232 1.591-.649l4.221-3.469c.847-.831.847-2.188 0-3.019L12.751 4.997c-.425-.417-1.002-.649-1.591-.649z"/>
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-600">Node.js</span>
            </div>
            
            {/* MongoDB */}
            <div className="flex flex-col items-center group">
              <div className="w-12 h-12 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="#47A248">
                  <path d="M17.193 9.555c-1.264-5.58-4.252-7.414-4.573-8.115-.28-.394-.53-.954-.735-1.44-.036.495-.055.685-.523 1.184-.723.566-4.438 3.682-4.74 10.02-.282 5.912 4.27 9.435 4.888 9.884l.07.05A73.49 73.49 0 0111.91 24h.481c.114-1.032.284-2.056.51-3.07.417-.296.604-.463.85-.693a11.342 11.342 0 003.639-8.464c.01-.814-.103-1.662-.197-2.218zm-5.336 8.195s0-8.291.275-8.29c.213 0 .49 10.695.49 10.695-.381-.045-.765-1.76-.765-2.405z"/>
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-600">MongoDB</span>
            </div>
            
            {/* PostgreSQL */}
            <div className="flex flex-col items-center group">
              <div className="w-12 h-12 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="#336791">
                  <path d="M23.98 5.79c.01.14.01.28.01.42 0 4.31-3.297 9.27-9.33 9.27-1.851 0-3.574-.543-5.024-1.47a6.605 6.605 0 004.86-1.359 3.285 3.285 0 01-3.066-2.277 3.282 3.282 0 001.482-.056 3.28 3.28 0 01-2.633-3.218v-.041a3.288 3.288 0 001.487.41A3.278 3.278 0 01.96 3.555c0-.607.164-1.177.45-1.666a9.32 9.32 0 006.761 3.426 3.28 3.28 0 015.583-2.99 6.58 6.58 0 002.085-.796 3.301 3.301 0 01-1.443 1.816A6.573 6.573 0 0022.46 2.74a6.662 6.662 0 01-1.636 1.697c.008.151.013.304.013.459l.143-.106z"/>
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-600">PostgreSQL</span>
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-lg text-gray-600 mb-6">
              And many more cutting-edge technologies to bring your vision to life
            </p>
            <Button 
              onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              See Our Services
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Security Badges */}
      <section className="bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-2xl lg:text-4xl font-bold text-blue-600 mb-4">
            Enterprise-Level Security
          </p>
          <SecurityBadges />
        </div>
      </section>

      {/* Why Choose DiSO Webs Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-blue-600">
              Why 500+ Businesses Choose DiSO Webs
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              We don't just build websites - we create digital experiences that drive results
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500">
              <CardContent className="pt-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Proven ROI
                  </h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Our clients see an average of 300% increase in online conversions within 6 months of launch.
                </p>
                <div className="text-2xl font-bold text-blue-600">300% ROI</div>
              </CardContent>
            </Card>

            <Card className="p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-l-green-500">
              <CardContent className="pt-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Clock className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Lightning Fast Delivery
                  </h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Most projects delivered within 7-14 days without compromising quality or functionality.
                </p>
                <div className="text-2xl font-bold text-green-600">7-14 Days</div>
              </CardContent>
            </Card>

            <Card className="p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-l-purple-500">
              <CardContent className="pt-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Shield className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    100% Satisfaction
                  </h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Unlimited revisions and 30-day money-back guarantee. Your success is our success.
                </p>
                <div className="text-2xl font-bold text-purple-600">100%</div>
              </CardContent>
            </Card>

            <Card className="p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-l-orange-500">
              <CardContent className="pt-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <HeadphonesIcon className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    24/7 Support
                  </h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Round-the-clock technical support and maintenance to keep your website running smoothly.
                </p>
                <div className="text-2xl font-bold text-orange-600">24/7</div>
              </CardContent>
            </Card>

            <Card className="p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-l-red-500">
              <CardContent className="pt-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <Award className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Industry Recognition
                  </h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Award-winning design team with 5+ years experience building enterprise-level solutions.
                </p>
                <div className="text-2xl font-bold text-red-600">5+ Years</div>
              </CardContent>
            </Card>

            <Card className="p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-l-teal-500">
              <CardContent className="pt-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                    <Smartphone className="h-6 w-6 text-teal-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Mobile-First Design
                  </h3>
                </div>
                <p className="text-gray-600 mb-4">
                  90%+ of your visitors will be on mobile. We ensure perfect performance on every device.
                </p>
                <div className="text-2xl font-bold text-teal-600">90%+ Mobile</div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-16 text-center">
            <Button 
              onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Start Your Project Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-10 lg:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4  text-blue-600">
              Why Choose DiSO Webs?
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              We combine cutting-edge technology with exceptional design to
              deliver websites that convert visitors into customers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Rocket className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-blue-600">
                    Lightning Fast
                  </h3>
                </div>
                <p className="text-slate-600">
                  Optimized for speed with 99.9% uptime guarantee and sub-2
                  second load times.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Zap className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-blue-600">
                    Mobile-First
                  </h3>
                </div>
                <p className="text-slate-600">
                  Responsive design that looks perfect on all devices, from
                  phones to desktops.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                    <Shield className="h-6 w-6 text-cyan-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-blue-600">
                    Secure & Reliable
                  </h3>
                </div>
                <p className="text-slate-600">
                  Enterprise-grade security with SSL certificates and regular
                  backups.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <ServicePackages />

      {/* Testimonials Section */}
      <section className="py-10 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-blue-600">
              What Our Clients Say
            </h2>
            <p className="text-xl text-slate-600">
              Join hundreds of satisfied customers who trust DiSO Webs
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-6">
              <CardContent className="pt-0">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-slate-700 mb-4">
                  "DiSO Webs transformed our online presence completely. Our
                  sales increased by 300% in just 3 months!"
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                    S
                  </div>
                  <div>
                    <p className="font-semibold text-blue-600">Okoro Johnson</p>
                    <p className="text-sm text-slate-500">TechStartup Inc.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="p-6">
              <CardContent className="pt-0">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-slate-700 mb-4">
                  "Professional, fast, and exceeded all expectations. The
                  project tracking dashboard is amazing!"
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                    M
                  </div>
                  <div>
                    <p className="font-semibold text-blue-600">Mike Echendu</p>
                    <p className="text-sm text-slate-500">Global Solutions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="p-6">
              <CardContent className="pt-0">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-slate-700 mb-4">
                  "Best investment we made for our business. The support team is
                  incredibly responsive."
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                    A
                  </div>
                  <div>
                    <p className="font-semibold text-blue-600">Anna Oluomo</p>
                    <p className="text-sm text-slate-500">Creative Agency</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-10 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-slate-900 mb-2">500+</div>
              <div className="text-slate-600 text-blue-600">
                Projects Completed
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-slate-900 mb-2">200+</div>
              <div className="text-slate-600 text-blue-600">Happy Clients</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-slate-900 mb-2">5</div>
              <div className="text-slate-600">Years Experience</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-slate-900 mb-2">24/7</div>
              <div className="text-slate-600">Support Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Projects Section */}
      <section className="py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Our <span className="text-blue-600">Success Stories</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              See how we've helped businesses transform their digital presence
              and achieve remarkable results
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {/* Project 1 */}
            <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="aspect-video overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=250&fit=crop"
                  alt="Fashion E-commerce Platform"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardHeader>
                <Badge variant="secondary" className="w-fit">
                  E-commerce
                </Badge>
                <CardTitle className="text-lg text-green-600">
                  Fashion E-commerce Platform
                </CardTitle>
                <CardDescription>
                  Complete online store with 300% sales increase
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 text-blue-600"
                  onClick={() =>
                    (window.location.href = "/project/ecommerce-fashion")
                  }
                >
                  View Case Study
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Project 2 */}
            <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="aspect-video overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=250&fit=crop"
                  alt="Restaurant Management System"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardHeader>
                <Badge variant="secondary" className="w-fit">
                  Web App
                </Badge>
                <CardTitle className="text-lg text-green-600">
                  Restaurant Management System
                </CardTitle>
                <CardDescription>
                  Streamlined operations with 60% more online orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 text-blue-600"
                  onClick={() => (window.location.href = "/projects")}
                >
                  View Case Study
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Project 3 */}
            <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="aspect-video overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=250&fit=crop"
                  alt="Healthcare Patient Portal"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardHeader>
                <Badge variant="secondary" className="w-fit">
                  Healthcare
                </Badge>
                <CardTitle className="text-lg text-green-600">
                  Healthcare Patient Portal
                </CardTitle>
                <CardDescription>
                  Secure portal with 80% reduction in phone bookings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-0 text-blue-600"
                  onClick={() => (window.location.href = "/projects")}
                >
                  View Case Study
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center text-blue-600">
            <Button
              size="lg"
              variant="outline"
              onClick={() => (window.location.href = "/projects")}
            >
              View All Projects
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-10 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-slate-600">
              Everything you need to know about us and our exceptional services
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-left text-lg font-semibold">
                How long does it take to build a website?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 text-base">
                Timeline depends on the complexity of your project. A basic
                website typically takes 1-2 weeks, e-commerce solutions take 3-4
                weeks, and custom web applications can take 6-12 weeks. We
                provide detailed timelines during our initial consultation.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left text-lg font-semibold">
                Do you provide hosting and domain services?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 text-base">
                We can help you set up hosting and domain registration with
                reliable providers. While we don't provide hosting directly, we
                recommend trusted partners and assist with the entire setup
                process.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left text-lg font-semibold">
                What payment methods do you accept?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 text-base">
                We accept bank transfers, online payments via Paystack, and
                installment payment plans for larger projects. A 50% deposit is
                typically required to start the project, with the balance due
                upon completion.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-left text-lg font-semibold">
                Do you offer ongoing maintenance and support?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 text-base">
                Yes! All our packages include initial support, and we offer
                ongoing maintenance plans starting from ₦25,000/month. This
                includes security updates, content updates, backup management,
                and technical support.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger className="text-left text-lg font-semibold">
                Can I update the website content myself?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 text-base">
                Absolutely! We build user-friendly content management systems
                that allow you to update text, images, and other content easily.
                We also provide training and documentation to help you manage
                your website independently.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger className="text-left text-lg font-semibold">
                What if I'm not satisfied with the result?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 text-base">
                Your satisfaction is our priority. We include multiple revision
                rounds in our process and work closely with you at each stage.
                We offer a satisfaction guarantee and will work until you're
                happy with the final result.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-10 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Ready to Start Your Project With Us?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of businesses that trust DiSO Webs for their digital
            transformation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="px-8 py-4 text-lg text-blue-600 font-semibold"
              onClick={() => (window.location.href = "/services")}
            >
              View Packages
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-8 py-4 text-lg font-semibold border-white text-blue-600 hover:bg-white hover:text-blue-600"
              onClick={() => (window.location.href = "/contact")}
            >
              Schedule Free Consulation
            </Button>
          </div>
        </div>
      </section>

      <Footer />

      {/* Live Notification */}
      {showNotification && (
        <LiveNotification
          message={currentNotification}
          onClose={handleNotificationClose}
        />
      )}
    </div>
  );
}
