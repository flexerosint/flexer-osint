
export interface UserProfile {
  uid: string;
  email: string;
  isAdmin: boolean;
  isApproved: boolean;
  lastSessionId: string;
}

export interface OSINTTool {
  id: string;
  name: string;
  apiUrl: string;
  description: string;
  icon: string;
}

export interface LookupResult {
  toolId: string;
  timestamp: number;
  data: any;
  status: 'success' | 'error';
}

export const ADMIN_TELEGRAM = "flexer_admin_bot"; // Example ID
