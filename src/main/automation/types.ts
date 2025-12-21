export interface AutomationProfile {
  id: string;
  name: string;
  imagePath?: string | null;
  message?: string;
  sessionDir?: string;
  sendLimit?: number;
  thumbnail?: string | null;
  isAdmin?: boolean;
}

export interface AutomationRunResult {
  message: string;
  status?: 'idle' | 'running';
}

export type ValidatedAutomationProfile = AutomationProfile & {
  message: string;
  sessionDir: string;
  sendLimit: number;
};
