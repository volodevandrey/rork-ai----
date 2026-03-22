import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

import { StoredImage } from "@/types/app";
import { persistBase64Image } from "@/services/storage/fileStorage";

async function optimizeAsset(uri: string): Promise<{
  base64: string;
  width: number;
  height: number;
}> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1600 } }],
    {
      compress: 0.82,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    },
  );

  if (!result.base64) {
    throw new Error("Не удалось подготовить изображение.");
  }

  return {
    base64: result.base64,
    width: result.width,
    height: result.height,
  };
}

async function createStoredImage(uri: string, fileNamePrefix: string): Promise<StoredImage> {
  const optimized = await optimizeAsset(uri);
  const mimeType = "image/jpeg";
  const persistedUri = await persistBase64Image({
    base64: optimized.base64,
    mimeType,
    fileNamePrefix,
  });

  console.log("[imageService] stored image created", persistedUri);

  return {
    uri: persistedUri,
    mimeType,
    width: optimized.width,
    height: optimized.height,
  };
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
    quality: 0.9,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  return createStoredImage(result.assets[0].uri, fileNamePrefix);
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
    quality: 0.9,
    cameraType: ImagePicker.CameraType.back,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  return createStoredImage(result.assets[0].uri, fileNamePrefix);
}
