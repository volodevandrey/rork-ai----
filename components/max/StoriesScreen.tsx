import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useMax } from '@/providers/MaxProvider';
import type { StoryPreview } from '@/services/max/types';

import { StoryViewer } from './StoryViewer';

export function StoriesScreen() {
  const {
    loading,
    error,
    profile,
    stories,
    refreshStories,
    publishStory,
    signOut,
    clearError,
  } = useMax();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Мой MAX';

  const confirmSignOut = () => {
    Alert.alert('Выйти из аккаунта?', 'Сохранённая сессия будет удалена с этого iPhone.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <LinearGradient colors={['#0B1020', '#111A36', '#0B1020']} style={styles.fill}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>MAX</Text>
            <Text style={styles.title}>Истории</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="Обновить истории"
              disabled={loading}
              onPress={() => void refreshStories()}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <Ionicons color="#CDD6F6" name="refresh" size={21} />
            </Pressable>
            <Pressable
              accessibilityLabel="Выйти"
              onPress={confirmSignOut}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <Ionicons color="#CDD6F6" name="log-out-outline" size={22} />
            </Pressable>
          </View>
        </View>

        {error ? (
          <Pressable onPress={clearError} style={styles.errorBox}>
            <Ionicons color="#FF9A9A" name="alert-circle-outline" size={20} />
            <Text style={styles.errorText}>{error}</Text>
            <Ionicons color="#AAB4D0" name="close" size={18} />
          </Pressable>
        ) : null}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              onRefresh={() => void refreshStories()}
              refreshing={loading}
              tintColor="#7D94FF"
            />
          }
        >
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.profileAvatarImage} />
              ) : (
                <Text style={styles.profileAvatarText}>{displayName.slice(0, 1).toUpperCase()}</Text>
              )}
            </View>
            <View style={styles.profileText}>
              <Text numberOfLines={1} style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileSubtitle}>Аккаунт подключён</Text>
            </View>
            <Pressable
              disabled={loading}
              onPress={() => void publishStory()}
              style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons color="#FFFFFF" name="add" size={25} />
              )}
              <Text style={styles.addButtonText}>Добавить</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>Новые истории</Text>
          {stories.length > 0 ? (
            <ScrollView
              contentContainerStyle={styles.ringsRow}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {stories.map((preview, index) => (
                <StoryRing
                  key={`${preview.owner.type}:${preview.owner.ownerId}`}
                  onPress={() => setSelectedIndex(index)}
                  preview={preview}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons color="#7F93E8" name="albums-outline" size={34} />
              </View>
              <Text style={styles.emptyTitle}>{loading ? 'Загружаем истории…' : 'Новых историй пока нет'}</Text>
              <Text style={styles.emptyText}>
                Потяните экран вниз или нажмите кнопку обновления. Здесь показывается Android-лента MAX.
              </Text>
            </View>
          )}

          <View style={styles.infoCard}>
            <Ionicons color="#8EA4FF" name="shield-checkmark-outline" size={24} />
            <View style={styles.infoTextWrap}>
              <Text style={styles.infoTitle}>Сессия хранится на iPhone</Text>
              <Text style={styles.infoText}>
                Номер, код и пароль не отправляются на сторонний сервер. Приложение подключается напрямую к MAX.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {selectedIndex !== null ? (
        <StoryViewer
          onClose={() => {
            setSelectedIndex(null);
            void refreshStories();
          }}
          previews={stories}
          startIndex={selectedIndex}
        />
      ) : null}
    </LinearGradient>
  );
}

function StoryRing({ preview, onPress }: { preview: StoryPreview; onPress(): void }) {
  const unread = preview.totalCount > preview.readCount;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.ringItem, pressed && styles.ringPressed]}>
      <LinearGradient
        colors={unread ? ['#5B75F7', '#A756F5', '#FF6C8A'] : ['#4B556F', '#4B556F']}
        style={styles.ringGradient}
      >
        <View style={styles.ringInner}>
          {preview.ownerInfo.avatarUrl ? (
            <Image source={{ uri: preview.ownerInfo.avatarUrl }} style={styles.ringImage} />
          ) : (
            <Text style={styles.ringFallback}>{preview.ownerInfo.name.slice(0, 1).toUpperCase()}</Text>
          )}
        </View>
      </LinearGradient>
      {preview.totalCount > 1 ? (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{preview.totalCount}</Text>
        </View>
      ) : null}
      <Text numberOfLines={2} style={styles.ringName}>{preview.ownerInfo.name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  eyebrow: { color: '#8198FF', fontSize: 12, fontWeight: '800', letterSpacing: 2.4 },
  title: { color: '#FFFFFF', fontSize: 31, fontWeight: '800', marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(33,46,81,0.75)',
    borderColor: 'rgba(132,151,219,0.18)',
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  errorBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 90, 90, 0.12)',
    borderColor: 'rgba(255, 130, 130, 0.25)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 2,
    marginHorizontal: 20,
    padding: 13,
  },
  errorText: { color: '#FFD0D0', flex: 1, fontSize: 13, lineHeight: 18 },
  scrollContent: { paddingBottom: 36, paddingTop: 10 },
  profileCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(26,38,70,0.82)',
    borderColor: 'rgba(128,151,235,0.18)',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: 20,
    padding: 14,
  },
  profileAvatar: {
    alignItems: 'center',
    backgroundColor: '#546FEF',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 50,
  },
  profileAvatarImage: { height: '100%', width: '100%' },
  profileAvatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  profileText: { flex: 1, marginHorizontal: 12 },
  profileName: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  profileSubtitle: { color: '#8390AE', fontSize: 12, marginTop: 3 },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#5B75F7',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 3,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  sectionTitle: { color: '#EAF0FF', fontSize: 18, fontWeight: '700', marginHorizontal: 20, marginTop: 26 },
  ringsRow: { gap: 15, paddingHorizontal: 20, paddingVertical: 17 },
  ringItem: { alignItems: 'center', position: 'relative', width: 76 },
  ringPressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  ringGradient: { alignItems: 'center', borderRadius: 36, height: 72, justifyContent: 'center', width: 72 },
  ringInner: {
    alignItems: 'center',
    backgroundColor: '#1A2542',
    borderColor: '#10182C',
    borderRadius: 32,
    borderWidth: 3,
    height: 64,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 64,
  },
  ringImage: { height: '100%', width: '100%' },
  ringFallback: { color: '#FFFFFF', fontSize: 23, fontWeight: '800' },
  countBadge: {
    alignItems: 'center',
    backgroundColor: '#5B75F7',
    borderColor: '#0D1427',
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    minWidth: 20,
    paddingHorizontal: 4,
    position: 'absolute',
    right: 0,
    top: 50,
  },
  countText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  ringName: { color: '#C8D0E6', fontSize: 12, lineHeight: 15, marginTop: 8, textAlign: 'center' },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(24,35,63,0.58)',
    borderColor: 'rgba(128,151,235,0.16)',
    borderRadius: 22,
    borderWidth: 1,
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(95,119,225,0.14)',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  emptyTitle: { color: '#EAF0FF', fontSize: 17, fontWeight: '700', marginTop: 14 },
  emptyText: { color: '#8792AD', fontSize: 13, lineHeight: 19, marginTop: 7, textAlign: 'center' },
  infoCard: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(25,38,70,0.6)',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
  },
  infoTextWrap: { flex: 1 },
  infoTitle: { color: '#DCE5FF', fontSize: 14, fontWeight: '700' },
  infoText: { color: '#8490AC', fontSize: 12, lineHeight: 17, marginTop: 4 },
});
