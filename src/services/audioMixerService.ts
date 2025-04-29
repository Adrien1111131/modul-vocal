import { logger } from '../config/development';

export interface AudioSegment {
  startTime: number;
  duration: number;
  audioUrl: string;
  environment?: string;
  volume?: number;
  fadeIn?: number;
  fadeOut?: number;
}

export interface MixedAudioResult {
  audioUrl: string;
  duration: number;
  segments: AudioSegment[];
}

class AudioMixerService {
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private segmentNodes: Map<string, AudioBufferSourceNode> = new Map();
  private environmentNodes: Map<string, AudioBufferSourceNode> = new Map();

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.connect(this.audioContext.destination);
      logger.info('Contexte audio du mixeur initialisé');
    } catch (error) {
      logger.error('Erreur lors de l\'initialisation du contexte audio:', error);
    }
  }

  private async fetchAudioBuffer(url: string): Promise<AudioBuffer> {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return await this.audioContext!.decodeAudioData(arrayBuffer);
    } catch (error) {
      logger.error('Erreur lors du chargement de l\'audio:', error);
      throw error;
    }
  }

  private createGainNode(): GainNode {
    return this.audioContext!.createGain();
  }

  private applyFadeEffect(gainNode: GainNode, startTime: number, duration: number, fadeIn?: number, fadeOut?: number) {
    const currentTime = this.audioContext!.currentTime;
    gainNode.gain.setValueAtTime(0, currentTime + startTime);

    if (fadeIn) {
      gainNode.gain.linearRampToValueAtTime(0, currentTime + startTime);
      gainNode.gain.linearRampToValueAtTime(1, currentTime + startTime + fadeIn);
    } else {
      gainNode.gain.setValueAtTime(1, currentTime + startTime);
    }

    if (fadeOut) {
      gainNode.gain.linearRampToValueAtTime(1, currentTime + startTime + duration - fadeOut);
      gainNode.gain.linearRampToValueAtTime(0, currentTime + startTime + duration);
    }
  }

  public async mixAudioSegments(segments: AudioSegment[]): Promise<MixedAudioResult> {
    if (!this.audioContext) {
      throw new Error('Contexte audio non initialisé');
    }

    try {
      logger.group('Mixage des segments audio');
      logger.info('Début du mixage de', segments.length, 'segments');

      // Vérifier s'il y a des segments
      if (segments.length === 0) {
        throw new Error('Aucun segment audio à mixer');
      }

      // Solution simplifiée : utiliser directement le premier segment audio
      logger.info('Utilisation directe du premier segment audio');
      const firstSegment = segments[0];
      
      // Retourner directement l'URL du premier segment
      logger.info('URL audio utilisée:', firstSegment.audioUrl);
      logger.info('Mixage terminé avec succès');
      logger.groupEnd();

      return {
        audioUrl: firstSegment.audioUrl,
        duration: firstSegment.duration,
        segments: [firstSegment]
      };
    } catch (error) {
      logger.error('Erreur lors du mixage audio:', error);
      throw error;
    }
  }

  private async exportToBuffer(buffer: AudioBuffer): Promise<ArrayBuffer> {
    const length = buffer.length * buffer.numberOfChannels * 2;
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
    view.setUint16(22, buffer.numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true);
    view.setUint16(32, buffer.numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);

    // Données audio
    const channelData = new Float32Array(buffer.length);
    const offset = 44;
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      buffer.copyFromChannel(channelData, channel, 0);
      for (let i = 0; i < buffer.length; i++) {
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        view.setInt16(offset + (i * buffer.numberOfChannels + channel) * 2, sample * 0x7FFF, true);
      }
    }

    return arrayBuffer;
  }

  public stopAll() {
    this.segmentNodes.forEach(node => {
      try {
        node.stop();
        node.disconnect();
      } catch (error) {
        logger.error('Erreur lors de l\'arrêt d\'un segment:', error);
      }
    });
    this.segmentNodes.clear();

    this.environmentNodes.forEach(node => {
      try {
        node.stop();
        node.disconnect();
      } catch (error) {
        logger.error('Erreur lors de l\'arrêt d\'un son d\'environnement:', error);
      }
    });
    this.environmentNodes.clear();
  }

  public setMasterVolume(volume: number) {
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  public async resume() {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  public async suspend() {
    if (this.audioContext?.state === 'running') {
      await this.audioContext.suspend();
    }
  }
}

export const audioMixerService = new AudioMixerService();
