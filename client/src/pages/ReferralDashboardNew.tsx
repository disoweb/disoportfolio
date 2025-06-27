import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, DollarSign, Users, TrendingUp, Wallet, Calendar, Eye, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ReferralDashboardNew() {
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
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleWithdrawalClick = (withdrawal: any) => {
    setSelectedWithdrawal(withdrawal);
    setIsDetailModalOpen(true);
  };

  if (isReferralLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
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
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <h1 className="text-2xl md:text-3xl font-bold">Referral Dashboard</h1>
        <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
          {referralData?.referralCode && (
            <Button 
              variant={parseFloat(referralData?.earnings?.availableBalance || "0") > 0 ? "default" : "secondary"}
              className="w-full md:w-auto"
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
              className="w-full md:w-auto"
            >
              {generateCodeMutation.isPending ? "Generating..." : "Generate Referral Code"}
            </Button>
          )}
        </div>
      </div>

      {referralData?.referralCode ? (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(referralData?.earnings?.availableBalance || "0")}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 w-full"
                  onClick={() => setIsWithdrawalModalOpen(true)}
                  disabled={parseFloat(referralData?.earnings?.availableBalance || "0") === 0}
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  {parseFloat(referralData?.earnings?.availableBalance || "0") > 0 ? "Withdraw Funds" : "No Funds Available"}
                </Button>
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

          {/* Withdrawal History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Withdrawal History
              </CardTitle>
              <CardDescription>
                Track your withdrawal requests and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isHistoryLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : withdrawalHistory && withdrawalHistory.length > 0 ? (
                <div className="space-y-3">
                  {withdrawalHistory.map((withdrawal: any) => (
                    <div
                      key={withdrawal.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleWithdrawalClick(withdrawal)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Wallet className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(withdrawal.amount)}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(withdrawal.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(withdrawal.status)}`}
                        >
                          {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                        </span>
                        <Eye className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Wallet className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p>No withdrawal requests yet</p>
                  <p className="text-sm">Your withdrawal history will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      {/* Modern Withdrawal Modal */}
      <Dialog open={isWithdrawalModalOpen} onOpenChange={setIsWithdrawalModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Request Withdrawal
            </DialogTitle>
            <DialogDescription>
              Submit a withdrawal request for your available earnings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Balance Display */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-900">Available Balance</span>
                <span className="text-xl font-bold text-blue-900">
                  {formatCurrency(referralData?.earnings?.availableBalance || "0")}
                </span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                Minimum withdrawal: ${referralData?.settings?.minimumWithdrawal || "50"}
              </p>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="withdrawal-amount" className="text-sm font-medium">
                Withdrawal Amount
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="withdrawal-amount"
                  type="number"
                  placeholder="0.00"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  className="pl-8"
                  max={referralData?.earnings?.availableBalance || "0"}
                />
              </div>
            </div>

            {/* Payment Details */}
            <div className="space-y-2">
              <Label htmlFor="payment-details" className="text-sm font-medium">
                Payment Details
              </Label>
              <Textarea
                id="payment-details"
                placeholder="Enter your payment information:&#10;• Bank account details&#10;• PayPal email&#10;• Mobile money number&#10;• etc."
                value={paymentDetails}
                onChange={(e) => setPaymentDetails(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Submit Button */}
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
              {withdrawalMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                "Submit Withdrawal Request"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Withdrawal Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Amount</p>
                  <p className="text-lg font-semibold">{formatCurrency(selectedWithdrawal.amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedWithdrawal.status)}`}
                  >
                    {selectedWithdrawal.status.charAt(0).toUpperCase() + selectedWithdrawal.status.slice(1)}
                  </span>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Requested On</p>
                <p className="text-sm">{formatDate(selectedWithdrawal.createdAt)}</p>
              </div>

              {selectedWithdrawal.paymentDetails && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Payment Details</p>
                  <div className="mt-1 p-3 bg-gray-50 rounded text-sm font-mono whitespace-pre-wrap">
                    {typeof selectedWithdrawal.paymentDetails === 'string' 
                      ? selectedWithdrawal.paymentDetails 
                      : JSON.stringify(selectedWithdrawal.paymentDetails, null, 2)}
                  </div>
                </div>
              )}

              {selectedWithdrawal.adminNotes && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Admin Notes</p>
                  <p className="text-sm mt-1 p-3 bg-yellow-50 rounded border border-yellow-200">
                    {selectedWithdrawal.adminNotes}
                  </p>
                </div>
              )}

              {selectedWithdrawal.processedAt && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Processed On</p>
                  <p className="text-sm">{formatDate(selectedWithdrawal.processedAt)}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}