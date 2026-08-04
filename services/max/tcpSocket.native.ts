import { Buffer } from 'buffer';
import TcpSocket from 'react-native-tcp-socket';

import type { ConnectOptions, MaxSocket } from './tcpTypes';

export function connectTlsSocket(options: ConnectOptions): Promise<MaxSocket> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const socket = TcpSocket.connectTLS(
      {
        host: options.host,
        port: options.port,
        connectTimeout: options.timeoutMs,
      },
      () => {
        if (settled) return;
        settled = true;
        resolve({
          write(data) {
            socket.write(Buffer.from(data));
          },
          destroy() {
            socket.destroy();
          },
          onData(listener) {
            socket.on('data', (chunk: Buffer | string) => {
              const bytes = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
              listener(Uint8Array.from(bytes));
            });
          },
          onError(listener) {
            socket.on('error', (error: Error) => listener(error));
          },
          onClose(listener) {
            socket.on('close', () => listener());
          },
        });
      },
    );

    socket.once('error', (error: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(error);
    });
  });
}
