import { asNumber, asRecord, asString } from './bytes';
import { computeChatCacheFingerprint } from './fingerprint';
import {
  clearLoginToken,
  getDeviceIdentity,
  readLoginToken,
  saveLoginToken,
  type DeviceIdentity,
} from './identity';
import { Opcode } from './opcodes';
import { PacketReceiver, packPacket, unpackPacket } from './protocol';
import {
  ownerInfoFromChat,
  ownerInfoFromContact,
  parseOwner,
  parseStory,
  parseStoryPreview,
} from './storyParsing';
import { connectTlsSocket } from './tcpSocket';
import type { MaxSocket } from './tcpTypes';
import type {
  MaxPacket,
  MaxProfile,
  Story,
  StoryOwner,
  StoryOwnerInfo,
  StoryPreview,
  StoryReaction,
  VerifyCodeResult,
} from './types';

const SERVER_HOST = 'api.oneme.ru';
const SERVER_PORT = 443;
const REQUEST_TIMEOUT_MS = 30_000;
const APP_VERSION = '26.20.2';
const BUILD_NUMBER = 6758;

interface PendingRequest {
  resolve: (packet: MaxPacket) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface UploadImage {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

function errorFromPayload(payload: unknown): Error {
  const map = asRecord(payload);
  const message = map
    ? asString(map.localizedMessage) ??
      asString(map.message) ??
      asString(map.title) ??
      asString(map.error)
    : undefined;
  if (message === 'FAIL_LOGIN_TOKEN' || message === 'FAIL_WRONG_PASSWORD') {
    return new Error('Сессия MAX устарела. Войдите заново.');
  }
  return new Error(message ?? 'Сервер MAX вернул неизвестную ошибку');
}

function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (digits.length < 10 || digits.length > 15) throw new Error('Проверьте номер телефона');
  return `+${digits}`;
}

function nestedToken(payload: Record<string, unknown>, kind: 'LOGIN' | 'REGISTER'): string | undefined {
  const attrs = asRecord(payload.tokenAttrs);
  const entry = attrs ? asRecord(attrs[kind]) : null;
  return entry ? asString(entry.token) : undefined;
}

function extractProfile(payload: unknown): MaxProfile {
  const root = asRecord(payload);
  const profile = root ? asRecord(root.profile) : null;
  const contact = profile ? asRecord(profile.contact) : null;
  if (!contact) return {};
  return {
    id: asNumber(contact.id) || undefined,
    firstName: asString(contact.firstName),
    lastName: asString(contact.lastName),
    avatarUrl: asString(contact.baseUrl),
  };
}

function timezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Vladivostok';
  } catch {
    return 'Asia/Vladivostok';
  }
}

export class MaxClient {
  private socket: MaxSocket | null = null;
  private receiver = new PacketReceiver();
  private pending = new Map<number, PendingRequest>();
  private sequence = 0;
  private connecting: Promise<void> | null = null;
  private identity: DeviceIdentity | null = null;
  private callsSeed: number | bigint | null = null;
  private online = false;
  private loggedIn = false;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private storiesUpdateListener: (() => void) | null = null;

  setStoriesUpdateListener(listener: (() => void) | null): void {
    this.storiesUpdateListener = listener;
  }

  async restoreSession(): Promise<{ token: string; profile: MaxProfile } | null> {
    const token = await readLoginToken();
    if (!token) return null;
    try {
      const profile = await this.loginWithToken(token);
      return { token, profile };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Сессия MAX устарела')) {
        await clearLoginToken();
      }
      this.disconnect();
      throw error;
    }
  }

  async connect(): Promise<void> {
    if (this.online && this.socket) return;
    if (this.connecting) return this.connecting;
    this.connecting = this.openConnection();
    try {
      await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  private async openConnection(): Promise<void> {
    this.disconnect();
    this.identity = await getDeviceIdentity();
    const socket = await connectTlsSocket({
      host: SERVER_HOST,
      port: SERVER_PORT,
      timeoutMs: 15_000,
    });
    this.socket = socket;
    socket.onData((chunk) => this.handleChunk(chunk));
    socket.onError((error) => this.handleDisconnect(error));
    socket.onClose(() => this.handleDisconnect(new Error('Соединение с MAX закрыто')));

    const response = await this.sendRequest(Opcode.sessionInit, {
      mt_instanceid: this.identity.instanceId,
      userAgent: {
        deviceType: 'ANDROID',
        appVersion: APP_VERSION,
        osVersion: 'Android 14',
        timezone: timezone(),
        screen: '420dpi 420dpi 1080x2340',
        pushDeviceType: 'GCM',
        arch: 'arm64-v8a',
        locale: 'ru',
        buildNumber: BUILD_NUMBER,
        deviceName: 'Google Pixel 8 Pro',
        deviceLocale: 'ru',
      },
      clientSessionId: this.identity.clientSessionId,
      deviceId: this.identity.deviceId,
    });
    const payload = this.requirePayload(response);
    const rawSeed = payload.callsSeed;
    if (typeof rawSeed === 'number' || typeof rawSeed === 'bigint') this.callsSeed = rawSeed;
    this.online = true;
    this.startPinging();
  }

  async requestCode(phone: string, resend = false): Promise<string> {
    await this.connect();
    const payload: Record<string, unknown> = {
      phone: normalizePhone(phone),
      type: resend ? 'RESEND' : 'START_AUTH',
      language: 'ru',
    };
    const fingerprint = this.fingerprint();
    if (fingerprint) payload.mode = fingerprint;
    const response = await this.sendRequest(Opcode.authRequest, payload);
    const token = asString(this.requirePayload(response).token);
    if (!token) throw new Error('MAX не вернул временный токен авторизации');
    return token;
  }

  async verifyCode(code: string, authToken: string): Promise<VerifyCodeResult> {
    if (!/^\d{4,8}$/.test(code.trim())) throw new Error('Проверьте код из сообщения');
    await this.connect();
    const response = await this.sendRequest(Opcode.auth, {
      token: authToken,
      verifyCode: code.trim(),
      authTokenType: 'CHECK_CODE',
    });
    const payload = this.requirePayload(response);
    const loginToken = nestedToken(payload, 'LOGIN');
    if (loginToken) return { kind: 'login', token: loginToken };

    const challenge = asRecord(payload.passwordChallenge);
    const trackId = challenge ? asString(challenge.trackId) : undefined;
    if (trackId) {
      return {
        kind: 'password',
        trackId,
        hint: challenge ? asString(challenge.hint) : undefined,
      };
    }

    if (nestedToken(payload, 'REGISTER')) return { kind: 'registration' };
    throw new Error('MAX не вернул токен входа');
  }

  async verifyPassword(password: string, trackId: string): Promise<string> {
    if (!password) throw new Error('Введите пароль MAX');
    await this.connect();
    const response = await this.sendRequest(Opcode.authLoginCheckPassword, {
      trackId,
      password,
    });
    const payload = this.requirePayload(response);
    if (payload.error) throw errorFromPayload(payload);
    const token = nestedToken(payload, 'LOGIN');
    if (!token) throw new Error('MAX не вернул токен после проверки пароля');
    return token;
  }

  async loginWithToken(token: string): Promise<MaxProfile> {
    await this.connect();
    const payload: Record<string, unknown> = {
      token,
      interactive: true,
      exp: { chatsCountGroups: Uint8Array.from([0x0b, 0x32]) },
      presenceSync: -1,
      chatsSync: -1,
    };
    const fingerprint = this.fingerprint();
    if (fingerprint) payload.chatCacheFingerprint = fingerprint;
    const response = await this.sendRequest(Opcode.login, payload);
    const data = this.requirePayload(response);
    const updatedToken = asString(data.token) ?? token;
    await saveLoginToken(updatedToken);
    this.loggedIn = true;
    return extractProfile(data);
  }

  async signOut(): Promise<void> {
    await clearLoginToken();
    this.disconnect();
  }

  async loadStories(): Promise<StoryPreview[]> {
    this.requireLoggedIn();
    const response = await this.sendRequest(Opcode.storiesList, { cursor: '', count: 50 });
    const payload = this.requirePayload(response);
    const rawPreviews = Array.isArray(payload.storiesPreviews) ? payload.storiesPreviews : [];
    const preliminary = rawPreviews
      .map((value) => parseStoryPreview(value))
      .filter((value): value is StoryPreview => value !== null);
    const info = await this.resolveOwnerInfo(preliminary.map((preview) => preview.owner));
    return preliminary
      .map((preview) => ({
        ...preview,
        ownerInfo: info.get(`${preview.owner.type}:${preview.owner.ownerId}`) ?? preview.ownerInfo,
      }))
      .sort((left, right) => {
        const leftUnread = left.totalCount > left.readCount;
        const rightUnread = right.totalCount > right.readCount;
        if (leftUnread !== rightUnread) return leftUnread ? -1 : 1;
        return right.updateTime - left.updateTime;
      });
  }

  async loadOwnerStories(owner: StoryOwner): Promise<Story[]> {
    this.requireLoggedIn();
    const response = await this.sendRequest(Opcode.storiesGetByOwner, {
      owners: [owner],
    });
    const payload = this.requirePayload(response);
    const peers = Array.isArray(payload.peerStories) ? payload.peerStories : [];
    for (const rawPeer of peers) {
      const peer = asRecord(rawPeer);
      const peerOwner = peer ? parseOwner(peer.owner) : null;
      if (!peer || !peerOwner || peerOwner.ownerId !== owner.ownerId || peerOwner.type !== owner.type) {
        continue;
      }
      const rawStories = Array.isArray(peer.stories) ? peer.stories : [];
      return rawStories.map(parseStory).filter((story): story is Story => story !== null);
    }
    return [];
  }

  async markStory(owner: StoryOwner, storyId: number): Promise<void> {
    this.requireLoggedIn();
    await this.sendRequest(Opcode.storiesMark, { owner, storyId });
  }

  async reactToStory(owner: StoryOwner, storyId: number, emoji?: string): Promise<void> {
    this.requireLoggedIn();
    const reaction: StoryReaction | undefined = emoji
      ? { reactionType: 0, id: emoji }
      : undefined;
    await this.sendRequest(Opcode.storiesReact, {
      owner,
      storyId,
      ...(reaction ? { reaction } : {}),
    });
  }

  async publishPhoto(image: UploadImage, audience: 1 | 2 = 1): Promise<void> {
    this.requireLoggedIn();
    const uploadResponse = await this.sendRequest(Opcode.photoUpload, { count: 1 });
    const uploadUrl = asString(this.requirePayload(uploadResponse).url);
    if (!uploadUrl) throw new Error('MAX не вернул адрес загрузки фото');

    const form = new FormData();
    form.append(
      'file',
      {
        uri: image.uri,
        name: image.fileName || `story-${Date.now()}.jpg`,
        type: image.mimeType || 'image/jpeg',
      } as unknown as Blob,
    );
    const httpResponse = await fetch(uploadUrl, { method: 'POST', body: form });
    const responseText = await httpResponse.text();
    if (!httpResponse.ok) throw new Error(`MAX отклонил фото: HTTP ${httpResponse.status}`);
    let uploadData: unknown;
    try {
      uploadData = JSON.parse(responseText);
    } catch {
      throw new Error('MAX вернул некорректный ответ при загрузке фото');
    }
    const uploadMap = asRecord(uploadData);
    let photoToken = uploadMap ? asString(uploadMap.photoToken) : undefined;
    const photos = uploadMap ? asRecord(uploadMap.photos) : null;
    if (!photoToken && photos) {
      for (const value of Object.values(photos)) {
        const token = asString(asRecord(value)?.token);
        if (token) {
          photoToken = token;
          break;
        }
      }
    }
    if (!photoToken) throw new Error('MAX не вернул токен загруженного фото');

    const cid = Date.now();
    await this.sendRequest(Opcode.storiesSend, {
      stories: [
        {
          cid,
          settings: audience,
          media: { _type: 'PHOTO', photoToken },
          expiration: 86_400,
        },
      ],
    });
  }

  disconnect(): void {
    this.online = false;
    this.loggedIn = false;
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
    const socket = this.socket;
    this.socket = null;
    socket?.destroy();
    this.receiver.reset();
    this.rejectPending(new Error('Соединение с MAX закрыто'));
  }

  private requireLoggedIn(): void {
    if (!this.online || !this.loggedIn) throw new Error('Сессия MAX не активна');
  }

  private fingerprint(): Uint8Array | null {
    if (this.callsSeed === null || !this.identity) return null;
    return computeChatCacheFingerprint(this.callsSeed, this.identity.deviceId);
  }

  private async resolveOwnerInfo(owners: StoryOwner[]): Promise<Map<string, StoryOwnerInfo>> {
    const result = new Map<string, StoryOwnerInfo>();
    const userIds = [...new Set(owners.filter((owner) => owner.type === 0).map((owner) => owner.ownerId))];
    const chatIds = [...new Set(owners.filter((owner) => owner.type !== 0).map((owner) => owner.ownerId))];

    const requests: Promise<void>[] = [];
    if (userIds.length > 0) {
      requests.push(
        this.sendRequest(Opcode.contactInfo, { contactIds: userIds })
          .then((packet) => {
            const payload = this.requirePayload(packet);
            const contacts = Array.isArray(payload.contacts) ? payload.contacts : [];
            for (const contact of contacts) {
              const entry = ownerInfoFromContact(contact);
              if (entry) result.set(`0:${entry[0]}`, entry[1]);
            }
          })
          .catch(() => undefined),
      );
    }
    if (chatIds.length > 0) {
      requests.push(
        this.sendRequest(Opcode.chatInfo, { chatIds })
          .then((packet) => {
            const payload = this.requirePayload(packet);
            const chats = Array.isArray(payload.chats) ? payload.chats : [];
            for (const chat of chats) {
              const entry = ownerInfoFromChat(chat);
              if (entry) {
                result.set(`1:${entry[0]}`, entry[1]);
                result.set(`2:${entry[0]}`, entry[1]);
              }
            }
          })
          .catch(() => undefined),
      );
    }
    await Promise.all(requests);
    return result;
  }

  private requirePayload(packet: MaxPacket): Record<string, unknown> {
    if (packet.cmd === 2 || packet.cmd === 3) throw errorFromPayload(packet.payload);
    const payload = asRecord(packet.payload);
    if (!payload) throw new Error('MAX вернул пустой или некорректный ответ');
    return payload;
  }

  private nextSequence(): number {
    this.sequence = (this.sequence + 1) & 0xffff;
    if (this.sequence === 0) this.sequence = 1;
    return this.sequence;
  }

  private sendRequest(opcode: number, payload: Record<string, unknown>): Promise<MaxPacket> {
    const socket = this.socket;
    if (!socket) return Promise.reject(new Error('Нет соединения с MAX'));
    const seq = this.nextSequence();
    return new Promise<MaxPacket>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(seq);
        reject(new Error(`MAX не ответил за ${REQUEST_TIMEOUT_MS / 1000} секунд`));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(seq, { resolve, reject, timer });
      try {
        socket.write(packPacket(opcode, payload, seq));
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(seq);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private sendFireAndForget(opcode: number, payload: Record<string, unknown>): void {
    const socket = this.socket;
    if (!socket) return;
    socket.write(packPacket(opcode, payload, this.nextSequence()));
  }

  private handleChunk(chunk: Uint8Array): void {
    try {
      for (const raw of this.receiver.feed(chunk)) {
        const packet = unpackPacket(raw);
        if (packet.cmd === 0) {
          if (packet.opcode === Opcode.notifStoriesUpdate) this.storiesUpdateListener?.();
          continue;
        }
        const pending = this.pending.get(packet.seq);
        if (!pending) continue;
        clearTimeout(pending.timer);
        this.pending.delete(packet.seq);
        if (packet.cmd === 2 || packet.cmd === 3) pending.reject(errorFromPayload(packet.payload));
        else pending.resolve(packet);
      }
    } catch (error) {
      this.handleDisconnect(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private handleDisconnect(error: Error): void {
    if (!this.socket) return;
    this.online = false;
    this.loggedIn = false;
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
    const socket = this.socket;
    this.socket = null;
    socket.destroy();
    this.receiver.reset();
    this.rejectPending(error);
  }

  private rejectPending(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }

  private startPinging(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.sendFireAndForget(Opcode.ping, { interactive: true });
    this.pingTimer = setInterval(() => {
      if (this.online) this.sendFireAndForget(Opcode.ping, { interactive: true });
    }, 10_000);
  }
}
