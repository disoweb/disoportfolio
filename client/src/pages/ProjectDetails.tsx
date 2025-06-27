
import React from "react";
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
  }
  // Add more projects as needed
};

export default function ProjectDetails() {
  const [location, setLocation] = useLocation();
  const projectId = location.split('/project/')[1];
  const project = projectData[projectId as keyof typeof projectData];

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
