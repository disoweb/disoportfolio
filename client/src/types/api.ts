// API response types for proper TypeScript support
export interface Order {
  id: string;
  userId: string;
  serviceId?: string;
  customRequest?: string;
  totalPrice: string;
  status: 'pending' | 'paid' | 'in_progress' | 'complete' | 'cancelled';
  paymentId?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  orderId: string;
  userId: string;
  projectName?: string;
  currentStage?: string;
  notes?: string;
  startDate?: string;
  dueDate?: string;
  status: 'not_started' | 'active' | 'paused' | 'completed';
  timelineWeeks?: number;
  timelineDays?: number;
  progressPercentage?: number;
  createdAt: string;
}

export interface ClientStats {
  activeProjects: number;
  completedProjects: number;
  totalSpent: number;
  newMessages: number;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  priceUsd: string;
  price: number;
  duration: string;
  features: string[];
  category: string;
  industry: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}