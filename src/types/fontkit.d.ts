declare module 'fontkit' {
  export interface Font {
    familyName: string;
    fullName: string;
    postscriptName: string;
  }
  
  export function openSync(path: string): Font;
}
