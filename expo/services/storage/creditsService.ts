import AsyncStorage from "@react-native-async-storage/async-storage";

import { ImageQuality, VariantCount } from "@/types/app";

const USER_CREDITS_KEY = "user_credits";
const INITIAL_CREDITS = 10;

const creditsPerVariant: Record<ImageQuality, number> = {
  low: 1,
  medium: 2,
  high: 4,
};

function normalizeCredits(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

async function persistCredits(credits: number): Promise<void> {
  const normalizedCredits = Math.max(0, Math.floor(credits));
  console.log("[creditsService] persist credits", normalizedCredits);
  await AsyncStorage.setItem(USER_CREDITS_KEY, String(normalizedCredits));
}

export function getCost(quality: ImageQuality, variantCount: VariantCount): number {
  return creditsPerVariant[quality] * variantCount;
}

export async function getCredits(): Promise<number> {
  const rawValue = await AsyncStorage.getItem(USER_CREDITS_KEY);
  const credits = normalizeCredits(rawValue);

  if (credits !== null) {
    console.log("[creditsService] loaded credits", credits);
    return credits;
  }

  console.log("[creditsService] initialize free credits", INITIAL_CREDITS);
  await persistCredits(INITIAL_CREDITS);
  return INITIAL_CREDITS;
}

export async function spendCredits(
  quality: ImageQuality,
  variantCount: VariantCount,
): Promise<void> {
  const currentCredits = await getCredits();
  const cost = getCost(quality, variantCount);

  console.log("[creditsService] spend request", {
    currentCredits,
    cost,
    quality,
    variantCount,
  });

  if (currentCredits < cost) {
    throw new Error(`Недостаточно кредитов. Нужно ${cost}, у вас ${currentCredits}.`);
  }

  await persistCredits(currentCredits - cost);
}

export async function addCredits(amount: number): Promise<void> {
  const safeAmount = Math.max(0, Math.floor(amount));
  const currentCredits = await getCredits();

  console.log("[creditsService] add credits", {
    amount: safeAmount,
    currentCredits,
  });

  await persistCredits(currentCredits + safeAmount);
}
