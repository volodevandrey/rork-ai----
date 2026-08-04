import { asNumber, asRecord, asString } from './bytes';
import type {
  Story,
  StoryMedia,
  StoryOwner,
  StoryOwnerInfo,
  StoryPreview,
  StoryReaction,
} from './types';

export function parseOwner(value: unknown): StoryOwner | null {
  const map = asRecord(value);
  if (!map) return null;
  const ownerId = asNumber(map.ownerId);
  if (!ownerId) return null;
  const rawType = asNumber(map.type);
  const type = rawType === 1 || rawType === 2 ? rawType : 0;
  return { ownerId, type };
}

function parseReaction(value: unknown): StoryReaction | undefined {
  const map = asRecord(value);
  const id = map ? asString(map.id) : undefined;
  if (!map || !id) return undefined;
  return { reactionType: asNumber(map.reactionType), id };
}

function parseMedia(value: unknown): StoryMedia | undefined {
  const map = asRecord(value);
  if (!map) return undefined;
  const rawType = asString(map._type)?.toUpperCase();
  if (rawType === 'PHOTO') {
    return {
      type: 'photo',
      url: asString(map.photoUrl) ?? asString(map.baseUrl) ?? asString(map.url),
      width: asNumber(map.width) || undefined,
      height: asNumber(map.height) || undefined,
    };
  }
  if (rawType === 'VIDEO') {
    return {
      type: 'video',
      url:
        asString(map.mp4Url) ??
        asString(map.videoUrl) ??
        asString(map.MP4_1080) ??
        asString(map.baseUrl),
      thumbnailUrl: asString(map.thumbnail),
      width: asNumber(map.width) || undefined,
      height: asNumber(map.height) || undefined,
      durationMs: asNumber(map.duration) || undefined,
    };
  }
  return { type: 'unknown' };
}

export function parseStory(value: unknown): Story | null {
  const map = asRecord(value);
  if (!map) return null;
  const owner = parseOwner(map.owner);
  if (!owner) return null;
  return {
    id: asNumber(map.id),
    cid: asNumber(map.cid),
    owner,
    settings: asNumber(map.settings),
    time: asNumber(map.time),
    updateTime: asNumber(map.updateTime),
    expiration: asNumber(map.expiration),
    media: parseMedia(map.media),
    reaction: parseReaction(map.reaction),
  };
}

export function parseStoryPreview(
  value: unknown,
  ownerInfo?: StoryOwnerInfo,
): StoryPreview | null {
  const map = asRecord(value);
  if (!map) return null;
  const owner = parseOwner(map.owner);
  if (!owner) return null;
  const totalCount = asNumber(map.totalCount);
  if (totalCount <= 0) return null;
  return {
    owner,
    updateTime: asNumber(map.updateTime),
    totalCount,
    readCount: asNumber(map.readCount),
    lastStoryExpirationTime: asNumber(map.lastStoryExpirationTime),
    ownerInfo: ownerInfo ?? { name: `ID ${owner.ownerId}` },
  };
}

export function ownerInfoFromContact(value: unknown): [number, StoryOwnerInfo] | null {
  const map = asRecord(value);
  if (!map) return null;
  const id = asNumber(map.id);
  if (!id) return null;
  const rawNames = Array.isArray(map.names) ? map.names : [];
  let fallback = '';
  let preferred = '';
  for (const rawName of rawNames) {
    const name = asRecord(rawName);
    if (!name) continue;
    const direct = asString(name.name);
    const combined = [asString(name.firstName), asString(name.lastName)].filter(Boolean).join(' ');
    const label = direct ?? combined;
    if (!label) continue;
    if (!fallback) fallback = label;
    if (name.type === 'ONEME') preferred = label;
  }
  return [
    id,
    {
      name: preferred || fallback || `Пользователь ${id}`,
      avatarUrl: asString(map.baseUrl),
    },
  ];
}

export function ownerInfoFromChat(value: unknown): [number, StoryOwnerInfo] | null {
  const map = asRecord(value);
  if (!map) return null;
  const id = asNumber(map.id);
  if (!id) return null;
  return [
    id,
    {
      name: asString(map.title) ?? `Чат ${id}`,
      avatarUrl: asString(map.baseUrl),
    },
  ];
}
