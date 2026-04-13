export type UserRole = 'admin' | 'manager' | 'employee';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  storeId?: string; // Optional for global admins, required for store employees
  createdAt: string;
}

export interface Store {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface CampaignReport {
  id: string;
  storeId: string;
  employeeId: string;
  employeeName: string;
  campaignDate: string;
  campaignName: string;
  purchases: number;
  costPerPurchase: number;
  confirmed: number;
  canceled: number;
  pending: number;
  // Calculated fields
  totalSpend: number;
  netOrders: number;
  cancellationRate: number;
  confirmationRate: number;
  performanceScore: number;
  createdAt: string;
}

export interface PerformanceAnalytics {
  storeId: string;
  period: string; // e.g., '2024-W14'
  totalSpend: number;
  totalConfirmed: number;
  totalCanceled: number;
  netPerformance: number;
  avgCancellationRate: number;
  bestCampaign: string;
  worstCampaign: string;
}
