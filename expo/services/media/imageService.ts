import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

import { StoredImage } from "@/types/app";
import { persistBase64Image } from "@/services/storage/fileStorage";

async function createStoredImage(uri: string, width: number, height: number, fileNamePrefix: string): Promise<StoredImage> {
  const mimeType = "image/jpeg";

  if (Platform.OS === "web" || uri.startsWith("data:")) {
    const base64 = uri.startsWith("data:") ? uri.split(",")[1] ?? "" : "";
    const persistedUri = await persistBase64Image({ base64, mimeType, fileNamePrefix });
    return { uri: persistedUri, mimeType, width, height };
  }

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
  return createStoredImage(asset.uri, asset.width, asset.height, fileNamePrefix);
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
  return createStoredImage(asset.uri, asset.width, asset.height, fileNamePrefix);
}
