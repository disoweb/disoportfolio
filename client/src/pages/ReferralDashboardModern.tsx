import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Copy, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Wallet, 
  Calendar, 
  Eye, 
  Clock,
  Share2,
  Gift,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { apiRequest } from "@/lib/queryClient";

export default function ReferralDashboardModern() {
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
        description: "Your withdrawal request has been submitted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit withdrawal request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const copyReferralCode = () => {
    const referralUrl = getReferralUrl();
    navigator.clipboard.writeText(referralUrl);
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard",
    });
  };

  const getReferralUrl = () => {
    if (!referralData?.referralCode) return "";
    const baseUrl = referralData?.settings?.baseUrl || window.location.origin;
    return `${baseUrl}?ref=${referralData.referralCode}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  if (isReferralLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <main className="container mx-auto px-4 py-6 mt-16 max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-md w-64"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <main className="container mx-auto px-4 py-6 mt-16 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                Referral Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base">
                Earn money by sharing DiSO Webs with your network
              </p>
            </div>
            
            {referralData?.referralCode ? (
              <Button
                onClick={() => setIsWithdrawalModalOpen(true)}
                disabled={parseFloat(referralData?.earnings?.availableBalance || "0") <= 0}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Request Withdrawal
              </Button>
            ) : (
              <Button
                onClick={() => generateCodeMutation.mutate()}
                disabled={generateCodeMutation.isPending}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {generateCodeMutation.isPending ? "Generating..." : "Get Started"}
              </Button>
            )}
          </div>
        </div>

        {!referralData?.referralCode ? (
          /* Getting Started Section */
          <Card className="border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
            <CardContent className="p-6 sm:p-8 text-center">
              <div className="space-y-6">
                <div className="text-4xl sm:text-6xl">🎯</div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-3 text-gray-900 dark:text-white">Start Your Referral Journey</h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
                    Generate your unique referral code and earn {referralData?.settings?.commissionPercentage || "10"}% commission 
                    on every successful referral. Share with friends, family, and your network!
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center text-sm">
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Gift className="h-5 w-5 mr-2 text-blue-600" />
                    Easy sharing
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
                    Instant earnings
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Users className="h-5 w-5 mr-2 text-blue-600" />
                    Unlimited referrals
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm font-medium">Available Balance</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                        ₦{parseFloat(referralData?.earnings?.availableBalance || "0").toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-2 sm:p-3 rounded-full">
                      <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm font-medium">Total Earned</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                        ₦{parseFloat(referralData?.earnings?.totalEarned || "0").toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 sm:p-3 rounded-full">
                      <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm font-medium">Total Referrals</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                        {referralData?.earnings?.totalReferrals || 0}
                      </p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-2 sm:p-3 rounded-full">
                      <Users className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm font-medium">Successful</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                        {referralData?.earnings?.successfulReferrals || 0}
                      </p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-2 sm:p-3 rounded-full">
                      <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Referral Link Card */}
              <Card className="border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-lg sm:text-xl text-gray-900 dark:text-white">
                    <Share2 className="h-5 w-5 mr-2 text-blue-600" />
                    Your Referral Link
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                    Share this link to earn {referralData?.settings?.commissionPercentage || "10"}% commission
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={getReferralUrl()}
                      readOnly
                      className="flex-1 text-xs sm:text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyReferralCode}
                      className="px-3"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-600 p-2 rounded-full flex-shrink-0">
                        <Gift className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-900 dark:text-blue-300 text-sm">
                          Your Code: {referralData.referralCode}
                        </h4>
                        <p className="text-blue-700 dark:text-blue-400 text-xs mt-1 leading-relaxed">
                          When someone uses this code or link to purchase our services, 
                          you'll earn {referralData?.settings?.commissionPercentage || "10"}% commission instantly!
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-lg sm:text-xl text-gray-900 dark:text-white">
                    <Clock className="h-5 w-5 mr-2 text-blue-600" />
                    Recent Referrals
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                    Your latest referral activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {referralData?.referrals && referralData.referrals.length > 0 ? (
                    <div className="space-y-3">
                      {referralData.referrals.slice(0, 3).map((referral: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-3">
                            <div className="bg-green-600 p-2 rounded-full">
                              <DollarSign className="h-3 w-3 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-gray-900 dark:text-white">₦{parseFloat(referral.commissionAmount).toLocaleString()}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(referral.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge className={`text-xs ${getStatusColor(referral.status)}`}>
                            {referral.status}
                          </Badge>
                        </div>
                      ))}
                      {referralData.referrals.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">No referrals yet</p>
                          <p className="text-xs">Start sharing your link to see activity here</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No referrals yet</p>
                      <p className="text-xs">Start sharing your link to see activity here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Withdrawal History */}
            <Card className="border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg sm:text-xl text-gray-900 dark:text-white">
                  <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
                  Withdrawal History
                </CardTitle>
                <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                  Track your withdrawal requests and payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isHistoryLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                ) : withdrawalHistory && withdrawalHistory.length > 0 ? (
                  <div className="space-y-3">
                    {withdrawalHistory.map((withdrawal: any) => (
                      <div key={withdrawal.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="bg-blue-600 p-2 rounded-full flex-shrink-0">
                            <Wallet className="h-4 w-4 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm text-gray-900 dark:text-white">₦{parseFloat(withdrawal.amount).toLocaleString()}</p>
                              <Badge className={`text-xs ${getStatusColor(withdrawal.status)}`}>
                                {withdrawal.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {new Date(withdrawal.createdAt).toLocaleDateString()} • {withdrawal.paymentMethod}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedWithdrawal(withdrawal);
                            setIsDetailModalOpen(true);
                          }}
                          className="ml-2 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No withdrawals yet</p>
                    <p className="text-xs">Request your first withdrawal when you have earnings</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Withdrawal Request Modal */}
      <Dialog open={isWithdrawalModalOpen} onOpenChange={setIsWithdrawalModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
            <DialogDescription>
              Available balance: ₦{parseFloat(referralData?.earnings?.availableBalance || "0").toLocaleString()}
              <br />
              Minimum withdrawal: ₦{parseFloat(referralData?.settings?.minimumWithdrawal || "50").toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount (₦)</Label>
              <Input
                id="amount"
                type="number"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                placeholder="Enter amount to withdraw"
                min={referralData?.settings?.minimumWithdrawal || 50}
                max={parseFloat(referralData?.earnings?.availableBalance || "0")}
              />
            </div>
            <div>
              <Label htmlFor="payment-details">Payment Details</Label>
              <Textarea
                id="payment-details"
                value={paymentDetails}
                onChange={(e) => setPaymentDetails(e.target.value)}
                placeholder="Enter your bank account details or preferred payment method"
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsWithdrawalModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => withdrawalMutation.mutate()}
                disabled={
                  withdrawalMutation.isPending ||
                  !withdrawalAmount ||
                  !paymentDetails ||
                  parseFloat(withdrawalAmount) < parseFloat(referralData?.settings?.minimumWithdrawal || "50") ||
                  parseFloat(withdrawalAmount) > parseFloat(referralData?.earnings?.availableBalance || "0")
                }
                className="flex-1"
              >
                {withdrawalMutation.isPending ? "Requesting..." : "Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Withdrawal Details</DialogTitle>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Amount</p>
                  <p className="font-medium">₦{parseFloat(selectedWithdrawal.amount).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <Badge className={getStatusColor(selectedWithdrawal.status)}>
                    {selectedWithdrawal.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-gray-500">Requested</p>
                  <p className="font-medium">{new Date(selectedWithdrawal.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Method</p>
                  <p className="font-medium">{selectedWithdrawal.paymentMethod}</p>
                </div>
              </div>
              {selectedWithdrawal.paymentDetails && (
                <div>
                  <p className="text-gray-500 text-sm mb-2">Payment Details</p>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm">
                    {selectedWithdrawal.paymentDetails}
                  </div>
                </div>
              )}
              {selectedWithdrawal.adminNotes && (
                <div>
                  <p className="text-gray-500 text-sm mb-2">Admin Notes</p>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm">
                    {selectedWithdrawal.adminNotes}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}