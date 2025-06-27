import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Calendar, User, Building, CheckCircle, AlertCircle } from 'lucide-react';
import ExpandableText from './ExpandableText';

interface ProjectTimerProps {
  project: any;
}

export default function ProjectTimer({ project }: ProjectTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  const [timeProgress, setTimeProgress] = useState(0);

  // Use parsed data from database
  const projectData = project || {};
  const contactInfo = project.contactInfo || {};
  const projectDetails = project.projectDetails || {};

  // Remove debugging code for production

  // Extract meaningful project information
  const getProjectInfo = () => {
    const now = new Date();

    // Use actual project dates from database
    const startDate = projectData.startDate ? new Date(projectData.startDate) : 
                     projectData.createdAt ? new Date(projectData.createdAt) : now;

    const dueDate = projectData.dueDate ? new Date(projectData.dueDate) : 
                   new Date(startDate.getTime() + (projectData.timelineDays || 28) * 24 * 60 * 60 * 1000);

    // Calculate actual time remaining
    const timeLeft = Math.max(0, dueDate.getTime() - now.getTime());
    const totalDuration = dueDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();

    // Extract service name from order data properly
    const getServiceName = () => {
      // First try the order's service name
      if (projectData.order?.serviceName) {
        return projectData.order.serviceName;
      }
      
      // Try custom request first line
      if (projectData.order?.customRequest) {
        // Handle if customRequest is a JSON string
        let customRequest = projectData.order.customRequest;
        if (typeof customRequest === 'string' && customRequest.startsWith('{')) {
          try {
            const parsed = JSON.parse(customRequest);
            customRequest = parsed.description || parsed.projectType || customRequest;
          } catch (e) {
            // If parsing fails, use as is
          }
        }
        
        const firstLine = customRequest.split('.')[0].trim();
        if (firstLine && firstLine.length > 0 && !firstLine.startsWith('{')) {
          return firstLine;
        }
      }
      
      // Try project name if it exists and isn't a generic format or JSON
      if (projectData.projectName && 
          !projectData.projectName.includes(' - Project') && 
          !projectData.projectName.startsWith('{')) {
        return projectData.projectName;
      }
      
      // Try to extract from projectDetails
      if (projectDetails.projectType && typeof projectDetails.projectType === 'string') {
        return projectDetails.projectType;
      }
      
      // If we have service ID from order, format it nicely
      if (projectData.order?.serviceId) {
        const serviceId = projectData.order.serviceId;
        // Convert service IDs like 'landing-page' to 'Landing Page'
        return serviceId.split('-').map((word: string) => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
      }
      
      // Fallback to a generic name
      return 'Custom Project';
    };

    return {
      id: projectData.id || 'unknown',
      projectName: getServiceName(),
      status: projectData.status || 'active',
      progressPercentage: projectData.progressPercentage || Math.min(95, Math.max(5, Math.floor((elapsed / totalDuration) * 100))),
      currentStage: projectData.currentStage || 'In Progress',
      startDate,
      dueDate,
      timeLeft,
      totalDuration,
      elapsed,
      clientName: contactInfo.fullName || 
                  (projectData.user?.firstName && projectData.user?.lastName 
                    ? `${projectData.user.firstName} ${projectData.user.lastName}` 
                    : projectData.user?.email || 'Client'),
      clientEmail: contactInfo.email || projectData.user?.email || '',
      projectDescription: projectDetails.description || projectData.notes || 'Project in progress',
      timelineWeeks: projectData.timelineWeeks || 4
    };
  };

  const info = getProjectInfo();

  // Helper function to format dates with 2-digit years
  const formatShortDate = (date: Date) => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${month}/${day}/${year}`;
  };

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const timeLeft = Math.max(0, info.dueDate.getTime() - new Date().getTime());

      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });

      // Calculate time progress based on actual dates
      const progress = Math.min(100, Math.max(0, (info.elapsed / info.totalDuration) * 100));
      setTimeProgress(progress);
    };

    calculateTimeRemaining();
    const timer = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(timer);
  }, [info.dueDate, info.elapsed, info.totalDuration]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold truncate">
            {info.projectName}
          </CardTitle>
          <Badge className={getStatusColor(info.status)}>
            {info.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Client Details */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2">
            <User className="h-4 w-4" />
            <span>Client Details</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900">{info.clientName}</div>
                {info.clientEmail && (
                  <div className="text-xs text-gray-600 mt-1">{info.clientEmail}</div>
                )}
              </div>
            </div>
            
            {info.projectDescription && (
              <div className="flex items-start gap-3">
                <Building className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-500 mb-1">Service Details:</div>
                  <ExpandableText 
                    text={info.projectDescription}
                    maxLength={120}
                    className=""
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Progress Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2">
            <CheckCircle className="h-4 w-4" />
            <span>Project Progress</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Completion</span>
              <span className="font-semibold text-blue-600">{info.progressPercentage}%</span>
            </div>
            <Progress value={info.progressPercentage} className="h-3" />
            
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Time Progress</span>
              </div>
              <span className="font-semibold text-orange-600">{Math.round(timeProgress)}%</span>
            </div>
            <Progress value={timeProgress} className="h-3" />
          </div>
        </div>

        {/* Timeline Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-3">
            <Calendar className="h-4 w-4" />
            <span>Timeline</span>
          </div>
          
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-xs text-gray-500 mb-1">Started</div>
              <div className="text-xs font-medium text-gray-900">
                {formatShortDate(info.startDate)}
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-2">
              <div className="text-xs text-blue-600 mb-1">Duration</div>
              <div className="text-xs font-medium text-blue-900">{info.timelineWeeks} Wks</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-2">
              <div className="text-xs text-orange-600 mb-1">Due Date</div>
              <div className="text-xs font-medium text-orange-900">
                {formatShortDate(info.dueDate)}
              </div>
            </div>
          </div>
        </div>

        {/* Countdown Timer */}
        <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-700 border-b border-red-200 pb-2 mb-3">
            <Clock className="h-4 w-4" />
            <span>Time Remaining</span>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 shadow-sm">
              <div className="text-xl font-bold text-red-600">{timeRemaining.days}</div>
              <div className="text-xs text-red-500 font-medium">Days</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 shadow-sm">
              <div className="text-xl font-bold text-orange-600">{timeRemaining.hours}</div>
              <div className="text-xs text-orange-500 font-medium">Hrs</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 shadow-sm">
              <div className="text-xl font-bold text-amber-600">{timeRemaining.minutes}</div>
              <div className="text-xs text-amber-500 font-medium">Mins</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 shadow-sm">
              <div className="text-xl font-bold text-yellow-600">{timeRemaining.seconds}</div>
              <div className="text-xs text-yellow-500 font-medium">Sec</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}