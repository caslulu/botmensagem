export type FileAsset = {
  id: string;
  kind: string;
  filename: string;
  mimeType: string;
  downloadUrl: string;
  createdAt: string;
};

export type QuotePrice = {
  id: string;
  cardId?: string | null;
  payload: Record<string, any>;
  processed: Record<string, any>;
  updatedAt: string;
};

export type KanbanCard = {
  id: string;
  columnId: string;
  title: string;
  description: string;
  payload: Record<string, any>;
  position: number;
  files?: FileAsset[];
  latestPrice?: QuotePrice | null;
  createdAt: string;
  updatedAt: string;
};

export type KanbanColumn = {
  id: string;
  title: string;
  position: number;
  cards: KanbanCard[];
};

export type BoardResponse = {
  columns: KanbanColumn[];
};

export type QuoteOption = {
  id: string;
  cardId?: string | null;
  label: string;
  title: string;
  payload: Record<string, any>;
  latestPrice?: QuotePrice | null;
  updatedAt: string;
};
