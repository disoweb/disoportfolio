import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const quoteSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  company: z.string().optional(),
  projectType: z.string().min(1, "Project type is required"),
  budgetRange: z.string().min(1, "Budget range is required"),
  timeline: z.string().min(1, "Timeline is required"),
  description: z.string().min(50, "Description must be at least 50 characters"),
  features: z.array(z.string()).optional(),
  preferredStartDate: z.string().optional(),
});

type QuoteForm = z.infer<typeof quoteSchema>;

interface CustomQuoteFormProps {
  onClose: () => void;
}

const projectTypes = [
  { value: "website", label: "Business Website" },
  { value: "ecommerce", label: "E-commerce Platform" },
  { value: "webapp", label: "Web Application" },
  { value: "redesign", label: "Website Redesign" },
  { value: "mobile", label: "Mobile App" },
  { value: "other", label: "Other" },
];

const budgetRanges = [
  { value: "5k-10k", label: "$5,000 - $10,000" },
  { value: "10k-25k", label: "$10,000 - $25,000" },
  { value: "25k-50k", label: "$25,000 - $50,000" },
  { value: "50k+", label: "$50,000+" },
];

const timelines = [
  { value: "asap", label: "ASAP (Rush project)" },
  { value: "1-2months", label: "1-2 months" },
  { value: "3-4months", label: "3-4 months" },
  { value: "6months+", label: "6+ months" },
];

const availableFeatures = [
  "E-commerce Integration",
  "User Authentication",
  "Payment Processing",
  "Content Management System",
  "API Integrations",
  "Mobile App",
  "Multi-language Support",
  "Advanced Analytics",
  "Custom Dashboard",
  "Third-party Integrations",
];

export default function CustomQuoteForm({ onClose }: CustomQuoteFormProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<QuoteForm>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      features: [],
    },
  });

  const selectedFeatures = watch("features") || [];

  const quoteMutation = useMutation({
    mutationFn: async (data: QuoteForm) => {
      return apiRequest("POST", "/api/quote-request", data);
    },
    onSuccess: () => {
      toast({
        title: "Quote request submitted!",
        description: "We'll review your requirements and get back to you within 24 hours.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error submitting quote request",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: QuoteForm) => {
    quoteMutation.mutate(data);
  };

  const handleFeatureChange = (feature: string, checked: boolean) => {
    const currentFeatures = selectedFeatures;
    if (checked) {
      setValue("features", [...currentFeatures, feature]);
    } else {
      setValue("features", currentFeatures.filter((f) => f !== feature));
    }
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-center">
          Request Custom Quote
        </CardTitle>
        <p className="text-slate-600 text-center">
          Tell us about your project requirements and we'll provide a detailed proposal
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name *
                </label>
                <Input
                  {...register("fullName")}
                  placeholder="John Smith"
                  className={errors.fullName ? "border-red-500" : ""}
                />
                {errors.fullName && (
                  <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address *
                </label>
                <Input
                  {...register("email")}
                  type="email"
                  placeholder="john@company.com"
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone Number
                </label>
                <Input
                  {...register("phone")}
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company
                </label>
                <Input
                  {...register("company")}
                  placeholder="Your Company"
                />
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Project Details</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Project Type *
                </label>
                <Select onValueChange={(value) => setValue("projectType", value)}>
                  <SelectTrigger className={errors.projectType ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.projectType && (
                  <p className="text-red-500 text-sm mt-1">{errors.projectType.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Budget Range *
                </label>
                <Select onValueChange={(value) => setValue("budgetRange", value)}>
                  <SelectTrigger className={errors.budgetRange ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select budget range" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetRanges.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.budgetRange && (
                  <p className="text-red-500 text-sm mt-1">{errors.budgetRange.message}</p>
                )}
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Timeline *
                </label>
                <Select onValueChange={(value) => setValue("timeline", value)}>
                  <SelectTrigger className={errors.timeline ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {timelines.map((timeline) => (
                      <SelectItem key={timeline.value} value={timeline.value}>
                        {timeline.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.timeline && (
                  <p className="text-red-500 text-sm mt-1">{errors.timeline.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Preferred Start Date
                </label>
                <Input
                  {...register("preferredStartDate")}
                  type="date"
                />
              </div>
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-4">
              Required Features (Select all that apply)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableFeatures.map((feature) => (
                <label key={feature} className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedFeatures.includes(feature)}
                    onCheckedChange={(checked) => 
                      handleFeatureChange(feature, checked as boolean)
                    }
                  />
                  <span className="text-sm">{feature}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Project Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Project Description *
            </label>
            <Textarea
              {...register("description")}
              rows={6}
              placeholder="Please describe your project in detail, including goals, target audience, specific requirements, and any inspiration websites..."
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={quoteMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {quoteMutation.isPending ? "Submitting..." : "Submit Quote Request"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
