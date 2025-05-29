import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, MessageSquare, FileText, ExternalLink } from "lucide-react";
import type { Project } from "@shared/schema";

interface ProjectCardProps {
  project: Project & {
    order?: {
      service?: {
        name: string;
      };
    };
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "not_started":
      return "bg-slate-100 text-slate-800";
    case "active":
      return "bg-blue-100 text-blue-800";
    case "paused":
      return "bg-yellow-100 text-yellow-800";
    case "completed":
      return "bg-green-100 text-green-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
};

const getStageColor = (stage: string) => {
  switch (stage.toLowerCase()) {
    case "discovery":
      return "text-blue-600";
    case "design":
      return "text-purple-600";
    case "development":
      return "text-orange-600";
    case "testing":
      return "text-yellow-600";
    case "launch":
      return "text-green-600";
    default:
      return "text-slate-600";
  }
};

const getProgressPercentage = (stage: string) => {
  const stages = ["discovery", "design", "development", "testing", "launch"];
  const currentStageIndex = stages.findIndex(s => s.toLowerCase() === stage.toLowerCase());
  return currentStageIndex >= 0 ? ((currentStageIndex + 1) / stages.length) * 100 : 0;
};

export default function ProjectCard({ project }: ProjectCardProps) {
  const progressPercentage = getProgressPercentage(project.currentStage || "discovery");
  const statusColor = getStatusColor(project.status || "not_started");
  const stageColor = getStageColor(project.currentStage || "discovery");

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "TBD";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-slate-900 mb-1">
              {project.projectName || "Untitled Project"}
            </CardTitle>
            <p className="text-sm text-slate-600">
              {project.order?.service?.name || "Custom Project"}
            </p>
          </div>
          <Badge className={statusColor}>
            {project.status?.replace("_", " ") || "Not Started"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">Progress</span>
            <span className="text-sm text-slate-600">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Project Stages */}
        <div className="flex items-center justify-between text-xs">
          {["Discovery", "Design", "Development", "Testing", "Launch"].map((stage, index) => {
            const isActive = stage.toLowerCase() === project.currentStage?.toLowerCase();
            const isCompleted = getProgressPercentage(stage) < progressPercentage;
            
            return (
              <div key={stage} className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full mb-1 ${
                    isCompleted
                      ? "bg-green-500"
                      : isActive
                      ? "bg-blue-500"
                      : "bg-slate-300"
                  }`}
                />
                <span
                  className={
                    isActive
                      ? "font-medium text-blue-600"
                      : isCompleted
                      ? "text-green-600"
                      : "text-slate-400"
                  }
                >
                  {stage}
                </span>
              </div>
            );
          })}
        </div>

        {/* Project Details */}
        <div className="flex justify-between items-center text-sm text-slate-600 pt-2 border-t">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            <span>Due: {formatDate(project.dueDate)}</span>
          </div>
          <div className="flex items-center">
            <span className="mr-1">Stage:</span>
            <span className={`font-medium ${stageColor}`}>
              {project.currentStage || "Discovery"}
            </span>
          </div>
        </div>

        {/* Notes */}
        {project.notes && (
          <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
            <strong>Notes:</strong> {project.notes}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1">
            <MessageSquare className="h-4 w-4 mr-2" />
            Messages
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <FileText className="h-4 w-4 mr-2" />
            Files
          </Button>
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
