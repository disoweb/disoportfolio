import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, CheckCircle, AlertCircle } from "lucide-react";

interface ProjectTimerProps {
  project: {
    id: string;
    projectName: string;
    status: string;
    startDate: string;
    dueDate: string;
    timelineWeeks: number;
    progressPercentage: number;
    createdAt: string;
  };
}

export default function ProjectTimer({ project }: ProjectTimerProps) {
  const [timeRemaining, setTimeRemaining] = React.useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isOverdue: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isOverdue: false });

  React.useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const endDate = new Date(project.dueDate);
      const timeDiff = endDate.getTime() - now.getTime();
      
      // Debug: Only log if there are different due dates
      if (project.projectName === "E-commerce Solution" || project.projectName?.includes("17:51:29")) {
        console.log(`Timer Debug - ${project.projectName}: Due ${project.dueDate}, Days: ${Math.floor(timeDiff / (1000 * 60 * 60 * 24))}`);
      }
      
      if (timeDiff <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, isOverdue: true });
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds, isOverdue: false });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000); // Update every second

    return () => clearInterval(interval);
  }, [project.dueDate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'default';
      case 'paused': return 'secondary';
      default: return 'outline';
    }
  };

  const startDate = new Date(project.startDate);
  const endDate = new Date(project.dueDate);
  const totalDuration = endDate.getTime() - startDate.getTime();
  const elapsed = new Date().getTime() - startDate.getTime();
  const timeProgress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold">{project.projectName}</CardTitle>
          <Badge variant={getStatusVariant(project.status)}>
            <div className={`w-2 h-2 rounded-full ${getStatusColor(project.status)} mr-2`} />
            {project.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress */}
          <div>
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>Project Progress</span>
              <span>{project.progressPercentage}%</span>
            </div>
            <Progress value={project.progressPercentage} className="h-2" />
          </div>

          {/* Time Progress with red indicator */}
          <div>
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>Time Progress</span>
              <span>{Math.round(timeProgress)}%</span>
            </div>
            <div className="relative">
              <Progress 
                value={timeProgress} 
                className={`h-3 ${timeRemaining.isOverdue ? 'bg-red-100' : ''}`}
              />
              {/* Red line indicator for current position */}
              <div 
                className="absolute top-0 h-3 w-1 bg-red-500 rounded-sm" 
                style={{ left: `${Math.min(timeProgress, 100)}%`, transform: 'translateX(-50%)' }}
              />
            </div>
          </div>

          {/* Timeline */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <div>
                <p className="text-slate-500">Started</p>
                <p className="font-medium">{startDate.toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <div>
                <p className="text-slate-500">Due Date</p>
                <p className="font-medium">{endDate.toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="bg-slate-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {timeRemaining.isOverdue ? (
                <AlertCircle className="h-4 w-4 text-red-500" />
              ) : (
                <Clock className="h-4 w-4 text-blue-500" />
              )}
              <span className="text-sm font-medium text-slate-700">
                {timeRemaining.isOverdue ? 'Overdue' : 'Time Remaining'}
              </span>
            </div>
            
            {timeRemaining.isOverdue ? (
              <p className="text-red-600 font-semibold">Project is overdue</p>
            ) : (
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-slate-900">{timeRemaining.days}</div>
                  <div className="text-xs text-slate-500">Days</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-slate-900">{timeRemaining.hours}</div>
                  <div className="text-xs text-slate-500">Hours</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-slate-900">{timeRemaining.minutes}</div>
                  <div className="text-xs text-slate-500">Minutes</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-slate-900">{timeRemaining.seconds}</div>
                  <div className="text-xs text-slate-500">Seconds</div>
                </div>
              </div>
            )}
          </div>

          {/* Project Stats */}
          <div className="text-xs text-slate-500 pt-2 border-t">
            Timeline: {project.timelineWeeks} weeks | 
            Created: {new Date(project.createdAt).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}