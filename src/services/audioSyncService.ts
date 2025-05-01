import { logger } from '../config/development';
import { soundEnvironments, getSoundUrl } from '../config/soundEnvironments';

export interface AmbianceQueueItem {
  url: string;
  startTime: number;
  duration: number;
  volume?: number;
}

class AudioSyncService {
  private audioContext: AudioContext | null = null;
  private ambianceSources: AudioBufferSourceNode[] = [];
  private audioBufferCache: Map<string, AudioBuffer> = new Map();
  
  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      logger.info('Contexte audio de synchronisation initialisé');
    } catch (error) {
      logger.error('Erreur lors de l\'initialisation du contexte audio:', error);
    }
  }

  /**
   * Estime la durée d'une phrase en fonction du nombre de mots et de la vitesse moyenne
   * @param text Texte de la phrase
   * @param wordsPerMinute Vitesse de parole en mots par minute (par défaut 150)
   * @returns Durée estimée en secondes
   */
  public estimatePhraseDuration(text: string, wordsPerMinute: number = 150): number {
    const words = text.trim().split(/\s+/).length;
    const durationInMinutes = words / wordsPerMinute;
    return durationInMinutes * 60;
  }

  /**
   * Crée une file d'attente d'ambiance en fonction du texte
   * @param phrases Tableau de phrases
   * @param environments Tableau d'environnements correspondants
   * @returns File d'attente d'ambiance
   */
  public createAmbianceQueue(
    phrases: string[],
    environments: string[]
  ): AmbianceQueueItem[] {
    const queue: AmbianceQueueItem[] = [];
    let currentTime = 0;

    phrases.forEach((phrase, index) => {
      const duration = this.estimatePhraseDuration(phrase);
      
      if (index < environments.length && environments[index]) {
        const envName = environments[index];
        const envConfig = soundEnvironments[envName] || soundEnvironments.default;
        
        queue.push({
          url: getSoundUrl(envConfig.mainAmbience),
          startTime: currentTime,
          duration: duration,
          volume: envConfig.volume
        });
      }
      
      currentTime += duration;
    });

    return queue;
  }

  /**
   * Charge un fichier audio et le met en cache
   * @param url URL du fichier audio
   * @returns Promise avec le buffer audio
   */
  private async loadAudioBuffer(url: string): Promise<AudioBuffer> {
    if (this.audioBufferCache.has(url)) {
      return this.audioBufferCache.get(url)!;
    }

    try {
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

  /**
   * Joue les sons d'ambiance en fonction de la file d'attente
   * @param queue File d'attente d'ambiance
   */
  public async playMixedAudio(queue: AmbianceQueueItem[]): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Contexte audio non initialisé');
    }

    // Arrêter tous les sons d'ambiance en cours
    this.stopAll();

    // Jouer chaque son d'ambiance dans la file d'attente
    for (const item of queue) {
      try {
        const buffer = await this.loadAudioBuffer(item.url);
        const ambianceSource = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        
        // Configurer le volume
        gainNode.gain.value = item.volume || 0.3;
        
        // Configurer la source
        ambianceSource.buffer = buffer;
        ambianceSource.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Programmer le démarrage et l'arrêt
        ambianceSource.start(this.audioContext.currentTime + item.startTime);
        ambianceSource.stop(this.audioContext.currentTime + item.startTime + item.duration);
        
        // Stocker la source pour pouvoir l'arrêter plus tard
        this.ambianceSources.push(ambianceSource);
        
        logger.info(`Son d'ambiance programmé: ${item.url} à ${item.startTime}s pour ${item.duration}s`);
      } catch (error) {
        logger.error(`Erreur lors de la lecture du son d'ambiance ${item.url}:`, error);
      }
    }
  }

  /**
   * Arrête tous les sons d'ambiance en cours
   */
  public stopAll(): void {
    this.ambianceSources.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch (error) {
        // Ignorer les erreurs si la source est déjà arrêtée
      }
    });
    this.ambianceSources = [];
  }

  /**
   * Reprend la lecture audio
   */
  public async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Met en pause la lecture audio
   */
  public async suspend(): Promise<void> {
    if (this.audioContext?.state === 'running') {
      await this.audioContext.suspend();
    }
  }
}

export const audioSyncService = new AudioSyncService();
