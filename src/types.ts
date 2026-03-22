export interface UserProfile {
  uid: string;
  email: string;
  generationCount: number;
  isPremium: boolean;
  createdAt: any;
  lastResetAt?: any;
}

export interface ChartData {
  name: string;
  value: number;
}

export interface StudySection {
  title: string;
  content: string;
  chart?: {
    type: 'bar' | 'line' | 'pie';
    data: ChartData[];
    title: string;
  };
  imagePrompt?: string;
  imageUrl?: string;
}

export interface StudyGuide {
  id?: string;
  uid: string;
  topic: string;
  sections: StudySection[];
  createdAt: any;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  photoURL?: string;
  score: number;
  quizTitle: string;
  createdAt: any;
}

export interface PaymentRequest {
  id?: string;
  uid: string;
  email: string;
  planName: string;
  amount: number;
  status: 'pending' | 'verified' | 'rejected';
  createdAt: any;
}

export interface AdminConfig {
  passwordHash: string;
  email: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
