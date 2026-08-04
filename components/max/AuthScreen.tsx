import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useMax } from '@/providers/MaxProvider';

export function AuthScreen() {
  const {
    phase,
    loading,
    error,
    phone: storedPhone,
    passwordHint,
    requestCode,
    resendCode,
    verifyCode,
    verifyPassword,
    backToPhone,
    clearError,
  } = useMax();
  const [phone, setPhone] = useState(storedPhone || '+7');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 12_000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [clearError, error]);

  if (phase === 'booting') {
    return (
      <LinearGradient colors={['#0B1020', '#111A36']} style={styles.fill}>
        <View style={styles.boot}>
          <Logo />
          <ActivityIndicator color="#6C8CFF" size="large" />
          <Text style={styles.bootText}>Подключаемся к MAX…</Text>
        </View>
      </LinearGradient>
    );
  }

  const isPhone = phase === 'signedOut';
  const isCode = phase === 'waitingCode';
  const title = isPhone ? 'Вход в MAX' : isCode ? 'Код подтверждения' : 'Пароль MAX';
  const subtitle = isPhone
    ? 'Введите номер аккаунта. Код придёт через MAX или SMS.'
    : isCode
      ? `Код отправлен на ${storedPhone}`
      : passwordHint
        ? `Подсказка: ${passwordHint}`
        : 'Для аккаунта включена двухэтапная защита.';

  const submit = () => {
    if (isPhone) void requestCode(phone);
    else if (isCode) void verifyCode(code);
    else void verifyPassword(password);
  };

  return (
    <LinearGradient colors={['#0B1020', '#111A36', '#0B1020']} style={styles.fill}>
      <SafeAreaView style={styles.fill}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <View style={styles.content}>
            <Logo />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            {error ? (
              <Pressable onPress={clearError} style={styles.errorBox}>
                <Ionicons color="#FF9A9A" name="alert-circle-outline" size={20} />
                <Text style={styles.errorText}>{error}</Text>
              </Pressable>
            ) : null}

            {isPhone ? (
              <TextInput
                autoComplete="tel"
                autoFocus
                editable={!loading}
                keyboardType="phone-pad"
                onChangeText={setPhone}
                onSubmitEditing={submit}
                placeholder="+7 999 123-45-67"
                placeholderTextColor="#6E7896"
                returnKeyType="go"
                style={styles.input}
                textContentType="telephoneNumber"
                value={phone}
              />
            ) : isCode ? (
              <TextInput
                autoComplete="one-time-code"
                autoFocus
                editable={!loading}
                keyboardType="number-pad"
                maxLength={8}
                onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
                onSubmitEditing={submit}
                placeholder="Код"
                placeholderTextColor="#6E7896"
                style={[styles.input, styles.codeInput]}
                textContentType="oneTimeCode"
                value={code}
              />
            ) : (
              <TextInput
                autoFocus
                editable={!loading}
                onChangeText={setPassword}
                onSubmitEditing={submit}
                placeholder="Пароль"
                placeholderTextColor="#6E7896"
                returnKeyType="go"
                secureTextEntry
                style={styles.input}
                textContentType="password"
                value={password}
              />
            )}

            <Pressable
              disabled={loading}
              onPress={submit}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, loading && styles.disabled]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>{isPhone ? 'Получить код' : 'Продолжить'}</Text>
              )}
            </Pressable>

            {isCode ? (
              <Pressable disabled={loading} onPress={() => void resendCode()} style={styles.linkButton}>
                <Text style={styles.linkText}>Отправить код ещё раз</Text>
              </Pressable>
            ) : null}
            {!isPhone ? (
              <Pressable disabled={loading} onPress={backToPhone} style={styles.linkButton}>
                <Text style={styles.mutedLink}>Изменить номер</Text>
              </Pressable>
            ) : null}

            <Text style={styles.disclaimer}>
              Неофициальный клиент. Данные входа сохраняются только в защищённом хранилище iPhone.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Logo() {
  return (
    <View style={styles.logo}>
      <LinearGradient colors={['#5575FF', '#8757FF']} style={styles.logoGradient}>
        <Text style={styles.logoText}>M</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  boot: { alignItems: 'center', flex: 1, gap: 20, justifyContent: 'center' },
  bootText: { color: '#AAB4D0', fontSize: 15 },
  container: { flex: 1, justifyContent: 'center' },
  content: { alignItems: 'stretch', paddingHorizontal: 28, paddingVertical: 24 },
  logo: { alignItems: 'center', marginBottom: 26 },
  logoGradient: {
    alignItems: 'center',
    borderRadius: 26,
    height: 76,
    justifyContent: 'center',
    shadowColor: '#6C62FF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    width: 76,
  },
  logoText: { color: '#FFFFFF', fontSize: 38, fontWeight: '800' },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', textAlign: 'center' },
  subtitle: {
    color: '#AAB4D0',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
    marginTop: 10,
    textAlign: 'center',
  },
  errorBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 90, 90, 0.12)',
    borderColor: 'rgba(255, 130, 130, 0.25)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
    padding: 13,
  },
  errorText: { color: '#FFD0D0', flex: 1, fontSize: 14, lineHeight: 19 },
  input: {
    backgroundColor: '#17213C',
    borderColor: '#273556',
    borderRadius: 16,
    borderWidth: 1,
    color: '#FFFFFF',
    fontSize: 18,
    height: 58,
    paddingHorizontal: 18,
  },
  codeInput: { fontSize: 26, fontWeight: '700', letterSpacing: 8, textAlign: 'center' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#5B75F7',
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    marginTop: 14,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.58 },
  linkButton: { alignItems: 'center', padding: 13 },
  linkText: { color: '#91A4FF', fontSize: 15, fontWeight: '600' },
  mutedLink: { color: '#8791AA', fontSize: 15 },
  disclaimer: {
    color: '#66718C',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 24,
    textAlign: 'center',
  },
});
