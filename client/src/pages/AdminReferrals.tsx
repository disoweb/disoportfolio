import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, DollarSign, Users, TrendingUp, Check, X, Clock, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface ReferralSettings {
  id: string;
  commissionPercentage: string;
  minimumWithdrawal: string;
  payoutSchedule: string;
  isActive: boolean;
}

interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: string;
  paymentMethod: string;
  paymentDetails: any;
  status: string;
  adminNotes?: string;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
}

export default function AdminReferrals() {
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [processingStatus, setProcessingStatus] = useState("");
  const [processingNotes, setProcessingNotes] = useState("");
  const [settingsData, setSettingsData] = useState<ReferralSettings | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch referral settings
  const { data: settings, isLoading: isSettingsLoading } = useQuery({
    queryKey: ["/api/admin/referral-settings"],
    queryFn: () => apiRequest("GET", "/api/admin/referral-settings"),
    onSuccess: (data) => setSettingsData(data),
  });

  // Fetch withdrawal requests
  const { data: withdrawals, isLoading: isWithdrawalsLoading } = useQuery({
    queryKey: ["/api/admin/withdrawals"],
    queryFn: () => apiRequest("GET", "/api/admin/withdrawals"),
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<ReferralSettings>) =>
      apiRequest("PATCH", "/api/admin/referral-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral-settings"] });
      toast({
        title: "Settings Updated",
        description: "Referral settings have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update referral settings.",
        variant: "destructive",
      });
    },
  });

  // Process withdrawal mutation
  const processWithdrawalMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      apiRequest("PATCH", `/api/admin/withdrawals/${id}`, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      setSelectedWithdrawal(null);
      setProcessingStatus("");
      setProcessingNotes("");
      toast({
        title: "Withdrawal Processed",
        description: "Withdrawal request has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Processing Failed",
        description: "Failed to process withdrawal request.",
        variant: "destructive",
      });
    },
  });

  const handleSettingsUpdate = () => {
    if (!settingsData) return;
    updateSettingsMutation.mutate(settingsData);
  };

  const handleProcessWithdrawal = () => {
    if (!selectedWithdrawal || !processingStatus) return;
    
    processWithdrawalMutation.mutate({
      id: selectedWithdrawal.id,
      status: processingStatus,
      notes: processingNotes,
    });
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount || "0"));
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "approved":
        return <Check className="h-4 w-4 text-blue-500" />;
      case "completed":
        return <Check className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  // Calculate withdrawal stats
  const withdrawalStats = withdrawals?.reduce(
    (acc: any, withdrawal: WithdrawalRequest) => {
      acc.total += parseFloat(withdrawal.amount);
      acc.counts[withdrawal.status] = (acc.counts[withdrawal.status] || 0) + 1;
      return acc;
    },
    { total: 0, counts: {} }
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Referral Management</h1>
      </div>

      <Tabs defaultValue="withdrawals" className="space-y-6">
        <TabsList>
          <TabsTrigger value="withdrawals">Withdrawal Requests</TabsTrigger>
          <TabsTrigger value="settings">Referral Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="withdrawals" className="space-y-6">
          {/* Withdrawal Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requested</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(withdrawalStats?.total?.toString() || "0")}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {withdrawalStats?.counts?.pending || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <Check className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {withdrawalStats?.counts?.completed || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                <X className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {withdrawalStats?.counts?.rejected || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Withdrawal Requests List */}
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal Requests</CardTitle>
              <CardDescription>
                Manage and process user withdrawal requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isWithdrawalsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : withdrawals?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No withdrawal requests</p>
              ) : (
                <div className="space-y-4">
                  {withdrawals?.map((withdrawal: WithdrawalRequest) => (
                    <div
                      key={withdrawal.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-lg">
                            {formatCurrency(withdrawal.amount)}
                          </span>
                          {getStatusBadge(withdrawal.status)}
                          <span className="text-sm text-muted-foreground">
                            User: {withdrawal.userId.slice(0, 8)}...
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{withdrawal.paymentMethod}</span>
                          <span>•</span>
                          <span>{new Date(withdrawal.createdAt).toLocaleDateString()}</span>
                          {withdrawal.processedAt && (
                            <>
                              <span>•</span>
                              <span>Processed: {new Date(withdrawal.processedAt).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                        {withdrawal.adminNotes && (
                          <p className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                            <strong>Admin Notes:</strong> {withdrawal.adminNotes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(withdrawal.status)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedWithdrawal(withdrawal);
                            setProcessingStatus(withdrawal.status);
                            setProcessingNotes(withdrawal.adminNotes || "");
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Referral System Settings</span>
              </CardTitle>
              <CardDescription>
                Configure commission rates, withdrawal limits, and system preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSettingsLoading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="commission">Commission Percentage (%)</Label>
                      <Input
                        id="commission"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={settingsData?.commissionPercentage || ""}
                        onChange={(e) =>
                          setSettingsData(prev => prev ? {
                            ...prev,
                            commissionPercentage: e.target.value
                          } : null)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="minimum">Minimum Withdrawal ($)</Label>
                      <Input
                        id="minimum"
                        type="number"
                        min="0"
                        step="0.01"
                        value={settingsData?.minimumWithdrawal || ""}
                        onChange={(e) =>
                          setSettingsData(prev => prev ? {
                            ...prev,
                            minimumWithdrawal: e.target.value
                          } : null)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schedule">Payout Schedule</Label>
                      <Select
                        value={settingsData?.payoutSchedule || ""}
                        onValueChange={(value) =>
                          setSettingsData(prev => prev ? {
                            ...prev,
                            payoutSchedule: value
                          } : null)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select schedule" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="active"
                        checked={settingsData?.isActive || false}
                        onCheckedChange={(checked) =>
                          setSettingsData(prev => prev ? {
                            ...prev,
                            isActive: checked
                          } : null)
                        }
                      />
                      <Label htmlFor="active">Referral System Active</Label>
                    </div>
                  </div>

                  <Button
                    onClick={handleSettingsUpdate}
                    disabled={updateSettingsMutation.isPending}
                    className="w-full md:w-auto"
                  >
                    {updateSettingsMutation.isPending ? "Updating..." : "Update Settings"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Process Withdrawal Dialog */}
      <Dialog 
        open={!!selectedWithdrawal} 
        onOpenChange={(open) => !open && setSelectedWithdrawal(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Process Withdrawal Request</DialogTitle>
            <DialogDescription>
              Review and update the status of this withdrawal request
            </DialogDescription>
          </DialogHeader>
          
          {selectedWithdrawal && (
            <div className="space-y-6">
              {/* Request Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-600">Amount</label>
                  <p className="text-lg font-bold">{formatCurrency(selectedWithdrawal.amount)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Payment Method</label>
                  <p>{selectedWithdrawal.paymentMethod}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">User ID</label>
                  <p className="font-mono text-sm">{selectedWithdrawal.userId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Request Date</label>
                  <p>{new Date(selectedWithdrawal.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {/* Payment Details */}
              <div>
                <label className="text-sm font-medium text-gray-600">Payment Details</label>
                <pre className="mt-1 p-3 bg-gray-100 rounded text-sm overflow-auto">
                  {JSON.stringify(selectedWithdrawal.paymentDetails, null, 2)}
                </pre>
              </div>

              {/* Status Update */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={processingStatus} onValueChange={setProcessingStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Admin Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add notes about this withdrawal..."
                    value={processingNotes}
                    onChange={(e) => setProcessingNotes(e.target.value)}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={handleProcessWithdrawal}
                    disabled={processWithdrawalMutation.isPending || !processingStatus}
                    className="flex-1"
                  >
                    {processWithdrawalMutation.isPending ? "Processing..." : "Update Status"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedWithdrawal(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}