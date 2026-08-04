export interface MaxSocket {
  write(data: Uint8Array): void;
  destroy(): void;
  onData(listener: (data: Uint8Array) => void): void;
  onError(listener: (error: Error) => void): void;
  onClose(listener: () => void): void;
}

export interface ConnectOptions {
  host: string;
  port: number;
  timeoutMs: number;
}
