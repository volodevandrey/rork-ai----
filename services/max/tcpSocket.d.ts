import type { ConnectOptions, MaxSocket } from './tcpTypes';

export function connectTlsSocket(options: ConnectOptions): Promise<MaxSocket>;
