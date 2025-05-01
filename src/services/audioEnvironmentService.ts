import { SoundEnvironment, getEnvironmentConfig, getSoundUrl } from '../config/soundEnvironments';
import { logger } from '../config/development';

class AudioEnvironmentService {
  private audioContext: AudioContext | null = null;
  private mainAmbienceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private additionalSoundNodes: Map<string, AudioBufferSourceNode> = new Map();
  private audioBufferCache: Map<string, AudioBuffer> = new Map();
  private currentEnvironment: SoundEnvironment | null = null;
  private isPlaying: boolean = false;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      logger.info('Contexte audio initialisé');
    } catch (error) {
      logger.error('Erreur lors de l\'initialisation du contexte audio:', error);
    }
  }

  private async loadAudioFile(url: string): Promise<AudioBuffer> {
    if (this.audioBufferCache.has(url)) {
      return this.audioBufferCache.get(url)!;
    }

    try {
      // Charger directement le fichier audio
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
      this.audioBufferCache.set(url, audioBuffer);
      return audioBuffer;
    } catch (error) {
      logger.error(`Erreur lors du chargement du son ${url}:`, error);
      throw error;
    }
  }

  private async playSound(
    buffer: AudioBuffer,
    options: {
      loop?: boolean;
      volume?: number;
      fadeInDuration?: number;
      fadeOutDuration?: number;
    } = {}
  ): Promise<AudioBufferSourceNode> {
    if (!this.audioContext) {
      throw new Error('Contexte audio non initialisé');
    }

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;
    source.loop = options.loop ?? false;

    // Configuration du volume initial
    gainNode.gain.value = 0;

    // Connexion des nodes
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Démarrage de la lecture avec fade in
    source.start();
    if (options.fadeInDuration) {
      gainNode.gain.linearRampToValueAtTime(
        options.volume ?? 1,
        this.audioContext.currentTime + options.fadeInDuration / 1000
      );
    } else {
      gainNode.gain.value = options.volume ?? 1;
    }

    return source;
  }

  private stopSound(
    source: AudioBufferSourceNode,
    fadeOutDuration: number = 0
  ) {
    if (!this.audioContext) return;

    const gainNode = source.context.createGain();
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    if (fadeOutDuration > 0) {
      gainNode.gain.linearRampToValueAtTime(
        0,
        this.audioContext.currentTime + fadeOutDuration / 1000
      );
      setTimeout(() => {
        source.stop();
        source.disconnect();
      }, fadeOutDuration);
    } else {
      source.stop();
      source.disconnect();
    }
  }

  private async playAdditionalSounds(environment: SoundEnvironment) {
    if (!environment.additionalSounds) return;

    for (const soundConfig of environment.additionalSounds) {
      const buffer = await this.loadAudioFile(getSoundUrl(soundConfig.sound));
      
      const playSound = async () => {
        if (!this.isPlaying) return;

        const source = await this.playSound(buffer, {
          volume: soundConfig.volume
        });

        this.additionalSoundNodes.set(soundConfig.sound, source);

        source.onended = () => {
          this.additionalSoundNodes.delete(soundConfig.sound);
          
          if (soundConfig.interval && this.isPlaying) {
            const delay = soundConfig.random
              ? Math.random() * soundConfig.interval
              : soundConfig.interval;
            setTimeout(playSound, delay);
          }
        };
      };

      if (soundConfig.interval) {
        const initialDelay = soundConfig.random
          ? Math.random() * soundConfig.interval
          : soundConfig.interval;
        setTimeout(playSound, initialDelay);
      } else {
        playSound();
      }
    }
  }

  public async playEnvironment(environmentName: string) {
    try {
      const environment = getEnvironmentConfig(environmentName);
      
      // Si le même environnement est déjà en cours de lecture, ne rien faire
      if (
        this.currentEnvironment?.name === environment.name &&
        this.isPlaying
      ) {
        return;
      }

      // Arrêter l'environnement actuel si nécessaire
      await this.stopCurrentEnvironment();

      this.currentEnvironment = environment;
      this.isPlaying = true;

      // Charger et jouer l'ambiance principale
      const mainBuffer = await this.loadAudioFile(
        getSoundUrl(environment.mainAmbience)
      );
      
      this.mainAmbienceNode = await this.playSound(mainBuffer, {
        loop: environment.loop,
        volume: environment.volume,
        fadeInDuration: environment.fadeInDuration
      });

      // Jouer les sons additionnels
      await this.playAdditionalSounds(environment);

      logger.info(`Environnement sonore "${environment.name}" démarré`);
    } catch (error) {
      logger.error('Erreur lors de la lecture de l\'environnement sonore:', error);
    }
  }

  public async stopCurrentEnvironment() {
    if (!this.currentEnvironment || !this.isPlaying) return;

    this.isPlaying = false;

    // Arrêter l'ambiance principale
    if (this.mainAmbienceNode) {
      this.stopSound(
        this.mainAmbienceNode,
        this.currentEnvironment.fadeOutDuration
      );
      this.mainAmbienceNode = null;
    }

    // Arrêter les sons additionnels
    this.additionalSoundNodes.forEach((node) => {
      this.stopSound(node, this.currentEnvironment?.fadeOutDuration);
    });
    this.additionalSoundNodes.clear();

    logger.info(`Environnement sonore "${this.currentEnvironment.name}" arrêté`);
    this.currentEnvironment = null;
  }

  public setVolume(volume: number) {
    if (!this.audioContext || !this.gainNode) return;
    
    // Limiter le volume entre 0 et 1
    const normalizedVolume = Math.max(0, Math.min(1, volume));
    this.gainNode.gain.value = normalizedVolume;
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

// Exporter une instance unique du service
export const audioEnvironmentService = new AudioEnvironmentService();
