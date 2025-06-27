
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, Play, Pause, Calendar, User } from 'lucide-react';

interface ProjectTimerProps {
  project: any;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "not_started":
      return "bg-slate-500";
    case "active":
      return "bg-green-500";
    case "paused":
      return "bg-yellow-500";
    case "completed":
      return "bg-blue-500";
    default:
      return "bg-slate-500";
  }
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case "active":
      return "default";
    case "completed":
      return "secondary";
    case "paused":
      return "outline";
    default:
      return "outline";
  }
};

const parseProjectData = (project: any) => {
  // If project is already a proper project object, return as is
  if (project.projectName && project.status && !project.contactInfo) {
    return project;
  }

  // Handle raw JSON data from orders
  let parsedData = project;
  
  // If the data is a string, try to parse it
  if (typeof project === 'string') {
    try {
      parsedData = JSON.parse(project);
    } catch (error) {
      console.error('Failed to parse project data:', error);
      return null;
    }
  }

  // Check if this is raw order data that needs conversion
  if (parsedData.contactInfo || parsedData.projectDetails) {
    const contactInfo = parsedData.contactInfo || {};
    const projectDetails = parsedData.projectDetails || {};
    const selectedAddOns = parsedData.selectedAddOns || [];
    
    // Create a proper project object from order data
    return {
      id: parsedData.id || 'temp-' + Date.now(),
      projectName: `${contactInfo.fullName || 'Client'} - ${projectDetails.description?.substring(0, 50) || 'Custom Service'}...`,
      status: "active",
      progressPercentage: 25, // Default to 25% for new projects
      currentStage: "discovery",
      timelineWeeks: parsedData.timeline || "4 weeks",
      createdAt: parsedData.createdAt || new Date().toISOString(),
      dueDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(), // 4 weeks from now
      contactInfo: contactInfo,
      projectDetails: projectDetails,
      selectedAddOns: selectedAddOns,
      timeline: parsedData.timeline || "4 weeks",
      paymentMethod: parsedData.paymentMethod || "Paystack",
      clientName: contactInfo.fullName || 'Client',
      clientEmail: contactInfo.email || '',
      clientPhone: contactInfo.phone || '',
      companyName: contactInfo.company || '',
      description: projectDetails.description || 'Project in progress'
    };
  }

  // If it's already a proper project object, return as is
  return parsedData;
};

export default function ProjectTimer({ project: rawProject }: ProjectTimerProps) {
  const [timeSpent, setTimeSpent] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const project = parseProjectData(rawProject);

  if (!project) {
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="text-center text-slate-500">
            <p>Unable to load project data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold line-clamp-2">
            {project.projectName}
          </CardTitle>
          <Badge variant={getStatusVariant(project.status)}>
            <div className={`w-2 h-2 rounded-full ${getStatusColor(project.status)} mr-2`} />
            {project.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Client Information */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <User className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Client Details</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-blue-800 font-medium">
                {project.clientName}
              </p>
              <p className="text-xs text-blue-600">{project.clientEmail}</p>
              {project.clientPhone && (
                <p className="text-xs text-blue-600">{project.clientPhone}</p>
              )}
              {project.companyName && (
                <p className="text-xs text-blue-600">{project.companyName}</p>
              )}
            </div>
          </div>

          {/* Project Description */}
          {project.description && (
            <div>
              <h4 className="font-medium text-slate-900 mb-1">Project Description</h4>
              <p className="text-sm text-slate-600">{project.description}</p>
            </div>
          )}

          {/* Add-ons */}
          {project.selectedAddOns && project.selectedAddOns.length > 0 && (
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Selected Add-ons</h4>
              <div className="flex flex-wrap gap-1">
                {project.selectedAddOns.map((addon: any, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {typeof addon === 'string' ? addon : addon.name || addon}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>Project Progress</span>
              <span>{project.progressPercentage || 0}%</span>
            </div>
            <Progress value={project.progressPercentage || 0} className="h-2" />
          </div>

          {/* Time Progress */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium">Time Progress</span>
            </div>
            <div className="text-sm text-slate-600">{project.progressPercentage || 0}%</div>
          </div>

          {/* Project Timeline Info */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-slate-500">Started</p>
              <p className="text-sm font-medium">
                {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Timeline</p>
              <p className="text-sm font-medium">{project.timeline || project.timelineWeeks}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Due Date</p>
              <p className="text-sm font-medium">
                {new Date(project.dueDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Time Remaining Countdown */}
          <div className="bg-slate-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium">Time Remaining</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-slate-900">27</p>
                <p className="text-xs text-slate-500">Days</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">23</p>
                <p className="text-xs text-slate-500">Hours</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">50</p>
                <p className="text-xs text-slate-500">Minutes</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">44</p>
                <p className="text-xs text-slate-500">Seconds</p>
              </div>
            </div>
          </div>

          {/* Project Stats */}
          <div className="text-xs text-slate-500 pt-2 border-t">
            Timeline: {project.timeline || project.timelineWeeks} | Created: {new Date(project.createdAt).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
