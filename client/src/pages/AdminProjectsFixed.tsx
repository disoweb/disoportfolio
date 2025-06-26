import React, { useState } from "react";
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
  FileText,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  Mail,
  Phone,
  Trash2
} from "lucide-react";

interface Project {
  id: string;
  projectName: string;
  status: string;
  progressPercentage: number;
  dueDate: string;
  startDate: string;
  timelineWeeks: number;
  description: string;
  currentStage: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  order?: {
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    companyName?: string;
  };
}

export default function AdminProjectsFixed() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const [updateForm, setUpdateForm] = useState({
    status: "",
    progressPercentage: "",
    notes: "",
    dueDate: ""
  });
  
  const [createForm, setCreateForm] = useState({
    projectName: "",
    userId: "",
    description: "",
    timelineWeeks: "",
    notes: ""
  });

  // Get projects data
  const { data: projects = [], isLoading } = useQuery({
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

  // Delete project mutation
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

  // Helper functions for timestamp-based calculations (like client dashboard)
  const getTimelineDisplay = (project: any) => {
    // If timelineDays is available and <= 7 days, show in days
    if (project.timelineDays && project.timelineDays <= 7) {
      return `${project.timelineDays} day${project.timelineDays !== 1 ? 's' : ''}`;
    }
    // Otherwise show in weeks
    if (project.timelineWeeks) {
      return `${project.timelineWeeks} week${project.timelineWeeks !== 1 ? 's' : ''}`;
    }
    return 'N/A';
  };

  const calculateTimeProgress = (project: any) => {
    if (!project.startDate || !project.dueDate) return 0;
    const start = new Date(project.startDate).getTime();
    const end = new Date(project.dueDate).getTime();
    const now = new Date().getTime();
    const progress = ((now - start) / (end - start)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const isOverdue = (project: any) => {
    if (!project.dueDate || project.status === 'completed') return false;
    return new Date(project.dueDate) < new Date();
  };

  // Filter projects
  const filteredProjects = projects.filter((project: Project) => {
    const matchesSearch = project.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Get status badge
  const getStatusBadge = (status: string) => {
    const configs = {
      active: { className: "bg-green-500 text-white", label: "Active" },
      completed: { className: "bg-blue-500 text-white", label: "Completed" },
      paused: { className: "bg-yellow-500 text-white", label: "Paused" },
      cancelled: { className: "bg-red-500 text-white", label: "Cancelled" },
      not_started: { className: "bg-gray-500 text-white", label: "Not Started" }
    };
    
    const config = configs[status as keyof typeof configs] || configs.not_started;
    
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const handleUpdateProject = (project: Project) => {
    setSelectedProject(project);
    setUpdateForm({
      status: project.status,
      progressPercentage: (project.progressPercentage || 0).toString(),
      notes: "",
      dueDate: project.dueDate.split('T')[0]
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

  // Redirect non-admin users (but wait for auth to fully load)
  if (!authLoading && !isAuthenticated) {
    window.location.href = '/admin';
    return null;
  }

  if (!authLoading && isAuthenticated && user?.role !== 'admin') {
    window.location.href = '/admin';
    return null;
  }

  if (authLoading || isLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <AdminNavigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <AdminNavigation />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
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
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">New Project</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Projects</p>
                  <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {projects.filter((p: Project) => p.status === "active").length}
                  </p>
                </div>
                <Play className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {projects.filter((p: Project) => p.status === "completed").length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {projects.filter((p: Project) => {
                      const dueDate = new Date(p.dueDate);
                      const now = new Date();
                      return dueDate < now && p.status !== "completed";
                    }).length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Projects Grid */}
        <div className="grid gap-4 lg:gap-6">
          {filteredProjects.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">No projects found</p>
              </CardContent>
            </Card>
          ) : (
            filteredProjects.map((project: Project) => (
              <Card key={project.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-slate-900 truncate">
                        {project.projectName}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {project.user?.firstName} {project.user?.lastName} • {project.user?.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleUpdateProject(project)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      {project.status === 'cancelled' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" 
                          onClick={() => deleteProjectMutation.mutate(project.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
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
                      <p className="font-medium text-slate-900">{getTimelineDisplay(project)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-600">Due Date</span>
                      <p className="font-medium text-slate-900">
                        {new Date(project.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
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

      {/* Create Project Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Create New Project
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="projectName" className="text-sm">Project Name</Label>
              <Input
                placeholder="Enter project name..."
                value={createForm.projectName}
                onChange={(e) => setCreateForm(prev => ({ 
                  ...prev, 
                  projectName: e.target.value 
                }))}
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="userId" className="text-sm">User ID</Label>
              <Input
                placeholder="Enter user ID..."
                value={createForm.userId}
                onChange={(e) => setCreateForm(prev => ({ 
                  ...prev, 
                  userId: e.target.value 
                }))}
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="description" className="text-sm">Description</Label>
              <Textarea
                placeholder="Project description..."
                value={createForm.description}
                onChange={(e) => setCreateForm(prev => ({ 
                  ...prev, 
                  description: e.target.value 
                }))}
                className="w-full min-h-[80px]"
              />
            </div>
            <div>
              <Label htmlFor="timelineWeeks" className="text-sm">Timeline (weeks)</Label>
              <Input
                type="number"
                min="1"
                placeholder="Number of weeks..."
                value={createForm.timelineWeeks}
                onChange={(e) => setCreateForm(prev => ({ 
                  ...prev, 
                  timelineWeeks: e.target.value 
                }))}
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="notes" className="text-sm">Notes</Label>
              <Textarea
                placeholder="Additional project notes..."
                value={createForm.notes}
                onChange={(e) => setCreateForm(prev => ({ 
                  ...prev, 
                  notes: e.target.value 
                }))}
                className="w-full min-h-[80px]"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end sm:space-x-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              onClick={() => createProjectMutation.mutate({
                projectName: createForm.projectName,
                userId: createForm.userId,
                description: createForm.description,
                timelineWeeks: parseInt(createForm.timelineWeeks),
                notes: createForm.notes
              })}
              disabled={createProjectMutation.isPending || !createForm.projectName || !createForm.userId}
              className="w-full sm:w-auto"
            >
              {createProjectMutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}