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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
  Settings
} from "lucide-react";

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

  // Filter projects based on search and status
  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.order?.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.order?.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      case "paused":
        return <Badge className="bg-yellow-100 text-yellow-800">Paused</Badge>;
      case "not_started":
        return <Badge className="bg-gray-100 text-gray-800">Not Started</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
      progressPercentage: project.progressPercentage.toString(),
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
      <div className="min-h-screen bg-gray-50">
        <AdminNavigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Project Management</h1>
            <p className="text-gray-600">Manage all client projects and track progress</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Projects</p>
                  <p className="text-2xl font-bold text-gray-900">{projectStats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Play className="h-4 w-4 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-gray-900">{projectStats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{projectStats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-gray-900">{projectStats.overdue}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Search projects, clients..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="w-full sm:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects List */}
        <div className="grid gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {project.projectName}
                    </h3>
                    {getStatusBadge(project.status)}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>Project Details: {project.projectName}</DialogTitle>
                        </DialogHeader>
                        <ProjectDetailsView project={project} />
                      </DialogContent>
                    </Dialog>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleUpdateProject(project)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Update
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="h-4 w-4 mr-2" />
                    <span>
                      {project.order?.user?.firstName} {project.order?.user?.lastName}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Due: {new Date(project.dueDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>{project.timelineWeeks} weeks</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="h-4 w-4 mr-2" />
                    <span>₦{project.order?.service?.price?.toLocaleString() || 'N/A'}</span>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{project.progressPercentage}%</span>
                  </div>
                  <Progress value={project.progressPercentage} className="h-2" />
                </div>

                {new Date(project.dueDate) < new Date() && project.status !== "completed" && (
                  <div className="flex items-center text-red-600 text-sm mt-2">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    <span>Overdue</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== "all" 
                  ? "No projects match your current filters."
                  : "Get started by creating your first project."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Update Project Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Project: {selectedProject?.projectName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={updateForm.status} onValueChange={(value) => 
                  setUpdateForm(prev => ({ ...prev, status: value }))
                }>
                  <SelectTrigger>
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
                <Label htmlFor="progress">Progress (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={updateForm.progressPercentage}
                  onChange={(e) => setUpdateForm(prev => ({ 
                    ...prev, 
                    progressPercentage: e.target.value 
                  }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                type="date"
                value={updateForm.dueDate}
                onChange={(e) => setUpdateForm(prev => ({ 
                  ...prev, 
                  dueDate: e.target.value 
                }))}
              />
            </div>
            <div>
              <Label htmlFor="notes">Update Notes</Label>
              <Textarea
                placeholder="Add notes about this update..."
                value={updateForm.notes}
                onChange={(e) => setUpdateForm(prev => ({ 
                  ...prev, 
                  notes: e.target.value 
                }))}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={submitUpdate}
              disabled={updateProjectMutation.isPending}
            >
              {updateProjectMutation.isPending ? "Updating..." : "Update Project"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Project Details Component
function ProjectDetailsView({ project }: { project: Project }) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="communication">Communication</TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Project Information</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Status:</span>
                <span className="ml-2 font-medium">{project.status}</span>
              </div>
              <div>
                <span className="text-gray-600">Progress:</span>
                <span className="ml-2 font-medium">{project.progressPercentage}%</span>
              </div>
              <div>
                <span className="text-gray-600">Timeline:</span>
                <span className="ml-2 font-medium">{project.timelineWeeks} weeks</span>
              </div>
              <div>
                <span className="text-gray-600">Started:</span>
                <span className="ml-2 font-medium">
                  {new Date(project.startDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Due Date:</span>
                <span className="ml-2 font-medium">
                  {new Date(project.dueDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Client Information</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium">
                  {project.order?.user?.firstName} {project.order?.user?.lastName}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <span className="ml-2 font-medium">{project.order?.user?.email}</span>
              </div>
              <div>
                <span className="text-gray-600">Service:</span>
                <span className="ml-2 font-medium">{project.order?.service?.name}</span>
              </div>
              <div>
                <span className="text-gray-600">Value:</span>
                <span className="ml-2 font-medium">
                  ₦{project.order?.service?.price?.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="timeline">
        <div className="text-center py-8 text-gray-500">
          Timeline view coming soon...
        </div>
      </TabsContent>
      
      <TabsContent value="communication">
        <div className="text-center py-8 text-gray-500">
          Communication history coming soon...
        </div>
      </TabsContent>
    </Tabs>
  );
}