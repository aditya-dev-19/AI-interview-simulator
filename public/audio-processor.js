/**
 * PCMProcessor — AudioWorkletProcessor
 *
 * Runs in the AudioWorklet thread. Accumulates microphone samples and posts
 * Float32Array chunks to the main thread at roughly `targetChunkMs` intervals
 * (default 120 ms). The main thread then downsamples to PCM-16 at 16 kHz and
 * forwards the bytes to the Gemini Live API.
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
    const targetMs = options?.processorOptions?.targetChunkMs ?? 120;
    // sampleRate is a global in AudioWorkletGlobalScope
    this._targetSamples = Math.round((sampleRate * targetMs) / 1000);
    this._buffer = new Float32Array(this._targetSamples * 2);
    this._writePos = 0;
  }

  process(inputs) {
    const channel = inputs?.[0]?.[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      this._buffer[this._writePos++] = channel[i];

      if (this._writePos >= this._targetSamples) {
        // Transfer ownership of the buffer to the main thread (zero-copy)
        const chunk = this._buffer.slice(0, this._writePos);
        this.port.postMessage({ type: 'audio', data: chunk }, [chunk.buffer]);
        // Reset — allocate fresh backing buffer for next accumulation
        this._buffer = new Float32Array(this._targetSamples * 2);
        this._writePos = 0;
      }
    }

    return true; // keep processor alive
  }
}

registerProcessor('pcm-processor', PCMProcessor);
