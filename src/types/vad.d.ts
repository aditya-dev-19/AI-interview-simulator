declare module '@ricky0123/vad-web' {
  export interface MicVADOptions {
    baseAssetPath?: string;
    onnxWASMBasePath?: string;
    getStream?: () => Promise<MediaStream>;
    pauseStream?: (stream: MediaStream) => Promise<void>;
    onSpeechRealStart?: () => void;
    onSpeechEnd?: () => void;
    positiveSpeechThreshold?: number;
    negativeSpeechThreshold?: number;
    minSpeechMs?: number;
    redemptionMs?: number;
    preSpeechPadMs?: number;
    [key: string]: any;
  }

  export class MicVAD {
    static new(options: MicVADOptions): Promise<MicVAD>;
    start(): void;
    pause(): void;
    listening: boolean;
  }
}
