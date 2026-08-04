import type { ConnectOptions, MaxSocket } from './tcpTypes';

export async function connectTlsSocket(_options: ConnectOptions): Promise<MaxSocket> {
  throw new Error('MAX использует TCP/TLS. Откройте приложение из Development Build или TestFlight.');
}
