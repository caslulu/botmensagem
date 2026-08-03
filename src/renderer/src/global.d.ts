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

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
}

interface DesktopAuthSession {
  authenticated?: boolean;
  expiresAt?: string;
  user?: AuthUser;
  profile?: Profile;
}

interface DesktopAuthAPI {
  login: (credentials: { email: string; password: string }) => AsyncResult<IpcResult<{ session?: DesktopAuthSession }>>;
  getSession: () => AsyncResult<IpcResult<{ session?: DesktopAuthSession }>>;
  logout: () => AsyncResult<IpcResult>;
  validateAdmin: (credentials: { email: string; password: string }) => AsyncResult<IpcResult<{ session?: DesktopAuthSession }>>;
}

interface DesktopWebApi {
  request: (payload: { method?: string; path: string; body?: unknown }) => AsyncResult<IpcResult<{ data?: any }>>;
}

interface ServicesAPI {
  list: () => AsyncResult<any>;
}

interface RtaAPI {
  generate: (data: any) => AsyncResult<any>;
}

interface PriceAPI {
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
  readImageAsDataUrl: (targetPath: string) => AsyncResult<IpcResult<{ dataUrl?: string }>>;
  selectImage: () => AsyncResult<{ success: boolean; path?: string; error?: string }>;
  selectImages: () => AsyncResult<{ success: boolean; paths?: string[]; error?: string }>;
}

interface SchedulerStatus {
  times: string[];
  instance: string;
  instance_state: string;
  image_path: string;
  image_exists: boolean;
  caption_preview: string;
  caption_length: number;
  log_tail: string;
  updated_at: string;
}

interface SchedulerImage {
  base64: string;
  mimetype: string;
  size: number;
}

interface SchedulerAPI {
  health: () => AsyncResult<IpcResult<{ ok: boolean }>>;
  getStatus: () => AsyncResult<IpcResult<{ status: SchedulerStatus }>>;
  getConfig: () => AsyncResult<IpcResult<{ config: { times: string[] } }>>;
  saveConfig: (times: string[]) => AsyncResult<IpcResult<{ result: { ok: boolean; times: string[] } }>>;
  getCaption: () => AsyncResult<IpcResult<{ caption: { text: string } }>>;
  saveCaption: (text: string) => AsyncResult<IpcResult<{ result: { ok: boolean; length: number } }>>;
  getImage: () => AsyncResult<IpcResult<{ image: SchedulerImage | null }>>;
  saveImage: (base64: string, mimetype: string) => AsyncResult<IpcResult<{ result: { ok: boolean; path: string; size: number } }>>;
  sendNow: () => AsyncResult<IpcResult<{ result: { ok: boolean; message?: string; error?: string } }>>;
  getLog: (lines?: number) => AsyncResult<IpcResult<{ log: string }>>;
}

declare global {
  interface Window {
    automation?: AutomationAPI;
    messages?: MessagesAPI;
    services?: ServicesAPI;
    rta?: RtaAPI;
    price?: PriceAPI;
    quotes?: QuotesAPI;
    fileSystem?: FileSystemAPI;
    files?: FilesAPI;
    desktopAuth?: DesktopAuthAPI;
    desktopWebApi?: DesktopWebApi;
    schedulerApi?: SchedulerAPI;
    lastGeneratedPricePath?: string;
  }
}

export {};
