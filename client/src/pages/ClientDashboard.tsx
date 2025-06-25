import React from "react";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ProjectCard from "@/components/ProjectCard";
import MessagesList from "@/components/MessagesList";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { 
  ChartGantt, 
  CheckCircle, 
  DollarSign, 
  MessageSquare,
  Upload,
  LifeBuoy,
  CreditCard,
  Calendar
} from "lucide-react";

export default function ClientDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Check for payment status in URL parameters and hash
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success' && hash === '#dashboard') {
      toast({
        title: "Payment Successful!",
        description: "Your order has been processed successfully. We'll start working on your project soon.",
        variant: "default",
      });
      // Clear the URL parameter and hash
      window.history.replaceState({}, '', '/dashboard');
      // Force refresh queries to show new orders
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else if (paymentStatus === 'failed' && hash === '#dashboard') {
      toast({
        title: "Payment Failed",
        description: "Your payment was not successful. Please try again or contact support.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/dashboard');
    } else if (paymentStatus === 'error' && hash === '#dashboard') {
      toast({
        title: "Payment Error",
        description: "There was an error processing your payment. Please contact support.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [toast]);

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/client/stats"],
  });

  if (projectsLoading || ordersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome back, {user?.firstName || 'Client'}!
          </h1>
          <p className="text-slate-600">Track your projects and manage your account</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ChartGantt className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-slate-600">Active Projects</p>
                  <p className="text-2xl font-bold text-slate-900">{stats?.activeProjects || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-slate-600">Completed</p>
                  <p className="text-2xl font-bold text-slate-900">{stats?.completedProjects || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-slate-600">Total Spent</p>
                  <p className="text-2xl font-bold text-slate-900">
                    ${stats?.totalSpent?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-slate-600">New Messages</p>
                  <p className="text-2xl font-bold text-slate-900">{stats?.newMessages || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Orders and Projects Section */}
          <div className="lg:col-span-2 space-y-8">
            {/* Orders Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-900">Service Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {orders && orders.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {orders.map((order: any) => (
                      <div 
                        key={order.id} 
                        className="border border-slate-200 rounded-lg p-4 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group"
                        onClick={() => {
                          // Create a detailed view modal or navigate to order details
                          const orderDetails = `
Order ID: ${order.id}
Service: ${order.customRequest?.split('\n')[0]?.replace('Service: ', '') || 'Custom Service'}
Amount: ₦${(order.totalPrice || 0).toLocaleString()}
Status: ${order.status}
Date: ${new Date(order.createdAt).toLocaleDateString()}

Full Request:
${order.customRequest || 'No additional details'}
                          `.trim();
                          
                          // Show order details
                          if (confirm(`Order Details:\n\n${orderDetails}\n\nWould you like to contact support about this order?`)) {
                            window.open('https://wa.me/2348035653465?text=Hi, I need help with my order: ' + order.id, '_blank');
                          }
                        }}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">Service Order</h4>
                          <Badge variant={order.status === 'paid' ? 'default' : order.status === 'pending' ? 'secondary' : 'outline'}>
                            {order.status}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-slate-600">
                            {order.customRequest?.split('\n')[0]?.replace('Service: ', '') || 'Custom Service'}
                          </p>
                          <p className="text-lg font-semibold text-green-600">
                            ₦{(order.totalPrice || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-500">
                            Ordered on {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                            Click to view details and contact support
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No Orders Yet</h3>
                    <p className="text-slate-600 mb-4">Place your first order to get started with our services.</p>
                    <Button onClick={() => setLocation("/services")}>Browse Services</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Projects Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-900">Active Projects</CardTitle>
              </CardHeader>
              <CardContent>
                {projects && projects.length > 0 ? (
                  <div className="space-y-6">
                    {projects.map((project: any) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ChartGantt className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No Active Projects</h3>
                    <p className="text-slate-600 mb-4">
                      Projects will be created automatically after successful order payment.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Files */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-900">Recent Files</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Files Yet</h3>
                  <p className="text-slate-600">Files shared by your project team will appear here.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Messages */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-900">Recent Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <MessagesList projectId={projects?.[0]?.id} />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-900">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      // File upload functionality - for now, show alert
                      alert("File upload feature coming soon! This will allow you to share files with your project team.");
                    }}
                  >
                    <Upload className="h-4 w-4 mr-3" />
                    Upload Files
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      // Message functionality - for now, show alert
                      alert("Messaging feature coming soon! This will allow you to communicate directly with your project team.");
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-3" />
                    Send Message
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setLocation("/contact")}
                  >
                    <LifeBuoy className="h-4 w-4 mr-3" />
                    Request Support
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      // Billing functionality - for now, show alert
                      alert("Billing feature coming soon! This will show your payment history and invoices.");
                    }}
                  >
                    <CreditCard className="h-4 w-4 mr-3" />
                    View Billing
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Account Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-900">Account Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Spent</span>
                    <span className="font-semibold text-slate-900">
                      ${stats?.totalSpent?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Active Projects</span>
                    <span className="font-semibold text-slate-900">{stats?.activeProjects || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Member Since</span>
                    <span className="font-semibold text-slate-900">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
