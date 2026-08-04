import * as ImagePicker from 'expo-image-picker';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import { MaxClient } from '@/services/max/MaxClient';
import type {
  MaxProfile,
  SessionPhase,
  Story,
  StoryOwner,
  StoryPreview,
} from '@/services/max/types';

interface MaxContextValue {
  phase: SessionPhase;
  loading: boolean;
  error: string | null;
  phone: string;
  passwordHint: string | null;
  profile: MaxProfile;
  stories: StoryPreview[];
  requestCode(phone: string): Promise<void>;
  resendCode(): Promise<void>;
  verifyCode(code: string): Promise<void>;
  verifyPassword(password: string): Promise<void>;
  backToPhone(): void;
  refreshStories(): Promise<void>;
  loadOwnerStories(owner: StoryOwner): Promise<Story[]>;
  markStory(owner: StoryOwner, storyId: number): Promise<void>;
  reactToStory(owner: StoryOwner, storyId: number, emoji?: string): Promise<void>;
  publishStory(): Promise<void>;
  signOut(): Promise<void>;
  clearError(): void;
}

const MaxContext = createContext<MaxContextValue | null>(null);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function MaxProvider({ children }: PropsWithChildren) {
  const clientRef = useRef<MaxClient | null>(null);
  if (!clientRef.current) clientRef.current = new MaxClient();
  const client = clientRef.current;

  const [phase, setPhase] = useState<SessionPhase>('booting');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState('+7');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loginToken, setLoginToken] = useState<string | null>(null);
  const [passwordTrackId, setPasswordTrackId] = useState<string | null>(null);
  const [passwordHint, setPasswordHint] = useState<string | null>(null);
  const [profile, setProfile] = useState<MaxProfile>({});
  const [stories, setStories] = useState<StoryPreview[]>([]);
  const refreshInFlight = useRef<Promise<void> | null>(null);

  const refreshStories = useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current;
    const run = async () => {
      setError(null);
      try {
        let feed: StoryPreview[];
        try {
          feed = await client.loadStories();
        } catch (firstError) {
          if (!loginToken) throw firstError;
          const restored = await client.restoreSession();
          if (!restored) throw firstError;
          setLoginToken(restored.token);
          setProfile(restored.profile);
          feed = await client.loadStories();
        }
        setStories(feed);
      } catch (refreshError) {
        setError(errorMessage(refreshError));
      }
    };
    refreshInFlight.current = run().finally(() => {
      refreshInFlight.current = null;
    });
    return refreshInFlight.current;
  }, [client, loginToken]);

  useEffect(() => {
    let active = true;
    const boot = async () => {
      try {
        const restored = await client.restoreSession();
        if (!active) return;
        if (!restored) {
          setPhase('signedOut');
          return;
        }
        setLoginToken(restored.token);
        setProfile(restored.profile);
        setPhase('signedIn');
      } catch (bootError) {
        if (!active) return;
        setError(errorMessage(bootError));
        setPhase('signedOut');
      }
    };
    void boot();
    return () => {
      active = false;
    };
  }, [client]);

  useEffect(() => {
    if (phase === 'signedIn') void refreshStories();
  }, [phase, refreshStories]);

  useEffect(() => {
    client.setStoriesUpdateListener(() => {
      if (phase === 'signedIn') void refreshStories();
    });
    return () => client.setStoriesUpdateListener(null);
  }, [client, phase, refreshStories]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && phase === 'signedIn') void refreshStories();
    });
    return () => subscription.remove();
  }, [phase, refreshStories]);

  useEffect(() => () => client.disconnect(), [client]);

  const requestCode = useCallback(
    async (value: string) => {
      setLoading(true);
      setError(null);
      try {
        const token = await client.requestCode(value);
        setPhone(value);
        setAuthToken(token);
        setPhase('waitingCode');
      } catch (requestError) {
        setError(errorMessage(requestError));
      } finally {
        setLoading(false);
      }
    },
    [client],
  );

  const resendCode = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await client.requestCode(phone, true);
      setAuthToken(token);
    } catch (resendError) {
      setError(errorMessage(resendError));
    } finally {
      setLoading(false);
    }
  }, [client, phone]);

  const completeLogin = useCallback(
    async (token: string) => {
      const nextProfile = await client.loginWithToken(token);
      setLoginToken(token);
      setProfile(nextProfile);
      setPhase('signedIn');
    },
    [client],
  );

  const verifyCode = useCallback(
    async (code: string) => {
      if (!authToken) {
        setError('Запросите новый код');
        setPhase('signedOut');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await client.verifyCode(code, authToken);
        if (result.kind === 'login' && result.token) {
          await completeLogin(result.token);
        } else if (result.kind === 'password' && result.trackId) {
          setPasswordTrackId(result.trackId);
          setPasswordHint(result.hint ?? null);
          setPhase('waitingPassword');
        } else {
          setError('Новый аккаунт сначала зарегистрируйте в официальном приложении MAX.');
        }
      } catch (verifyError) {
        setError(errorMessage(verifyError));
      } finally {
        setLoading(false);
      }
    },
    [authToken, client, completeLogin],
  );

  const verifyPassword = useCallback(
    async (password: string) => {
      if (!passwordTrackId) {
        setError('Сессия проверки пароля потеряна. Запросите код заново.');
        setPhase('signedOut');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const token = await client.verifyPassword(password, passwordTrackId);
        await completeLogin(token);
      } catch (passwordError) {
        setError(errorMessage(passwordError));
      } finally {
        setLoading(false);
      }
    },
    [client, completeLogin, passwordTrackId],
  );

  const publishStory = useCallback(async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Разрешите доступ к фотографиям в настройках iPhone.');
      return;
    }
    const selection = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.92,
    });
    if (selection.canceled || !selection.assets[0]) return;
    setLoading(true);
    try {
      await client.publishPhoto(selection.assets[0]);
      await refreshStories();
    } catch (publishError) {
      setError(errorMessage(publishError));
    } finally {
      setLoading(false);
    }
  }, [client, refreshStories]);

  const signOut = useCallback(async () => {
    await client.signOut();
    setStories([]);
    setProfile({});
    setAuthToken(null);
    setLoginToken(null);
    setPasswordTrackId(null);
    setPasswordHint(null);
    setError(null);
    setPhase('signedOut');
  }, [client]);

  const backToPhone = useCallback(() => {
    setAuthToken(null);
    setPasswordTrackId(null);
    setPasswordHint(null);
    setError(null);
    setPhase('signedOut');
  }, []);

  const value = useMemo<MaxContextValue>(
    () => ({
      phase,
      loading,
      error,
      phone,
      passwordHint,
      profile,
      stories,
      requestCode,
      resendCode,
      verifyCode,
      verifyPassword,
      backToPhone,
      refreshStories,
      loadOwnerStories: (owner) => client.loadOwnerStories(owner),
      markStory: (owner, storyId) => client.markStory(owner, storyId),
      reactToStory: (owner, storyId, emoji) => client.reactToStory(owner, storyId, emoji),
      publishStory,
      signOut,
      clearError: () => setError(null),
    }),
    [
      backToPhone,
      client,
      error,
      loading,
      passwordHint,
      phase,
      phone,
      profile,
      publishStory,
      refreshStories,
      requestCode,
      resendCode,
      signOut,
      stories,
      verifyCode,
      verifyPassword,
    ],
  );

  return <MaxContext.Provider value={value}>{children}</MaxContext.Provider>;
}

export function useMax(): MaxContextValue {
  const value = useContext(MaxContext);
  if (!value) throw new Error('useMax должен использоваться внутри MaxProvider');
  return value;
}
