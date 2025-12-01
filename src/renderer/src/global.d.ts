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
  }
}

export {};