
import React, { useEffect } from "react";
import { useLocation } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, ExternalLink, CheckCircle, TrendingUp, Users, Clock } from "lucide-react";

// Project data (same as in Projects.tsx but with more details)
const projectData = {
  "ecommerce-fashion": {
    title: "Fashion E-commerce Platform",
    description: "Complete online store for a fashion brand with inventory management, payment integration, and customer portal.",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=400&fit=crop",
    category: "E-commerce",
    technologies: ["React", "Node.js", "Paystack", "MongoDB", "Express", "JWT"],
    completedDate: "2024-01-15",
    client: "Style Haven",
    duration: "8 weeks",
    teamSize: "4 developers",
    challenge: "Style Haven needed a modern e-commerce platform to replace their outdated website and expand their online presence. They required seamless payment integration, inventory management, and a user-friendly shopping experience.",
    solution: "We developed a comprehensive e-commerce platform with a modern React frontend, robust Node.js backend, and integrated payment processing. The solution includes advanced inventory management, customer accounts, and detailed analytics.",
    features: [
      "Product catalog with 500+ items and advanced filtering",
      "Secure payment gateway integration with Paystack",
      "Customer accounts with order history and tracking",
      "Comprehensive admin dashboard with real-time analytics",
      "Mobile-responsive design optimized for all devices",
      "Inventory management with low-stock alerts",
      "Email notifications for order updates",
      "SEO optimization for better search visibility"
    ],
    results: [
      {
        metric: "Online Sales Increase",
        value: "300%",
        description: "Significant boost in online revenue within first quarter"
      },
      {
        metric: "Order Processing Time",
        value: "45% faster",
        description: "Streamlined checkout and fulfillment process"
      },
      {
        metric: "Customer Satisfaction",
        value: "95%",
        description: "Improved user experience and support"
      },
      {
        metric: "Transaction Volume",
        value: "₦50M+",
        description: "Successfully processed high-value transactions"
      }
    ],
    testimonial: {
      text: "DiSO Webs transformed our online presence completely. The new platform is not only beautiful but also incredibly functional. Our sales have tripled, and customer feedback has been overwhelmingly positive.",
      author: "Sarah Johnson",
      role: "CEO, Style Haven"
    }
  },
  "restaurant-app": {
    title: "Restaurant Management System",
    description: "Custom web application for restaurant chain management including ordering, inventory, and staff scheduling.",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=400&fit=crop",
    category: "Web Application",
    technologies: ["Vue.js", "Express", "PostgreSQL", "Stripe", "Socket.io", "Redis"],
    completedDate: "2023-11-20",
    client: "Taste Buds Restaurant",
    duration: "10 weeks",
    teamSize: "5 developers",
    challenge: "Taste Buds Restaurant needed to modernize their operations across 5 locations with a unified system for online ordering, table reservations, inventory management, and staff scheduling. They were losing customers due to inefficient manual processes.",
    solution: "We built a comprehensive restaurant management system with real-time synchronization across all locations. The solution includes customer-facing ordering, internal management tools, and integration with existing POS systems.",
    features: [
      "Online ordering system with real-time menu updates",
      "Table reservation management with automated confirmations",
      "Comprehensive inventory tracking across all locations",
      "Staff scheduling with shift management and notifications",
      "POS integration for seamless order processing",
      "Customer loyalty program with point tracking",
      "Analytics dashboard for sales and performance insights",
      "Mobile app for delivery drivers and staff"
    ],
    results: [
      {
        metric: "Online Orders Increase",
        value: "60%",
        description: "Significant boost in online orders within first month"
      },
      {
        metric: "Table Turnover",
        value: "30% faster",
        description: "Improved efficiency in table management"
      },
      {
        metric: "Food Waste Reduction",
        value: "25%",
        description: "Better inventory management reduced waste"
      },
      {
        metric: "Locations Managed",
        value: "5",
        description: "Streamlined operations across all restaurant locations"
      }
    ],
    testimonial: {
      text: "DiSO Webs revolutionized our restaurant operations. The system is intuitive, reliable, and has significantly improved our efficiency. Our customers love the seamless ordering experience.",
      author: "Michael Chen",
      role: "Operations Manager, Taste Buds Restaurant"
    }
  },
  "healthcare-portal": {
    title: "Healthcare Patient Portal",
    description: "Secure patient portal for healthcare providers with appointment booking, medical records, and telemedicine features.",
    image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=400&fit=crop",
    category: "Healthcare",
    technologies: ["React", "Python", "Django", "AWS", "PostgreSQL", "WebRTC"],
    completedDate: "2023-09-10",
    client: "MedCare Clinic",
    duration: "12 weeks",
    teamSize: "6 developers",
    challenge: "MedCare Clinic was overwhelmed with phone call bookings and needed a secure digital solution for patient management. They required HIPAA compliance and seamless integration with existing medical systems.",
    solution: "We developed a comprehensive patient portal with secure authentication, appointment management, and telemedicine capabilities. The solution prioritizes patient privacy while improving operational efficiency.",
    features: [
      "Secure patient authentication with two-factor verification",
      "Comprehensive appointment booking and management system",
      "Electronic medical records access and management",
      "Prescription tracking and refill requests",
      "Integrated telemedicine platform with video consultations",
      "Automated appointment reminders and notifications",
      "Insurance verification and billing integration",
      "Mobile-responsive design for accessibility"
    ],
    results: [
      {
        metric: "Phone Call Reduction",
        value: "80%",
        description: "Dramatic decrease in appointment booking calls"
      },
      {
        metric: "Patient Engagement",
        value: "50% increase",
        description: "Higher patient participation in care management"
      },
      {
        metric: "System Uptime",
        value: "99.9%",
        description: "Reliable, always-available healthcare access"
      },
      {
        metric: "Security Compliance",
        value: "100%",
        description: "Full HIPAA compliance implementation"
      }
    ],
    testimonial: {
      text: "The patient portal has transformed how we deliver healthcare. Our patients love the convenience, and our staff can focus more on patient care rather than administrative tasks.",
      author: "Dr. Patricia Williams",
      role: "Medical Director, MedCare Clinic"
    }
  },
  "education-lms": {
    title: "Learning Management System",
    description: "Custom LMS for educational institution with course management, student tracking, and assessment tools.",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=400&fit=crop",
    category: "Education",
    technologies: ["Angular", "Laravel", "MySQL", "Redis", "AWS", "WebRTC"],
    completedDate: "2023-06-30",
    client: "Excellence Academy",
    duration: "14 weeks",
    teamSize: "7 developers",
    challenge: "Excellence Academy needed a robust learning management system to support both in-person and remote learning. They required comprehensive student tracking, assessment tools, and parent communication features.",
    solution: "We created a full-featured LMS that supports hybrid learning environments with real-time collaboration tools, comprehensive assessment capabilities, and detailed analytics for educators and administrators.",
    features: [
      "Comprehensive course content management and delivery",
      "Real-time student progress tracking and analytics",
      "Advanced online assessment and quiz creation tools",
      "Integrated grade book with automated calculations",
      "Parent portal with progress reports and communications",
      "Virtual classroom with video conferencing capabilities",
      "Assignment submission and feedback system",
      "Mobile application for students and teachers"
    ],
    results: [
      {
        metric: "Remote Learning",
        value: "100%",
        description: "Complete remote learning capability achieved"
      },
      {
        metric: "Student Engagement",
        value: "40% improvement",
        description: "Higher participation in online activities"
      },
      {
        metric: "Admin Efficiency",
        value: "90% reduction",
        description: "Dramatic decrease in manual administrative tasks"
      },
      {
        metric: "Students Supported",
        value: "1,000+",
        description: "Successfully managing over 1,000 students"
      }
    ],
    testimonial: {
      text: "The LMS has been a game-changer for our institution. It seamlessly supports our hybrid learning model and has greatly improved communication between teachers, students, and parents.",
      author: "Prof. David Okafor",
      role: "Academic Director, Excellence Academy"
    }
  },
  "fintech-dashboard": {
    title: "Financial Analytics Dashboard",
    description: "Real-time financial dashboard for investment firm with portfolio tracking and market analysis tools.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop",
    category: "Fintech",
    technologies: ["React", "D3.js", "Node.js", "Redis", "WebSocket", "Python"],
    completedDate: "2023-04-15",
    client: "InvestPro Capital",
    duration: "16 weeks",
    teamSize: "8 developers",
    challenge: "InvestPro Capital needed real-time financial analytics and portfolio management tools to serve their high-net-worth clients. They required complex data visualization and integration with multiple market data providers.",
    solution: "We developed a sophisticated financial dashboard with real-time market data integration, advanced analytics, and intuitive visualization tools that enable quick decision-making for investment professionals.",
    features: [
      "Real-time market data integration from multiple sources",
      "Comprehensive portfolio performance tracking and analysis",
      "Advanced risk analysis tools with predictive modeling",
      "Automated report generation and client communications",
      "Multi-currency support with real-time conversion",
      "Customizable dashboards for different user roles",
      "Advanced charting and data visualization tools",
      "Secure API integration with banking and trading platforms"
    ],
    results: [
      {
        metric: "Decision Speed",
        value: "75% faster",
        description: "Significantly faster investment decision making"
      },
      {
        metric: "Portfolio Monitoring",
        value: "Real-time",
        description: "Continuous portfolio performance tracking"
      },
      {
        metric: "Reporting Efficiency",
        value: "50% reduction",
        description: "Automated reporting saves significant time"
      },
      {
        metric: "Assets Under Management",
        value: "₦10B+",
        description: "Successfully managing over 10 billion naira"
      }
    ],
    testimonial: {
      text: "The analytics dashboard has revolutionized our investment process. The real-time insights and intuitive interface have made us more responsive to market changes and better at serving our clients.",
      author: "James Adebayo",
      role: "Chief Investment Officer, InvestPro Capital"
    }
  },
  "logistics-tracker": {
    title: "Logistics Tracking System",
    description: "Comprehensive logistics management system with real-time tracking, route optimization, and delivery management.",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=400&fit=crop",
    category: "Logistics",
    technologies: ["React", "Express", "MongoDB", "Google Maps API", "Socket.io", "Redis"],
    completedDate: "2023-02-28",
    client: "SwiftDelivery Ltd",
    duration: "12 weeks",
    teamSize: "6 developers",
    challenge: "SwiftDelivery Ltd was struggling with inefficient route planning, poor package tracking visibility, and high fuel costs. They needed a comprehensive solution to optimize their delivery operations and improve customer satisfaction.",
    solution: "We built an end-to-end logistics management system with real-time tracking, AI-powered route optimization, and comprehensive analytics to streamline delivery operations and enhance customer experience.",
    features: [
      "Real-time package tracking with GPS integration",
      "AI-powered route optimization for efficient deliveries",
      "Comprehensive driver mobile application",
      "Automated customer notifications and updates",
      "Advanced analytics dashboard for operations management",
      "Proof of delivery with digital signatures and photos",
      "Integration with e-commerce platforms",
      "Fleet management with vehicle maintenance tracking"
    ],
    results: [
      {
        metric: "Delivery Time",
        value: "35% reduction",
        description: "Significantly faster delivery times"
      },
      {
        metric: "Tracking Accuracy",
        value: "90% improvement",
        description: "Much more accurate package tracking"
      },
      {
        metric: "Fuel Savings",
        value: "25%",
        description: "Optimized routes reduced fuel costs"
      },
      {
        metric: "Monthly Deliveries",
        value: "10,000+",
        description: "Processing over 10,000 deliveries monthly"
      }
    ],
    testimonial: {
      text: "The logistics system has transformed our delivery operations. Our customers are happier with real-time tracking, and we've significantly reduced our operational costs through better route optimization.",
      author: "Funmi Okoro",
      role: "Operations Director, SwiftDelivery Ltd"
    }
  }
};

export default function ProjectDetails() {
  const [location, setLocation] = useLocation();
  const projectId = location.split('/project/')[1];
  const project = projectData[projectId as keyof typeof projectData];

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h1>
          <Button onClick={() => setLocation('/projects')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button
            variant="ghost"
            onClick={() => setLocation('/projects')}
            className="mb-6 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">{project.category}</Badge>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{project.title}</h1>
              <p className="text-lg text-gray-600 mb-6">{project.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  Completed: {new Date(project.completedDate).toLocaleDateString()}
                </div>
                <div className="flex items-center text-gray-600">
                  <Clock className="h-4 w-4 mr-2" />
                  Duration: {project.duration}
                </div>
                <div className="flex items-center text-gray-600">
                  <Users className="h-4 w-4 mr-2" />
                  Team: {project.teamSize}
                </div>
                <div className="flex items-center text-gray-600">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Client: {project.client}
                </div>
              </div>
            </div>
            
            <div className="order-first lg:order-last">
              <img 
                src={project.image} 
                alt={project.title}
                className="w-full rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Challenge */}
            <Card>
              <CardHeader>
                <CardTitle>The Challenge</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{project.challenge}</p>
              </CardContent>
            </Card>

            {/* Solution */}
            <Card>
              <CardHeader>
                <CardTitle>Our Solution</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{project.solution}</p>
              </CardContent>
            </Card>

            {/* Features */}
            <Card>
              <CardHeader>
                <CardTitle>Key Features Delivered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {project.features.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            <Card>
              <CardHeader>
                <CardTitle>Project Results</CardTitle>
                <CardDescription>Measurable impact delivered to the client</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {project.results.map((result, index) => (
                    <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-3xl font-bold text-blue-600 mb-2">{result.value}</div>
                      <div className="font-semibold text-gray-900 mb-1">{result.metric}</div>
                      <div className="text-sm text-gray-600">{result.description}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Testimonial */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-8">
                <blockquote className="text-lg text-gray-700 mb-4 italic">
                  "{project.testimonial.text}"
                </blockquote>
                <div className="flex items-center">
                  <div>
                    <div className="font-semibold text-gray-900">{project.testimonial.author}</div>
                    <div className="text-sm text-gray-600">{project.testimonial.role}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FAQ Section */}
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <CardDescription>Common questions about this project type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">How long did this project take to complete?</h4>
                    <p className="text-gray-600">This project was completed in {project.duration}, including planning, development, testing, and deployment phases.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">What technologies were used?</h4>
                    <p className="text-gray-600">We used modern technologies including {project.technologies.slice(0, 3).join(', ')} and others to ensure scalability and performance.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Can you build something similar for my business?</h4>
                    <p className="text-gray-600">Absolutely! We specialize in creating custom solutions tailored to each client's unique needs. Contact us to discuss your requirements.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">What kind of support was provided?</h4>
                    <p className="text-gray-600">We provided comprehensive support including training, documentation, ongoing maintenance, and technical assistance to ensure project success.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Is this solution scalable?</h4>
                    <p className="text-gray-600">Yes, all our solutions are built with scalability in mind using modern architecture patterns and cloud-native technologies.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Technologies */}
            <Card>
              <CardHeader>
                <CardTitle>Technologies Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {project.technologies.map((tech) => (
                    <Badge key={tech} variant="outline">{tech}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Project Info */}
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="font-semibold text-gray-900">Client</div>
                  <div className="text-gray-600">{project.client}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Category</div>
                  <div className="text-gray-600">{project.category}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Duration</div>
                  <div className="text-gray-600">{project.duration}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Completed</div>
                  <div className="text-gray-600">{new Date(project.completedDate).toLocaleDateString()}</div>
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="p-6 text-center">
                <h3 className="font-bold text-gray-900 mb-2">Inspired by this project?</h3>
                <p className="text-gray-600 mb-4 text-sm">Let's discuss how we can create something amazing for your business too.</p>
                <Button className="w-full" onClick={() => setLocation('/services')}>
                  Start Your Project
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
