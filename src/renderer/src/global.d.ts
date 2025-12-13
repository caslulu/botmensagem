// TypeScript declarations for Electron preload APIs
import type { Message } from './components/MessageManager';

declare global {
  interface Window {
    automation?: {
      onLog: (handler: (payload: any) => void) => void;
      start: (profileId: string) => Promise<any>;
      stop: () => Promise<any>;
    };
    messages?: {
      get: (profileId: string) => Promise<Message[]>;
      select: (id: string) => Promise<void>;
    };
    trello?: {
      authCheck?: () => Promise<any>;
      createCard?: (payload: any) => Promise<any>;
      decodeVin?: (vin: string) => Promise<{
        success: boolean;
        data?: { year?: string; make?: string; model?: string } | null;
        error?: string;
      }>;
    };
  }
}

export {};