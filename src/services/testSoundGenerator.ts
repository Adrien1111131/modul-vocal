import { logger } from '../config/development';

class TestSoundGenerator {
  private audioContext: AudioContext | null = null;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      logger.error('Erreur lors de l\'initialisation du contexte audio:', error);
    }
  }

  private async generateTestSound(
    type: OscillatorType,
    frequency: number,
    duration: number,
    volume: number = 0.1
  ): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Contexte audio non initialisé');
    }

    const sampleRate = this.audioContext.sampleRate;
    const numberOfSamples = duration * sampleRate;
    const buffer = this.audioContext.createBuffer(1, numberOfSamples, sampleRate);
    const channelData = buffer.getChannelData(0);

    // Générer le son
    for (let i = 0; i < numberOfSamples; i++) {
      const t = i / sampleRate;
      
      // Ajouter une modulation de fréquence pour plus de réalisme
      const modulation = 1 + 0.01 * Math.sin(2 * Math.PI * 0.5 * t);
      const value = Math.sin(2 * Math.PI * frequency * t * modulation);
      
      // Ajouter un peu de bruit pour plus de naturel
      const noise = (Math.random() * 2 - 1) * 0.05;
      
      // Appliquer une enveloppe pour éviter les clics
      const fadeInDuration = 0.1;
      const fadeOutDuration = 0.1;
      const fadeIn = Math.min(1, t / fadeInDuration);
      const fadeOut = Math.min(1, (duration - t) / fadeOutDuration);
      const envelope = Math.min(fadeIn, fadeOut);
      
      channelData[i] = (value + noise) * envelope * volume;
    }

    return buffer;
  }

  private async generateComplexSound(
    baseFrequency: number,
    harmonics: Array<{ frequency: number; volume: number }>,
    duration: number,
    baseVolume: number = 0.1,
    type: OscillatorType = 'sine'
  ): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Contexte audio non initialisé');
    }

    const sampleRate = this.audioContext.sampleRate;
    const numberOfSamples = duration * sampleRate;
    const buffer = this.audioContext.createBuffer(1, numberOfSamples, sampleRate);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < numberOfSamples; i++) {
      const t = i / sampleRate;
      let value = 0;

      // Son de base
      const baseModulation = 1 + 0.01 * Math.sin(2 * Math.PI * 0.5 * t);
      value += Math.sin(2 * Math.PI * baseFrequency * t * baseModulation) * baseVolume;

      // Ajouter les harmoniques
      harmonics.forEach(({ frequency, volume }) => {
        const harmonicModulation = 1 + 0.005 * Math.sin(2 * Math.PI * 0.3 * t);
        value += Math.sin(2 * Math.PI * frequency * t * harmonicModulation) * volume;
      });

      // Ajouter du bruit
      const noise = (Math.random() * 2 - 1) * 0.05 * baseVolume;
      value += noise;

      // Appliquer une enveloppe
      const fadeInDuration = 0.1;
      const fadeOutDuration = 0.1;
      const fadeIn = Math.min(1, t / fadeInDuration);
      const fadeOut = Math.min(1, (duration - t) / fadeOutDuration);
      const envelope = Math.min(fadeIn, fadeOut);

      channelData[i] = value * envelope;
    }

    return buffer;
  }

  public async generateBedroomAmbience(): Promise<Blob> {
    // Son doux et apaisant avec légère réverbération
    const buffer = await this.generateComplexSound(60, [
      { frequency: 120, volume: 0.02 },
      { frequency: 180, volume: 0.01 },
      { frequency: 240, volume: 0.005 }
    ], 10, 0.05);
    return this.bufferToBlob(buffer);
  }

  public async generateOceanWaves(): Promise<Blob> {
    // Son des vagues avec harmoniques
    const buffer = await this.generateComplexSound(40, [
      { frequency: 80, volume: 0.04 },
      { frequency: 120, volume: 0.03 },
      { frequency: 160, volume: 0.02 }
    ], 10, 0.08);
    return this.bufferToBlob(buffer);
  }

  public async generateForestAmbience(): Promise<Blob> {
    // Sons de la forêt avec oiseaux
    const buffer = await this.generateComplexSound(220, [
      { frequency: 440, volume: 0.02 },
      { frequency: 880, volume: 0.01 },
      { frequency: 1760, volume: 0.005 }
    ], 10, 0.03, 'triangle');
    return this.bufferToBlob(buffer);
  }

  public async generateRain(): Promise<Blob> {
    // Pluie avec variations de fréquence
    const buffer = await this.generateComplexSound(800, [
      { frequency: 1200, volume: 0.01 },
      { frequency: 1600, volume: 0.008 },
      { frequency: 2000, volume: 0.005 }
    ], 10, 0.02, 'triangle');
    return this.bufferToBlob(buffer);
  }

  public async generateCityAmbience(): Promise<Blob> {
    // Ambiance urbaine complexe
    const buffer = await this.generateComplexSound(100, [
      { frequency: 200, volume: 0.03 },
      { frequency: 300, volume: 0.02 },
      { frequency: 400, volume: 0.01 }
    ], 10, 0.04, 'sawtooth');
    return this.bufferToBlob(buffer);
  }

  public async generateFireplace(): Promise<Blob> {
    // Crépitement du feu
    const buffer = await this.generateComplexSound(50, [
      { frequency: 100, volume: 0.04 },
      { frequency: 150, volume: 0.03 },
      { frequency: 200, volume: 0.02 }
    ], 10, 0.06, 'sawtooth');
    return this.bufferToBlob(buffer);
  }

  public async generateNightAmbience(): Promise<Blob> {
    // Sons nocturnes avec grillons
    const buffer = await this.generateComplexSound(600, [
      { frequency: 1200, volume: 0.015 },
      { frequency: 2400, volume: 0.01 },
      { frequency: 3600, volume: 0.005 }
    ], 10, 0.025, 'triangle');
    return this.bufferToBlob(buffer);
  }

  public async generateWaterStream(): Promise<Blob> {
    // Ruisseau qui coule
    const buffer = await this.generateComplexSound(300, [
      { frequency: 600, volume: 0.03 },
      { frequency: 900, volume: 0.02 },
      { frequency: 1200, volume: 0.01 }
    ], 10, 0.04);
    return this.bufferToBlob(buffer);
  }

  public async generateCafeAmbience(): Promise<Blob> {
    // Ambiance de café
    const buffer = await this.generateComplexSound(150, [
      { frequency: 300, volume: 0.025 },
      { frequency: 450, volume: 0.015 },
      { frequency: 600, volume: 0.01 }
    ], 10, 0.035, 'triangle');
    return this.bufferToBlob(buffer);
  }

  public async generateSpaceAmbience(): Promise<Blob> {
    // Ambiance spatiale
    const buffer = await this.generateComplexSound(20, [
      { frequency: 40, volume: 0.04 },
      { frequency: 60, volume: 0.03 },
      { frequency: 80, volume: 0.02 }
    ], 10, 0.05, 'sine');
    return this.bufferToBlob(buffer);
  }

  private async bufferToBlob(buffer: AudioBuffer): Promise<Blob> {
    // Convertir le buffer audio en WAV
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length * numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);

    // En-tête WAV
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);

    // Données audio
    const offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset + (i * numberOfChannels + channel) * 2, sample * 0x7FFF, true);
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }
}

export const testSoundGenerator = new TestSoundGenerator();
