import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminNavigation from "@/components/AdminNavigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Eye, 
  Calendar, 
  Clock,
  User,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  RotateCcw,
  MessageSquare,
  FileText,
  Settings,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  Users,
  Activity,
  ChevronRight,
  ExternalLink,
  Mail,
  Phone
} from "lucide-react";

// Helper function to get status badge
function getStatusBadge(status: string) {
  const statusConfig = {
    not_started: { variant: "secondary", text: "Not Started", icon: Clock },
    active: { variant: "default", text: "Active", icon: Play },
    paused: { variant: "outline", text: "Paused", icon: Pause },
    completed: { variant: "success", text: "Completed", icon: CheckCircle }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_started;
  const IconComponent = config.icon;

  return (
    <Badge variant={config.variant as any} className="text-xs flex items-center gap-1">
      <IconComponent className="h-3 w-3" />
      {config.text}
    </Badge>
  );
}

interface Project {
  id: string;
  projectName: string;
  status: string;
  userId: string;
  orderId?: string;
  startDate: string;
  dueDate: string;
  timelineWeeks?: number;
  progressPercentage?: number;
  createdAt: string;
  updatedAt?: string;
  currentStage?: string;
  notes?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  order?: {
    id: string;
    service?: {
      name: string;
      price: number;
    };
    user?: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

export default function AdminProjects() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: "",
    progressPercentage: "",
    notes: "",
    dueDate: ""
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    projectName: "",
    userId: "",
    description: "",
    timelineWeeks: "",
    notes: ""
  });

  // Fetch all projects
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async (data: { projectId: string; updates: any }) => {
      await apiRequest("PATCH", `/api/projects/${data.projectId}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsUpdateDialogOpen(false);
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update project",
        variant: "destructive",
      });
    },
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: any) => {
      return await apiRequest('POST', '/api/admin/projects', projectData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsCreateDialogOpen(false);
      setCreateForm({
        projectName: "",
        userId: "",
        description: "",
        timelineWeeks: "",
        notes: ""
      });
      toast({
        title: "Project created",
        description: "New project has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  // Delete project mutation (only for cancelled projects)
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      return await apiRequest('DELETE', `/api/admin/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project deleted",
        description: "Cancelled project has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete project",
        variant: "destructive",
      });
    },
  });

  // Filter projects based on search and status
  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.order?.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.order?.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Get enhanced status badge
  const getStatusBadge = (status: string) => {
    const badgeConfig = {
      active: { 
        className: "bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-sm", 
        icon: Play,
        label: "Active"
      },
      completed: { 
        className: "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-sm", 
        icon: CheckCircle,
        label: "Completed"
      },
      paused: { 
        className: "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0 shadow-sm", 
        icon: Pause,
        label: "Paused"
      },
      not_started: { 
        className: "bg-gradient-to-r from-slate-500 to-slate-600 text-white border-0 shadow-sm", 
        icon: Clock,
        label: "Not Started"
      }
    };
    
    const config = badgeConfig[status as keyof typeof badgeConfig] || {
      className: "bg-slate-100 text-slate-700 border border-slate-200",
      icon: AlertTriangle,
      label: status
    };
    
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.className} text-xs font-medium px-2 py-1 flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Get progress color
  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-green-500";
    if (percentage >= 70) return "bg-blue-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Calculate project stats
  const projectStats = {
    total: projects.length,
    active: projects.filter((p) => p.status === "active").length,
    completed: projects.filter((p) => p.status === "completed").length,
    overdue: projects.filter((p) => {
      const dueDate = new Date(p.dueDate);
      const now = new Date();
      return dueDate < now && p.status !== "completed";
    }).length,
  };

  const handleUpdateProject = (project: Project) => {
    setSelectedProject(project);
    setUpdateForm({
      status: project.status,
      progressPercentage: (project.progressPercentage || 0).toString(),
      notes: "",
      dueDate: project.dueDate.split('T')[0] // Format for date input
    });
    setIsUpdateDialogOpen(true);
  };

  const submitUpdate = () => {
    if (!selectedProject) return;
    
    updateProjectMutation.mutate({
      projectId: selectedProject.id,
      updates: {
        status: updateForm.status,
        progressPercentage: parseInt(updateForm.progressPercentage),
        dueDate: updateForm.dueDate,
        notes: updateForm.notes
      }
    });
  };

  // Redirect non-admin users
  if (!authLoading && (!isAuthenticated || user?.role !== 'admin')) {
    window.location.href = '/admin';
    return null;
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <AdminNavigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ProjectsLoadingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <AdminNavigation />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Modern Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="space-y-1 min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Project Management
            </h1>
            <p className="text-slate-600 text-sm lg:text-base">
              Manage all client projects and track progress
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Activity className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25">
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">New Project</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <StatsCard
            title="Total Projects"
            value={projectStats.total}
            icon={FileText}
            trend={{ value: 12, isPositive: true }}
            color="blue"
          />
          <StatsCard
            title="Active"
            value={projectStats.active}
            icon={Zap}
            trend={{ value: 8, isPositive: true }}
            color="green"
          />
          <StatsCard
            title="Completed"
            value={projectStats.completed}
            icon={CheckCircle}
            trend={{ value: 5, isPositive: true }}
            color="purple"
          />
          <StatsCard
            title="Overdue"
            value={projectStats.overdue}
            icon={AlertTriangle}
            trend={{ value: 2, isPositive: false }}
            color="red"
          />
        </div>

        {/* Enhanced Filters */}
        <Card className="mb-6 border-0 shadow-lg shadow-slate-200/50 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3.5 text-slate-400" />
                  <Input
                    placeholder="Search projects..."
                    className="pl-10 border-slate-200 bg-slate-50/50 focus:bg-white transition-colors w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2 sm:gap-3 flex-shrink-0">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32 sm:w-40 border-slate-200">
                    <Filter className="h-4 w-4 mr-1 sm:mr-2 text-slate-500" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="hidden sm:flex border-slate-200 px-2">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modern Projects Grid */}
        <div className="grid gap-4 lg:gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              onUpdate={handleUpdateProject}
            />
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <EmptyState 
            searchTerm={searchTerm} 
            statusFilter={statusFilter} 
          />
        )}
      </div>

      {/* Update Project Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              <span className="truncate">Update: {selectedProject?.projectName}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status" className="text-sm">Status</Label>
                <Select value={updateForm.status} onValueChange={(value) => 
                  setUpdateForm(prev => ({ ...prev, status: value }))
                }>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="progress" className="text-sm">Progress (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={updateForm.progressPercentage}
                  onChange={(e) => setUpdateForm(prev => ({ 
                    ...prev, 
                    progressPercentage: e.target.value 
                  }))}
                  className="w-full"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="dueDate" className="text-sm">Due Date</Label>
              <Input
                type="date"
                value={updateForm.dueDate}
                onChange={(e) => setUpdateForm(prev => ({ 
                  ...prev, 
                  dueDate: e.target.value 
                }))}
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="notes" className="text-sm">Update Notes</Label>
              <Textarea
                placeholder="Add notes about this update..."
                value={updateForm.notes}
                onChange={(e) => setUpdateForm(prev => ({ 
                  ...prev, 
                  notes: e.target.value 
                }))}
                className="w-full min-h-[80px]"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end sm:space-x-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              onClick={submitUpdate}
              disabled={updateProjectMutation.isPending}
              className="w-full sm:w-auto"
            >
              {updateProjectMutation.isPending ? "Updating..." : "Update Project"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Modern Component Definitions
function StatsCard({ title, value, icon: Icon, trend, color }: {
  title: string;
  value: number;
  icon: any;
  trend: { value: number; isPositive: boolean };
  color: string;
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 text-blue-600 bg-blue-50',
    green: 'from-green-500 to-green-600 text-green-600 bg-green-50',
    purple: 'from-purple-500 to-purple-600 text-purple-600 bg-purple-50',
    red: 'from-red-500 to-red-600 text-red-600 bg-red-50'
  };
  
  return (
    <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
      <CardContent className="p-3 sm:p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-600 uppercase tracking-wide truncate">
              {title}
            </p>
            <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-slate-900">
              {value}
            </p>
            <div className="flex items-center space-x-1">
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={`text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.value}%
              </span>
            </div>
          </div>
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses].split(' ')[0]} ${colorClasses[color as keyof typeof colorClasses].split(' ')[1]} flex items-center justify-center shadow-lg flex-shrink-0 ml-2`}>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectCard({ project, onUpdate }: { project: Project; onUpdate: (project: Project) => void }) {
  const isOverdue = new Date(project.dueDate) < new Date() && project.status !== "completed";
  
  return (
    <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 group">
      <CardContent className="p-4 lg:p-6">
        {/* Header */}
        <div className="space-y-3 mb-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 flex-1 min-w-0 truncate">
              {project.projectName}
            </h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Eye className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="truncate">{project.projectName}</span>
                    </DialogTitle>
                  </DialogHeader>
                  <ProjectDetailsView project={project} />
                </DialogContent>
              </Dialog>
              
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onUpdate(project)}>
                <Edit className="h-4 w-4" />
              </Button>
              
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Status badges row for mobile */}
          <div className="flex items-center gap-2 flex-wrap">
            {getStatusBadge(project.status)}
            {isOverdue && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Overdue
              </Badge>
            )}
          </div>
          
          {/* Client and date info for mobile */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span className="truncate">
                {project.user?.firstName} {project.user?.lastName}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Due {new Date(project.dueDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Progress</span>
            <span className="text-sm font-bold text-slate-900">{project.progressPercentage || 0}%</span>
          </div>
          <div className="relative">
            <Progress 
              value={project.progressPercentage || 0} 
              className="h-2 bg-slate-100"
            />
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 opacity-20" 
                 style={{ width: `${project.progressPercentage || 0}%` }} />
          </div>
        </div>

        {/* Client Info */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                {project.user?.firstName?.[0]}{project.user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 truncate">
                {project.user?.firstName} {project.user?.lastName}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {project.user?.email}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-slate-600 flex-shrink-0">
            <DollarSign className="h-4 w-4" />
            <span className="font-medium">
              ₦{project.order?.service?.price?.toLocaleString() || 'N/A'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectsLoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      
      {/* Stats Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-12" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-12 w-12 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Filters Skeleton */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-10" />
          </div>
        </CardContent>
      </Card>
      
      {/* Projects Skeleton */}
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
                <Skeleton className="h-2 w-full" />
                <div className="flex justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ searchTerm, statusFilter }: { searchTerm: string; statusFilter: string }) {
  return (
    <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white/80 backdrop-blur-sm">
      <CardContent className="p-12 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <FileText className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">No projects found</h3>
        <p className="text-slate-600 mb-6 max-w-md mx-auto">
          {searchTerm || statusFilter !== "all" 
            ? "No projects match your current filters. Try adjusting your search criteria."
            : "Get started by creating your first project and begin tracking progress."}
        </p>
        <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
          <Plus className="h-4 w-4 mr-2" />
          Create Project
        </Button>
      </CardContent>
    </Card>
  );
}

function ProjectDetailsView({ project }: { project: Project }) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-slate-100">
        <TabsTrigger value="overview" className="data-[state=active]:bg-white">Overview</TabsTrigger>
        <TabsTrigger value="timeline" className="data-[state=active]:bg-white">Timeline</TabsTrigger>
        <TabsTrigger value="communication" className="data-[state=active]:bg-white">Communication</TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview" className="space-y-6 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Project Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-slate-600">Status</span>
                  <div className="mt-1">{getStatusBadge(project.status)}</div>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Progress</span>
                  <p className="text-lg font-semibold text-slate-900">{project.progressPercentage || 0}%</p>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Timeline</span>
                  <p className="font-medium text-slate-900">{project.timelineWeeks || 'N/A'} weeks</p>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Stage</span>
                  <p className="font-medium text-slate-900">{project.currentStage || 'Discovery'}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-slate-600">Started</span>
                    <p className="font-medium text-slate-900">
                      {new Date(project.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-600">Due Date</span>
                    <p className="font-medium text-slate-900">
                      {new Date(project.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {project.user?.firstName?.[0]}{project.user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-slate-900">
                    {project.user?.firstName} {project.user?.lastName}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-slate-600">
                    <Mail className="h-3 w-3" />
                    <span>{project.user?.email}</span>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-slate-600">Service</span>
                    <p className="font-medium text-slate-900">{project.order?.service?.name || 'Custom Project'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-600">Project Value</span>
                    <p className="text-lg font-bold text-green-600">
                      ₦{project.order?.service?.price?.toLocaleString() || 'TBD'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
      
      <TabsContent value="timeline" className="mt-6">
        <Card className="border-slate-200">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Timeline View</h3>
            <p className="text-slate-600">Project timeline and milestone tracking coming soon...</p>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="communication" className="mt-6">
        <Card className="border-slate-200">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Communication Hub</h3>
            <p className="text-slate-600">Client communication history and messaging tools coming soon...</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}