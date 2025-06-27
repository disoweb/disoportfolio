import React from "react";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProjectCard from "@/components/ProjectCard";
import MessagesList from "@/components/MessagesList";
import OrderDetailsModal from "@/components/OrderDetailsModal";
import ProjectTimer from "@/components/ProjectTimer";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ChartGantt, 
  CheckCircle, 
  DollarSign, 
  MessageSquare,
  Upload,
  LifeBuoy,
  CreditCard,
  Calendar,
  X,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";

export default function ClientDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = React.useState<any>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = React.useState(false);
  const [processingOrderId, setProcessingOrderId] = React.useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = React.useState<string | null>(null);
  const [orderFilter, setOrderFilter] = React.useState<'all' | 'pending' | 'paid' | 'cancelled'>('all');
  const [hasSetDefaultFilter, setHasSetDefaultFilter] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage] = React.useState(6); // 6 orders per page for optimal mobile display
  const [projectCurrentPage, setProjectCurrentPage] = React.useState(1);
  const [projectItemsPerPage] = React.useState(4); // 4 projects per page for optimal mobile display



  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      setCancellingOrderId(orderId);
      return await apiRequest('DELETE', `/api/orders/${orderId}`);
    },
    onSuccess: () => {
      setCancellingOrderId(null);
      toast({
        title: "Order Cancelled",
        description: "Your order has been successfully cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/client/stats'] });
    },
    onError: (error: Error) => {
      setCancellingOrderId(null);
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel order. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reactivate payment mutation
  const reactivatePaymentMutation = useMutation({
    mutationFn: async (orderId: string) => {
      setProcessingOrderId(orderId);
      const response = await apiRequest('POST', `/api/orders/${orderId}/reactivate-payment`);
      return await response.json();
    },
    onSuccess: (response: any) => {
      setProcessingOrderId(null);
      if (response?.paymentUrl) {
        toast({
          title: "Payment link generated",
          description: "Redirecting to secure payment gateway...",
        });
        window.location.href = response.paymentUrl;
      } else {
        toast({
          title: "Payment Issue",
          description: "Payment URL not received. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      setProcessingOrderId(null);

      // Enhanced error handling with user-friendly messages
      let errorMessage = "Failed to reactivate payment. Please try again.";

      if (error.message?.includes("401")) {
        errorMessage = "Session expired. Please refresh and try again.";
      } else if (error.message?.includes("429")) {
        errorMessage = "Too many attempts. Please wait a moment before retrying.";
      } else if (error.message?.includes("404")) {
        errorMessage = "Order not found or access denied.";
      } else if (error.message?.includes("400")) {
        errorMessage = "This order cannot be reactivated.";
      }

      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleCancelOrder = (orderId: string, orderAmount: number) => {
    if (window.confirm(`Are you sure you want to cancel this order for ₦${orderAmount.toLocaleString()}?`)) {
      cancelOrderMutation.mutate(orderId);
    }
  };

  const handleReactivatePayment = (orderId: string) => {
    reactivatePaymentMutation.mutate(orderId);
  };

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

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
  });

  // Calculate total spent from paid orders
  const totalSpent = React.useMemo(() => {
    if (!Array.isArray(orders)) return 0;
    return orders.filter((o: any) => o.status === 'paid').reduce((sum: number, o: any) => {
      const price = typeof o.totalPrice === 'string' ? parseInt(o.totalPrice) : (o.totalPrice || 0);
      return sum + price;
    }, 0);
  }, [orders]);

  // Filter orders based on selected filter
  const filteredOrders = React.useMemo(() => {
    if (!Array.isArray(orders)) return [];
    if (orderFilter === 'all') return orders;
    return orders.filter((order: any) => {
      switch (orderFilter) {
        case 'pending':
          return order.status === 'pending';
        case 'paid':
          return order.status === 'paid';
        case 'cancelled':
          return order.status === 'cancelled';
        default:
          return true;
      }
    });
  }, [orders, orderFilter]);

  // Pagination logic
  const totalPages = Math.ceil((filteredOrders?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = React.useMemo(() => {
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, startIndex, endIndex]);

  // Reset to page 1 when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [orderFilter]);

  // Projects pagination logic
  const projectTotalPages = Math.ceil((Array.isArray(projects) ? projects.length : 0) / projectItemsPerPage);
  const projectStartIndex = (projectCurrentPage - 1) * projectItemsPerPage;
  const projectEndIndex = projectStartIndex + projectItemsPerPage;
  const paginatedProjects = React.useMemo(() => {
    if (!Array.isArray(projects)) return [];
    return projects.slice(projectStartIndex, projectEndIndex);
  }, [projects, projectStartIndex, projectEndIndex]);

  // Calculate filter counts
  const filterCounts = React.useMemo(() => {
    if (!Array.isArray(orders)) return { all: 0, pending: 0, paid: 0, cancelled: 0 };
    return {
      all: orders.length,
      pending: orders.filter((o: any) => o.status === 'pending').length,
      paid: orders.filter((o: any) => o.status === 'paid').length,
      cancelled: orders.filter((o: any) => o.status === 'cancelled').length,
    };
  }, [orders]);

  // Get visible tabs (only show tabs with non-zero counts)
  const visibleTabs = React.useMemo(() => {
    const tabs = [];
    if (filterCounts.all > 0) tabs.push({ key: 'all', label: 'All', count: filterCounts.all });
    if (filterCounts.pending > 0) tabs.push({ key: 'pending', label: 'Pending', count: filterCounts.pending });
    if (filterCounts.paid > 0) tabs.push({ key: 'paid', label: 'Completed', count: filterCounts.paid });
    if (filterCounts.cancelled > 0) tabs.push({ key: 'cancelled', label: 'Cancelled', count: filterCounts.cancelled });

    // Always show at least the "All" tab if no other tabs have content
    if (tabs.length === 0) {
      tabs.push({ key: 'all', label: 'All', count: 0 });
    }

    return tabs;
  }, [filterCounts]);

  // Smart default filter logic - show pending first, then paid, then all (only once)
  React.useEffect(() => {
    if (orders && filterCounts && !hasSetDefaultFilter) {
      if (filterCounts.pending > 0) {
        setOrderFilter('pending');
      } else if (filterCounts.paid > 0) {
        setOrderFilter('paid');
      } else {
        setOrderFilter('all');
      }
      setHasSetDefaultFilter(true);
    }
  }, [orders, filterCounts, hasSetDefaultFilter]);

  const { data: stats = {} } = useQuery({
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
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setLocation('/active-projects')}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ChartGantt className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-slate-600">Active Projects</p>
                  <p className="text-2xl font-bold text-slate-900">{(stats as any)?.activeProjects || 0}</p>
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
                  <p className="text-2xl font-bold text-slate-900">{(stats as any)?.completedProjects || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setLocation('/transactions')}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-slate-600">Total Spent</p>
                  <p className="text-2xl font-bold text-slate-900">
                    ₦{((stats as any)?.totalSpent || 0).toLocaleString()}
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
                  <p className="text-2xl font-bold text-slate-900">{(stats as any)?.newMessages || 0}</p>
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
                <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Service Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={orderFilter} onValueChange={(value: any) => setOrderFilter(value)} className="w-full">
                  <TabsList className={`w-full mb-6 ${visibleTabs.length <= 2 ? 'grid grid-cols-2' : visibleTabs.length === 3 ? 'grid grid-cols-3' : 'grid grid-cols-2 sm:grid-cols-4'}`}>
                    {visibleTabs.map((tab) => (
                      <TabsTrigger 
                        key={tab.key} 
                        value={tab.key} 
                        className="text-xs sm:text-sm px-2 py-1.5 whitespace-nowrap"
                      >
                        <span className="truncate">
                          {tab.label} ({tab.count})
                        </span>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value={orderFilter} className="mt-0">
                    {filteredOrders && filteredOrders.length > 0 ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {paginatedOrders.map((order: any) => (
                          <div 
                            key={order.id} 
                            className="border border-slate-200 rounded-lg p-4 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsOrderModalOpen(true);
                            }}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">Service Order</h4>
                              <Badge variant={order.status === 'paid' ? 'default' : order.status === 'pending' ? 'secondary' : 'outline'}>
                                {order.status}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                          {(() => {
                            try {
                              // Try to parse JSON contact info if it exists
                              if (order.customRequest && order.customRequest.includes('contactInfo')) {
                                const data = JSON.parse(order.customRequest);
                                const contactInfo = data.contactInfo || {};
                                const projectDetails = data.projectDetails || {};

                                return (
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium text-slate-900">
                                      {order.service?.name || 'Custom Service'}
                                    </p>
                                    <p className="text-xs text-slate-600">
                                      Client: {contactInfo.fullName}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">
                                      {projectDetails.description || 'Project details available'}
                                    </p>
                                  </div>
                                );
                              }
                              // Fallback for old data format
                              return (
                                <p className="text-sm text-slate-600">
                                  {order.customRequest?.split('\n')[0]?.replace('Service: ', '') || order.service?.name || 'Custom Service'}
                                </p>
                              );
                            } catch (error) {
                              return (
                                <p className="text-sm text-slate-600">
                                  {order.service?.name || 'Custom Service'}
                                </p>
                              );
                            }
                          })()}
                          <p className="text-lg font-semibold text-green-600">
                            ₦{(typeof order.totalPrice === 'string' ? parseInt(order.totalPrice) : (order.totalPrice || 0)).toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-500">
                            Ordered on {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                            Click to view details and contact support
                          </p>

                          {/* Countdown Timer Progress Bar for Paid Orders */}
                          {order.status === 'paid' && (
                            <div className="mt-3">
                              <div className="flex justify-between text-xs text-slate-600 mb-1">
                                <span>Project Timeline</span>
                                <span>Week 1 of 4</span>
                              </div>
                              <div className="relative">
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                                </div>
                                {/* Red line indicator */}
                                <div 
                                  className="absolute top-0 h-2 w-0.5 bg-red-500 rounded-sm" 
                                  style={{ left: '25%', transform: 'translateX(-50%)' }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Action Buttons for Pending Orders */}
                          {order.status === 'pending' && (
                            <div className="mt-3 flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="flex-1 h-8 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReactivatePayment(order.id);
                                }}
                                disabled={processingOrderId === order.id}
                              >
                                {processingOrderId === order.id ? (
                                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <CreditCard className="h-3 w-3 mr-1" />
                                )}
                                Pay Now
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const amount = typeof order.totalPrice === 'string' ? parseInt(order.totalPrice) : (order.totalPrice || 0);
                                  handleCancelOrder(order.id, amount);
                                }}
                                disabled={cancellingOrderId === order.id}
                              >
                                {cancellingOrderId === order.id ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  <X className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          )}
                            </div>
                          </div>
                        ))}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="mt-3 pt-2 border-t border-slate-200">
                            {/* Mobile-first compact layout */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs text-slate-600 hidden sm:block">
                                {startIndex + 1}-{Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length}
                              </div>

                              <div className="flex items-center justify-center gap-1 mx-auto sm:mx-0">
                                {/* Previous Page */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                  disabled={currentPage === 1}
                                  className="h-6 w-6 p-0 sm:h-8 sm:w-8"
                                >
                                  <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>

                                {/* Page Numbers - Mobile optimized */}
                                {(() => {
                                  const pageNumbers = [];
                                  const maxVisiblePages = 3; // Keep it minimal for mobile
                                  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                                  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                                  if (endPage - startPage < maxVisiblePages - 1) {
                                    startPage = Math.max(1, endPage - maxVisiblePages + 1);
                                  }

                                  // Show ellipsis if there are more pages before
                                  if (startPage > 1) {
                                    pageNumbers.push(
                                      <Button
                                        key={1}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(1)}
                                        className="h-6 w-6 p-0 text-xs sm:h-8 sm:w-8 sm:text-sm"
                                      >
                                        1
                                      </Button>
                                    );
                                    if (startPage > 2) {
                                      pageNumbers.push(
                                        <span key="ellipsis-start" className="px-1 text-slate-500 text-xs">
                                          ...
                                        </span>
                                      );
                                    }
                                  }

                                  for (let i = startPage; i <= endPage; i++) {
                                    pageNumbers.push(
                                      <Button
                                        key={i}
                                        variant={currentPage === i ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setCurrentPage(i)}
                                        className="h-6 w-6 p-0 text-xs sm:h-8 sm:w-8 sm:text-sm"
                                      >
                                        {i}
                                      </Button>
                                    );
                                  }

                                  // Show ellipsis if there are more pages after
                                  if (endPage < totalPages) {
                                    if (endPage < totalPages - 1) {
                                      pageNumbers.push(
                                        <span key="ellipsis-end" className="px-1 text-slate-500 text-xs">
                                          ...
                                        </span>
                                      );
                                    }
                                    pageNumbers.push(
                                      <Button
                                        key={totalPages}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(totalPages)}
                                        className="h-6 w-6 p-0 text-xs sm:h-8 sm:w-8 sm:text-sm"
                                      >
                                        {totalPages}
                                      </Button>
                                    );
                                  }

                                  return pageNumbers;
                                })()}

                                {/* Next Page */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                  disabled={currentPage === totalPages}
                                  className="h-6 w-6 p-0 sm:h-8 sm:w-8"
                                >
                                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <CreditCard className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-2">
                          {orderFilter === 'all' ? 'No Orders Yet' : 
                           orderFilter === 'pending' ? 'No Pending Orders' :
                           orderFilter === 'paid' ? 'No Completed Orders' : 'No Cancelled Orders'}
                        </h3>
                        <p className="text-slate-600 mb-4">
                          {orderFilter === 'all' ? 'Place your first order to get started with our services.' :
                           orderFilter === 'pending' ? 'All your orders have been processed.' :
                           orderFilter === 'paid' ? 'No completed orders to display.' : 'No cancelled orders found.'}
                        </p>
                        {orderFilter === 'all' && (
                          <Button onClick={() => setLocation("/services")}>Browse Services</Button>
                        )}
                      </div>
                    )}
                  </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

            {/* Projects Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-900">Active Projects</CardTitle>
              </CardHeader>
              <CardContent>
                {Array.isArray(projects) && projects.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {paginatedProjects.map((project: any) => (
                        <ProjectTimer key={project.id} project={project} />
                      ))}
                    </div>

                    {/* Projects Pagination Controls */}
                    {projectTotalPages > 1 && (
                      <div className="mt-6 pt-4 border-t border-slate-200">
                        {/* Mobile-first compact layout */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs text-slate-600 hidden sm:block">
                            {projectStartIndex + 1}-{Math.min(projectEndIndex, projects.length)} of {projects.length}
                          </div>

                          <div className="flex items-center justify-center gap-1 mx-auto sm:mx-0">
                            {/* Previous Page */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setProjectCurrentPage(Math.max(1, projectCurrentPage - 1))}
                              disabled={projectCurrentPage === 1}
                              className="h-6 w-6 p-0 sm:h-8 sm:w-8"
                            >
                              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>

                            {/* Page Numbers - Mobile optimized */}
                            {(() => {
                              const pageNumbers = [];
                              const maxVisiblePages = 3; // Keep it minimal for mobile
                              let startPage = Math.max(1, projectCurrentPage - Math.floor(maxVisiblePages / 2));
                              let endPage = Math.min(projectTotalPages, startPage + maxVisiblePages - 1);

                              if (endPage - startPage < maxVisiblePages - 1) {
                                startPage = Math.max(1, endPage - maxVisiblePages + 1);
                              }

                              // Show ellipsis if there are more pages before
                              if (startPage > 1) {
                                pageNumbers.push(
                                  <Button
                                    key={1}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setProjectCurrentPage(1)}
                                    className="h-6 w-6 p-0 text-xs sm:h-8 sm:w-8 sm:text-sm"
                                  >
                                    1
                                  </Button>
                                );
                                if (startPage > 2) {
                                  pageNumbers.push(
                                    <span key="ellipsis-start" className="px-1 text-slate-500 text-xs">
                                      ...
                                    </span>
                                  );
                                }
                              }

                              // Show page numbers
                              for (let i = startPage; i <= endPage; i++) {
                                pageNumbers.push(
                                  <Button
                                    key={i}
                                    variant={i === projectCurrentPage ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setProjectCurrentPage(i)}
                                    className="h-6 w-6 p-0 text-xs sm:h-8 sm:w-8 sm:text-sm"
                                  >
                                    {i}
                                  </Button>
                                );
                              }

                              // Show ellipsis if there are more pages after
                              if (endPage < projectTotalPages) {
                                if (endPage < projectTotalPages - 1) {
                                  pageNumbers.push(
                                    <span key="ellipsis-end" className="px-1 text-slate-500 text-xs">
                                      ...
                                    </span>
                                  );
                                }
                                pageNumbers.push(
                                  <Button
                                    key={projectTotalPages}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setProjectCurrentPage(projectTotalPages)}
                                    className="h-6 w-6 p-0 text-xs sm:h-8 sm:w-8 sm:text-sm"
                                  >
                                    {projectTotalPages}
                                  </Button>
                                );
                              }

                              return pageNumbers;
                            })()}

                            {/* Next Page */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setProjectCurrentPage(Math.min(projectTotalPages, projectCurrentPage + 1))}
                              disabled={projectCurrentPage === projectTotalPages}
                              className="h-6 w-6 p-0 sm:h-8 sm:w-8"
                            >
                              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
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
                <MessagesList projectId={Array.isArray(projects) && projects.length > 0 ? projects[0]?.id : undefined} />
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
                      ₦{((stats as any)?.totalSpent || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Active Projects</span>
                    <span className="font-semibold text-slate-900">{(stats as any)?.activeProjects || 0}</span>
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

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false);
          setSelectedOrder(null);
        }}
      />
    </div>
  );
}