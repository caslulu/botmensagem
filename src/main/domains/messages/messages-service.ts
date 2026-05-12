import { requestWebApi } from '../auth/web-auth-service';
import { createSuccess } from '../../utils/result';

type CloudMessage = {
  id?: string | number;
  text?: string;
  imagePath?: string | null;
  image_path?: string | null;
  isSelected?: boolean | number;
  is_selected?: boolean | number;
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

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function normalizeMessage(item: CloudMessage): RendererMessage | null {
  const id = asString(item?.id);
  const text = asString(item?.text);
  if (!id || !text.trim()) return null;

  const imagePath = asString(item?.imagePath ?? item?.image_path);
  const selectedRaw = item?.isSelected ?? item?.is_selected;
  const isSelected = selectedRaw === true || selectedRaw === 1 || selectedRaw === '1';

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

async function listByProfile(profileId: string) {
  const encodedProfileId = encodeURIComponent(String(profileId || '').trim());
  const payload = await requestWebApi<CloudListResponse>(`/messages?profileId=${encodedProfileId}`, {
    method: 'GET'
  });
  return createSuccess({ messages: normalizeList(payload) });
}

async function create(profileId: string, text: string, imagePath?: string | null) {
  const payload = await requestWebApi<{ message?: CloudMessage; id?: string | number } | null>('/messages', {
    method: 'POST',
    body: JSON.stringify({
      profileId,
      text,
      imagePath: imagePath || null
    })
  });

  const messageId = asString(payload?.message?.id ?? payload?.id);
  return createSuccess({ messageId: messageId || undefined });
}

async function update(messageId: number | string, text: string, imagePath?: string | null) {
  await requestWebApi(`/messages/${encodeURIComponent(String(messageId))}`, {
    method: 'PATCH',
    body: JSON.stringify({
      text,
      imagePath: imagePath || null
    })
  });
  return createSuccess({ updated: true });
}

async function remove(messageId: number | string) {
  await requestWebApi(`/messages/${encodeURIComponent(String(messageId))}`, {
    method: 'DELETE'
  });
  return createSuccess({ deleted: true });
}

async function select(messageId: number | string) {
  await requestWebApi(`/messages/${encodeURIComponent(String(messageId))}/select`, {
    method: 'PATCH',
    body: JSON.stringify({})
  });
  return createSuccess({ selected: true });
}

async function getSelected(profileId: string): Promise<RendererMessage | null> {
  const encodedProfileId = encodeURIComponent(String(profileId || '').trim());
  const payload = await requestWebApi<{ message?: CloudMessage } | CloudListResponse>(`/messages/selected?profileId=${encodedProfileId}`, {
    method: 'GET'
  });

  const message = (payload as { message?: CloudMessage })?.message;
  if (message) {
    return normalizeMessage(message);
  }

  const all = normalizeList(payload as CloudListResponse);
  return all.find((item) => item.isSelected) || all[0] || null;
}

export default {
  listByProfile,
  create,
  update,
  remove,
  select,
  getSelected
};
