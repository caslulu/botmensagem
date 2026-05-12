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
  delete: (profileId: string) => AsyncResult<IpcResult<{ success?: boolean }> | any>;
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
  listQuotes: () => AsyncResult<IpcResult<{ quotes?: any[] }> | any>;
  getQuote: (id: string) => AsyncResult<IpcResult<{ quote?: any }> | any>;
  deleteQuote: (id: string) => AsyncResult<IpcResult<{ deleted?: boolean }> | any>;
  upsertQuote: (entry: any) => AsyncResult<IpcResult<{ quote?: any }> | any>;
  generate: (payload: any) => AsyncResult<IpcResult<{ result?: any }> | any>;
}

interface QuotesAPI {
  runAutomation: (payload: any) => AsyncResult<IpcResult<{ result?: any }> | any>;
}

type RoadmapStatus = 'todo' | 'doing' | 'done';

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  eta: string;
  label: string;
  risk?: string;
  status: RoadmapStatus;
  position: number;
}

interface RoadmapAPI {
  list: () => AsyncResult<IpcResult<{ items?: RoadmapItem[] }> | any>;
  create: (payload: Partial<RoadmapItem>) => AsyncResult<IpcResult<{ item?: RoadmapItem }> | any>;
  updateStatus: (payload: { id: string; status: RoadmapStatus }) => AsyncResult<IpcResult<{ item?: RoadmapItem }> | any>;
  update: (payload: Partial<RoadmapItem> & { id: string }) => AsyncResult<IpcResult<{ item?: RoadmapItem }> | any>;
  delete: (payload: { id: string }) => AsyncResult<IpcResult<{ deleted?: boolean }> | any>;
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
    price?: PriceAPI;
    quotes?: QuotesAPI;
    roadmap?: RoadmapAPI;
    fileSystem?: FileSystemAPI;
    files?: FilesAPI;
    desktopAuth?: DesktopAuthAPI;
    desktopWebApi?: DesktopWebApi;
    lastGeneratedPricePath?: string;
  }
}

export {};
