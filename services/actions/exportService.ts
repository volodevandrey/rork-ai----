import { Platform, Share } from "react-native";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";

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

  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Нет доступа к галерее. Разрешите доступ и попробуйте снова.");
  }

  await MediaLibrary.createAssetAsync(uri);
}

export async function shareImage(uri: string, title: string): Promise<void> {
  console.log("[exportService] share image", uri);

  const isSharingAvailable = await Sharing.isAvailableAsync();
  if (isSharingAvailable && Platform.OS !== "web" && uri.startsWith("file://")) {
    await Sharing.shareAsync(uri, {
      UTI: "public.jpeg",
      dialogTitle: title,
      mimeType: "image/jpeg",
    });
    return;
  }

  await Share.share({
    title,
    message: title,
    url: uri,
  });
}
