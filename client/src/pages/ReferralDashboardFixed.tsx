import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, DollarSign, Users, TrendingUp, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ReferralDashboardFixed() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch referral data
  const { data: referralData, isLoading: isReferralLoading } = useQuery({
    queryKey: ["/api/referrals/my-data"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/referrals/my-data");
      return await response.json();
    },
  });

  // Fetch withdrawal history
  const { data: withdrawalHistory, isLoading: isHistoryLoading } = useQuery({
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

  // Request withdrawal mutation
  const withdrawalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/referrals/request-withdrawal", {
        amount: parseFloat(withdrawalAmount),
        paymentDetails: paymentDetails,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/my-data"] });
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/withdrawals"] });
      setWithdrawalAmount("");
      setPaymentDetails("");
      setIsWithdrawalModalOpen(false);
      toast({
        title: "Withdrawal Requested",
        description: "Your withdrawal request has been submitted for review!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit withdrawal request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const copyReferralCode = () => {
    if (referralData?.referralCode) {
      // Use configurable base URL if available, otherwise fallback to current origin
      const baseUrl = referralData?.settings?.baseUrl || window.location.origin;
      const referralUrl = `${baseUrl}?ref=${referralData.referralCode}`;
      navigator.clipboard.writeText(referralUrl);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard.",
      });
    }
  };

  const getReferralUrl = () => {
    if (referralData?.referralCode) {
      const baseUrl = referralData?.settings?.baseUrl || window.location.origin;
      return `${baseUrl}?ref=${referralData.referralCode}`;
    }
    return "";
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount?.toString() || "0"));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleWithdrawalClick = (withdrawal: any) => {
    setSelectedWithdrawal(withdrawal);
    setIsDetailModalOpen(true);
  };

  if (isReferralLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="grid gap-6">
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Referral Dashboard</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          {referralData?.referralCode && (
            <Button 
              variant={parseFloat(referralData?.earnings?.availableBalance || "0") > 0 ? "default" : "secondary"}
              className="w-full sm:w-auto"
              onClick={() => setIsWithdrawalModalOpen(true)}
            >
              <Wallet className="h-4 w-4 mr-2" />
              Request Withdrawal
            </Button>
          )}
          {!referralData?.referralCode && (
            <Button
              onClick={() => generateCodeMutation.mutate()}
              disabled={generateCodeMutation.isPending}
              className="w-full sm:w-auto"
            >
              {generateCodeMutation.isPending ? "Generating..." : "Generate Referral Code"}
            </Button>
          )}
        </div>
      </div>

      {referralData?.referralCode ? (
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
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant={parseFloat(referralData?.earnings?.availableBalance || "0") > 0 ? "default" : "outline"} 
                      size="sm" 
                      className="mt-2 w-full"
                      disabled={parseFloat(referralData?.earnings?.availableBalance || "0") === 0}
                    >
                      <Wallet className="h-4 w-4 mr-2" />
                      {parseFloat(referralData?.earnings?.availableBalance || "0") > 0 ? "Withdraw Funds" : "No Funds Available"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Request Withdrawal</DialogTitle>
                      <DialogDescription>
                        Request a withdrawal of your available earnings. Minimum withdrawal: ${referralData?.settings?.minimumWithdrawal || "50"}.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-blue-900">Available Balance:</span>
                          <span className="text-lg font-bold text-blue-900">
                            {formatCurrency(referralData?.earnings?.availableBalance || "0")}
                          </span>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="amount">Withdrawal Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          placeholder={`Min: $${referralData?.settings?.minimumWithdrawal || "50"}`}
                          value={withdrawalAmount}
                          onChange={(e) => setWithdrawalAmount(e.target.value)}
                          max={referralData?.earnings?.availableBalance || "0"}
                        />
                      </div>
                      <div>
                        <Label htmlFor="payment-details">Payment Details</Label>
                        <Textarea
                          id="payment-details"
                          placeholder="Enter your bank account details, PayPal email, or other payment information..."
                          value={paymentDetails}
                          onChange={(e) => setPaymentDetails(e.target.value)}
                          rows={4}
                        />
                      </div>
                      <Button
                        onClick={() => withdrawalMutation.mutate()}
                        disabled={
                          withdrawalMutation.isPending ||
                          !withdrawalAmount ||
                          !paymentDetails ||
                          parseFloat(withdrawalAmount) <= 0 ||
                          parseFloat(withdrawalAmount) > parseFloat(referralData?.earnings?.availableBalance || "0")
                        }
                        className="w-full"
                      >
                        {withdrawalMutation.isPending ? "Processing..." : "Submit Withdrawal Request"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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
                <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {referralData?.settings?.commissionPercentage || "10"}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Referral Code Section */}
          <Card>
            <CardHeader>
              <CardTitle>Your Referral Link</CardTitle>
              <CardDescription>
                Share this link to earn {referralData?.settings?.commissionPercentage || "10"}% commission on successful referrals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Input
                  value={getReferralUrl()}
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
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900">Your Referral Code: {referralData.referralCode}</h4>
                <p className="text-sm text-blue-700 mt-1">
                  When someone uses this code or link to purchase our services, you'll earn {referralData?.settings?.commissionPercentage || "10"}% commission!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <h4 className="font-semibold mb-2">Share Your Link</h4>
                  <p className="text-sm text-gray-600">Send your referral link to friends and colleagues</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-green-600 font-bold">2</span>
                  </div>
                  <h4 className="font-semibold mb-2">They Purchase</h4>
                  <p className="text-sm text-gray-600">When they buy our services, you earn commission</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-purple-600 font-bold">3</span>
                  </div>
                  <h4 className="font-semibold mb-2">Get Paid</h4>
                  <p className="text-sm text-gray-600">Request withdrawals once you reach the minimum amount</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Start Earning with Referrals</CardTitle>
            <CardDescription>
              Generate your unique referral code and start earning commissions on every successful referral!
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="space-y-4">
              <div className="text-6xl">💰</div>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Share your referral link with friends and earn money when they purchase our services.
              </p>
              <Button
                onClick={() => generateCodeMutation.mutate()}
                disabled={generateCodeMutation.isPending}
                size="lg"
              >
                {generateCodeMutation.isPending ? "Generating..." : "Generate My Referral Code"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}