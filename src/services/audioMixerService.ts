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
      this.initAudioContext();
      if (!this.audioContext) {
        throw new Error('Contexte audio non initialisé');
      }
    }

    try {
      logger.group('Mixage des segments audio');
      logger.info('Début du mixage de', segments.length, 'segments');

      // Vérifier s'il y a des segments
      if (segments.length === 0) {
        throw new Error('Aucun segment audio à mixer');
      }

      // Si un seul segment sans ambiance, retourner directement
      if (segments.length === 1 && !segments[0].environment) {
        logger.info('Un seul segment sans ambiance, pas besoin de mixage');
        const segment = segments[0];
        logger.info('URL audio utilisée:', segment.audioUrl);
        logger.info('Mixage terminé avec succès');
        logger.groupEnd();
        return {
          audioUrl: segment.audioUrl,
          duration: segment.duration,
          segments: [segment]
        };
      }

      // Charger tous les buffers audio
      logger.info('Chargement des buffers audio pour', segments.length, 'segments');
      const bufferPromises = segments.map(async segment => {
        try {
          return {
            buffer: await this.fetchAudioBuffer(segment.audioUrl),
            segment
          };
        } catch (error) {
          logger.error(`Erreur lors du chargement du buffer pour ${segment.audioUrl}:`, error);
          return null;
        }
      });

      const bufferResults = await Promise.all(bufferPromises);
      const validBuffers = bufferResults.filter(result => result !== null) as { buffer: AudioBuffer; segment: AudioSegment }[];

      if (validBuffers.length === 0) {
        throw new Error('Aucun buffer audio valide n\'a pu être chargé');
      }

      // Trouver la durée maximale
      const maxDuration = Math.max(...validBuffers.map(result => {
        const { buffer, segment } = result;
        const endTime = (segment.startTime || 0) + buffer.duration;
        return endTime;
      }));

      logger.info('Durée maximale calculée:', maxDuration, 'secondes');

      // Créer un buffer de sortie
      const sampleRate = this.audioContext.sampleRate;
      const outputLength = Math.ceil(maxDuration * sampleRate);
      const outputBuffer = this.audioContext.createBuffer(
        2, // stéréo
        outputLength,
        sampleRate
      );

      // Mixer les segments
      logger.info('Mixage des buffers audio...');
      validBuffers.forEach(({ buffer, segment }) => {
        const startSample = Math.floor((segment.startTime || 0) * sampleRate);
        const volume = segment.volume !== undefined ? segment.volume : 1.0;
        
        // Appliquer le volume et les fondus
        for (let channel = 0; channel < Math.min(buffer.numberOfChannels, 2); channel++) {
          const outputData = outputBuffer.getChannelData(channel);
          const inputData = buffer.getChannelData(channel);
          
          // Calculer les points de fondu
          const fadeInSamples = segment.fadeIn ? Math.floor(segment.fadeIn * sampleRate) : 0;
          const fadeOutSamples = segment.fadeOut ? Math.floor(segment.fadeOut * sampleRate) : 0;
          
          for (let i = 0; i < buffer.length; i++) {
            if (startSample + i < outputLength) {
              // Calculer le gain du fondu
              let fadeGain = 1.0;
              
              // Fondu d'entrée
              if (fadeInSamples > 0 && i < fadeInSamples) {
                fadeGain = i / fadeInSamples;
              }
              
              // Fondu de sortie
              if (fadeOutSamples > 0 && i > buffer.length - fadeOutSamples) {
                fadeGain = (buffer.length - i) / fadeOutSamples;
              }
              
              // Appliquer le volume et le fondu
              const gain = volume * fadeGain;
              
              // Ajouter au buffer de sortie (mixage additif)
              outputData[startSample + i] += inputData[i] * gain;
            }
          }
        }
      });

      // Normaliser le buffer pour éviter l'écrêtage
      logger.info('Normalisation du buffer audio...');
      this.normalizeBuffer(outputBuffer);

      // Exporter en WAV
      logger.info('Exportation du buffer en WAV...');
      const wavData = await this.exportToBuffer(outputBuffer);
      const blob = new Blob([wavData], { type: 'audio/wav' });
      const mixedUrl = URL.createObjectURL(blob) + '#.wav';

      logger.info('URL audio mixée créée:', mixedUrl);
      logger.info('Mixage terminé avec succès');
      logger.groupEnd();

      return {
        audioUrl: mixedUrl,
        duration: maxDuration,
        segments
      };
    } catch (error) {
      logger.error('Erreur lors du mixage audio:', error);
      logger.groupEnd();
      
      // En cas d'erreur, retourner le premier segment si disponible
      if (segments.length > 0) {
        logger.info('Utilisation du premier segment comme fallback');
        const firstSegment = segments[0];
        return {
          audioUrl: firstSegment.audioUrl,
          duration: firstSegment.duration,
          segments: [firstSegment]
        };
      }
      
      throw error;
    }
  }
  
  private normalizeBuffer(buffer: AudioBuffer) {
    // Trouver la valeur maximale dans le buffer
    let maxValue = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        const absValue = Math.abs(channelData[i]);
        if (absValue > maxValue) {
          maxValue = absValue;
        }
      }
    }
    
    // Si le maximum est supérieur à 0.95, normaliser pour éviter l'écrêtage
    if (maxValue > 0.95) {
      const gain = 0.95 / maxValue;
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < channelData.length; i++) {
          channelData[i] *= gain;
        }
      }
    }
  }

  private async exportToBuffer(buffer: AudioBuffer): Promise<ArrayBuffer> {
    // Calculer la taille des données audio (16 bits par échantillon)
    const bytesPerSample = 2; // 16 bits = 2 bytes
    const numChannels = buffer.numberOfChannels;
    const length = buffer.length * numChannels * bytesPerSample;
    const arrayBuffer = new ArrayBuffer(44 + length); // 44 bytes pour l'en-tête WAV
    const view = new DataView(arrayBuffer);

    // Écrire l'en-tête WAV (PCM 16 bits)
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // Chunk RIFF
    writeString(0, 'RIFF');                                    // ChunkID
    view.setUint32(4, 36 + length, true);                      // ChunkSize
    writeString(8, 'WAVE');                                    // Format

    // Sous-chunk "fmt"
    writeString(12, 'fmt ');                                   // Sous-chunk 1 ID
    view.setUint32(16, 16, true);                              // Sous-chunk 1 taille (16 pour PCM)
    view.setUint16(20, 1, true);                               // Format audio (1 = PCM)
    view.setUint16(22, numChannels, true);                     // Nombre de canaux
    view.setUint32(24, buffer.sampleRate, true);               // Taux d'échantillonnage
    view.setUint32(28, buffer.sampleRate * numChannels * bytesPerSample, true); // Débit binaire
    view.setUint16(32, numChannels * bytesPerSample, true);    // Bloc d'alignement
    view.setUint16(34, bytesPerSample * 8, true);              // Bits par échantillon (16 bits)

    // Sous-chunk "data"
    writeString(36, 'data');                                   // Sous-chunk 2 ID
    view.setUint32(40, length, true);                          // Sous-chunk 2 taille

    // Écrire les données audio (conversion de Float32 à Int16)
    const offset = 44;
    let dataIndex = 0;

    // Interleave les canaux
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = buffer.getChannelData(channel)[i];
        // Limiter l'échantillon entre -1 et 1, puis convertir en Int16
        const limitedSample = Math.max(-1, Math.min(1, sample));
        const int16Sample = Math.round(limitedSample * 0x7FFF); // 0x7FFF = 32767 (max value for 16-bit signed int)
        view.setInt16(offset + dataIndex, int16Sample, true);
        dataIndex += bytesPerSample;
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
