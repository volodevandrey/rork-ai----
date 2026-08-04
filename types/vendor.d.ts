declare module 'lz4js' {
  const lz4: {
    decompress(input: Uint8Array | number[]): Uint8Array | number[];
  };
  export default lz4;
}
