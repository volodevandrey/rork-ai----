import AsyncStorage from "@react-native-async-storage/async-storage";

const LICENSE_KEY = "@furniture-ai/license";

// ⚠️ Должен совпадать с LICENSE_SECRET в keygen.py
const LICENSE_SECRET = "renderai-mf-2026-secret-key";

// Точка отсчёта — 1 января 2025, 00:00 UTC (в миллисекундах)
const EPOCH_MS = Date.UTC(2025, 0, 1);
const DAY_MS = 86_400_000;

export interface LicenseInfo {
  key: string;
  activatedAt: number;
  expiresAt: number;
  durationDays: number;
}

export interface LicenseStatus {
  isActive: boolean;
  license: LicenseInfo | null;
  daysLeft: number;
}

// ---------- FNV-1a хэш (идентичен Python-версии) ----------

function fnv1a(data: string): number {
  let h = 0x811c9dc5;

  for (let i = 0; i < data.length; i += 1) {
    h ^= data.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
    h = h >>> 0; // unsigned 32-bit
  }

  return h;
}

function computeChecksum(nonce: string, days: number, created: number): string {
  const base = `${LICENSE_SECRET}:${nonce}:${days}:${created}`;
  const h1 = fnv1a(base);
  const h2 = fnv1a(base + ":v2");

  const part1 = h1.toString(16).padStart(8, "0").slice(0, 3);
  const part2 = h2.toString(16).padStart(8, "0").slice(0, 3);

  return (part1 + part2).toUpperCase();
}

// ---------- Валидация ключа ----------

export function validateKey(key: string): {
  valid: boolean;
  days: number;
  createdDaysSinceEpoch: number;
  error?: string;
} {
  const clean = key.trim().toUpperCase().replace(/^RAI-/, "").replace(/-/g, "");

  if (clean.length !== 16) {
    return { valid: false, days: 0, createdDaysSinceEpoch: 0, error: "Неверный формат ключа" };
  }

  if (!/^[0-9A-F]{16}$/.test(clean)) {
    return { valid: false, days: 0, createdDaysSinceEpoch: 0, error: "Ключ содержит недопустимые символы" };
  }

  const nonce = clean.slice(0, 4);
  const days = parseInt(clean.slice(4, 6), 16);
  const created = parseInt(clean.slice(6, 10), 16);
  const checksum = clean.slice(10, 16);

  const expected = computeChecksum(nonce, days, created);

  if (checksum !== expected) {
    return { valid: false, days: 0, createdDaysSinceEpoch: 0, error: "Недействительный ключ" };
  }

  // Проверяем что ключ ещё не истёк с момента создания
  const createdMs = EPOCH_MS + created * DAY_MS;
  const expiresMs = createdMs + days * DAY_MS;

  if (Date.now() > expiresMs) {
    return { valid: false, days, createdDaysSinceEpoch: created, error: "Срок действия ключа истёк" };
  }

  return { valid: true, days, createdDaysSinceEpoch: created };
}

// ---------- Активация ----------

export async function activateLicense(key: string): Promise<LicenseInfo> {
  const result = validateKey(key);

  if (!result.valid) {
    throw new Error(result.error ?? "Недействительный ключ");
  }

  const createdMs = EPOCH_MS + result.createdDaysSinceEpoch * DAY_MS;
  const expiresAt = createdMs + result.days * DAY_MS;
  const now = Date.now();

  const license: LicenseInfo = {
    key: key.trim().toUpperCase(),
    activatedAt: now,
    expiresAt,
    durationDays: result.days,
  };

  console.log("[licenseService] activate license", license.key, result.days, "days");
  await AsyncStorage.setItem(LICENSE_KEY, JSON.stringify(license));

  return license;
}

// ---------- Загрузка и проверка ----------

export async function loadLicense(): Promise<LicenseInfo | null> {
  try {
    const raw = await AsyncStorage.getItem(LICENSE_KEY);
    if (!raw) {
      return null;
    }

    const license = JSON.parse(raw) as LicenseInfo;

    if (!license.key || !license.expiresAt) {
      return null;
    }

    return license;
  } catch (error) {
    console.log("[licenseService] load error", error);
    return null;
  }
}

export async function getLicenseStatus(): Promise<LicenseStatus> {
  const license = await loadLicense();

  if (!license) {
    return { isActive: false, license: null, daysLeft: 0 };
  }

  const now = Date.now();
  const isActive = now < license.expiresAt;
  const daysLeft = isActive
    ? Math.max(0, Math.ceil((license.expiresAt - now) / DAY_MS))
    : 0;

  return { isActive, license, daysLeft };
}

export async function removeLicense(): Promise<void> {
  console.log("[licenseService] remove license");
  await AsyncStorage.removeItem(LICENSE_KEY);
}
