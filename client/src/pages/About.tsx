import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Lightbulb, Award } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">About DiSO Webs</h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            We're passionate about creating digital experiences that drive real business results. 
            Our team combines creativity with technical excellence to deliver websites that not only look stunning but perform exceptionally.
          </p>
        </div>

        {/* Company Story */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <img 
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600" 
              alt="Modern office workspace" 
              className="rounded-2xl shadow-xl w-full h-auto" 
            />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Our Story</h2>
            <p className="text-slate-600 mb-6">
              Founded in 2019, DiSO Webs emerged from a simple belief: every business deserves a website that truly represents their vision and drives growth. 
              What started as a small team of passionate developers has evolved into a full-service digital agency.
            </p>
            <p className="text-slate-600 mb-6">
              We've had the privilege of working with over 150 clients, from innovative startups to established enterprises, 
              helping them establish and strengthen their digital presence.
            </p>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">150+</div>
                <div className="text-sm text-slate-600">Projects Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">98%</div>
                <div className="text-sm text-slate-600">Client Satisfaction</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">5</div>
                <div className="text-sm text-slate-600">Years Experience</div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Meet Our Team</h2>
            <p className="text-xl text-slate-600">The talented individuals who bring your digital vision to life</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardContent className="pt-6">
                <img 
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400" 
                  alt="Alex Rodriguez - CEO" 
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover" 
                />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Alex Rodriguez</h3>
                <p className="text-blue-600 font-medium mb-2">CEO & Lead Developer</p>
                <p className="text-slate-600">Full-stack developer with 8+ years experience in building scalable web applications.</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <img 
                  src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400" 
                  alt="Sarah Chen - Design Director" 
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover" 
                />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Sarah Chen</h3>
                <p className="text-blue-600 font-medium mb-2">Design Director</p>
                <p className="text-slate-600">Award-winning UX/UI designer passionate about creating intuitive user experiences.</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400" 
                  alt="Michael Thompson - Project Manager" 
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover" 
                />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Michael Thompson</h3>
                <p className="text-blue-600 font-medium mb-2">Project Manager</p>
                <p className="text-slate-600">Expert in agile methodologies, ensuring projects are delivered on time and exceed expectations.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Values Section */}
        <div className="bg-slate-900 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">Our Core Values</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Client-Centric</h3>
              <p className="text-slate-300">
                Your success is our success. We listen, understand, and deliver solutions that exceed expectations.
              </p>
            </div>
            <div>
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Innovation</h3>
              <p className="text-slate-300">
                We stay ahead of technology trends to provide cutting-edge solutions for your business.
              </p>
            </div>
            <div>
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Excellence</h3>
              <p className="text-slate-300">
                Quality is never an accident. We maintain the highest standards in every project we deliver.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}