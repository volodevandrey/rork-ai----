import { Platform, Share } from "react-native";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";

export type ShareImageResult = "shared" | "saved" | "web-shared" | "downloaded";

export async function saveImageToGallery(uri: string): Promise<void> {
  console.log("[exportService] save image", uri);

  if (Platform.OS === "web") {
    const link = document.createElement("a");
    link.href = uri;
    link.download = `mebel-ai-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) {
    throw new Error("Нет доступа к галерее. Разрешите доступ и попробуйте снова.");
  }

  await MediaLibrary.saveToLibraryAsync(uri);
}

export async function shareImage(uri: string, title: string): Promise<ShareImageResult> {
  console.log("[exportService] share image", uri);

  if (Platform.OS !== "web") {
    const isSharingAvailable = await Sharing.isAvailableAsync();

    if (isSharingAvailable && uri.startsWith("file://")) {
      try {
        await Sharing.shareAsync(uri, {
          UTI: "public.jpeg",
          dialogTitle: title,
          mimeType: "image/jpeg",
        });
        return "shared";
      } catch (error) {
        console.log("[exportService] native share fallback to gallery", error);
      }
    }

    await saveImageToGallery(uri);
    return "saved";
  }

  try {
    await Share.share({
      title,
      message: title,
      url: uri,
    });
    return "web-shared";
  } catch (error) {
    console.log("[exportService] web share fallback to download", error);
    await saveImageToGallery(uri);
    return "downloaded";
  }
}
