import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { SaveFormat, manipulateAsync } from "expo-image-manipulator";

import { StoredImage } from "@/types/app";
import { persistBase64Image } from "@/services/storage/fileStorage";

const MAX_IMAGE_SIDE = 1536;
const JPEG_QUALITY = 0.8;

function getResizedDimensions(width: number, height: number): { width: number; height: number } {
  const longestSide = Math.max(width, height);
  const scale = MAX_IMAGE_SIDE / longestSide;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function prepareImageForUpload(params: {
  uri: string;
  width: number;
  height: number;
}): Promise<{ uri: string; width: number; height: number }> {
  const { uri, width, height } = params;

  if (width <= 0 || height <= 0) {
    return { uri, width, height };
  }

  if (width <= MAX_IMAGE_SIDE && height <= MAX_IMAGE_SIDE) {
    return { uri, width, height };
  }

  if (Platform.OS === "web" || uri.startsWith("data:")) {
    return { uri, width, height };
  }

  const resized = getResizedDimensions(width, height);
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: resized.width, height: resized.height } }],
    {
      compress: JPEG_QUALITY,
      format: SaveFormat.JPEG,
    },
  );

  console.log("[imageService] image resized before upload", {
    from: { width, height },
    to: resized,
  });

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}

async function createStoredImage(uri: string, width: number, height: number, fileNamePrefix: string): Promise<StoredImage> {
  const mimeType = "image/jpeg";

  if (Platform.OS === "web" || uri.startsWith("data:")) {
    // Веб: URI уже data-url или blob
    const base64 = uri.startsWith("data:") ? uri.split(",")[1] ?? "" : "";
    const persistedUri = await persistBase64Image({ base64, mimeType, fileNamePrefix });
    return { uri: persistedUri, mimeType, width, height };
  }

  // Нативные платформы: читаем файл как base64
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const persistedUri = await persistBase64Image({ base64, mimeType, fileNamePrefix });
  console.log("[imageService] stored image created", persistedUri);

  return { uri: persistedUri, mimeType, width, height };
}

export async function pickImageFromLibrary(fileNamePrefix: string): Promise<StoredImage | null> {
  console.log("[imageService] picking image from library");
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Нет доступа к галерее. Разрешите доступ и попробуйте снова.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  const prepared = await prepareImageForUpload({
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
  });
  return createStoredImage(prepared.uri, prepared.width, prepared.height, fileNamePrefix);
}

export async function captureImage(fileNamePrefix: string): Promise<StoredImage | null> {
  console.log("[imageService] capturing image from camera");
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Нет доступа к камере. Разрешите доступ и попробуйте снова.");
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.8,
    cameraType: ImagePicker.CameraType.back,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  const prepared = await prepareImageForUpload({
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
  });
  return createStoredImage(prepared.uri, prepared.width, prepared.height, fileNamePrefix);
}
