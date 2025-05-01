import { logger } from './development';

export interface SoundEnvironment {
  name: string;
  mainAmbience: string;
  volume: number;
  fadeInDuration: number;
  fadeOutDuration: number;
  loop: boolean;
  fallback?: string;
  additionalSounds?: {
    sound: string;
    volume: number;
    interval?: number;  // Pour les sons qui se répètent périodiquement
    random?: boolean;   // Pour les sons aléatoires
  }[];
}

// URL de base pour les fichiers audio
const SOUND_BASE_URL = '/sounds/environments/mp3/';

// Configuration des environnements sonores basée sur les fichiers disponibles
export const soundEnvironments: Record<string, SoundEnvironment> = {
  mer: {
    name: 'Mer',
    mainAmbience: 'ocean-waves-112906.mp3',
    volume: 0.4,
    fadeInDuration: 3000,
    fadeOutDuration: 3000,
    loop: true,
    additionalSounds: [
      {
        sound: 'sea-and-seagull-wave-5932.mp3',
        volume: 0.3,
        interval: 15000,
        random: true
      }
    ]
  },
  vague: {
    name: 'Vagues',
    mainAmbience: 'sea-wave-34088.mp3',
    volume: 0.4,
    fadeInDuration: 2500,
    fadeOutDuration: 2500,
    loop: true
  },
  foret: {
    name: 'Forêt',
    mainAmbience: 'forest-ambience-296528.mp3',
    volume: 0.35,
    fadeInDuration: 2500,
    fadeOutDuration: 2500,
    loop: true,
    additionalSounds: [
      {
        sound: 'bird-333090.mp3',
        volume: 0.25,
        interval: 10000,
        random: true
      }
    ]
  },
  riviere: {
    name: 'Rivière',
    mainAmbience: 'river-26984.mp3',
    volume: 0.35,
    fadeInDuration: 2000,
    fadeOutDuration: 2000,
    loop: true,
    additionalSounds: [
      {
        sound: 'relaxing-mountains-rivers-streams-running-water-18178.mp3',
        volume: 0.3,
        interval: 20000,
        random: true
      }
    ]
  },
  pluie: {
    name: 'Pluie',
    mainAmbience: 'light-spring-rain-nature-sounds-331710.mp3',
    volume: 0.4,
    fadeInDuration: 3000,
    fadeOutDuration: 3000,
    loop: true
  },
  ville: {
    name: 'Ville',
    mainAmbience: 'city-ambience-9270.mp3',
    volume: 0.3,
    fadeInDuration: 2000,
    fadeOutDuration: 2000,
    loop: true
  },
  nuit: {
    name: 'Nuit',
    mainAmbience: 'mid-nights-sound-291477.mp3',
    volume: 0.3,
    fadeInDuration: 2500,
    fadeOutDuration: 2500,
    loop: true
  },
  nature: {
    name: 'Nature',
    mainAmbience: 'calm-nature-sounds-196258.mp3',
    volume: 0.35,
    fadeInDuration: 2000,
    fadeOutDuration: 2000,
    loop: true
  },
  porte: {
    name: 'Porte',
    mainAmbience: 'main-door-opening-closing-38280.mp3',
    volume: 0.5,
    fadeInDuration: 500,
    fadeOutDuration: 1000,
    loop: false,
    additionalSounds: [
      {
        sound: 'opening-the-front-door-210347.mp3',
        volume: 0.5,
        interval: 8000,
        random: true
      }
    ]
  },
  vent: {
    name: 'Vent',
    mainAmbience: 'windy-hut-fx-64675.mp3',
    volume: 0.4,
    fadeInDuration: 2000,
    fadeOutDuration: 2000,
    loop: true
  },
  default: {
    name: 'Ambiance par défaut',
    mainAmbience: 'calm-nature-sounds-196258.mp3',
    volume: 0.3,
    fadeInDuration: 2000,
    fadeOutDuration: 2000,
    loop: true
  }
};

/**
 * Obtient l'URL complète d'un fichier audio
 * @param filename Nom du fichier audio
 * @returns URL complète du fichier audio
 */
export const getSoundUrl = (filename: string): string => {
  return `${SOUND_BASE_URL}${filename}`;
};

/**
 * Obtient la configuration d'un environnement sonore
 * @param environment Nom de l'environnement
 * @returns Configuration de l'environnement sonore ou configuration par défaut
 */
export const getEnvironmentConfig = (environment: string): SoundEnvironment => {
  // Normaliser le nom de l'environnement
  const normalizedEnv = environment.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '_');

  // Rechercher l'environnement dans la configuration
  for (const [key, config] of Object.entries(soundEnvironments)) {
    const normalizedKey = key.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, '_');
    
    if (normalizedEnv.includes(normalizedKey) || normalizedKey.includes(normalizedEnv)) {
      logger.debug(`Environnement sonore trouvé: ${key}`);
      return config;
    }
  }

  // Retourner la configuration par défaut si aucune correspondance n'est trouvée
  logger.warn(`Aucun environnement sonore trouvé pour "${environment}", utilisation de la configuration par défaut`);
  return soundEnvironments.default;
};
