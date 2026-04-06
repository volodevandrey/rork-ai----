import { Audio } from "expo-av";
import { Platform } from "react-native";

let nativeRecording: Audio.Recording | null = null;
let webMediaRecorder: MediaRecorder | null = null;
let webStream: MediaStream | null = null;
let webChunks: Blob[] = [];

const nativeRecordingOptions = {
  isMeteringEnabled: true,
  keepAudioActiveHint: true,
  android: {
    extension: ".m4a",
    outputFormat: 2,
    audioEncoder: 3,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: ".wav",
    outputFormat: "lpcm",
    audioQuality: 96,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: 128000,
  },
};

function getSpeechToTextUrl(): string {
  return new URL(
    "/stt/transcribe/",
    process.env.EXPO_PUBLIC_TOOLKIT_URL ?? "https://toolkit.rork.com",
  ).toString();
}

async function transcribeFormData(formData: FormData): Promise<string> {
  const response = await fetch(getSpeechToTextUrl(), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log("[voiceService] transcription failed", response.status, errorText);
    throw new Error("Не удалось распознать речь. Попробуйте ещё раз или введите текст вручную.");
  }

  const data = (await response.json()) as { text?: string };
  if (!data.text) {
    throw new Error("Не удалось распознать речь. Попробуйте ещё раз или введите текст вручную.");
  }

  return data.text;
}

export async function startVoiceCapture(): Promise<void> {
  console.log("[voiceService] start capture", Platform.OS);

  if (Platform.OS === "web") {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Голосовой ввод недоступен в этом браузере.");
    }

    webStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    webChunks = [];
    webMediaRecorder = new MediaRecorder(webStream, {
      mimeType: "audio/webm",
    });

    webMediaRecorder.addEventListener("dataavailable", (event: BlobEvent) => {
      if (event.data.size > 0) {
        webChunks.push(event.data);
      }
    });

    webMediaRecorder.start();
    return;
  }

  const permission = await Audio.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Нет доступа к микрофону. Разрешите доступ и попробуйте снова.");
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(nativeRecordingOptions);
  await recording.startAsync();
  nativeRecording = recording;
}

export async function stopVoiceCaptureAndTranscribe(): Promise<string> {
  console.log("[voiceService] stop capture", Platform.OS);

  if (Platform.OS === "web") {
    const recorder = webMediaRecorder;
    if (!recorder) {
      throw new Error("Запись не запущена.");
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        resolve(new Blob(webChunks, { type: "audio/webm" }));
      };
      recorder.onerror = () => {
        reject(new Error("Не удалось завершить запись."));
      };
      recorder.stop();
    });

    webStream?.getTracks().forEach((track) => track.stop());
    webMediaRecorder = null;
    webStream = null;
    webChunks = [];

    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");
    formData.append("language", "ru");

    return transcribeFormData(formData);
  }

  if (!nativeRecording) {
    throw new Error("Запись не запущена.");
  }

  const recording = nativeRecording;
  nativeRecording = null;

  await recording.stopAndUnloadAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

  const uri = recording.getURI();
  if (!uri) {
    throw new Error("Не удалось получить аудиофайл.");
  }

  const extension = Platform.OS === "ios" ? "wav" : "m4a";
  const formData = new FormData();
  formData.append(
    "audio",
    {
      uri,
      name: `recording.${extension}`,
      type: `audio/${extension}`,
    } as never,
  );
  formData.append("language", "ru");

  return transcribeFormData(formData);
}
