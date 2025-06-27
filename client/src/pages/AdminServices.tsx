import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import AdminNavigation from '@/components/AdminNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Plus, Edit, Trash2, Package, DollarSign, Clock, Users } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  priceUsd: string;
  currency: string;
  deliveryDays: number;
  features: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export default function AdminServices() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    priceUsd: '',
    currency: 'NGN',
    deliveryDays: '',
    features: [''],
    isActive: true
  });

  // Fetch services
  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/admin/services"],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: async (serviceData: any) => {
      const formattedData = {
        ...serviceData,
        price: parseInt(serviceData.price),
        deliveryDays: parseInt(serviceData.deliveryDays),
        features: serviceData.features.filter((f: string) => f.trim() !== '')
      };
      return await apiRequest('POST', '/api/admin/services', formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] }); // Refresh public services too
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Service created",
        description: "Service package has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create service",
        variant: "destructive",
      });
    },
  });

  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const formattedUpdates = {
        ...updates,
        price: updates.price ? parseInt(updates.price) : undefined,
        deliveryDays: updates.deliveryDays ? parseInt(updates.deliveryDays) : undefined,
        features: updates.features ? updates.features.filter((f: string) => f.trim() !== '') : undefined
      };
      return await apiRequest('PATCH', `/api/admin/services/${id}`, formattedUpdates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsEditDialogOpen(false);
      setSelectedService(null);
      resetForm();
      toast({
        title: "Service updated",
        description: "Service package has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update service",
        variant: "destructive",
      });
    },
  });

  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      return await apiRequest('DELETE', `/api/admin/services/${serviceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Service deleted",
        description: "Service package has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete service",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setServiceForm({
      name: '',
      description: '',
      category: '',
      price: '',
      priceUsd: '',
      currency: 'NGN',
      deliveryDays: '',
      features: [''],
      isActive: true
    });
  };

  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setServiceForm({
      name: service.name,
      description: service.description,
      category: service.category,
      price: service.price ? service.price.toString() : '',
      priceUsd: service.priceUsd || '',
      currency: service.currency || 'NGN',
      deliveryDays: service.deliveryDays ? service.deliveryDays.toString() : '',
      features: service.features && service.features.length > 0 ? service.features : [''],
      isActive: service.isActive
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteService = (serviceId: string, serviceName: string) => {
    if (confirm(`Are you sure you want to delete "${serviceName}"? This action cannot be undone.`)) {
      deleteServiceMutation.mutate(serviceId);
    }
  };

  const addFeature = () => {
    setServiceForm(prev => ({
      ...prev,
      features: [...prev.features, '']
    }));
  };

  const removeFeature = (index: number) => {
    setServiceForm(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const updateFeature = (index: number, value: string) => {
    setServiceForm(prev => ({
      ...prev,
      features: prev.features.map((feature, i) => i === index ? value : feature)
    }));
  };

  // Filter services
  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(services.map(s => s.category)));

  // Redirect non-admin users
  if (!isAuthenticated || user?.role !== 'admin') {
    window.location.href = '/admin';
    return null;
  }

  const ServiceForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Service Name</Label>
          <Input
            id="name"
            value={serviceForm.name}
            onChange={(e) => setServiceForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Landing Page"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={serviceForm.category} onValueChange={(value) => setServiceForm(prev => ({ ...prev, category: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="web-development">Web Development</SelectItem>
              <SelectItem value="design">Design</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="consulting">Consulting</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={serviceForm.description}
          onChange={(e) => setServiceForm(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe the service package..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price (NGN)</Label>
          <Input
            id="price"
            type="number"
            value={serviceForm.price}
            onChange={(e) => setServiceForm(prev => ({ ...prev, price: e.target.value }))}
            placeholder="150000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="priceUsd">Price (USD)</Label>
          <Input
            id="priceUsd"
            value={serviceForm.priceUsd}
            onChange={(e) => setServiceForm(prev => ({ ...prev, priceUsd: e.target.value }))}
            placeholder="$100"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deliveryDays">Delivery (Days)</Label>
          <Input
            id="deliveryDays"
            type="number"
            value={serviceForm.deliveryDays}
            onChange={(e) => setServiceForm(prev => ({ ...prev, deliveryDays: e.target.value }))}
            placeholder="14"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Features</Label>
        {serviceForm.features.map((feature, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={feature}
              onChange={(e) => updateFeature(index, e.target.value)}
              placeholder="Enter feature..."
            />
            {serviceForm.features.length > 1 && (
              <Button type="button" variant="outline" size="sm" onClick={() => removeFeature(index)}>
                Remove
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addFeature}>
          Add Feature
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isActive"
          checked={serviceForm.isActive}
          onChange={(e) => setServiceForm(prev => ({ ...prev, isActive: e.target.checked }))}
          className="rounded"
        />
        <Label htmlFor="isActive">Active (visible to customers)</Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={() => {
          if (isEdit) {
            setIsEditDialogOpen(false);
            setSelectedService(null);
          } else {
            setIsCreateDialogOpen(false);
          }
          resetForm();
        }}>
          Cancel
        </Button>
        <Button 
          onClick={() => {
            if (isEdit && selectedService) {
              updateServiceMutation.mutate({ id: selectedService.id, updates: serviceForm });
            } else {
              createServiceMutation.mutate(serviceForm);
            }
          }}
          disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
        >
          {isEdit ? 'Update Service' : 'Create Service'}
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <AdminNavigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Service Management</h1>
            <p className="text-slate-600">Create and manage service packages</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                New Service
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Service Package</DialogTitle>
              </DialogHeader>
              <ServiceForm />
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Service Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Total Services</p>
                  <p className="text-2xl font-bold text-slate-900">{services.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Active Services</p>
                  <p className="text-2xl font-bold text-slate-900">{services.filter(s => s.isActive).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Avg. Price</p>
                  <p className="text-2xl font-bold text-slate-900">
                    ₦{services.length > 0 ? Math.round(services.reduce((acc, s) => acc + s.price, 0) / services.length).toLocaleString() : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Avg. Delivery</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {services.length > 0 ? Math.round(services.reduce((acc, s) => acc + s.deliveryDays, 0) / services.length) : 0} days
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <Card key={service.id} className="relative">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <Badge variant={service.isActive ? "default" : "secondary"} className="mt-2">
                      {service.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditService(service)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeleteService(service.id, service.name)}
                      disabled={deleteServiceMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 text-sm mb-4">{service.description}</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Price:</span>
                    <span className="font-semibold">₦{service.price.toLocaleString()} ({service.priceUsd})</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Delivery:</span>
                    <span className="font-semibold">{service.deliveryDays} days</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Category:</span>
                    <span className="font-semibold capitalize">{service.category}</span>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm text-slate-600 mb-1">Features:</p>
                    <div className="flex flex-wrap gap-1">
                      {service.features.slice(0, 3).map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {service.features.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{service.features.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No services found</h3>
            <p className="text-slate-600">
              {searchTerm || categoryFilter !== 'all' 
                ? "Try adjusting your filters" 
                : "Create your first service package to get started"}
            </p>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Service Package</DialogTitle>
            </DialogHeader>
            <ServiceForm isEdit={true} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}