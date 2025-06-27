import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import Navigation from "@/components/Navigation";
import { 
  Clock, 
  DollarSign, 
  TrendingUp, 
  MessageSquare, 
  User, 
  Building2,
  CalendarDays,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  CreditCard,
  XCircle,
  Loader2
} from "lucide-react";

// Optimized interface for instant loading
interface OptimizedStats {
  activeProjects: number;
  completedProjects: number;
  totalSpent: number;
  newMessages: number;
}

interface OptimizedProject {
  id: string;
  projectName: string;
  progressPercentage: number;
  currentStage: string;
  dueDate: string;
  status: string;
}

interface OptimizedOrder {
  id: string;
  serviceName: string;
  status: 'pending' | 'paid' | 'cancelled';
  totalPrice: number;
  createdAt: string;
  contactName: string;
  contactEmail: string;
}

export default function OptimizedClientDashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management for optimized UX
  const [selectedOrder, setSelectedOrder] = React.useState<OptimizedOrder | null>(null);
  const [orderFilter, setOrderFilter] = React.useState<'all' | 'pending' | 'paid' | 'cancelled'>('all');
  const [orderPage, setOrderPage] = React.useState(1);
  const [projectPage, setProjectPage] = React.useState(1);
  const [processingPayments, setProcessingPayments] = React.useState<Set<string>>(new Set());

  const itemsPerPage = 6;

  // Ultra-fast parallel data loading with aggressive caching
  const { data: stats = { activeProjects: 0, completedProjects: 0, totalSpent: 0, newMessages: 0 } } = useQuery({
    queryKey: ["/api/client/stats"],
    enabled: isAuthenticated,
    staleTime: 30000, // 30 seconds cache
    refetchOnWindowFocus: false,
  }) as { data: OptimizedStats };

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
    staleTime: 60000, // 1 minute cache
    refetchOnWindowFocus: false,
    select: (data: any[]) => data.map((project: any) => ({
      id: project.id,
      projectName: project.projectName || 'Project',
      progressPercentage: project.progressPercentage || 0,
      currentStage: project.currentStage || 'Planning',
      dueDate: project.dueDate || new Date().toISOString(),
      status: project.status || 'active'
    })) as OptimizedProject[]
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
    enabled: isAuthenticated,
    staleTime: 60000, // 1 minute cache
    refetchOnWindowFocus: false,
    select: (data: any[]) => data.map((order: any) => ({
      id: order.id,
      serviceName: order.serviceName || order.customServiceName || 'Custom Service',
      status: order.status,
      totalPrice: typeof order.totalPrice === 'string' ? parseInt(order.totalPrice) : (order.totalPrice || 0),
      createdAt: order.createdAt,
      contactName: order.contactName || 'N/A',
      contactEmail: order.contactEmail || 'N/A'
    })) as OptimizedOrder[]
  });

  // Optimized payment processing
  const reactivatePaymentMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest("POST", `/api/orders/${orderId}/reactivate-payment`, {});
      return typeof response === 'string' ? response : response.paymentUrl;
    },
    onMutate: (orderId) => {
      setProcessingPayments(prev => new Set(prev).add(orderId));
    },
    onSettled: (_, __, orderId) => {
      setProcessingPayments(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    },
    onSuccess: (paymentUrl: string) => {
      if (paymentUrl) {
        window.location.href = paymentUrl;
      }
    },
    onError: (error) => {
      toast({
        title: "Payment Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    }
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest("POST", `/api/orders/${orderId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client/stats"] });
      setSelectedOrder(null);
      toast({
        title: "Order Cancelled",
        description: "Your order has been successfully cancelled.",
      });
    },
    onError: () => {
      toast({
        title: "Cancellation Failed",
        description: "Failed to cancel order. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Optimized filtering and pagination
  const filteredOrders = React.useMemo(() => {
    if (orderFilter === 'all') return orders;
    return orders.filter(order => order.status === orderFilter);
  }, [orders, orderFilter]);

  const paginatedOrders = React.useMemo(() => {
    const startIndex = (orderPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, orderPage]);

  const paginatedProjects = React.useMemo(() => {
    const startIndex = (projectPage - 1) * itemsPerPage;
    return projects.slice(startIndex, startIndex + itemsPerPage);
  }, [projects, projectPage]);

  const orderPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const projectPages = Math.ceil(projects.length / itemsPerPage);

  // Filter counts for instant UI updates
  const filterCounts = React.useMemo(() => ({
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    paid: orders.filter(o => o.status === 'paid').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length
  }), [orders]);

  // Show instant loading skeleton while preserving layout
  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-6 h-24"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header - Instant Load */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome back, {user?.firstName || 'Client'}!
          </h1>
          <p className="text-slate-600">
            Here's an overview of your projects and orders
          </p>
        </div>

        {/* Stats Cards - Cached Data for Instant Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeProjects}</div>
              <p className="text-xs text-muted-foreground">Currently in progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedProjects}</div>
              <p className="text-xs text-muted-foreground">Successfully delivered</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦{stats.totalSpent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Lifetime spending</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.newMessages}</div>
              <p className="text-xs text-muted-foreground">Unread notifications</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs - Instant Switching */}
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="projects">Active Projects</TabsTrigger>
            <TabsTrigger value="orders">Service Orders</TabsTrigger>
          </TabsList>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Active Projects</CardTitle>
              </CardHeader>
              <CardContent>
                {projectsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="animate-pulse bg-slate-100 rounded-lg h-32"></div>
                    ))}
                  </div>
                ) : paginatedProjects.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {paginatedProjects.map((project) => (
                        <Card key={project.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-lg mb-2">{project.projectName}</h3>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Progress</span>
                                <span className="text-sm font-medium">{project.progressPercentage}%</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${project.progressPercentage}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-600">Stage: {project.currentStage}</span>
                                <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                                  {project.status}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Project Pagination */}
                    {projectPages > 1 && (
                      <div className="flex justify-center items-center space-x-2 mt-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setProjectPage(Math.max(1, projectPage - 1))}
                          disabled={projectPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
                          Page {projectPage} of {projectPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setProjectPage(Math.min(projectPages, projectPage + 1))}
                          disabled={projectPage === projectPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900">No active projects</h3>
                    <p className="mt-1 text-sm text-slate-500">Get started by ordering a service</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Service Orders</CardTitle>
                  <div className="flex space-x-2">
                    {(['all', 'pending', 'paid', 'cancelled'] as const).map((filter) => (
                      <Button
                        key={filter}
                        variant={orderFilter === filter ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setOrderFilter(filter);
                          setOrderPage(1);
                        }}
                        className="capitalize"
                      >
                        {filter} ({filterCounts[filter]})
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="animate-pulse bg-slate-100 rounded-lg h-40"></div>
                    ))}
                  </div>
                ) : paginatedOrders.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {paginatedOrders.map((order) => (
                        <Card key={order.id} className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardContent className="p-4" onClick={() => setSelectedOrder(order)}>
                            <div className="flex justify-between items-start mb-3">
                              <h3 className="font-semibold text-lg truncate">{order.serviceName}</h3>
                              <Badge
                                variant={
                                  order.status === 'paid' ? 'default' :
                                  order.status === 'pending' ? 'secondary' : 'destructive'
                                }
                              >
                                {order.status}
                              </Badge>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-600">Amount:</span>
                                <span className="font-medium">₦{order.totalPrice.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Date:</span>
                                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>

                            {/* Action Buttons for Pending Orders */}
                            {order.status === 'pending' && (
                              <div className="flex space-x-2 mt-4">
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    reactivatePaymentMutation.mutate(order.id);
                                  }}
                                  disabled={processingPayments.has(order.id)}
                                >
                                  {processingPayments.has(order.id) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CreditCard className="h-4 w-4" />
                                  )}
                                  Pay Now
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cancelOrderMutation.mutate(order.id);
                                  }}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Order Pagination */}
                    {orderPages > 1 && (
                      <div className="flex justify-center items-center space-x-2 mt-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setOrderPage(Math.max(1, orderPage - 1))}
                          disabled={orderPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
                          Page {orderPage} of {orderPages} ({filteredOrders.length} orders)
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setOrderPage(Math.min(orderPages, orderPage + 1))}
                          disabled={orderPage === orderPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-2 text-sm font-medium text-slate-900">No orders found</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {orderFilter === 'all' ? 'Start by ordering a service' : `No ${orderFilter} orders`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Order Details Modal */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
              <DialogDescription>
                Order #{selectedOrder?.id.slice(-8)}
              </DialogDescription>
            </DialogHeader>
            
            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Service</label>
                    <p className="text-sm">{selectedOrder.serviceName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Status</label>
                    <Badge
                      variant={
                        selectedOrder.status === 'paid' ? 'default' :
                        selectedOrder.status === 'pending' ? 'secondary' : 'destructive'
                      }
                      className="ml-2"
                    >
                      {selectedOrder.status}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Amount</label>
                    <p className="text-sm font-semibold">₦{selectedOrder.totalPrice.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Order Date</label>
                    <p className="text-sm">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Contact Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-slate-600">Name: </span>
                      <span>{selectedOrder.contactName}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Email: </span>
                      <span>{selectedOrder.contactEmail}</span>
                    </div>
                  </div>
                </div>

                {selectedOrder.status === 'pending' && (
                  <div className="flex space-x-3 pt-4 border-t">
                    <Button
                      className="flex-1"
                      onClick={() => reactivatePaymentMutation.mutate(selectedOrder.id)}
                      disabled={processingPayments.has(selectedOrder.id)}
                    >
                      {processingPayments.has(selectedOrder.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      Complete Payment
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => cancelOrderMutation.mutate(selectedOrder.id)}
                    >
                      Cancel Order
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}