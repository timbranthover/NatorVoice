export type TrimSilenceOptions = {
  threshold?: number;
  minDurationMs?: number;
};

function maxAbsAtSample(buffer: AudioBuffer, index: number) {
  let max = 0;

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const value = Math.abs(buffer.getChannelData(channel)[index] ?? 0);
    if (value > max) {
      max = value;
    }
  }

  return max;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function audioBufferToWavBuffer(buffer: AudioBuffer): ArrayBuffer {
  const channelCount = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const sampleCount = buffer.length;
  const dataSize = sampleCount * channelCount * bytesPerSample;
  const totalSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  let offset = 0;
  const writeString = (value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
    offset += value.length;
  };

  writeString("RIFF");
  view.setUint32(offset, 36 + dataSize, true);
  offset += 4;
  writeString("WAVE");
  writeString("fmt ");
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, channelCount, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, sampleRate * channelCount * bytesPerSample, true);
  offset += 4;
  view.setUint16(offset, channelCount * bytesPerSample, true);
  offset += 2;
  view.setUint16(offset, bitsPerSample, true);
  offset += 2;
  writeString("data");
  view.setUint32(offset, dataSize, true);
  offset += 4;

  const channels: Float32Array[] = [];
  for (let channel = 0; channel < channelCount; channel += 1) {
    channels.push(buffer.getChannelData(channel));
  }

  for (let i = 0; i < sampleCount; i += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const sample = clamp(channels[channel]?.[i] ?? 0, -1, 1);
      const pcm = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, pcm, true);
      offset += 2;
    }
  }

  return arrayBuffer;
}

async function decodeBlob(blob: Blob) {
  const AudioContextConstructor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error("This browser does not support audio decoding.");
  }

  const context = new AudioContextConstructor();
  try {
    const audioData = await blob.arrayBuffer();
    return await context.decodeAudioData(audioData.slice(0));
  } finally {
    await context.close();
  }
}

function trimAudioBuffer(buffer: AudioBuffer, threshold: number, minDurationMs: number) {
  const minDurationSamples = Math.floor((minDurationMs / 1000) * buffer.sampleRate);
  let start = 0;
  let end = buffer.length - 1;

  while (start < buffer.length && maxAbsAtSample(buffer, start) < threshold) {
    start += 1;
  }

  while (end > start && maxAbsAtSample(buffer, end) < threshold) {
    end -= 1;
  }

  const trimmedLength = end - start + 1;
  if (trimmedLength <= 0 || trimmedLength >= buffer.length || trimmedLength < minDurationSamples) {
    return {
      buffer,
      didTrim: false,
      trimmedLeadingMs: 0,
      trimmedTrailingMs: 0,
    };
  }

  const trimmed = new AudioBuffer({
    length: trimmedLength,
    numberOfChannels: buffer.numberOfChannels,
    sampleRate: buffer.sampleRate,
  });

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const source = buffer.getChannelData(channel);
    const target = trimmed.getChannelData(channel);
    target.set(source.subarray(start, end + 1));
  }

  return {
    buffer: trimmed,
    didTrim: true,
    trimmedLeadingMs: Math.floor((start / buffer.sampleRate) * 1000),
    trimmedTrailingMs: Math.floor(((buffer.length - 1 - end) / buffer.sampleRate) * 1000),
  };
}

export function buildWaveformBars(buffer: AudioBuffer, bars = 48): number[] {
  const channel = buffer.getChannelData(0);
  const blockSize = Math.floor(channel.length / bars) || 1;
  const amplitudes: number[] = [];

  for (let i = 0; i < bars; i += 1) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, channel.length);
    let peak = 0;

    for (let sample = start; sample < end; sample += 1) {
      const value = Math.abs(channel[sample] ?? 0);
      if (value > peak) {
        peak = value;
      }
    }

    amplitudes.push(peak);
  }

  const maxValue = Math.max(...amplitudes, 0.01);
  return amplitudes.map((value) => clamp(value / maxValue, 0.04, 1));
}

export async function analyzeAudioWaveform(blob: Blob, bars = 48) {
  const decoded = await decodeBlob(blob);
  return {
    bars: buildWaveformBars(decoded, bars),
    durationMs: Math.floor(decoded.duration * 1000),
  };
}

export async function trimSilence(blob: Blob, options?: TrimSilenceOptions) {
  const threshold = clamp(options?.threshold ?? 0.015, 0.002, 0.1);
  const minDurationMs = clamp(options?.minDurationMs ?? 250, 120, 1000);

  const decoded = await decodeBlob(blob);
  const result = trimAudioBuffer(decoded, threshold, minDurationMs);
  const wavBuffer = audioBufferToWavBuffer(result.buffer);
  const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });
  const durationMs = Math.floor(result.buffer.duration * 1000);

  return {
    blob: wavBlob,
    didTrim: result.didTrim,
    durationMs,
    trimmedLeadingMs: result.trimmedLeadingMs,
    trimmedTrailingMs: result.trimmedTrailingMs,
    bars: buildWaveformBars(result.buffer),
  };
}
