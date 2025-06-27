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

      {/* Security Badges */}
      <section className="bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-2xl lg:text-4xl font-bold text-blue-600 mb-4">
            Enterprise-Level Security
          </p>
          <SecurityBadges />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-10 lg:py-24 bg-white">
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
