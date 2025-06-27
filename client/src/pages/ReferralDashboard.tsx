import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Copy, DollarSign, Users, TrendingUp, Clock, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReferralData {
  referralCode: string;
  earnings: {
    totalEarned: string;
    totalWithdrawn: string;
    availableBalance: string;
    totalReferrals: number;
    successfulReferrals: number;
  };
  referrals: Array<{
    id: string;
    referredUserId: string;
    commissionAmount: string;
    status: string;
    createdAt: string;
  }>;
  settings: {
    commissionPercentage: string;
    minimumWithdrawal: string;
    isActive: boolean;
  };
}

interface WithdrawalRequest {
  id: string;
  amount: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  processedAt?: string;
  adminNotes?: string;
}

export default function ReferralDashboard() {
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentDetails, setPaymentDetails] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch referral data
  const { data: referralData, isLoading: isReferralLoading } = useQuery({
    queryKey: ["/api/referrals/my-data"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/referrals/my-data");
      return await response.json();
    },
  });

  // Fetch withdrawal requests
  const { data: withdrawals, isLoading: isWithdrawalsLoading } = useQuery({
    queryKey: ["/api/referrals/withdrawals"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/referrals/withdrawals");
      return await response.json();
    },
  });

  // Generate referral code mutation
  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/referrals/generate-code");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/my-data"] });
      toast({
        title: "Referral Code Generated",
        description: "Your unique referral code has been created successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate referral code. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create withdrawal mutation
  const createWithdrawalMutation = useMutation({
    mutationFn: (data: { amount: string; paymentMethod: string; paymentDetails: any }) =>
      apiRequest("POST", "/api/referrals/withdraw", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/my-data"] });
      setIsWithdrawDialogOpen(false);
      setWithdrawalAmount("");
      setPaymentMethod("");
      setPaymentDetails("");
      toast({
        title: "Withdrawal Requested",
        description: "Your withdrawal request has been submitted for review.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to submit withdrawal request.",
        variant: "destructive",
      });
    },
  });

  const copyReferralCode = () => {
    if (referralData?.referralCode) {
      const referralUrl = `${window.location.origin}?ref=${referralData.referralCode}`;
      navigator.clipboard.writeText(referralUrl);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard.",
      });
    }
  };

  const handleWithdrawSubmit = () => {
    if (!withdrawalAmount || !paymentMethod) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    let details: any = {};
    try {
      details = JSON.parse(paymentDetails);
    } catch {
      // If not JSON, treat as simple string
      details = { details: paymentDetails };
    }

    createWithdrawalMutation.mutate({
      amount: withdrawalAmount,
      paymentMethod,
      paymentDetails: details,
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
      confirmed: "bg-green-100 text-green-800",
      paid: "bg-blue-100 text-blue-800",
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

  if (isReferralLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <Navigation />
        <main className="container mx-auto p-6 mt-20">
          <div className="grid gap-6">
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        </main>
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
            Referral Dashboard
          </h1>
          <p className="text-slate-600">Earn rewards by referring friends to DiSO Webs</p>
        </div>

        {!referralData?.referralCode && (
          <div className="flex justify-end mb-6">
            <Button
              onClick={() => generateCodeMutation.mutate()}
              disabled={generateCodeMutation.isPending}
            >
              {generateCodeMutation.isPending ? "Generating..." : "Generate Referral Code"}
            </Button>
          </div>
        )}

      {referralData?.referralCode && (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(referralData?.earnings?.availableBalance || "0")}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(referralData?.earnings?.totalEarned || "0")}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {referralData?.earnings?.totalReferrals || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Successful Referrals</CardTitle>
                <Check className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {referralData?.earnings?.successfulReferrals || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Referral Code Section */}
          <Card>
            <CardHeader>
              <CardTitle>Your Referral Link</CardTitle>
              <CardDescription>
                Share this link to earn {referralData?.settings?.commissionPercentage}% commission on successful referrals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Input
                  value={`${window.location.origin}?ref=${referralData.referralCode}`}
                  readOnly
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyReferralCode}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Withdrawal Section */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Withdrawals</h2>
            <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  disabled={parseFloat(referralData?.earnings?.availableBalance || "0") < parseFloat(referralData?.settings?.minimumWithdrawal || "50")}
                >
                  Request Withdrawal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Withdrawal</DialogTitle>
                  <DialogDescription>
                    Minimum withdrawal: {formatCurrency(referralData?.settings?.minimumWithdrawal || "50")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter amount"
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(e.target.value)}
                      max={referralData?.earnings?.availableBalance}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentDetails">Payment Details</Label>
                    <Textarea
                      id="paymentDetails"
                      placeholder="Enter account details (JSON format or description)"
                      value={paymentDetails}
                      onChange={(e) => setPaymentDetails(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleWithdrawSubmit}
                    disabled={createWithdrawalMutation.isPending}
                    className="w-full"
                  >
                    {createWithdrawalMutation.isPending ? "Submitting..." : "Submit Request"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Withdrawal History */}
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal History</CardTitle>
            </CardHeader>
            <CardContent>
              {isWithdrawalsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : withdrawals?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No withdrawal requests yet</p>
              ) : (
                <div className="space-y-4">
                  {withdrawals?.map((withdrawal: WithdrawalRequest) => (
                    <div key={withdrawal.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{formatCurrency(withdrawal.amount)}</span>
                          {getStatusBadge(withdrawal.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {withdrawal.paymentMethod} • {new Date(withdrawal.createdAt).toLocaleDateString()}
                        </p>
                        {withdrawal.adminNotes && (
                          <p className="text-sm text-muted-foreground">
                            Note: {withdrawal.adminNotes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {withdrawal.status === "pending" && <Clock className="h-4 w-4 text-yellow-500" />}
                        {withdrawal.status === "completed" && <Check className="h-4 w-4 text-green-500" />}
                        {withdrawal.status === "rejected" && <X className="h-4 w-4 text-red-500" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Referrals */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Referrals</CardTitle>
            </CardHeader>
            <CardContent>
              {referralData?.referrals?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No referrals yet</p>
              ) : (
                <div className="space-y-4">
                  {referralData?.referrals?.map((referral: any) => (
                    <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">User {referral.referredUserId.slice(0, 8)}...</span>
                          {getStatusBadge(referral.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(referral.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(referral.commissionAmount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!referralData?.referralCode && (
        <Card>
          <CardHeader>
            <CardTitle>Start Earning with Referrals</CardTitle>
            <CardDescription>
              Generate your unique referral code and start earning {referralData?.settings?.commissionPercentage || "10"}% commission on every successful referral!
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="space-y-4">
              <div className="text-6xl">💰</div>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Share your referral link with friends and earn money when they purchase our services.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}