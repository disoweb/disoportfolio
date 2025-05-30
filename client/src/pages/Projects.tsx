import React, { useState } from "react";
import { useLocation } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, ExternalLink, Search, Filter, ArrowRight } from "lucide-react";

const projects = [
  {
    id: "ecommerce-fashion",
    title: "Fashion E-commerce Platform",
    description: "Complete online store for a fashion brand with inventory management, payment integration, and customer portal.",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&h=300&fit=crop",
    category: "E-commerce",
    technologies: ["React", "Node.js", "Paystack", "MongoDB"],
    completedDate: "2024-01-15",
    client: "Style Haven",
    features: [
      "Product catalog with 500+ items",
      "Payment gateway integration",
      "Customer accounts and order tracking",
      "Admin dashboard with analytics",
      "Mobile-responsive design"
    ],
    results: [
      "300% increase in online sales",
      "45% reduction in order processing time",
      "95% customer satisfaction rate",
      "Successfully processed ₦50M+ in transactions"
    ]
  },
  {
    id: "restaurant-app",
    title: "Restaurant Management System",
    description: "Custom web application for restaurant chain management including ordering, inventory, and staff scheduling.",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&h=300&fit=crop",
    category: "Web Application",
    technologies: ["Vue.js", "Express", "PostgreSQL", "Stripe"],
    completedDate: "2023-11-20",
    client: "Taste Buds Restaurant",
    features: [
      "Online ordering system",
      "Table reservation management",
      "Inventory tracking",
      "Staff scheduling",
      "POS integration"
    ],
    results: [
      "60% increase in online orders",
      "30% improvement in table turnover",
      "25% reduction in food waste",
      "Streamlined operations across 5 locations"
    ]
  },
  {
    id: "healthcare-portal",
    title: "Healthcare Patient Portal",
    description: "Secure patient portal for healthcare providers with appointment booking, medical records, and telemedicine features.",
    image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=500&h=300&fit=crop",
    category: "Healthcare",
    technologies: ["React", "Python", "Django", "AWS"],
    completedDate: "2023-09-10",
    client: "MedCare Clinic",
    features: [
      "Secure patient authentication",
      "Appointment booking system",
      "Medical records management",
      "Prescription tracking",
      "Telemedicine integration"
    ],
    results: [
      "80% reduction in phone call bookings",
      "50% increase in patient engagement",
      "99.9% uptime reliability",
      "HIPAA compliant security implementation"
    ]
  },
  {
    id: "education-lms",
    title: "Learning Management System",
    description: "Custom LMS for educational institution with course management, student tracking, and assessment tools.",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500&h=300&fit=crop",
    category: "Education",
    technologies: ["Angular", "Laravel", "MySQL", "Redis"],
    completedDate: "2023-06-30",
    client: "Excellence Academy",
    features: [
      "Course content management",
      "Student progress tracking",
      "Online assessments",
      "Grade book management",
      "Parent portal"
    ],
    results: [
      "100% remote learning capability",
      "40% improvement in student engagement",
      "90% reduction in administrative tasks",
      "Supported 1000+ students seamlessly"
    ]
  },
  {
    id: "fintech-dashboard",
    title: "Financial Analytics Dashboard",
    description: "Real-time financial dashboard for investment firm with portfolio tracking and market analysis tools.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&h=300&fit=crop",
    category: "Fintech",
    technologies: ["React", "D3.js", "Node.js", "Redis"],
    completedDate: "2023-04-15",
    client: "InvestPro Capital",
    features: [
      "Real-time market data",
      "Portfolio performance tracking",
      "Risk analysis tools",
      "Automated reporting",
      "Multi-currency support"
    ],
    results: [
      "75% faster decision making",
      "Real-time portfolio monitoring",
      "50% reduction in reporting time",
      "Managing ₦10B+ in assets"
    ]
  },
  {
    id: "logistics-tracker",
    title: "Logistics Tracking System",
    description: "Comprehensive logistics management system with real-time tracking, route optimization, and delivery management.",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500&h=300&fit=crop",
    category: "Logistics",
    technologies: ["React", "Express", "MongoDB", "Google Maps API"],
    completedDate: "2023-02-28",
    client: "SwiftDelivery Ltd",
    features: [
      "Real-time package tracking",
      "Route optimization",
      "Driver mobile app",
      "Customer notifications",
      "Analytics dashboard"
    ],
    results: [
      "35% reduction in delivery time",
      "90% improvement in tracking accuracy",
      "25% fuel cost savings",
      "Processing 10,000+ deliveries monthly"
    ]
  }
];

export default function Projects() {
  const [, setLocation] = useLocation();

  const categories = [...new Set(projects.map(p => p.category))];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Our <span className="text-blue-600">Success Stories</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover how we've helped businesses across various industries achieve their digital transformation goals
            </p>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <Badge variant="secondary" className="px-4 py-2 text-sm">All Projects</Badge>
          {categories.map((category) => (
            <Badge key={category} variant="outline" className="px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer">
              {category}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project) => (
            <Card key={project.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                  onClick={() => setLocation(`/project/${project.id}`)}>
              <div className="aspect-video overflow-hidden">
                <img 
                  src={project.image} 
                  alt={project.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary">{project.category}</Badge>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(project.completedDate).toLocaleDateString()}
                  </div>
                </div>
                <CardTitle className="text-xl">{project.title}</CardTitle>
                <CardDescription className="text-gray-600">
                  {project.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-2">Technologies:</div>
                    <div className="flex flex-wrap gap-1">
                      {project.technologies.slice(0, 3).map((tech) => (
                        <Badge key={tech} variant="outline" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                      {project.technologies.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{project.technologies.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button variant="ghost" className="w-full justify-between p-0 h-auto text-blue-600 hover:text-blue-700">
                    View Case Study
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16 pt-16 border-t border-gray-200">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Ready to Create Your Success Story?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Let's discuss how we can help transform your business with a custom digital solution
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => setLocation('/contact')}>
              Start Your Project
            </Button>
            <Button variant="outline" size="lg" onClick={() => setLocation('/services')}>
              View Our Services
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}