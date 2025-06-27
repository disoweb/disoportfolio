import React, { useState, useEffect } from "react";


import AdminNavigation from "@/components/AdminNavigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  TrendingUp,
  ChartGantt,
  Plus,
  MessageSquare,
  Settings,
  Edit,
  Clock,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  MoreHorizontal,
  Filter,
  Calendar,
  FileText,
  User
} from "lucide-react";

// WhatsApp Settings Component
function WhatsAppSettings() {
  const { toast } = useToast();
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: settings, refetch } = useQuery({
    queryKey: ["/api/admin/settings"],
    onSuccess: (data: any) => {
      if (data?.whatsappNumber) {
        setWhatsappNumber(data.whatsappNumber);
      }
    }
  });

  useEffect(() => {
    if (settings?.whatsappNumber) {
      setWhatsappNumber(settings.whatsappNumber);
    }
  }, [settings]);

  const updateWhatsAppNumber = async () => {
    if (!whatsappNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid WhatsApp number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          whatsappNumber: whatsappNumber.trim(),
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "WhatsApp number updated successfully",
        });
        refetch();
      } else {
        throw new Error("Failed to update WhatsApp number");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update WhatsApp number",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="whatsapp-number">WhatsApp Number</Label>
          <div className="flex space-x-2 mt-2">
            <Input
              id="whatsapp-number"
              type="tel"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="+234 123 456 7890"
              className="flex-1"
            />
            <Button onClick={updateWhatsAppNumber} disabled={isLoading}>
              {isLoading ? "Updating..." : "Update"}
            </Button>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Include country code (e.g., +234 for Nigeria)
          </p>
        </div>
        <div className="bg-slate-50 p-4 rounded-lg">
          <h4 className="font-medium text-slate-900 mb-2">Current Settings</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">WhatsApp Number:</span>
              <span className="font-mono">{settings?.whatsappNumber || "Not set"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Widget Status:</span>
              <span className="text-green-600">Active</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Preview */}
      <div className="border rounded-lg p-4 bg-slate-50">
        <h4 className="font-medium text-slate-900 mb-2">Widget Preview</h4>
        <div className="relative w-fit">
          <div className="bg-green-500 text-white p-3 rounded-full shadow-lg">
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.516"/>
            </svg>
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
        </div>
        <p className="text-sm text-slate-600 mt-2">
          This is how the WhatsApp widget appears on your website
        </p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Redirect to admin login if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user)) {
      toast({
        title: "Access Denied",
        description: "Admin credentials required",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/admin";
      }, 1000);
    } else if (!isLoading && user && (user as any).role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Admin privileges required",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  }, [isAuthenticated, isLoading, user, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">Admin credentials required</p>
          <p className="text-sm text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if ((user as any).role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">Admin privileges required</p>
          <p className="text-sm text-gray-500">Redirecting to home...</p>
        </div>
      </div>
    );
  }
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projectFilter, setProjectFilter] = useState("all");
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [isClientsModalOpen, setIsClientsModalOpen] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedProjectDetail, setSelectedProjectDetail] = useState<any>(null);
  const [updateForm, setUpdateForm] = useState({
    stage: "",
    progress: "",
    notes: "",
    status: ""
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/analytics"],
  });

  const { data: orders = [] as any[] } = useQuery({
    queryKey: ["/api/orders"],
  });

  const { data: projects = [] as any[] } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: workload = {} as any } = useQuery({
    queryKey: ["/api/admin/workload"],
  });

  if (analyticsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNavigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-600">Manage projects, clients, and business operations</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="cursor-pointer hover:bg-slate-50 transition-colors duration-200 active:scale-95 transform" onClick={() => setIsRevenueModalOpen(true)}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-slate-900">
                    ₦{(analytics as any)?.totalRevenue?.toLocaleString() || '0'}
                  </p>
                  <p className="text-sm text-green-600">+12% this month</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-slate-50 transition-colors duration-200 active:scale-95 transform" onClick={() => setIsOrdersModalOpen(true)}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">New Orders</p>
                  <p className="text-2xl font-bold text-slate-900">{(analytics as any)?.newOrders || 0}</p>
                  <p className="text-sm text-blue-600">+3 this week</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-slate-50 transition-colors duration-200 active:scale-95 transform" onClick={() => setIsClientsModalOpen(true)}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Clients</p>
                  <p className="text-2xl font-bold text-slate-900">{(analytics as any)?.totalClients || 0}</p>
                  <p className="text-sm text-purple-600">+8 this month</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-slate-50 transition-colors duration-200 active:scale-95 transform" onClick={() => setIsProjectsModalOpen(true)}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Active Projects</p>
                  <p className="text-2xl font-bold text-slate-900">{(analytics as any)?.activeProjects || 0}</p>
                  <p className="text-sm text-orange-600">2 due this week</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <ChartGantt className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Details Modal */}
        <Dialog open={isRevenueModalOpen} onOpenChange={setIsRevenueModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Revenue Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-600">Total Revenue</div>
                    <div className="text-2xl font-bold text-green-600">
                      ₦{((analytics as any)?.totalRevenue || 0).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-600">This Month</div>
                    <div className="text-2xl font-bold">₦{((analytics as any)?.totalRevenue * 0.12 || 0).toLocaleString()}</div>
                    <div className="text-sm text-green-600">+12% growth</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-600">Average Order</div>
                    <div className="text-2xl font-bold">₦{((analytics as any)?.totalRevenue / Math.max((analytics as any)?.newOrders || 1, 1)).toLocaleString()}</div>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Revenue Transactions</h3>
                <div className="space-y-2">
                  {(() => {
                    if (!orders || !Array.isArray(orders)) return null;
                    return (orders as any[])
                      .filter((order: any) => order.status === 'paid')
                      .map((order: any, index: number) => (
                        <div 
                          key={`order-${order.id || index}`} 
                          className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={() => setSelectedTransaction(order)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div>
                              <div className="font-medium">{order.service?.name || order.customRequest?.split('\n')[0] || 'Service'}</div>
                              <div className="text-sm text-slate-600">
                                {new Date(order.createdAt).toLocaleDateString()} • {order.user?.firstName} {order.user?.lastName}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-green-600">₦{parseInt(order.totalPrice || order.amount).toLocaleString()}</div>
                            <div className="text-sm text-slate-600">Paid</div>
                          </div>
                        </div>
                      ));
                  })()}
                  {(!orders || !Array.isArray(orders) || orders.filter((order: any) => order.status === 'paid').length === 0) && (
                    <div className="text-center py-8 text-slate-500">
                      No revenue transactions found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Orders Details Modal */}
        <Dialog open={isOrdersModalOpen} onOpenChange={setIsOrdersModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                All Orders
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {['pending', 'paid', 'in_progress', 'complete'].map((status) => {
                  const statusOrders = orders && Array.isArray(orders) 
                    ? orders.filter((order: any) => order.status === status) 
                    : [];
                  return (
                    <Card key={status}>
                      <CardContent className="p-4">
                        <div className="text-sm text-slate-600 capitalize">{status.replace('_', ' ')}</div>
                        <div className="text-2xl font-bold">{statusOrders.length}</div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>
                <div className="space-y-2">
                  {(() => {
                    if (!orders || !Array.isArray(orders)) return null;
                    return (orders as any[])
                      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((order: any, index: number) => (
                        <div 
                          key={order.id} 
                          className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant={order.status === 'paid' ? 'default' : 'secondary'}>
                              {order.status}
                            </Badge>
                            <div>
                              <div className="font-medium">{order.service?.name || order.customRequest?.split('\n')[0] || 'Service'}</div>
                              <div className="text-sm text-slate-600">
                                {order.user?.firstName} {order.user?.lastName} • {new Date(order.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">₦{parseInt(order.totalPrice || order.amount).toLocaleString()}</div>
                            <div className="text-sm text-slate-600">{order.service?.category || 'Custom'}</div>
                          </div>
                        </div>
                      ));
                  })()}
                  {(!orders || !Array.isArray(orders) || orders.length === 0) && (
                    <div className="text-center py-8 text-slate-500">
                      No orders found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Clients Details Modal */}
        <Dialog open={isClientsModalOpen} onOpenChange={setIsClientsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                All Clients
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-600">Total Clients</div>
                    <div className="text-2xl font-bold">{(analytics as any)?.totalClients || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-600">Active Projects</div>
                    <div className="text-2xl font-bold">
                      {projects && Array.isArray(projects) 
                        ? projects.filter((p: any) => p.status === 'active').length 
                        : 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-600">Total Revenue</div>
                    <div className="text-2xl font-bold text-green-600">
                      ₦{((analytics as any)?.totalRevenue || 0).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Client List</h3>
                <div className="space-y-2">
                  {(() => {
                    if (!orders || !Array.isArray(orders)) return null;
                    return Array.from(new Map(orders.map((order: any) => [order.user?.email, order])).values())
                      .sort((a: any, b: any) => {
                        const aHasActiveProject = projects && Array.isArray(projects) 
                          ? projects.some((p: any) => p.userId === a.userId && p.status === 'active')
                          : false;
                        const bHasActiveProject = projects && Array.isArray(projects)
                          ? projects.some((p: any) => p.userId === b.userId && p.status === 'active')
                          : false;
                        
                        if (aHasActiveProject && !bHasActiveProject) return -1;
                        if (!aHasActiveProject && bHasActiveProject) return 1;
                        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                      })
                      .map((order: any, index: number) => {
                        const clientProjects = projects && Array.isArray(projects)
                          ? projects.filter((p: any) => p.userId === order.userId)
                          : [];
                        const activeProject = clientProjects.find((p: any) => p.status === 'active');
                        
                        return (
                          <div 
                            key={order.user?.email} 
                            className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => setSelectedClient({...order.user, projects: clientProjects, activeProject})}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-purple-600 font-semibold">
                                  {order.user?.firstName?.[0]}{order.user?.lastName?.[0]}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium">{order.user?.firstName} {order.user?.lastName}</div>
                                <div className="text-sm text-slate-600">{order.user?.email}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                {activeProject && (
                                  <Badge variant="default" className="bg-green-100 text-green-700">
                                    Active Project
                                  </Badge>
                                )}
                                <Badge variant="secondary">
                                  {clientProjects.length} project{clientProjects.length !== 1 ? 's' : ''}
                                </Badge>
                              </div>
                              <div className="text-sm text-slate-600 mt-1">
                                Joined {new Date(order.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        );
                      });
                  })()}
                  {(!orders || !Array.isArray(orders) || orders.length === 0) && (
                    <div className="text-center py-8 text-slate-500">
                      No clients found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Projects Details Modal */}
        <Dialog open={isProjectsModalOpen} onOpenChange={setIsProjectsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ChartGantt className="h-5 w-5 text-orange-600" />
                All Projects
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {['active', 'not_started', 'paused', 'completed'].map((status) => {
                  const statusProjects = projects && Array.isArray(projects)
                    ? projects.filter((project: any) => project.status === status)
                    : [];
                  return (
                    <Card key={status}>
                      <CardContent className="p-4">
                        <div className="text-sm text-slate-600 capitalize">{status.replace('_', ' ')}</div>
                        <div className="text-2xl font-bold">{statusProjects.length}</div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Active Projects (Sorted by Priority)</h3>
                <div className="space-y-2">
                  {(() => {
                    if (!projects || !Array.isArray(projects)) return null;
                    return (projects as any[])
                      .filter((project: any) => project.status === 'active')
                      .sort((a: any, b: any) => {
                        // Sort by due date (most urgent first), then by progress (least progress first)
                        const aDueDate = new Date(a.dueDate).getTime();
                        const bDueDate = new Date(b.dueDate).getTime();
                        if (aDueDate !== bDueDate) return aDueDate - bDueDate;
                        return a.progressPercentage - b.progressPercentage;
                      })
                      .map((project: any, index: number) => {
                        const isOverdue = new Date(project.dueDate) < new Date();
                        const daysUntilDue = Math.ceil((new Date(project.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        
                        return (
                          <div 
                            key={project.id} 
                            className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => setSelectedProjectDetail(project)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${isOverdue ? 'bg-red-500' : daysUntilDue <= 7 ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                              <div>
                                <div className="font-medium">{project.projectName}</div>
                                <div className="text-sm text-slate-600">
                                  Client: {project.order?.user?.firstName} {project.order?.user?.lastName}
                                </div>
                                <div className="text-sm text-slate-600">
                                  Due: {new Date(project.dueDate).toLocaleDateString()}
                                  {isOverdue && <span className="text-red-600 ml-2">(Overdue)</span>}
                                  {!isOverdue && daysUntilDue <= 7 && <span className="text-yellow-600 ml-2">({daysUntilDue} days left)</span>}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                                {project.status}
                              </Badge>
                              <div className="text-sm text-slate-600 mt-1">{project.progressPercentage}% complete</div>
                              <Progress value={project.progressPercentage} className="w-20 h-2 mt-1" />
                            </div>
                          </div>
                        );
                      });
                  })()}
                  {(!projects || !Array.isArray(projects) || projects.filter((p: any) => p.status === 'active').length === 0) && (
                    <div className="text-center py-8 text-slate-500">
                      No active projects found
                    </div>
                  )}
                </div>

                {projects && Array.isArray(projects) && projects.filter((p: any) => p.status !== 'active').length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4">Other Projects</h3>
                    <div className="space-y-2">
                      {(() => {
                        if (!projects || !Array.isArray(projects)) return null;
                        return (projects as any[])
                          .filter((project: any) => project.status !== 'active')
                          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .map((project: any, index: number) => (
                            <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg opacity-75">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${
                                  project.status === 'completed' ? 'bg-green-500' : 
                                  project.status === 'paused' ? 'bg-yellow-500' : 'bg-gray-500'
                                }`}></div>
                                <div>
                                  <div className="font-medium">{project.projectName}</div>
                                  <div className="text-sm text-slate-600">
                                    Client: {project.order?.user?.firstName} {project.order?.user?.lastName}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant="secondary" className="capitalize">
                                  {project.status.replace('_', ' ')}
                                </Badge>
                                <div className="text-sm text-slate-600 mt-1">{project.progressPercentage}% complete</div>
                              </div>
                            </div>
                          ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Transaction Detail Modal */}
        <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Transaction Details
              </DialogTitle>
            </DialogHeader>
            {selectedTransaction && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">Transaction ID</h3>
                    <p className="text-sm text-slate-600 font-mono">{selectedTransaction.id}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Amount</h3>
                    <p className="text-lg font-bold text-green-600">₦{parseInt(selectedTransaction.totalPrice || selectedTransaction.amount).toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">Client</h3>
                    <p className="text-slate-600">{selectedTransaction.user?.firstName} {selectedTransaction.user?.lastName}</p>
                    <p className="text-sm text-slate-500">{selectedTransaction.user?.email}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Date</h3>
                    <p className="text-slate-600">{new Date(selectedTransaction.createdAt).toLocaleDateString()}</p>
                    <p className="text-sm text-slate-500">{new Date(selectedTransaction.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900">Service Details</h3>
                  {selectedTransaction.service?.name ? (
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                      <p className="font-medium">{selectedTransaction.service.name}</p>
                      <p className="text-sm text-slate-600 capitalize">{selectedTransaction.service.category} Package</p>
                    </div>
                  ) : (
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                      <p className="font-medium">Custom Service Request</p>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{selectedTransaction.customRequest}</p>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900">Status</h3>
                  <div className="mt-2">
                    <Badge variant="default" className="bg-green-100 text-green-700">
                      {selectedTransaction.status}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Order Detail Modal */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                Order Details
              </DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">Order ID</h3>
                    <p className="text-sm text-slate-600 font-mono">{selectedOrder.id}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Status</h3>
                    <Badge variant={selectedOrder.status === 'paid' ? 'default' : 'secondary'}>
                      {selectedOrder.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">Client Information</h3>
                    <p className="font-medium">{selectedOrder.user?.firstName} {selectedOrder.user?.lastName}</p>
                    <p className="text-sm text-slate-600">{selectedOrder.user?.email}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Order Value</h3>
                    <p className="text-xl font-bold text-blue-600">₦{parseInt(selectedOrder.totalPrice || selectedOrder.amount).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900">Service/Product</h3>
                  {selectedOrder.service?.name ? (
                    <div className="mt-2 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900">{selectedOrder.service.name}</h4>
                      <p className="text-sm text-blue-700 capitalize mt-1">{selectedOrder.service.category} Package</p>
                      {selectedOrder.service.description && (
                        <p className="text-sm text-blue-600 mt-2">{selectedOrder.service.description}</p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900">Custom Service Request</h4>
                      <p className="text-sm text-blue-600 mt-2 whitespace-pre-wrap">{selectedOrder.customRequest}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">Order Date</h3>
                    <p className="text-slate-600">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                    <p className="text-sm text-slate-500">{new Date(selectedOrder.createdAt).toLocaleTimeString()}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Payment Status</h3>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${selectedOrder.status === 'paid' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      <span className="text-sm">{selectedOrder.status === 'paid' ? 'Payment Received' : 'Payment Pending'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Client Detail Modal */}
        <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Client Details
              </DialogTitle>
            </DialogHeader>
            {selectedClient && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-xl">
                      {selectedClient.firstName?.[0]}{selectedClient.lastName?.[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{selectedClient.firstName} {selectedClient.lastName}</h3>
                    <p className="text-slate-600">{selectedClient.email}</p>
                    <p className="text-sm text-slate-500">Client ID: {selectedClient.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-slate-900">Account Status</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedClient.activeProject ? (
                        <Badge variant="default" className="bg-green-100 text-green-700">
                          Active Client
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Total Projects</h4>
                    <p className="text-2xl font-bold text-purple-600">{selectedClient.projects?.length || 0}</p>
                  </div>
                </div>

                {selectedClient.projects && selectedClient.projects.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3">Projects</h4>
                    <div className="space-y-2">
                      {selectedClient.projects.map((project: any) => (
                        <div key={project.id} className="p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{project.projectName}</p>
                              <p className="text-sm text-slate-600">Due: {new Date(project.dueDate).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant={project.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                                {project.status.replace('_', ' ')}
                              </Badge>
                              <p className="text-sm text-slate-600 mt-1">{project.progressPercentage}% complete</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-slate-900">Member Since</h4>
                    <p className="text-slate-600">{new Date(selectedClient.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Role</h4>
                    <p className="text-slate-600 capitalize">{selectedClient.role || 'Client'}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Project Detail Modal */}
        <Dialog open={!!selectedProjectDetail} onOpenChange={() => setSelectedProjectDetail(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ChartGantt className="h-5 w-5 text-orange-600" />
                Project Details
              </DialogTitle>
            </DialogHeader>
            {selectedProjectDetail && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{selectedProjectDetail.projectName}</h3>
                    <p className="text-sm text-slate-600 mt-1">Project ID: {selectedProjectDetail.id}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={selectedProjectDetail.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                      {selectedProjectDetail.status.replace('_', ' ')}
                    </Badge>
                    <p className="text-sm text-slate-600 mt-1">Progress: {selectedProjectDetail.progressPercentage}%</p>
                    <Progress value={selectedProjectDetail.progressPercentage} className="w-full h-2 mt-2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-slate-900">Client Information</h4>
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                      <p className="font-medium">{selectedProjectDetail.order?.user?.firstName} {selectedProjectDetail.order?.user?.lastName}</p>
                      <p className="text-sm text-slate-600">{selectedProjectDetail.order?.user?.email}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Timeline</h4>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Start Date:</span>
                        <span>{new Date(selectedProjectDetail.startDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Due Date:</span>
                        <span className={new Date(selectedProjectDetail.dueDate) < new Date() ? 'text-red-600' : ''}>
                          {new Date(selectedProjectDetail.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Duration:</span>
                        <span>{selectedProjectDetail.timelineWeeks} weeks</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900">Project Description</h4>
                  <div className="mt-2 p-4 bg-orange-50 rounded-lg">
                    <p className="text-slate-700">{selectedProjectDetail.description || 'No description available'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-semibold text-slate-900">Current Stage</h4>
                    <p className="text-slate-600 capitalize">{selectedProjectDetail.currentStage?.replace('_', ' ') || 'Planning'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Priority</h4>
                    <p className="text-slate-600 capitalize">{selectedProjectDetail.priority || 'Normal'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Created</h4>
                    <p className="text-slate-600">{new Date(selectedProjectDetail.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {selectedProjectDetail.notes && (
                  <div>
                    <h4 className="font-semibold text-slate-900">Latest Notes</h4>
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedProjectDetail.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Recent Orders */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Recent Orders</CardTitle>
                    <Button variant="outline" size="sm">View All</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {Array.isArray(orders) && orders.length > 0 ? (
                    <div className="space-y-4">
                      {orders.slice(0, 5).map((order: any) => (
                        <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{order.user?.firstName} {order.user?.lastName}</p>
                            <p className="text-sm text-slate-600">{order.service?.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">₦{parseInt(order.totalPrice).toLocaleString()}</p>
                            <Badge variant={order.status === 'paid' ? 'default' : 'secondary'}>
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ShoppingCart className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">No orders yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Project Status Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {Array.isArray(projects) && projects.length > 0 ? (
                    <div className="space-y-4">
                      {['Discovery', 'Design', 'Development', 'Testing', 'Deployed'].map((status) => {
                        const count = projects.filter((p: any) => p.currentStage === status).length;
                        return (
                          <div key={status} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className={`w-4 h-4 rounded-full mr-3 ${
                                status === 'Discovery' ? 'bg-blue-500' :
                                status === 'Design' ? 'bg-yellow-500' :
                                status === 'Development' ? 'bg-purple-500' :
                                status === 'Testing' ? 'bg-orange-500' :
                                'bg-green-500'
                              }`}></div>
                              <span>{status}</span>
                            </div>
                            <span className="font-semibold">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ChartGantt className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">No projects yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>All Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {Array.isArray(orders) && orders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Client</th>
                          <th className="text-left p-2">Service</th>
                          <th className="text-left p-2">Amount</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order: any) => (
                          <tr key={order.id} className="border-b">
                            <td className="p-2">
                              {order.user?.firstName} {order.user?.lastName}
                            </td>
                            <td className="p-2">{order.service?.name}</td>
                            <td className="p-2">₦{parseInt(order.totalPrice).toLocaleString()}</td>
                            <td className="p-2">
                              <Badge variant={order.status === 'paid' ? 'default' : 'secondary'}>
                                {order.status}
                              </Badge>
                            </td>
                            <td className="p-2">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-2">
                              <Button variant="outline" size="sm">
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">No orders found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects">
            <div className="space-y-6">
              {/* Project Management Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Project Management</h2>
                  <p className="text-slate-600">Manage project progress, timelines, and team assignments</p>
                </div>
                <div className="flex space-x-3">
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </Button>
                </div>
              </div>

              {/* Projects Grid */}
              {Array.isArray(projects) && projects.length > 0 ? (
                <div className="grid gap-6">
                  {projects
                    .filter((project: any) => {
                      if (projectFilter === "all") return true;
                      if (projectFilter === "overdue") {
                        const dueDate = new Date(project.dueDate);
                        return dueDate < new Date() && project.status !== 'completed';
                      }
                      return project.status === projectFilter;
                    })
                    .map((project: any) => (
                      <ProjectCard 
                        key={project.id} 
                        project={project} 
                        onUpdate={(project) => {
                          setSelectedProject(project);
                          setUpdateForm({
                            stage: project.currentStage || "",
                            progress: project.progressPercentage?.toString() || "0",
                            notes: project.notes || "",
                            status: project.status || ""
                          });
                          setIsUpdateDialogOpen(true);
                        }}
                      />
                    ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <ChartGantt className="h-16 w-16 text-slate-400 mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No Projects Found</h3>
                    <p className="text-slate-600 mb-6">Get started by creating your first project</p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Project
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Project Update Dialog */}
              <ProjectUpdateDialog 
                project={selectedProject}
                isOpen={isUpdateDialogOpen}
                onClose={() => setIsUpdateDialogOpen(false)}
                updateForm={updateForm}
                setUpdateForm={setUpdateForm}
              />
            </div>
          </TabsContent>

          <TabsContent value="clients">
            <Card>
              <CardHeader>
                <CardTitle>Client Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">Client management coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-6">
              {/* WhatsApp Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>WhatsApp Integration Settings</CardTitle>
                  <CardDescription>Configure WhatsApp contact number for the floating widget</CardDescription>
                </CardHeader>
                <CardContent>
                  <WhatsAppSettings />
                </CardContent>
              </Card>

              {/* Workload Management */}
              <Card>
                <CardHeader>
                  <CardTitle>Workload & Capacity Management</CardTitle>
                  <CardDescription>Manage project capacity and delivery estimates</CardDescription>
                </CardHeader>
                <CardContent>
                  {workload ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{workload.totalActiveProjects}</div>
                        <div className="text-sm text-blue-800">Active Projects</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{workload.capacity}</div>
                        <div className="text-sm text-green-800">Available Capacity</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{workload.thisWeekProjects}</div>
                        <div className="text-sm text-purple-800">This Week</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {new Date(workload.estimatedDelivery).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-orange-800">Next Available</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">Loading workload data...</div>
                  )}
                </CardContent>
              </Card>

              {/* Service Availability */}
              <Card>
                <CardHeader>
                  <CardTitle>Service Availability Management</CardTitle>
                  <CardDescription>Update available spots and delivery dates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['landing', 'ecommerce', 'webapp'].map(serviceId => (
                      <div key={serviceId} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium capitalize">{serviceId} Page</h4>
                          <p className="text-sm text-slate-600">Current spots and delivery estimates</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <input
                            type="number"
                            placeholder="Spots"
                            className="w-20 px-2 py-1 border rounded"
                            min="0"
                            max="10"
                          />
                          <input
                            type="date"
                            className="px-2 py-1 border rounded"
                          />
                          <Button size="sm">Update</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Analytics & Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">Detailed analytics coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Project Card Component
function ProjectCard({ project, onUpdate }: { project: any; onUpdate: (project: any) => void }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-slate-500';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage?.toLowerCase()) {
      case 'discovery': return 'text-blue-600 bg-blue-50';
      case 'design': return 'text-purple-600 bg-purple-50';
      case 'development': return 'text-orange-600 bg-orange-50';
      case 'testing': return 'text-yellow-600 bg-yellow-50';
      case 'launch': return 'text-green-600 bg-green-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const calculateTimeProgress = () => {
    if (!project.startDate || !project.dueDate) return 0;
    const start = new Date(project.startDate).getTime();
    const end = new Date(project.dueDate).getTime();
    const now = new Date().getTime();
    const progress = ((now - start) / (end - start)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const isOverdue = () => {
    if (!project.dueDate || project.status === 'completed') return false;
    return new Date(project.dueDate) < new Date();
  };

  const timeProgress = calculateTimeProgress();

  return (
    <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-semibold text-slate-900">
                {project.projectName || 'Untitled Project'}
              </h3>
              <div className={`w-3 h-3 rounded-full ${getStatusColor(project.status)}`} />
              {isOverdue() && (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>Client: {project.user?.firstName} {project.user?.lastName}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Due: {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'TBD'}</span>
              </div>
            </div>
            <Badge className={`${getStageColor(project.currentStage)} border-none`}>
              {project.currentStage || 'Not Started'}
            </Badge>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onUpdate(project)}>
                <Edit className="h-4 w-4 mr-2" />
                Update Progress
              </DropdownMenuItem>
              <DropdownMenuItem>
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Client
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Progress Indicators */}
        <div className="space-y-4">
          {/* Project Progress */}
          <div>
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>Project Progress</span>
              <span>{project.progressPercentage || 0}%</span>
            </div>
            <Progress value={project.progressPercentage || 0} className="h-2" />
          </div>

          {/* Time Progress */}
          <div>
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>Time Progress</span>
              <span>{Math.round(timeProgress)}%</span>
            </div>
            <div className="relative">
              <Progress 
                value={timeProgress} 
                className={`h-2 ${isOverdue() ? 'bg-red-100' : ''}`}
              />
              {/* Red line indicator */}
              <div 
                className="absolute top-0 h-2 w-0.5 bg-red-500 rounded-sm" 
                style={{ left: `${Math.min(timeProgress, 100)}%`, transform: 'translateX(-50%)' }}
              />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock className="h-4 w-4" />
            <span>
              {project.timelineWeeks ? `${project.timelineWeeks} weeks` : 'No timeline set'}
            </span>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => onUpdate(project)}>
              <Edit className="h-4 w-4 mr-1" />
              Update
            </Button>
            {project.status === 'active' ? (
              <Button variant="outline" size="sm">
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
            ) : (
              <Button variant="outline" size="sm">
                <Play className="h-4 w-4 mr-1" />
                Resume
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Project Update Dialog Component
function ProjectUpdateDialog({ 
  project, 
  isOpen, 
  onClose, 
  updateForm, 
  setUpdateForm 
}: { 
  project: any; 
  isOpen: boolean; 
  onClose: () => void;
  updateForm: any;
  setUpdateForm: (form: any) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentStage: updateForm.stage,
          progressPercentage: parseInt(updateForm.progress),
          notes: updateForm.notes,
          status: updateForm.status
        })
      });

      if (response.ok) {
        onClose();
        // Refresh projects data
        window.location.reload();
      }
    } catch (error) {

    } finally {
      setIsSubmitting(false);
    }
  };

  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Project Progress</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="stage">Current Stage</Label>
            <Select value={updateForm.stage} onValueChange={(value) => setUpdateForm({...updateForm, stage: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Discovery">Discovery</SelectItem>
                <SelectItem value="Design">Design</SelectItem>
                <SelectItem value="Development">Development</SelectItem>
                <SelectItem value="Testing">Testing</SelectItem>
                <SelectItem value="Launch">Launch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="progress">Progress Percentage</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={updateForm.progress}
              onChange={(e) => setUpdateForm({...updateForm, progress: e.target.value})}
              placeholder="0-100"
            />
          </div>

          <div>
            <Label htmlFor="status">Project Status</Label>
            <Select value={updateForm.status} onValueChange={(value) => setUpdateForm({...updateForm, status: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Progress Notes</Label>
            <Textarea
              value={updateForm.notes}
              onChange={(e) => setUpdateForm({...updateForm, notes: e.target.value})}
              placeholder="Add notes about current progress..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
