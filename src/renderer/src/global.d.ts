// TypeScript declarations for Electron preload bridges
import type { Message } from './pages/whatsapp/components/MessageManager';
import type { Profile } from './components/profile/ProfileCard';

type AsyncResult<T = any> = Promise<T>;

type IpcSuccess<T = {}> = { success: true } & T;
type IpcError<T = {}> = { success: false; error?: string } & T;
type IpcResult<T = {}> = IpcSuccess<T> | IpcError;

interface AutomationAPI {
  getProfiles: () => AsyncResult<Profile[]>;
  start: (profileId: string) => AsyncResult<any>;
  stop: () => AsyncResult<any>;
  onLog: (handler: (payload: any) => void) => void;
  removeLogListener: () => void;
  onStatus: (handler: (payload: any) => void) => void;
  removeStatusListener: () => void;
}

interface MessagesAPI {
  get: (profileId: string) => AsyncResult<Message[] | IpcResult<{ messages?: Message[] }>>;
  add: (profileId: string, text: string, imagePath?: string) => AsyncResult<IpcResult<{ messageId?: string }> | any>;
  update: (messageId: string, text: string, imagePath?: string) => AsyncResult<IpcResult<{ updated?: boolean }> | any>;
  delete: (messageId: string) => AsyncResult<IpcResult<{ deleted?: boolean }> | any>;
  select: (messageId: string) => AsyncResult<IpcResult<{ selected?: boolean }> | any>;
}

interface ProfileAPI {
  getProfiles: () => AsyncResult<Profile[]>;
  create: (profile: any) => AsyncResult<IpcResult>;
  getSettings: (profileId: string) => AsyncResult<IpcResult<{ send_limit?: number }> | any>;
  updateSendLimit: (profileId: string, sendLimit: number) => AsyncResult<IpcResult<{ updated?: boolean }> | any>;
  update: (profileId: string, updates: any) => AsyncResult<IpcResult<{ updated?: boolean }> | any>;
}

interface ServicesAPI {
  list: () => AsyncResult<any>;
}

interface RtaAPI {
  generate: (data: any) => AsyncResult<any>;
}

interface TrelloAPI {
  authCheck: () => AsyncResult<IpcResult<{ authenticated?: boolean }>>;
  createCard: (payload: any) => AsyncResult<IpcResult<{ card?: any }>>;
  decodeVin: (vin: string) => AsyncResult<IpcResult<{ data?: { year?: string; make?: string; model?: string } | null }>>;
}

interface PriceAPI {
  listQuotes: () => AsyncResult<IpcResult<{ quotes?: any[] }> | any>;
  getQuote: (id: string) => AsyncResult<IpcResult<{ quote?: any }> | any>;
  deleteQuote: (id: string) => AsyncResult<IpcResult<{ deleted?: boolean }> | any>;
  upsertQuote: (entry: any) => AsyncResult<IpcResult<{ quote?: any }> | any>;
  generate: (payload: any) => AsyncResult<IpcResult<{ result?: any }> | any>;
}

interface QuotesAPI {
  runAutomation: (payload: any) => AsyncResult<IpcResult<{ result?: any }> | any>;
}

interface FileSystemAPI {
  selectImage: () => AsyncResult<{ success: boolean; path?: string; error?: string }>;
}

interface FilesAPI {
  saveToDownloads: (srcPath: string, suggestedName?: string) => AsyncResult<any>;
  showInFolder: (targetPath: string) => AsyncResult<any>;
  openPath: (targetPath: string) => AsyncResult<any>;
  selectImage: () => AsyncResult<{ success: boolean; path?: string; error?: string }>;
}

declare global {
  interface Window {
    automation?: AutomationAPI;
    messages?: MessagesAPI;
    profile?: ProfileAPI;
    services?: ServicesAPI;
    rta?: RtaAPI;
    trello?: TrelloAPI;
    price?: PriceAPI;
    quotes?: QuotesAPI;
    fileSystem?: FileSystemAPI;
    files?: FilesAPI;
    lastGeneratedPricePath?: string;
  }
}

export {};