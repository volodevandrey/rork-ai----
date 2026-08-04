import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video, type AVPlaybackStatus } from 'expo-av';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useMax } from '@/providers/MaxProvider';
import type { Story, StoryPreview } from '@/services/max/types';

interface StoryViewerProps {
  previews: StoryPreview[];
  startIndex: number;
  onClose(): void;
}

const PHOTO_DURATION_MS = 5_000;
const REACTIONS = ['❤️', '🔥', '😂', '👍', '😮', '😢'];

export function StoryViewer({ previews, startIndex, onClose }: StoryViewerProps) {
  const { loadOwnerStories, markStory, reactToStory } = useMax();
  const [ownerIndex, setOwnerIndex] = useState(startIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [reactionBusy, setReactionBusy] = useState(false);
  const videoRef = useRef<Video | null>(null);
  const preview = previews[ownerIndex];
  const story = stories[storyIndex];

  const advanceOwner = useCallback(() => {
    if (ownerIndex + 1 >= previews.length) {
      onClose();
      return;
    }
    setOwnerIndex((value) => value + 1);
  }, [onClose, ownerIndex, previews.length]);

  const advance = useCallback(() => {
    if (storyIndex + 1 < stories.length) setStoryIndex((value) => value + 1);
    else advanceOwner();
  }, [advanceOwner, stories.length, storyIndex]);

  const rewind = useCallback(() => {
    if (storyIndex > 0) setStoryIndex((value) => value - 1);
    else if (ownerIndex > 0) setOwnerIndex((value) => value - 1);
  }, [ownerIndex, storyIndex]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setStories([]);
    setStoryIndex(0);
    void loadOwnerStories(preview.owner)
      .then((loaded) => {
        if (!active) return;
        setStories(loaded);
        const preferred = Math.min(Math.max(preview.readCount, 0), Math.max(loaded.length - 1, 0));
        setStoryIndex(preferred);
        if (loaded.length === 0) setError('Истории недоступны или уже удалены');
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : String(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadOwnerStories, preview.owner, preview.readCount]);

  useEffect(() => {
    if (!story) return;
    void markStory(story.owner, story.id).catch(() => undefined);
  }, [markStory, story]);

  useEffect(() => {
    if (!story || story.media?.type !== 'photo' || paused) return undefined;
    const timer = setTimeout(advance, PHOTO_DURATION_MS);
    return () => clearTimeout(timer);
  }, [advance, paused, story]);

  const sendReaction = async (emoji: string) => {
    if (!story || reactionBusy) return;
    setReactionBusy(true);
    try {
      await reactToStory(story.owner, story.id, emoji);
    } finally {
      setReactionBusy(false);
    }
  };

  const playbackUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded && status.didJustFinish) advance();
  }, [advance]);

  const media = useMemo(() => {
    if (!story?.media?.url) return null;
    if (story.media.type === 'video') {
      return (
        <Video
          isLooping={false}
          onPlaybackStatusUpdate={playbackUpdate}
          ref={videoRef}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={!paused}
          source={{ uri: story.media.url }}
          style={styles.media}
          useNativeControls={false}
        />
      );
    }
    if (story.media.type === 'photo') {
      return <Image contentFit="contain" source={{ uri: story.media.url }} style={styles.media} transition={180} />;
    }
    return null;
  }, [paused, playbackUpdate, story]);

  return (
    <Modal animationType="fade" onRequestClose={onClose} presentationStyle="fullScreen" visible>
      <View style={styles.container}>
        {media}
        {!media && !loading ? (
          <View style={styles.center}>
            <Ionicons color="#AAB4D0" name="image-outline" size={46} />
            <Text style={styles.emptyText}>{error ?? 'Медиа недоступно'}</Text>
          </View>
        ) : null}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#FFFFFF" size="large" />
          </View>
        ) : null}

        <Pressable
          delayLongPress={160}
          onLongPress={() => setPaused(true)}
          onPress={(event) => {
            setPaused(false);
            if (event.nativeEvent.locationX < Dimensions.get('window').width * 0.32) rewind();
            else advance();
          }}
          onPressOut={() => setPaused(false)}
          style={StyleSheet.absoluteFill}
        />

        <LinearGradient colors={['rgba(0,0,0,0.72)', 'transparent']} style={styles.topShade}>
          <SafeAreaView>
            <View style={styles.progressRow}>
              {(stories.length > 0 ? stories : [null]).map((item, index) => (
                <View key={item?.id ?? 'empty'} style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: index < storyIndex ? '100%' : index === storyIndex ? '45%' : '0%' },
                    ]}
                  />
                </View>
              ))}
            </View>
            <View style={styles.header}>
              <View style={styles.avatarWrap}>
                {preview.ownerInfo.avatarUrl ? (
                  <Image source={{ uri: preview.ownerInfo.avatarUrl }} style={styles.avatar} />
                ) : (
                  <Text style={styles.avatarFallback}>{preview.ownerInfo.name.slice(0, 1).toUpperCase()}</Text>
                )}
              </View>
              <View style={styles.ownerText}>
                <Text numberOfLines={1} style={styles.ownerName}>{preview.ownerInfo.name}</Text>
                <Text style={styles.timeText}>{formatStoryTime(story?.time)}</Text>
              </View>
              <Pressable hitSlop={12} onPress={onClose} style={styles.closeButton}>
                <Ionicons color="#FFFFFF" name="close" size={30} />
              </Pressable>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {story ? (
          <SafeAreaView pointerEvents="box-none" style={styles.reactionSafe}>
            <View style={styles.reactions}>
              {REACTIONS.map((emoji) => (
                <Pressable
                  disabled={reactionBusy}
                  key={emoji}
                  onPress={() => void sendReaction(emoji)}
                  style={({ pressed }) => [styles.reactionButton, pressed && styles.reactionPressed]}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </SafeAreaView>
        ) : null}
      </View>
    </Modal>
  );
}

function formatStoryTime(raw?: number): string {
  if (!raw) return '';
  const milliseconds = raw < 1_000_000_000_000 ? raw * 1000 : raw;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' }).format(date);
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#000000', flex: 1 },
  media: { backgroundColor: '#000000', height: '100%', width: '100%' },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    gap: 14,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: { color: '#CDD4E8', fontSize: 15, lineHeight: 21, textAlign: 'center' },
  topShade: { left: 0, paddingBottom: 72, position: 'absolute', right: 0, top: 0 },
  progressRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingTop: 8 },
  progressTrack: { backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 2, flex: 1, height: 3 },
  progressFill: { backgroundColor: '#FFFFFF', borderRadius: 2, height: 3 },
  header: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: 12, paddingTop: 10 },
  avatarWrap: {
    alignItems: 'center',
    backgroundColor: '#5B75F7',
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 40,
  },
  avatar: { height: '100%', width: '100%' },
  avatarFallback: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  ownerText: { flex: 1, marginLeft: 10 },
  ownerName: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  timeText: { color: 'rgba(255,255,255,0.72)', fontSize: 12, marginTop: 2 },
  closeButton: { alignItems: 'center', height: 42, justifyContent: 'center', width: 42 },
  reactionSafe: { bottom: 0, left: 0, position: 'absolute', right: 0 },
  reactions: {
    alignSelf: 'center',
    backgroundColor: 'rgba(14,18,30,0.82)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 2,
    marginBottom: 12,
    padding: 5,
  },
  reactionButton: { alignItems: 'center', borderRadius: 22, height: 42, justifyContent: 'center', width: 42 },
  reactionPressed: { backgroundColor: 'rgba(255,255,255,0.18)', transform: [{ scale: 1.12 }] },
  reactionEmoji: { fontSize: 24 },
});
