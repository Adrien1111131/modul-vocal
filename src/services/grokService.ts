import axios from 'axios';
import { config, logger } from '../config/development';

const API_KEY = import.meta.env.VITE_GROK_API_KEY || '';
const API_URL = 'https://api.x.ai/grok/v1/chat/completions';

// Vérification de la présence de la clé API
if (!API_KEY) {
  logger.error('Variable d\'environnement manquante: VITE_GROK_API_KEY');
  console.error('Variable d\'environnement manquante: VITE_GROK_API_KEY');
}

export interface EnvironmentDetection {
  segment: string;
  environment: string;
  soundEffects: string[];
  emotionalTone: string;
  speechRate: string;
  volume: string;
  startTime?: number;
  duration?: number;
  fadeIn?: number;
  fadeOut?: number;
  transition?: {
    type: 'crossfade' | 'cut' | 'overlap';
    duration: number;
  };
}

interface TimingInfo {
  estimatedDuration: number;
  fadeIn: number;
  fadeOut: number;
  transitionType: 'crossfade' | 'cut' | 'overlap';
  transitionDuration: number;
}

const calculateTiming = (text: string, speechRate: string): TimingInfo => {
  // Estimation de la durée basée sur le nombre de mots et le débit
  const words = text.trim().split(/\s+/).length;
  const wordsPerSecond = speechRate === 'très lent' ? 1.0 :
                        speechRate === 'lent' ? 1.5 :
                        speechRate === 'modéré' ? 2.0 :
                        2.5; // rapide
  
  const estimatedDuration = words / wordsPerSecond;
  
  // Durées de fondu basées sur la longueur du segment
  const fadeIn = Math.min(1.0, estimatedDuration * 0.1);
  const fadeOut = Math.min(1.0, estimatedDuration * 0.1);
  
  // Type de transition basé sur le contexte
  const hasEllipsis = text.includes('...');
  const endsWithPunctuation = /[.!?]$/.test(text.trim());
  
  const transitionType = hasEllipsis ? 'crossfade' :
                        endsWithPunctuation ? 'cut' :
                        'overlap';
  
  const transitionDuration = transitionType === 'crossfade' ? 1.0 :
                            transitionType === 'overlap' ? 0.5 :
                            0.2;
  
  return {
    estimatedDuration,
    fadeIn,
    fadeOut,
    transitionType,
    transitionDuration
  };
};

/**
 * Analyse un texte pour détecter les environnements et les émotions
 * @param text Le texte à analyser
 * @returns Une liste de segments avec leurs environnements et paramètres vocaux
 */
export const analyzeTextEnvironments = async (text: string): Promise<EnvironmentDetection[]> => {
  try {
    logger.group('Analyse du texte (locale)');
    logger.info('Début de l\'analyse pour le texte:', text);

    // Diviser le texte en paragraphes
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    
    // Si pas de paragraphes, considérer le texte entier comme un segment
    const segments = paragraphs.length > 0 ? paragraphs : [text];
    
    // Créer un résultat par défaut pour chaque segment
    let results: EnvironmentDetection[] = segments.map(segment => {
      // Analyse simple pour déterminer l'environnement et l'émotion
      let environment = '';
      let emotionalTone = 'sensuel';
      
      // Mots-clés pour détecter l'environnement
      if (segment.toLowerCase().includes('plage') || segment.toLowerCase().includes('mer') || segment.toLowerCase().includes('vague') || segment.toLowerCase().includes('océan')) {
        environment = 'mer';
      } else if (segment.toLowerCase().includes('forêt') || segment.toLowerCase().includes('bois') || segment.toLowerCase().includes('arbre')) {
        environment = 'foret';
      } else if (segment.toLowerCase().includes('pluie')) {
        environment = 'pluie';
      } else if (segment.toLowerCase().includes('ville') || segment.toLowerCase().includes('rue')) {
        environment = 'ville';
      } else if (segment.toLowerCase().includes('rivière') || segment.toLowerCase().includes('ruisseau') || segment.toLowerCase().includes('eau')) {
        environment = 'riviere';
      } else if (segment.toLowerCase().includes('nuit')) {
        environment = 'nuit';
      } else if (segment.toLowerCase().includes('porte')) {
        environment = 'porte';
      } else if (segment.toLowerCase().includes('vent')) {
        environment = 'vent';
      } else if (segment.toLowerCase().includes('nature')) {
        environment = 'nature';
      } else if (segment.toLowerCase().includes('oiseau')) {
        environment = 'oiseau';
      }
      
      // Mots-clés pour détecter l'émotion
      if (segment.toLowerCase().includes('gémis') || segment.toLowerCase().includes('soupir') || segment.toLowerCase().includes('excit')) {
        emotionalTone = 'excite';
      } else if (segment.toLowerCase().includes('extase') || segment.toLowerCase().includes('jouir') || segment.toLowerCase().includes('orgasme')) {
        emotionalTone = 'jouissance';
      } else if (segment.toLowerCase().includes('murmure') || segment.toLowerCase().includes('chuchot')) {
        emotionalTone = 'murmure';
      } else if (segment.toLowerCase().includes('fort') || segment.toLowerCase().includes('intense') || segment.toLowerCase().includes('violent')) {
        emotionalTone = 'intense';
      } else if (segment.toLowerCase().includes('doux') || segment.toLowerCase().includes('tendre')) {
        emotionalTone = 'doux';
      }
      
      // Obtenir les sons d'environnement
      const soundEffects = mapEnvironmentToSounds(environment);
      
      return {
        segment,
        environment,
        soundEffects,
        emotionalTone,
        speechRate: 'lent',
        volume: 'normal'
      };
    });

    // Ajouter les informations de timing pour chaque segment
    let currentTime = 0;
    results = results.map((segment: EnvironmentDetection, index: number) => {
      const timing = calculateTiming(segment.segment, segment.speechRate);
      
      // Ajouter les informations de timing au segment
      const enhancedSegment = {
        ...segment,
        startTime: currentTime,
        duration: timing.estimatedDuration,
        fadeIn: timing.fadeIn,
        fadeOut: timing.fadeOut,
        transition: {
          type: timing.transitionType,
          duration: timing.transitionDuration
        }
      };
      
      // Mettre à jour le temps de début pour le prochain segment
      currentTime += timing.estimatedDuration;
      if (timing.transitionType === 'crossfade' && index < results.length - 1) {
        currentTime -= timing.transitionDuration;
      }
      
      return enhancedSegment;
    });

    logger.debug('Résultats de l\'analyse locale avec timing:', results);
    logger.groupEnd();

    return results;
  } catch (error) {
    logger.error('Erreur lors de l\'analyse locale du texte:', error);
    
    // En cas d'erreur, retourner un segment par défaut
    const defaultSegment: EnvironmentDetection = {
      segment: text,
      environment: '',
      soundEffects: [],
      emotionalTone: 'sensuel',
      speechRate: 'lent',
      volume: 'normal',
      startTime: 0,
      duration: 10,
      fadeIn: 0.5,
      fadeOut: 0.5,
      transition: {
        type: 'crossfade',
        duration: 0.5
      }
    };
    
    return [defaultSegment];
  }
};

/**
 * Mappe un environnement à des fichiers audio réellement disponibles
 * @param environment Le nom de l'environnement
 * @returns Une liste d'URLs de fichiers audio ou un tableau vide si aucun fichier correspondant n'est trouvé
 */
export const mapEnvironmentToSounds = (environment: string): string[] => {
  // Mapping des environnements aux fichiers MP3 disponibles
  const environmentSounds: Record<string, string[]> = {
    // Sons de mer et océan
    mer: ['ocean-waves-112906.mp3', 'sea-wave-34088.mp3', 'sea-and-seagull-wave-5932.mp3'],
    plage: ['ocean-waves-112906.mp3', 'sea-and-seagull-wave-5932.mp3'],
    océan: ['ocean-waves-112906.mp3', 'sea-wave-34088.mp3'],
    vague: ['sea-wave-34088.mp3', 'ocean-waves-112906.mp3'],
    
    // Sons de nature et forêt
    foret: ['forest-ambience-296528.mp3', 'bird-333090.mp3'],
    nature: ['calm-nature-sounds-196258.mp3', 'bird-333090.mp3'],
    oiseau: ['bird-333090.mp3'],
    
    // Sons de pluie
    pluie: ['light-spring-rain-nature-sounds-331710.mp3'],
    
    // Sons de ville
    ville: ['city-ambience-9270.mp3'],
    
    // Sons de rivière et eau
    riviere: ['river-26984.mp3', 'relaxing-mountains-rivers-streams-running-water-18178.mp3'],
    ruisseau: ['relaxing-mountains-rivers-streams-running-water-18178.mp3', 'river-26984.mp3'],
    
    // Sons de nuit
    nuit: ['mid-nights-sound-291477.mp3'],
    
    // Sons de porte
    porte: ['main-door-opening-closing-38280.mp3', 'opening-the-front-door-210347.mp3'],
    
    // Sons de vent
    vent: ['windy-hut-fx-64675.mp3']
  };

  // Normaliser l'environnement (minuscules, sans accents)
  const normalizedEnv = environment.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '_');

  // Rechercher l'environnement dans le mapping
  for (const [env, sounds] of Object.entries(environmentSounds)) {
    const normalizedKey = env.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, '_');
    
    if (normalizedEnv.includes(normalizedKey) || normalizedKey.includes(normalizedEnv)) {
      return sounds;
    }
  }

  // Si aucune correspondance n'est trouvée, retourner un tableau vide
  return [];
};
