import { randomUUID } from 'crypto';
import { requestWebApi } from '../auth/web-auth-service';
import { createSuccess } from '../../utils/result';

type CloudMessage = {
  id?: string | number;
  text?: string;
  imagePath?: string | null;
  image_path?: string | null;
  isSelected?: boolean | number | string;
  is_selected?: boolean | number | string;
  profileId?: string;
  profile_id?: string;
};

type RendererMessage = {
  id: string;
  text: string;
  imagePath?: string;
  isSelected: boolean;
};

type CloudListResponse =
  | { messages?: CloudMessage[] }
  | CloudMessage[]
  | null
  | undefined;

type CloudQuote = {
  id?: string;
  updatedAt?: string;
  payload?: Record<string, any>;
  latestPrice?: {
    payload?: Record<string, any>;
    updatedAt?: string;
  } | null;
};

type CloudQuotesResponse =
  | { quotes?: CloudQuote[] }
  | CloudQuote[]
  | null
  | undefined;

type MessageEvent = {
  messageId: string;
  profileId: string;
  text: string;
  imagePath?: string;
  isSelected: boolean;
  deleted: boolean;
  updatedAt: string;
  updatedAtMs: number;
};

const QUOTE_MESSAGE_MARKER = 'desktop-whatsapp-message-v1';

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function normalizeMessage(item: CloudMessage): RendererMessage | null {
  const id = asString(item?.id);
  const text = asString(item?.text);
  if (!id || !text.trim()) return null;

  const imagePath = asString(item?.imagePath ?? item?.image_path);
  const selectedRaw = item?.isSelected ?? item?.is_selected;
  const isSelected = asBoolean(selectedRaw);

  return {
    id,
    text,
    imagePath: imagePath || undefined,
    isSelected
  };
}

function normalizeList(payload: CloudListResponse): RendererMessage[] {
  const rawList = Array.isArray(payload) ? payload : Array.isArray(payload?.messages) ? payload.messages : [];
  return rawList.map(normalizeMessage).filter((item): item is RendererMessage => Boolean(item));
}

function isRouteNotFoundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  const normalized = message.toLowerCase();
  return (
    normalized.includes('rota nao encontrada') ||
    normalized.includes('rota não encontrada') ||
    normalized.includes('not found') ||
    normalized.includes('http 404')
  );
}

async function requestWithFallback<T>(paths: string[], init: RequestInit): Promise<T> {
  const failures: string[] = [];

  for (const path of paths) {
    try {
      return await requestWebApi<T>(path, init);
    } catch (error) {
      if (!isRouteNotFoundError(error)) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error || 'falha desconhecida');
      failures.push(`${path}: ${message}`);
    }
  }

  throw new Error(`Rota de mensagens nao encontrada na API cloud. Tentativas: ${failures.join(' | ')}`);
}

function extractQuotePayload(quote: CloudQuote): Record<string, any> | null {
  const payload = quote?.latestPrice?.payload ?? quote?.payload;
  if (!payload || typeof payload !== 'object') return null;
  return payload;
}

function normalizeQuoteEvent(quote: CloudQuote): MessageEvent | null {
  const payload = extractQuotePayload(quote);
  if (!payload || payload.__desktopKind !== QUOTE_MESSAGE_MARKER) {
    return null;
  }

  const profileId = asString(payload.profileId);
  const messageId = asString(payload.messageId || quote?.id);
  if (!profileId || !messageId) {
    return null;
  }

  const text = asString(payload.text);
  const imagePath = asString(payload.imagePath ?? payload.image_path);
  const updatedAt = asString(payload.updatedAt || quote?.latestPrice?.updatedAt || quote?.updatedAt) || new Date().toISOString();
  const updatedAtMs = Date.parse(updatedAt);

  return {
    messageId,
    profileId,
    text,
    imagePath: imagePath || undefined,
    isSelected: asBoolean(payload.isSelected ?? payload.is_selected),
    deleted: asBoolean(payload.deleted),
    updatedAt,
    updatedAtMs: Number.isFinite(updatedAtMs) ? updatedAtMs : 0
  };
}

async function listEventsFromQuotes(): Promise<MessageEvent[]> {
  const payload = await requestWebApi<CloudQuotesResponse>('/quotes', { method: 'GET' });
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.quotes) ? payload.quotes : [];
  const events = rows.map(normalizeQuoteEvent).filter((item): item is MessageEvent => Boolean(item));
  events.sort((a, b) => (b.updatedAtMs - a.updatedAtMs) || b.updatedAt.localeCompare(a.updatedAt));
  return events;
}

function buildMessagesFromEvents(events: MessageEvent[]): RendererMessage[] {
  const latestById = new Map<string, MessageEvent>();

  for (const event of events) {
    const current = latestById.get(event.messageId);
    if (!current) {
      latestById.set(event.messageId, event);
      continue;
    }
    const isNewer =
      event.updatedAtMs > current.updatedAtMs ||
      (event.updatedAtMs === current.updatedAtMs && event.updatedAt >= current.updatedAt);
    if (isNewer) {
      latestById.set(event.messageId, event);
    }
  }

  const active = Array.from(latestById.values())
    .filter((item) => !item.deleted && item.text.trim())
    .sort((a, b) => (b.updatedAtMs - a.updatedAtMs) || b.updatedAt.localeCompare(a.updatedAt));

  const list = active.map((event) => ({
    id: event.messageId,
    text: event.text,
    imagePath: event.imagePath,
    isSelected: Boolean(event.isSelected)
  }));

  if (!list.length) return list;
  if (!list.some((item) => item.isSelected)) {
    list[0].isSelected = true;
  }
  return list;
}

async function persistQuoteMessageEvent(input: {
  profileId: string;
  messageId: string;
  text: string;
  imagePath?: string | null;
  isSelected: boolean;
  deleted?: boolean;
}) {
  const payload = {
    __desktopKind: QUOTE_MESSAGE_MARKER,
    version: 1,
    profileId: input.profileId,
    messageId: input.messageId,
    text: input.text,
    imagePath: input.imagePath || null,
    isSelected: Boolean(input.isSelected),
    deleted: Boolean(input.deleted),
    updatedAt: new Date().toISOString()
  };

  await requestWebApi('/quotes', {
    method: 'POST',
    body: JSON.stringify({
      cardId: '',
      payload,
      processed: {}
    })
  });
}

async function listByProfileFromQuoteStore(profileId: string): Promise<RendererMessage[]> {
  const profile = String(profileId || '').trim();
  const events = (await listEventsFromQuotes()).filter((event) => event.profileId === profile);
  return buildMessagesFromEvents(events);
}

async function findMessageByIdInQuoteStore(messageId: string): Promise<{ profileId: string; message: RendererMessage } | null> {
  const id = String(messageId || '').trim();
  if (!id) return null;

  const events = await listEventsFromQuotes();
  const target = events.find((event) => event.messageId === id);
  if (!target) return null;

  const list = buildMessagesFromEvents(events.filter((event) => event.profileId === target.profileId));
  const message = list.find((item) => item.id === id);
  if (!message) return null;
  return { profileId: target.profileId, message };
}

async function listByProfileNative(profileId: string) {
  const encodedProfileId = encodeURIComponent(String(profileId || '').trim());
  const payload = await requestWithFallback<CloudListResponse>(
    [`/messages?profileId=${encodedProfileId}`, `/profile/messages?profileId=${encodedProfileId}`, '/profile/messages'],
    { method: 'GET' }
  );
  return createSuccess({ messages: normalizeList(payload) });
}

async function createNative(profileId: string, text: string, imagePath?: string | null) {
  const payload = await requestWithFallback<{ message?: CloudMessage; id?: string | number } | null>(
    ['/messages', '/profile/messages'],
    {
      method: 'POST',
      body: JSON.stringify({
        profileId,
        text,
        imagePath: imagePath || null
      })
    }
  );

  const messageId = asString(payload?.message?.id ?? payload?.id);
  return createSuccess({ messageId: messageId || undefined });
}

async function updateNative(messageId: number | string, text: string, imagePath?: string | null) {
  const encodedMessageId = encodeURIComponent(String(messageId));
  await requestWithFallback<void>(
    [`/messages/${encodedMessageId}`, `/profile/messages/${encodedMessageId}`],
    {
      method: 'PATCH',
      body: JSON.stringify({
        text,
        imagePath: imagePath || null
      })
    }
  );
  return createSuccess({ updated: true });
}

async function removeNative(messageId: number | string) {
  const encodedMessageId = encodeURIComponent(String(messageId));
  await requestWithFallback<void>(
    [`/messages/${encodedMessageId}`, `/profile/messages/${encodedMessageId}`],
    { method: 'DELETE' }
  );
  return createSuccess({ deleted: true });
}

async function selectNative(messageId: number | string) {
  const encodedMessageId = encodeURIComponent(String(messageId));
  try {
    await requestWithFallback<void>(
      [`/messages/${encodedMessageId}/select`, `/profile/messages/${encodedMessageId}/select`],
      {
        method: 'PATCH',
        body: JSON.stringify({})
      }
    );
  } catch (error) {
    if (!isRouteNotFoundError(error)) {
      throw error;
    }
    await requestWithFallback<void>(
      [`/messages/${encodedMessageId}`, `/profile/messages/${encodedMessageId}`],
      {
        method: 'PATCH',
        body: JSON.stringify({ isSelected: true, is_selected: true })
      }
    );
  }
  return createSuccess({ selected: true });
}

async function getSelectedNative(profileId: string): Promise<RendererMessage | null> {
  const encodedProfileId = encodeURIComponent(String(profileId || '').trim());
  const payload = await requestWithFallback<{ message?: CloudMessage } | CloudListResponse>(
    [`/messages/selected?profileId=${encodedProfileId}`, `/profile/messages/selected?profileId=${encodedProfileId}`, '/profile/messages/selected'],
    { method: 'GET' }
  );

  const message = (payload as { message?: CloudMessage })?.message;
  if (message) {
    return normalizeMessage(message);
  }

  const all = normalizeList(payload as CloudListResponse);
  return all.find((item) => item.isSelected) || all[0] || null;
}

async function listByProfile(profileId: string) {
  try {
    return await listByProfileNative(profileId);
  } catch (error) {
    if (!isRouteNotFoundError(error)) throw error;
    const messages = await listByProfileFromQuoteStore(profileId);
    return createSuccess({ messages });
  }
}

async function create(profileId: string, text: string, imagePath?: string | null) {
  try {
    return await createNative(profileId, text, imagePath);
  } catch (error) {
    if (!isRouteNotFoundError(error)) throw error;

    const list = await listByProfileFromQuoteStore(profileId);
    const messageId = randomUUID();
    await persistQuoteMessageEvent({
      profileId: String(profileId || '').trim(),
      messageId,
      text: String(text || ''),
      imagePath: imagePath || null,
      isSelected: list.length === 0
    });
    return createSuccess({ messageId });
  }
}

async function update(messageId: number | string, text: string, imagePath?: string | null) {
  try {
    return await updateNative(messageId, text, imagePath);
  } catch (error) {
    if (!isRouteNotFoundError(error)) throw error;

    const found = await findMessageByIdInQuoteStore(String(messageId));
    if (!found) {
      throw new Error('Mensagem não encontrada para atualização.');
    }
    await persistQuoteMessageEvent({
      profileId: found.profileId,
      messageId: String(messageId),
      text: String(text || ''),
      imagePath: imagePath || null,
      isSelected: Boolean(found.message.isSelected)
    });
    return createSuccess({ updated: true });
  }
}

async function remove(messageId: number | string) {
  try {
    return await removeNative(messageId);
  } catch (error) {
    if (!isRouteNotFoundError(error)) throw error;

    const found = await findMessageByIdInQuoteStore(String(messageId));
    if (!found) {
      return createSuccess({ deleted: true });
    }
    await persistQuoteMessageEvent({
      profileId: found.profileId,
      messageId: String(messageId),
      text: found.message.text,
      imagePath: found.message.imagePath || null,
      isSelected: false,
      deleted: true
    });
    return createSuccess({ deleted: true });
  }
}

async function select(messageId: number | string) {
  try {
    return await selectNative(messageId);
  } catch (error) {
    if (!isRouteNotFoundError(error)) throw error;

    const found = await findMessageByIdInQuoteStore(String(messageId));
    if (!found) {
      throw new Error('Mensagem não encontrada para seleção.');
    }

    const messages = await listByProfileFromQuoteStore(found.profileId);
    for (const item of messages) {
      await persistQuoteMessageEvent({
        profileId: found.profileId,
        messageId: item.id,
        text: item.text,
        imagePath: item.imagePath || null,
        isSelected: item.id === String(messageId)
      });
    }

    return createSuccess({ selected: true });
  }
}

async function getSelected(profileId: string): Promise<RendererMessage | null> {
  try {
    return await getSelectedNative(profileId);
  } catch (error) {
    if (!isRouteNotFoundError(error)) throw error;
    const list = await listByProfileFromQuoteStore(profileId);
    return list.find((item) => item.isSelected) || list[0] || null;
  }
}

export default {
  listByProfile,
  create,
  update,
  remove,
  select,
  getSelected
};
