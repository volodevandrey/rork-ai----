import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

const IMAGE_DIRECTORY = "furniture-ai";

function getExtensionFromMimeType(mimeType: string): string {
  if (mimeType.includes("png")) {
    return "png";
  }

  if (mimeType.includes("webp")) {
    return "webp";
  }

  return "jpg";
}

function sanitizeBase64(input: string): string {
  if (input.startsWith("data:")) {
    return input.split(",")[1] ?? "";
  }

  return input;
}

async function ensureImageDirectory(): Promise<string | null> {
  if (Platform.OS === "web") {
    return null;
  }

  const baseDirectory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!baseDirectory) {
    throw new Error("Не удалось открыть локальное хранилище.");
  }

  const targetDirectory = `${baseDirectory}${IMAGE_DIRECTORY}`;
  const info = await FileSystem.getInfoAsync(targetDirectory);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(targetDirectory, { intermediates: true });
  }

  return targetDirectory;
}

export async function persistBase64Image(params: {
  base64: string;
  mimeType: string;
  fileNamePrefix: string;
}): Promise<string> {
  const { base64, mimeType, fileNamePrefix } = params;
  const safeBase64 = sanitizeBase64(base64);

  if (Platform.OS === "web") {
    return `data:${mimeType};base64,${safeBase64}`;
  }

  const directory = await ensureImageDirectory();
  const extension = getExtensionFromMimeType(mimeType);
  const uri = `${directory}/${fileNamePrefix}-${Date.now()}.${extension}`;

  await FileSystem.writeAsStringAsync(uri, safeBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  console.log("[fileStorage] image persisted", uri);
  return uri;
}

export async function readBase64FromUri(uri: string): Promise<string> {
  if (uri.startsWith("data:")) {
    return sanitizeBase64(uri);
  }

  if (Platform.OS === "web") {
    throw new Error("Не удалось прочитать изображение в веб-версии.");
  }

  console.log("[fileStorage] reading base64 from uri", uri);
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export async function deleteImageIfNeeded(uri: string): Promise<void> {
  if (Platform.OS === "web" || uri.startsWith("data:")) {
    return;
  }

  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}
