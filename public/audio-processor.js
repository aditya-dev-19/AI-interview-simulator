/**
 * PCMProcessor — AudioWorkletProcessor
 *
 * Runs in the AudioWorklet thread. Accumulates microphone samples, downsamples
 * to 16 kHz mono PCM16, and posts Int16Array chunks to the main thread at
 * roughly `targetChunkMs` intervals (default 100 ms).
 *
 * Using AudioWorkletNode (vs the deprecated ScriptProcessorNode) gives us:
 *  • No deprecation warning
 *  • Processing on a dedicated real-time audio thread
 *  • No audio echo — the node is a "sink" (numberOfOutputs: 0) so it never
 *    routes mic audio to the speakers
 */
class PCMProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const targetMs = options?.processorOptions?.targetChunkMs ?? 100;
    // sampleRate is a global in AudioWorkletGlobalScope.
    // Collect ~targetMs of source-rate audio before converting to 16 kHz PCM16.
    this._targetSamples = Math.round((sampleRate * targetMs) / 1000);
    this._buffer = new Float32Array(this._targetSamples * 2);
    this._writePos = 0;
  }

  _downsampleTo16kPcm16(float32Data) {
    if (sampleRate === 16000) {
      const out = new Int16Array(float32Data.length);
      for (let i = 0; i < float32Data.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Data[i]));
        out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      return out;
    }

    const ratio = sampleRate / 16000;
    const outLength = Math.max(1, Math.round(float32Data.length / ratio));
    const out = new Int16Array(outLength);
    let offsetBuffer = 0;

    for (let offsetOut = 0; offsetOut < outLength; offsetOut++) {
      const nextOffsetBuffer = Math.round((offsetOut + 1) * ratio);
      let accum = 0;
      let count = 0;

      for (let i = offsetBuffer; i < nextOffsetBuffer && i < float32Data.length; i++) {
        accum += float32Data[i];
        count++;
      }

      const avg = count > 0 ? accum / count : 0;
      const s = Math.max(-1, Math.min(1, avg));
      out[offsetOut] = s < 0 ? s * 0x8000 : s * 0x7fff;
      offsetBuffer = nextOffsetBuffer;
    }

    return out;
  }

  process(inputs) {
    const channel = inputs?.[0]?.[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      this._buffer[this._writePos++] = channel[i];

      if (this._writePos >= this._targetSamples) {
        // Convert on the worklet thread and transfer Int16 PCM payload.
        const floatChunk = this._buffer.slice(0, this._writePos);
        const pcm16 = this._downsampleTo16kPcm16(floatChunk);
        this.port.postMessage({ type: 'pcm16', data: pcm16 }, [pcm16.buffer]);
        // Reset — allocate fresh backing buffer for next accumulation
        this._buffer = new Float32Array(this._targetSamples * 2);
        this._writePos = 0;
      }
    }

    return true; // keep processor alive
  }
}

registerProcessor('pcm-processor', PCMProcessor);
