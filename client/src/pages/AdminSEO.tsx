
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Search, 
  Settings, 
  FileText, 
  BarChart3, 
  CheckCircle, 
  AlertCircle, 
  Globe, 
  Eye,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  Target,
  Zap,
  Download,
  Upload,
  RefreshCw,
  ExternalLink,
  Lightbulb,
  AlertTriangle,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSEO() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [selectedKeyword, setSelectedKeyword] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Fetch SEO settings
  const { data: seoSettings, isLoading: isSettingsLoading, error: settingsError } = useQuery({
    queryKey: ["/api/seo/settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/seo/settings");
      if (!response.ok) throw new Error("Failed to fetch SEO settings");
      return await response.json();
    },
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch SEO pages
  const { data: seoPages, isLoading: isPagesLoading, error: pagesError } = useQuery({
    queryKey: ["/api/admin/seo/pages"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/seo/pages");
      if (!response.ok) throw new Error("Failed to fetch SEO pages");
      return await response.json();
    },
    retry: 3,
  });

  // Fetch SEO keywords
  const { data: seoKeywords, isLoading: isKeywordsLoading, error: keywordsError } = useQuery({
    queryKey: ["/api/admin/seo/keywords"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/seo/keywords");
      if (!response.ok) throw new Error("Failed to fetch SEO keywords");
      return await response.json();
    },
    retry: 3,
  });

  // Fetch SEO audits
  const { data: seoAudits, isLoading: isAuditsLoading, error: auditsError } = useQuery({
    queryKey: ["/api/admin/seo/audits"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/seo/audits");
      if (!response.ok) throw new Error("Failed to fetch SEO audits");
      return await response.json();
    },
    retry: 3,
  });

  // Update SEO settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const response = await apiRequest("PATCH", "/api/admin/seo/settings", settings);
      if (!response.ok) throw new Error("Failed to update settings");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seo/settings"] });
      toast({
        title: "Settings Updated",
        description: "SEO settings have been updated successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update SEO settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create/Update page mutation
  const createPageMutation = useMutation({
    mutationFn: async (pageData: any) => {
      const url = isEditMode && selectedPage ? `/api/admin/seo/pages/${selectedPage.id}` : "/api/admin/seo/pages";
      const method = isEditMode && selectedPage ? "PATCH" : "POST";
      const response = await apiRequest(method, url, pageData);
      if (!response.ok) throw new Error(`Failed to ${isEditMode ? 'update' : 'create'} page`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo/pages"] });
      setIsPageModalOpen(false);
      setSelectedPage(null);
      setIsEditMode(false);
      toast({
        title: `Page ${isEditMode ? 'Updated' : 'Created'}`,
        description: `SEO page configuration has been ${isEditMode ? 'updated' : 'created'} successfully!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditMode ? 'update' : 'create'} SEO page. Please try again.`,
        variant: "destructive",
      });
    },
  });

  // Delete page mutation
  const deletePageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/seo/pages/${pageId}`);
      if (!response.ok) throw new Error("Failed to delete page");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo/pages"] });
      toast({
        title: "Page Deleted",
        description: "SEO page has been deleted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete page. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create/Update keyword mutation
  const createKeywordMutation = useMutation({
    mutationFn: async (keywordData: any) => {
      const url = isEditMode && selectedKeyword ? `/api/admin/seo/keywords/${selectedKeyword.id}` : "/api/admin/seo/keywords";
      const method = isEditMode && selectedKeyword ? "PATCH" : "POST";
      const response = await apiRequest(method, url, keywordData);
      if (!response.ok) throw new Error(`Failed to ${isEditMode ? 'update' : 'add'} keyword`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo/keywords"] });
      setIsKeywordModalOpen(false);
      setSelectedKeyword(null);
      setIsEditMode(false);
      toast({
        title: `Keyword ${isEditMode ? 'Updated' : 'Added'}`,
        description: `SEO keyword has been ${isEditMode ? 'updated' : 'added'} successfully!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditMode ? 'update' : 'add'} keyword. Please try again.`,
        variant: "destructive",
      });
    },
  });

  // Create audit mutation
  const createAuditMutation = useMutation({
    mutationFn: async (auditData: any) => {
      const response = await apiRequest("POST", "/api/admin/seo/audits", auditData);
      if (!response.ok) throw new Error("Failed to create audit");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo/audits"] });
      setIsAuditModalOpen(false);
      toast({
        title: "Audit Created",
        description: "SEO audit has been created successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create audit. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Run audit mutation
  const runAuditMutation = useMutation({
    mutationFn: async (auditId: string) => {
      const response = await apiRequest("POST", `/api/admin/seo/audits/${auditId}/run`);
      if (!response.ok) throw new Error("Failed to run audit");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo/audits"] });
      toast({
        title: "Audit Started",
        description: "SEO audit is now running. Results will be available shortly.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to run audit. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUpdateSettings = (field: string, value: any) => {
    updateSettingsMutation.mutate({ [field]: value });
  };

  const handleCreatePage = (formData: FormData) => {
    const pageData = {
      path: formData.get("path"),
      title: formData.get("title"),
      metaDescription: formData.get("metaDescription"),
      keywords: formData.get("keywords"),
      h1Tag: formData.get("h1Tag"),
      canonicalUrl: formData.get("canonicalUrl"),
      priority: parseFloat(formData.get("priority") as string || "0.5"),
      changeFrequency: formData.get("changeFrequency"),
      contentType: formData.get("contentType"),
    };
    createPageMutation.mutate(pageData);
  };

  const handleEditPage = (page: any) => {
    setSelectedPage(page);
    setIsEditMode(true);
    setIsPageModalOpen(true);
  };

  const handleCreateKeyword = (formData: FormData) => {
    const keywordData = {
      keyword: formData.get("keyword"),
      targetPage: formData.get("targetPage"),
      searchVolume: parseInt(formData.get("searchVolume") as string) || null,
      difficulty: parseFloat(formData.get("difficulty") as string) || null,
      targetRanking: parseInt(formData.get("targetRanking") as string) || null,
      notes: formData.get("notes"),
    };
    createKeywordMutation.mutate(keywordData);
  };

  const handleEditKeyword = (keyword: any) => {
    setSelectedKeyword(keyword);
    setIsEditMode(true);
    setIsKeywordModalOpen(true);
  };

  const handleCreateAudit = (formData: FormData) => {
    const auditData = {
      auditType: formData.get("auditType"),
      page: formData.get("page"),
      notes: formData.get("notes"),
    };
    createAuditMutation.mutate(auditData);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "in_progress": return "bg-blue-100 text-blue-800 border-blue-200";
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/seo/settings"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/seo/pages"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/seo/keywords"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/seo/audits"] });
  };

  // Calculate SEO health score
  const calculateSEOHealth = () => {
    let score = 0;
    let maxScore = 0;

    // Check basic settings
    if (seoSettings?.siteName) score += 10;
    if (seoSettings?.siteDescription) score += 10;
    if (seoSettings?.defaultMetaTitle) score += 10;
    if (seoSettings?.defaultMetaDescription) score += 10;
    if (seoSettings?.googleAnalyticsId) score += 10;
    maxScore += 50;

    // Check pages configuration
    const activePagesCount = seoPages?.filter((p: any) => p.isActive).length || 0;
    if (activePagesCount > 0) score += Math.min(activePagesCount * 5, 25);
    maxScore += 25;

    // Check keywords
    const activeKeywordsCount = seoKeywords?.filter((k: any) => k.isActive).length || 0;
    if (activeKeywordsCount > 0) score += Math.min(activeKeywordsCount * 2, 25);
    maxScore += 25;

    return Math.round((score / maxScore) * 100);
  };

  if (isSettingsLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const seoHealthScore = calculateSEOHealth();

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Search className="h-6 w-6 md:h-8 md:w-8" />
            SEO Management Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Manage website SEO settings, page optimization, and performance tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refreshData} disabled={updateSettingsMutation.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${updateSettingsMutation.isPending ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Error Alerts */}
      {(settingsError || pagesError || keywordsError || auditsError) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Data Loading Error</AlertTitle>
          <AlertDescription>
            Some SEO data could not be loaded. Please check your connection and try refreshing the page.
          </AlertDescription>
        </Alert>
      )}

      {/* SEO Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            SEO Health Score
          </CardTitle>
          <CardDescription>Overall website SEO configuration status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={seoHealthScore} className="h-3" />
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(seoHealthScore)}`}>
              {seoHealthScore}%
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Basic Settings: {seoSettings ? 'Configured' : 'Incomplete'}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <span>Pages: {seoPages?.filter((p: any) => p.isActive).length || 0} active</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              <span>Keywords: {seoKeywords?.filter((k: any) => k.isActive).length || 0} tracked</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
          <TabsTrigger value="pages" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Pages</span>
          </TabsTrigger>
          <TabsTrigger value="keywords" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Keywords</span>
          </TabsTrigger>
          <TabsTrigger value="audits" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Audits</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{seoPages?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {seoPages?.filter((p: any) => p.isActive).length || 0} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Keywords Tracked</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{seoKeywords?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {seoKeywords?.filter((k: any) => k.isActive).length || 0} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Audits Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {seoAudits?.filter((a: any) => a.status === "completed").length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {seoAudits?.filter((a: any) => a.status === "pending").length || 0} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {seoAudits?.length ? 
                    Math.round(seoAudits.filter((a: any) => a.score).reduce((acc: number, a: any) => acc + a.score, 0) / seoAudits.filter((a: any) => a.score).length) 
                    : 0}
                </div>
                <p className="text-xs text-muted-foreground">SEO audit score</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common SEO management tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button onClick={() => setIsPageModalOpen(true)} className="h-auto flex-col gap-2 p-4">
                  <Plus className="h-5 w-5" />
                  <span>Add New Page</span>
                </Button>
                <Button onClick={() => setIsKeywordModalOpen(true)} variant="outline" className="h-auto flex-col gap-2 p-4">
                  <Target className="h-5 w-5" />
                  <span>Track Keyword</span>
                </Button>
                <Button onClick={() => setIsAuditModalOpen(true)} variant="outline" className="h-auto flex-col gap-2 p-4">
                  <CheckCircle className="h-5 w-5" />
                  <span>Run Audit</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* SEO Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                SEO Recommendations
              </CardTitle>
              <CardDescription>Suggestions to improve your SEO performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {!seoSettings?.googleAnalyticsId && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Add Google Analytics</AlertTitle>
                    <AlertDescription>
                      Set up Google Analytics to track your website performance and user behavior.
                    </AlertDescription>
                  </Alert>
                )}
                
                {seoPages?.length === 0 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Configure Page SEO</AlertTitle>
                    <AlertDescription>
                      Add SEO configurations for your main pages to improve search engine visibility.
                    </AlertDescription>
                  </Alert>
                )}
                
                {seoKeywords?.length < 5 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Track More Keywords</AlertTitle>
                    <AlertDescription>
                      Add more target keywords to monitor your search engine rankings effectively.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent SEO Activity</CardTitle>
              <CardDescription>Latest pages, keywords, and audits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Recent Pages */}
                {seoPages?.slice(0, 3).map((page: any) => (
                  <div key={page.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium">{page.title}</p>
                        <p className="text-sm text-gray-500">{page.path}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={page.isActive ? "default" : "secondary"}>
                        {page.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => handleEditPage(page)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {/* Recent Keywords */}
                {seoKeywords?.slice(0, 2).map((keyword: any) => (
                  <div key={keyword.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Target className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">{keyword.keyword}</p>
                        <p className="text-sm text-gray-500">
                          Target: {keyword.targetPage || "Not set"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {keyword.searchVolume && (
                        <Badge variant="outline">{keyword.searchVolume} searches</Badge>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleEditKeyword(keyword)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Global SEO Settings</CardTitle>
              <CardDescription>Configure site-wide SEO parameters and tracking codes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    defaultValue={seoSettings?.siteName}
                    onBlur={(e) => handleUpdateSettings("siteName", e.target.value)}
                    placeholder="Your Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteUrl">Site URL</Label>
                  <Input
                    id="siteUrl"
                    defaultValue={seoSettings?.siteUrl}
                    onBlur={(e) => handleUpdateSettings("siteUrl", e.target.value)}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteDescription">Site Description</Label>
                <Textarea
                  id="siteDescription"
                  defaultValue={seoSettings?.siteDescription}
                  onBlur={(e) => handleUpdateSettings("siteDescription", e.target.value)}
                  placeholder="Brief description of your website and services"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultMetaTitle">Default Meta Title</Label>
                <Input
                  id="defaultMetaTitle"
                  defaultValue={seoSettings?.defaultMetaTitle}
                  onBlur={(e) => handleUpdateSettings("defaultMetaTitle", e.target.value)}
                  placeholder="Your Company - Professional Services"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultMetaDescription">Default Meta Description</Label>
                <Textarea
                  id="defaultMetaDescription"
                  defaultValue={seoSettings?.defaultMetaDescription}
                  onBlur={(e) => handleUpdateSettings("defaultMetaDescription", e.target.value)}
                  placeholder="Default description for pages without specific meta descriptions"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultKeywords">Default Keywords</Label>
                <Input
                  id="defaultKeywords"
                  placeholder="keyword1, keyword2, keyword3"
                  defaultValue={seoSettings?.defaultKeywords}
                  onBlur={(e) => handleUpdateSettings("defaultKeywords", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="googleAnalyticsId">Google Analytics ID</Label>
                  <Input
                    id="googleAnalyticsId"
                    placeholder="GA-XXXXXXXXX-X"
                    defaultValue={seoSettings?.googleAnalyticsId}
                    onBlur={(e) => handleUpdateSettings("googleAnalyticsId", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="googleTagManagerId">Google Tag Manager ID</Label>
                  <Input
                    id="googleTagManagerId"
                    placeholder="GTM-XXXXXXX"
                    defaultValue={seoSettings?.googleTagManagerId}
                    onBlur={(e) => handleUpdateSettings("googleTagManagerId", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="sitemapEnabled"
                    checked={seoSettings?.sitemapEnabled}
                    onCheckedChange={(checked) => handleUpdateSettings("sitemapEnabled", checked)}
                  />
                  <Label htmlFor="sitemapEnabled">Enable Sitemap</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="openGraphEnabled"
                    checked={seoSettings?.openGraphEnabled}
                    onCheckedChange={(checked) => handleUpdateSettings("openGraphEnabled", checked)}
                  />
                  <Label htmlFor="openGraphEnabled">Open Graph Tags</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="structuredDataEnabled"
                    checked={seoSettings?.structuredDataEnabled}
                    onCheckedChange={(checked) => handleUpdateSettings("structuredDataEnabled", checked)}
                  />
                  <Label htmlFor="structuredDataEnabled">Structured Data</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pages Tab */}
        <TabsContent value="pages" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-medium">SEO Pages</h3>
              <p className="text-gray-600">Manage page-specific SEO settings</p>
            </div>
            <Dialog open={isPageModalOpen} onOpenChange={(open) => {
              setIsPageModalOpen(open);
              if (!open) {
                setSelectedPage(null);
                setIsEditMode(false);
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Page
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{isEditMode ? 'Edit' : 'Add'} SEO Page Configuration</DialogTitle>
                  <DialogDescription>
                    Configure SEO settings for a specific page
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleCreatePage(new FormData(e.target as HTMLFormElement));
                }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="path">Page Path</Label>
                      <Input 
                        id="path" 
                        name="path" 
                        placeholder="/about" 
                        defaultValue={selectedPage?.path}
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title">Page Title</Label>
                      <Input 
                        id="title" 
                        name="title" 
                        placeholder="About Us" 
                        defaultValue={selectedPage?.title}
                        required 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="metaDescription">Meta Description</Label>
                    <Textarea 
                      id="metaDescription" 
                      name="metaDescription" 
                      placeholder="Page description for search engines" 
                      defaultValue={selectedPage?.metaDescription}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="keywords">Keywords</Label>
                    <Input 
                      id="keywords" 
                      name="keywords" 
                      placeholder="keyword1, keyword2, keyword3" 
                      defaultValue={selectedPage?.keywords}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Input 
                        id="priority" 
                        name="priority" 
                        type="number" 
                        min="0" 
                        max="1" 
                        step="0.1" 
                        defaultValue={selectedPage?.priority || 0.5} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="changeFrequency">Change Frequency</Label>
                      <Select name="changeFrequency" defaultValue={selectedPage?.changeFrequency || "weekly"}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" disabled={createPageMutation.isPending} className="w-full">
                    {createPageMutation.isPending ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Page" : "Create Page")}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {isPagesLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
                ))}
              </div>
            ) : seoPages?.length > 0 ? (
              seoPages.map((page: any) => (
                <Card key={page.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{page.title}</h4>
                          <Badge variant={page.isActive ? "default" : "secondary"}>
                            {page.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{page.path}</p>
                        {page.metaDescription && (
                          <p className="text-sm text-gray-500 mt-1">{page.metaDescription}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span>Priority: {page.priority}</span>
                          <span>Frequency: {page.changeFrequency}</span>
                          {page.updatedAt && (
                            <span>Updated: {new Date(page.updatedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditPage(page)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this page?')) {
                              deletePageMutation.mutate(page.id);
                            }
                          }}
                          disabled={deletePageMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500">No SEO pages configured yet</p>
                  <p className="text-sm text-gray-400">Add your first page to get started</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Keywords Tab */}
        <TabsContent value="keywords" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-medium">SEO Keywords</h3>
              <p className="text-gray-600">Track keyword rankings and performance</p>
            </div>
            <Dialog open={isKeywordModalOpen} onOpenChange={(open) => {
              setIsKeywordModalOpen(open);
              if (!open) {
                setSelectedKeyword(null);
                setIsEditMode(false);
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Keyword
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{isEditMode ? 'Edit' : 'Add'} SEO Keyword</DialogTitle>
                  <DialogDescription>
                    {isEditMode ? 'Update the' : 'Add a new'} keyword to track
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateKeyword(new FormData(e.target as HTMLFormElement));
                }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="keyword">Keyword</Label>
                    <Input 
                      id="keyword" 
                      name="keyword" 
                      placeholder="web development" 
                      defaultValue={selectedKeyword?.keyword}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetPage">Target Page</Label>
                    <Input 
                      id="targetPage" 
                      name="targetPage" 
                      placeholder="/services" 
                      defaultValue={selectedKeyword?.targetPage}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="searchVolume">Search Volume</Label>
                      <Input 
                        id="searchVolume" 
                        name="searchVolume" 
                        type="number" 
                        placeholder="1000" 
                        defaultValue={selectedKeyword?.searchVolume}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="difficulty">Difficulty (1-100)</Label>
                      <Input 
                        id="difficulty" 
                        name="difficulty" 
                        type="number" 
                        min="1" 
                        max="100" 
                        placeholder="50" 
                        defaultValue={selectedKeyword?.difficulty}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetRanking">Target Ranking</Label>
                    <Input 
                      id="targetRanking" 
                      name="targetRanking" 
                      type="number" 
                      min="1" 
                      max="100" 
                      placeholder="10" 
                      defaultValue={selectedKeyword?.targetRanking}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea 
                      id="notes" 
                      name="notes" 
                      placeholder="Additional notes about this keyword" 
                      defaultValue={selectedKeyword?.notes}
                    />
                  </div>
                  <Button type="submit" disabled={createKeywordMutation.isPending} className="w-full">
                    {createKeywordMutation.isPending ? (isEditMode ? "Updating..." : "Adding...") : (isEditMode ? "Update Keyword" : "Add Keyword")}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {isKeywordsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
                ))}
              </div>
            ) : seoKeywords?.length > 0 ? (
              seoKeywords.map((keyword: any) => (
                <Card key={keyword.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{keyword.keyword}</h4>
                          <Badge variant={keyword.isActive ? "default" : "secondary"}>
                            {keyword.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Target: {keyword.targetPage || "Not set"}
                        </p>
                        <div className="flex gap-4 mt-2 text-sm text-gray-500">
                          {keyword.searchVolume && (
                            <span>Volume: {keyword.searchVolume.toLocaleString()}</span>
                          )}
                          {keyword.difficulty && (
                            <span>Difficulty: {keyword.difficulty}/100</span>
                          )}
                          {keyword.currentRanking && (
                            <span>Current: #{keyword.currentRanking}</span>
                          )}
                          {keyword.targetRanking && (
                            <span>Target: #{keyword.targetRanking}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditKeyword(keyword)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <Target className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500">No keywords being tracked yet</p>
                  <p className="text-sm text-gray-400">Add keywords to monitor their performance</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Audits Tab */}
        <TabsContent value="audits" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-medium">SEO Audits</h3>
              <p className="text-gray-600">Track SEO performance and issues</p>
            </div>
            <Dialog open={isAuditModalOpen} onOpenChange={setIsAuditModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Start Audit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start SEO Audit</DialogTitle>
                  <DialogDescription>
                    Create a new SEO audit task
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateAudit(new FormData(e.target as HTMLFormElement));
                }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="auditType">Audit Type</Label>
                    <Select name="auditType" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select audit type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual Review</SelectItem>
                        <SelectItem value="automated">Automated Scan</SelectItem>
                        <SelectItem value="external">External Tool</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="page">Page (Optional)</Label>
                    <Input id="page" name="page" placeholder="/specific-page" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" name="notes" placeholder="Specific areas to focus on..." />
                  </div>
                  <Button type="submit" disabled={createAuditMutation.isPending} className="w-full">
                    {createAuditMutation.isPending ? "Creating..." : "Start Audit"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {isAuditsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
                ))}
              </div>
            ) : seoAudits?.length > 0 ? (
              seoAudits.map((audit: any) => (
                <Card key={audit.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium capitalize">{audit.auditType} Audit</h4>
                          <Badge className={getStatusColor(audit.status)}>
                            {audit.status.replace("_", " ")}
                          </Badge>
                          {audit.score && (
                            <Badge variant="outline" className={getScoreColor(audit.score)}>
                              Score: {audit.score}/100
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {audit.page ? `Page: ${audit.page}` : "Site-wide audit"}
                        </p>
                        <p className="text-sm text-gray-500">
                          Created: {new Date(audit.createdAt).toLocaleDateString()}
                          {audit.completedAt && (
                            <span> | Completed: {new Date(audit.completedAt).toLocaleDateString()}</span>
                          )}
                        </p>
                        {audit.notes && (
                          <p className="text-sm text-gray-500 mt-1">{audit.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {audit.status === "pending" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => runAuditMutation.mutate(audit.id)}
                            disabled={runAuditMutation.isPending}
                          >
                            <Zap className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500">No SEO audits yet</p>
                  <p className="text-sm text-gray-400">Start your first audit to track SEO performance</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
