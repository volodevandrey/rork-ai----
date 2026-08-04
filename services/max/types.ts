export type SessionPhase =
  | 'booting'
  | 'signedOut'
  | 'waitingCode'
  | 'waitingPassword'
  | 'signedIn';

export type StoryOwnerType = 0 | 1 | 2;

export interface StoryOwner {
  ownerId: number;
  type: StoryOwnerType;
}

export interface StoryOwnerInfo {
  name: string;
  avatarUrl?: string;
}

export interface StoryPreview {
  owner: StoryOwner;
  updateTime: number;
  totalCount: number;
  readCount: number;
  lastStoryExpirationTime: number;
  ownerInfo: StoryOwnerInfo;
}

export type StoryMediaType = 'photo' | 'video' | 'unknown';

export interface StoryMedia {
  type: StoryMediaType;
  url?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  durationMs?: number;
}

export interface StoryReaction {
  reactionType: number;
  id: string;
}

export interface Story {
  id: number;
  cid: number;
  owner: StoryOwner;
  settings: number;
  time: number;
  updateTime: number;
  expiration: number;
  media?: StoryMedia;
  reaction?: StoryReaction;
}

export interface MaxProfile {
  id?: number;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export interface VerifyCodeResult {
  kind: 'login' | 'password' | 'registration';
  token?: string;
  trackId?: string;
  hint?: string;
}

export interface MaxPacket {
  api: number;
  cmd: number;
  seq: number;
  opcode: number;
  payload: unknown;
}
