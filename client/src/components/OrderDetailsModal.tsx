import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  CreditCard,
  FileText,
  MessageCircle,
  Copy,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OrderDetailsModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function OrderDetailsModal({ order, isOpen, onClose }: OrderDetailsModalProps) {
  const { toast } = useToast();

  const copyOrderId = () => {
    navigator.clipboard.writeText(order.id);
    toast({
      title: "Copied!",
      description: "Order ID copied to clipboard",
    });
  };

  const contactSupport = () => {
    const message = `Hi, I need help with my order: ${order.id}`;
    window.open(`https://wa.me/2348035653465?text=${encodeURIComponent(message)}`, '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'in_progress': return 'bg-blue-500';
      case 'complete': return 'bg-emerald-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'secondary';
      case 'in_progress': return 'outline';
      case 'complete': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  if (!order) return null;

  const serviceName = order.customRequest?.split('\n')[0]?.replace('Service: ', '') || 'Custom Service';
  const timeline = order.customRequest?.match(/Timeline: ([^\n]+)/)?.[1] || 'Not specified';
  const contactInfo = order.customRequest?.match(/Contact: ([^\n]+)/)?.[1] || 'Not provided';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Order Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status & Service */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900">{serviceName}</h3>
                <Badge variant={getStatusVariant(order.status)}>
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(order.status)} mr-2`} />
                  {order.status}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-green-600">
                ₦{(order.totalPrice || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          {/* Order Information */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Order ID
              </label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm bg-slate-100 px-2 py-1 rounded font-mono">
                  {order.id.slice(0, 8)}...{order.id.slice(-8)}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyOrderId}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Order Date
              </label>
              <p className="text-sm text-slate-900 mt-1">
                {new Date(order.createdAt).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            {timeline && (
              <div>
                <label className="text-sm font-medium text-slate-500">Timeline</label>
                <p className="text-sm text-slate-900 mt-1">{timeline}</p>
              </div>
            )}

            {contactInfo && (
              <div>
                <label className="text-sm font-medium text-slate-500">Contact Information</label>
                <p className="text-sm text-slate-900 mt-1">{contactInfo}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Full Request Details */}
          <div>
            <label className="text-sm font-medium text-slate-500 mb-2 block">
              Project Requirements
            </label>
            <div className="bg-slate-50 p-3 rounded-lg">
              <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
                {order.customRequest || 'No additional details provided'}
              </pre>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={contactSupport}
              className="flex-1 flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Contact Support
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}