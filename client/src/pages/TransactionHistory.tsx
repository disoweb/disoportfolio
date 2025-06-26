import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Calendar, DollarSign, Package, Filter, ChevronLeft, ChevronRight, Eye, ShoppingCart, CreditCard, Search, User, Building } from 'lucide-react';
import { Link } from 'wouter';
import Navigation from '@/components/Navigation';

export default function TransactionHistory() {
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'paid' | 'pending' | 'cancelled'>('paid');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage] = React.useState(8); // Reduced for better mobile experience
  const [selectedOrder, setSelectedOrder] = React.useState<any>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = React.useState(false);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/orders"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/client/stats"],
  });

  // Smart default filter based on available data
  React.useEffect(() => {
    if (Array.isArray(orders) && orders.length > 0 && statusFilter === 'paid') {
      const hasPaid = orders.some((order: any) => order.status === 'paid');
      if (!hasPaid) {
        const hasPending = orders.some((order: any) => order.status === 'pending');
        setStatusFilter(hasPending ? 'pending' : 'all');
      }
    }
  }, [orders, statusFilter]);

  // Filter orders based on status and search query
  const filteredOrders = React.useMemo(() => {
    if (!orders) return [];
    
    let filtered = orders as any[];
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((order: any) => order.status === statusFilter);
    }
    
    // Filter by search query with exact word matching
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      
      filtered = filtered.filter((order: any) => {
        const searchFields = [
          (order.contactName || '').toString().toLowerCase(),
          (order.contactEmail || '').toString().toLowerCase(), 
          (order.companyName || '').toString().toLowerCase(),
          (order.serviceName || '').toString().toLowerCase(),
          (order.customRequest || '').toString().toLowerCase(),
        ].filter(field => field.length > 0);
        
        const orderId = (order.id || '').toString().toLowerCase();
        if (orderId.length >= 6) {
          searchFields.push(orderId);
          searchFields.push(orderId.slice(-6));
          searchFields.push(orderId.slice(-8));
        }
        
        return searchFields.some(field => {
          const words = field.toLowerCase().split(/\s+|[^\w]/);
          const exactWordMatch = words.some((word: string) => word === query);
          const substringMatch = query.length >= 6 && field.includes(query);
          return exactWordMatch || substringMatch;
        });
      });
    }
    
    return filtered;
  }, [orders, statusFilter, searchQuery]);

  // Pagination logic
  const totalPages = Math.ceil(((filteredOrders as any[])?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = React.useMemo(() => {
    return (filteredOrders as any[]).slice(startIndex, endIndex);
  }, [filteredOrders, startIndex, endIndex]);

  // Reset to page 1 when filter or search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatPrice = (price: any) => {
    const numPrice = typeof price === 'string' ? parseInt(price) : (price || 0);
    return `₦${numPrice.toLocaleString()}`;
  };

  const getStatusCounts = () => {
    if (!orders) return { all: 0, paid: 0, pending: 0, cancelled: 0 };
    return {
      all: (orders as any[]).length,
      paid: (orders as any[]).filter((o: any) => o.status === 'paid').length,
      pending: (orders as any[]).filter((o: any) => o.status === 'pending').length,
      cancelled: (orders as any[]).filter((o: any) => o.status === 'cancelled').length,
    };
  };

  const statusCounts = getStatusCounts();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="h-8">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
            Transaction History
          </h1>
          <p className="text-slate-600 text-sm sm:text-base">
            View all your orders and transactions (Total Spent: <span className="font-semibold text-slate-900">₦{((stats as any)?.totalSpent || 0).toLocaleString()}</span>)
          </p>
        </div>

        {/* Compact Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-slate-900">{statusCounts.all}</div>
              <div className="text-xs sm:text-sm text-slate-600">Total Orders</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{statusCounts.paid}</div>
              <div className="text-xs sm:text-sm text-slate-600">Paid</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-yellow-600">{statusCounts.pending}</div>
              <div className="text-xs sm:text-sm text-slate-600">Pending</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="text-xl sm:text-2xl font-bold text-red-600">{statusCounts.cancelled}</div>
              <div className="text-xs sm:text-sm text-slate-600">Cancelled</div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Filter and Search Controls */}
        <Card className="mb-6">
          <CardContent className="p-4 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, company, service, or order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchQuery('')}
                >
                  ×
                </Button>
              )}
            </div>
            
            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Filter by Status:</span>
              </div>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders ({statusCounts.all})</SelectItem>
                  <SelectItem value="paid">Paid ({statusCounts.paid})</SelectItem>
                  <SelectItem value="pending">Pending ({statusCounts.pending})</SelectItem>
                  <SelectItem value="cancelled">Cancelled ({statusCounts.cancelled})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Search Results Info */}
            {searchQuery && (
              <div className="text-sm text-slate-600">
                Found {filteredOrders.length} result{filteredOrders.length !== 1 ? 's' : ''} for "{searchQuery}"
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modern Orders List */}
        {paginatedOrders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {statusFilter === 'all' ? 'No Orders Found' : `No ${statusFilter} Orders`}
              </h3>
              <p className="text-slate-600 mb-6">
                {statusFilter === 'all' 
                  ? "You haven't placed any orders yet." 
                  : `You don't have any ${statusFilter} orders.`}
              </p>
              {statusFilter === 'all' && (
                <Link href="/">
                  <Button>Browse Services</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {paginatedOrders.map((order: any) => (
                <Card 
                  key={order.id} 
                  className="hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group"
                  onClick={() => {
                    setSelectedOrder(order);
                    setIsOrderModalOpen(true);
                  }}
                >
                  <CardContent className="p-4">
                    {/* Header with Status */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-slate-500" />
                        <span className="font-medium text-slate-900 text-sm">Order #{order.id.slice(-6).toUpperCase()}</span>
                      </div>
                      <Badge 
                        variant={order.status === 'paid' ? 'default' : order.status === 'pending' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {order.status}
                      </Badge>
                    </div>

                    {/* Customer Information */}
                    <div className="mb-3 p-2 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-3 w-3 text-slate-500" />
                        <span className="font-medium text-slate-900 text-sm">
                          {order.contactName || order.contactEmail || 'Unknown Customer'}
                        </span>
                      </div>
                      {order.companyName && (
                        <div className="flex items-center gap-2">
                          <Building className="h-3 w-3 text-slate-500" />
                          <span className="text-xs text-slate-600">{order.companyName}</span>
                        </div>
                      )}
                    </div>

                    {/* Service Name */}
                    <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {order.serviceName || order.customRequest || 'Custom Service'}
                    </h3>

                    {/* Order Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Amount:</span>
                        <span className="font-semibold text-green-600">
                          {formatPrice(order.totalPrice)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Date:</span>
                        <span className="text-slate-900">{formatDate(order.createdAt)}</span>
                      </div>
                      
                      {/* Add-ons count */}
                      {order.addons && order.addons.length > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Add-ons:</span>
                          <span className="text-blue-600">{order.addons.length} items</span>
                        </div>
                      )}
                    </div>

                    {/* Action Hint */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to view details
                        </span>
                        <Eye className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Modern Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 pt-4 border-t border-slate-200">
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
                      
                      // Show page numbers
                      for (let i = startPage; i <= endPage; i++) {
                        pageNumbers.push(
                          <Button
                            key={i}
                            variant={i === currentPage ? "default" : "outline"}
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
          </div>
        )}

        {/* Order Details Modal */}
        <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
          <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                Order Details
              </DialogTitle>
            </DialogHeader>
            
            {selectedOrder && (
              <div className="space-y-4">
                {/* Order Header */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">Order ID</span>
                    <span className="font-mono text-sm">#{selectedOrder.id.slice(-8).toUpperCase()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Status</span>
                    <Badge 
                      variant={selectedOrder.status === 'paid' ? 'default' : selectedOrder.status === 'pending' ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {selectedOrder.status}
                    </Badge>
                  </div>
                </div>

                {/* Service Information */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Service Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Service:</span>
                      <span className="font-medium">{selectedOrder.serviceName || 'Custom Service'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Base Price:</span>
                      <span className="font-medium text-green-600">
                        {formatPrice(selectedOrder.servicePrice || selectedOrder.totalPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Order Date:</span>
                      <span>{formatDate(selectedOrder.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Add-ons */}
                {selectedOrder.addons && selectedOrder.addons.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">Add-ons ({selectedOrder.addons.length})</h3>
                    <div className="space-y-2">
                      {selectedOrder.addons.map((addon: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                          <span className="text-sm">{addon.name}</span>
                          <span className="text-sm font-medium text-blue-600">
                            +₦{addon.price.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Customer Information */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Customer Information</h3>
                  <div className="space-y-3">
                    {/* Primary Contact */}
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-900">Primary Contact</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        {selectedOrder.contactName && (
                          <div>
                            <span className="font-medium">{selectedOrder.contactName}</span>
                          </div>
                        )}
                        {selectedOrder.contactEmail && (
                          <div className="text-blue-700">{selectedOrder.contactEmail}</div>
                        )}
                        {selectedOrder.contactPhone && (
                          <div className="text-slate-600">{selectedOrder.contactPhone}</div>
                        )}
                      </div>
                    </div>

                    {/* Company Information */}
                    {selectedOrder.companyName && (
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Building className="h-4 w-4 text-slate-600" />
                          <span className="font-medium text-slate-900">Company</span>
                        </div>
                        <div className="text-sm text-slate-700">{selectedOrder.companyName}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Project Details */}
                {selectedOrder.projectDescription && (
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">Project Description</h3>
                    <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
                      {selectedOrder.projectDescription}
                    </p>
                  </div>
                )}

                {/* Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-slate-900">Total Amount:</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatPrice(selectedOrder.totalPrice)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedOrder.status === 'pending' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        // Handle payment logic here
                        setIsOrderModalOpen(false);
                      }}
                    >
                      Pay Now
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        // Handle cancel logic here
                        setIsOrderModalOpen(false);
                      }}
                    >
                      Cancel
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