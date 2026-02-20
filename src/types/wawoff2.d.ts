declare module 'wawoff2' {
  export function convert(input: Buffer | Uint8Array): Buffer;
  export function decompress(input: Buffer | Uint8Array): Buffer;
  const wawoff2: {
    convert(input: Buffer | Uint8Array): Buffer;
    decompress(input: Buffer | Uint8Array): Buffer;
  };
  export default wawoff2;
}
