import axiosInstance from './axiosConfig';
import axios from 'axios';
import { config, logger } from '../config/development';
import { analyzeTextEnvironments, mapEnvironmentToSounds, EnvironmentDetection } from './grokService';
import { audioMixerService, AudioSegment } from './audioMixerService';

const VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID || '';
const API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || '';
const API_URL = `${config.api.baseUrl}/text-to-speech/${VOICE_ID}`;

// Vérification de la présence des variables d'environnement
if (!VOICE_ID || !API_KEY) {
  logger.error('Variables d\'environnement manquantes: VITE_ELEVENLABS_VOICE_ID ou VITE_ELEVENLABS_API_KEY');
  console.error('Variables d\'environnement manquantes: VITE_ELEVENLABS_VOICE_ID ou VITE_ELEVENLABS_API_KEY');
}

type IntonationType = 'crescendo' | 'diminuendo' | 'whisper' | 'emphasis' | 'dramatic' | 'soft';
type ContextualMoodType = 'anticipation' | 'tension' | 'relaxation' | 'intimacy' | 'passion' | 'neutral';

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
}

interface TextSegment {
  text: string;
  emotion: string;
  analysis: TextAnalysis;
  intonationMarkers: IntonationMarker[];
  context?: SegmentContext;
  intonationContexts?: IntonationContext[];
}

interface TextAnalysis {
  intensity: number;
  rhythm: number;
  pause: boolean;
  isQuestion: boolean;
  isExclamation: boolean;
  emotionalProgression: number;
  contextualMood: ContextualMoodType;
  emphasis: string[];
  tonalVariation: number;
}

interface IntonationMarker {
  type: IntonationType;
  value: string;
  position: number;
  duration?: number;
}

interface ContextualMoodPattern {
  pitch: string;
  rate: string;
}

const emotionKeywords = {
  sensuel: ['désir', 'doux', 'caresse', 'peau', 'frisson', 'sensuel', 'chaleur', 'corps'],
  excite: ['gémis', 'soupir', 'excité', 'passionné', 'brûlant', 'urgent', 'envie', 'trembler'],
  jouissance: ['extase', 'jouir', 'orgasme', 'plaisir', 'délice', 'intense', 'explosion'],
  murmure: ['murmure', 'souffle', 'chuchote', 'doux', 'tendre', 'délicat'],
  intense: ['fort', 'intense', 'profond', 'puissant', 'violent', 'ardent', 'sauvage'],
  doux: ['tendre', 'doux', 'délicat', 'léger', 'suave', 'douceur']
};

const contextualMoodPatterns: Record<Exclude<ContextualMoodType, 'neutral'>, ContextualMoodPattern> = {
  anticipation: { pitch: '+5%', rate: '55%' },   // Ralenti pour plus de tension
  tension: { pitch: '+10%', rate: '65%' },       // Ralenti pour plus d'impact
  relaxation: { pitch: '-5%', rate: '50%' },     // Très lent pour la détente
  intimacy: { pitch: '-10%', rate: '45%' },      // Extrêmement lent pour l'intimité
  passion: { pitch: '+15%', rate: '60%' }        // Ralenti pour plus de profondeur
};

const analyzeText = (text: string): TextAnalysis => {
  logger.group('Analyse du texte');
  logger.debug('Texte à analyser:', text);
  
  const lowerText = text.toLowerCase();
  
  // Analyse de base
  const hasPause = text.includes('...');
  const exclamationCount = (text.match(/!/g) || []).length;
  const questionCount = (text.match(/\?/g) || []).length;
  const ellipsisCount = (text.match(/\.\.\./g) || []).length;
  
  let intensityScore = 0;
  let tonalVariation = 0;
  const emphasis: string[] = [];
  
  // Analyse de la ponctuation
  intensityScore += exclamationCount * 0.15;
  intensityScore += questionCount * 0.1;
  intensityScore += ellipsisCount * 0.05;
  
  logger.debug('Scores de ponctuation:', { exclamationCount, questionCount, ellipsisCount });
  
  // Analyse des mots-clés émotionnels
  Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
    keywords.forEach(keyword => {
      const matches = lowerText.match(new RegExp(keyword, 'g'));
      if (matches) {
        intensityScore += matches.length * 0.1;
        tonalVariation += matches.length * 0.05;
        logger.debug(`Mot-clé trouvé (${emotion}):`, keyword, matches.length);
      }
    });
  });

  // Analyse des phrases
  const sentences = text.split(/[.!?…]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
  const rhythm = Math.min(1.0, avgSentenceLength / 80);

  // Détection des mots à accentuer
  const emphasisRegex = /\b[A-Z][A-Z]+\b|"[^"]+"|'[^']+'|\*[^\*]+\*/g;
  const emphasisMatches = text.match(emphasisRegex);
  if (emphasisMatches) {
    emphasis.push(...emphasisMatches.map(m => m.replace(/["'*]/g, '').trim()));
    tonalVariation += emphasisMatches.length * 0.1;
  }

  // Analyse de la progression émotionnelle
  const emotionalProgression = sentences.reduce((progression, sentence, index) => {
    const position = index / sentences.length;
    const localIntensity = calculateLocalIntensity(sentence);
    return progression + (localIntensity * position);
  }, 0) / sentences.length;

  // Détermination du contexte émotionnel
  let contextualMood: ContextualMoodType = 'neutral';
  if (intensityScore > 0.7) contextualMood = 'passion';
  else if (intensityScore > 0.5) contextualMood = 'tension';
  else if (hasPause) contextualMood = 'anticipation';
  else if (lowerText.includes('doux') || lowerText.includes('tendre')) contextualMood = 'intimacy';
  else if (tonalVariation < 0.3) contextualMood = 'relaxation';

  const analysis = {
    intensity: Math.min(1.0, intensityScore),
    rhythm,
    pause: hasPause,
    isQuestion: questionCount > 0,
    isExclamation: exclamationCount > 0,
    emotionalProgression,
    contextualMood,
    emphasis,
    tonalVariation: Math.min(1.0, tonalVariation)
  };

  logger.debug('Résultat de l\'analyse:', analysis);
  logger.groupEnd();
  return analysis;
};

const calculateLocalIntensity = (sentence: string): number => {
  const lowerSentence = sentence.toLowerCase();
  let intensity = 0;

  // Mots d'intensité
  const intensityWords = ['fort', 'intense', 'passionné', 'urgent', 'violemment', 'profond'];
  intensityWords.forEach(word => {
    if (lowerSentence.includes(word)) intensity += 0.2;
  });

  // Ponctuation
  if (sentence.includes('!')) intensity += 0.3;
  if (sentence.includes('?')) intensity += 0.2;
  if (sentence.includes('...')) intensity += 0.1;

  // Mots en majuscules
  const uppercaseWords = sentence.match(/\b[A-Z][A-Z]+\b/g);
  if (uppercaseWords) intensity += uppercaseWords.length * 0.15;

  // Texte entre guillemets
  const quotedText = sentence.match(/"[^"]+"|'[^']+'/g);
  if (quotedText) intensity += quotedText.length * 0.1;

  return Math.min(1.0, intensity);
};

interface IntonationContext {
  previousType?: IntonationType;
  nextType?: IntonationType;
  transitionDuration?: number;
}

const extractIntonationMarkers = (text: string): { text: string; markers: IntonationMarker[]; contexts: IntonationContext[] } => {
  // Nettoyer les espaces multiples uniquement
  const cleanText = text.replace(/\s+/g, ' ').trim();
  return { 
    text: cleanText, 
    markers: [], 
    contexts: [] 
  };
};


const getVoiceSettings = (emotion: string, analysis: TextAnalysis): VoiceSettings => {
  logger.group('Calcul des paramètres de voix');
  logger.debug('Émotion:', emotion);
  logger.debug('Analyse:', analysis);
  
  // Paramètres ajustés pour plus de sensualité et de profondeur
  const baseSettings: Record<string, VoiceSettings> = {
    sensuel: {
      stability: 0.7,  // Augmenté pour plus de constance
      similarity_boost: 0.9  // Augmenté pour plus d'expressivité
    },
    excite: {
      stability: 0.4,  // Légèrement augmenté
      similarity_boost: 0.95
    },
    jouissance: {
      stability: 0.3,  // Légèrement augmenté
      similarity_boost: 1.0
    },
    murmure: {
      stability: 0.85, // Légèrement réduit pour plus de variation
      similarity_boost: 0.8  // Augmenté pour plus d'expressivité
    },
    intense: {
      stability: 0.4,  // Légèrement augmenté
      similarity_boost: 0.95 // Augmenté pour plus d'expressivité
    },
    doux: {
      stability: 0.75, // Légèrement réduit
      similarity_boost: 0.85 // Augmenté pour plus d'expressivité
    }
  };

  const settings = baseSettings[emotion] || baseSettings.sensuel;
  const adjustedSettings = {
    ...settings,
    // Ajustements moins agressifs pour préserver la sensualité
    stability: Math.max(0.3, Math.min(0.9, settings.stability * (1 - analysis.intensity * 0.3))),
    similarity_boost: Math.max(0.6, Math.min(1.0, settings.similarity_boost + analysis.emotionalProgression * 0.15))
  };

  logger.debug('Paramètres ajustés:', adjustedSettings);
  logger.groupEnd();
  return adjustedSettings;
};

const addBreathingAndPauses = (text: string, emotion: string, analysis: TextAnalysis): string => {
  logger.group('Ajout des respirations et pauses');
  logger.debug('Texte initial:', text);
  logger.debug('Émotion:', emotion);
  logger.debug('Analyse:', analysis);
  
  // Nettoyer le texte des espaces multiples
  text = text.replace(/\s+/g, ' ').trim();

  // Calculer la durée des pauses en fonction de l'intensité
  const pauseDuration = Math.min(1500, 1000 + (analysis.intensity * 700));
  
  // Ajouter des pauses pour la ponctuation
  text = text.replace(/\.\.\./g, `<break time="${pauseDuration * 1.2}ms"/>`);
  text = text.replace(/([.!?])/g, (match) => {
    const duration = match === '?' ? pauseDuration * 1.1 : 
                    match === '!' ? pauseDuration * 1.5 : 
                    pauseDuration;
    return `${match}<break time="${duration}ms"/>`;
  });
  text = text.replace(/,/g, `,<break time="${pauseDuration * 0.7}ms"/>`);

  // Ralentir les interjections
  const interjections = /(a+h+|m+h+|o+h+|h+a+h+|o+u+i+)/gi;
  text = text.replace(interjections, (match) => {
    const rate = match === match.toUpperCase() ? '25%' : '30%';
    return `<prosody rate="${rate}">${match}</prosody>`;
  });

  // Appliquer les variations contextuelles
  if (analysis.contextualMood !== 'neutral') {
    const contextPattern = contextualMoodPatterns[analysis.contextualMood];
    const baseRate = "70%";
    text = `<prosody pitch="${contextPattern.pitch}" rate="${baseRate}">${text}</prosody>`;
  } else {
    text = `<prosody rate="70%" pitch="-5%">${text}</prosody>`;
  }

  // Ajouter des emphases sur les mots importants
  analysis.emphasis.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const emphasisLevel = analysis.intensity > 0.7 ? 'strong' : 'moderate';
    text = text.replace(regex, `<emphasis level="${emphasisLevel}">${word}</emphasis>`);
  });

  logger.debug('Texte avec respirations et variations:', text);
  logger.groupEnd();
  return text;
};

interface SegmentContext {
  previousEmotion?: string;
  nextEmotion?: string;
  transitionDuration?: number;
}

const calculateEmotionTransitionDuration = (currentEmotion: string, nextEmotion: string): number => {
  // Définir les durées de transition entre les émotions
  const transitionMap: Record<string, Record<string, number>> = {
    sensuel: {
      excite: 600,
      jouissance: 800,
      murmure: 400,
      intense: 700,
      doux: 300
    },
    excite: {
      sensuel: 600,
      jouissance: 400,
      murmure: 700,
      intense: 500,
      doux: 800
    },
    jouissance: {
      sensuel: 800,
      excite: 400,
      murmure: 900,
      intense: 300,
      doux: 1000
    },
    murmure: {
      sensuel: 400,
      excite: 700,
      jouissance: 900,
      intense: 800,
      doux: 300
    },
    intense: {
      sensuel: 700,
      excite: 500,
      jouissance: 300,
      murmure: 800,
      doux: 900
    },
    doux: {
      sensuel: 300,
      excite: 800,
      jouissance: 1000,
      murmure: 300,
      intense: 900
    }
  };

  return transitionMap[currentEmotion]?.[nextEmotion] || 500;
};

const parseTextSegments = async (text: string): Promise<TextSegment[]> => {
  logger.group('Parsing des segments');
  logger.debug('Texte à parser:', text);
  
  const segments: TextSegment[] = [];
  
  // Utiliser l'analyse de Grok pour obtenir les segments et leurs émotions
  const environmentDetections = await analyzeTextEnvironments(text);
  
  // Convertir les détections en segments
  environmentDetections.forEach((detection, i) => {
    const analysis = analyzeText(detection.segment);
    const { markers, contexts } = extractIntonationMarkers(detection.segment);

    // Créer le contexte du segment
    const segmentContext: SegmentContext = {
      previousEmotion: i > 0 ? environmentDetections[i - 1].emotionalTone : undefined,
      nextEmotion: i < environmentDetections.length - 1 ? environmentDetections[i + 1].emotionalTone : undefined,
      transitionDuration: i < environmentDetections.length - 1 ? 
        calculateEmotionTransitionDuration(detection.emotionalTone, environmentDetections[i + 1].emotionalTone) : undefined
    };

    // Ajuster l'analyse en fonction du contexte
    if (segmentContext.previousEmotion) {
      analysis.emotionalProgression *= 1.2;
    }

    // Créer le segment avec les informations de contexte
    segments.push({
      text: detection.segment,
      emotion: detection.emotionalTone,
      analysis,
      intonationMarkers: markers,
      context: segmentContext,
      intonationContexts: contexts
    });
  });

  logger.debug('Segments générés:', segments);
  logger.groupEnd();
  return segments;
};

/**
 * Fonction principale pour générer la voix
 * @param text Le texte à convertir en voix
 * @param useAI Indique si on doit utiliser l'IA pour ajouter des sons d'environnement
 * @returns URL de l'audio généré
 */
export const generateVoice = async (text: string): Promise<string> => {
  try {
    logger.group('Génération de la voix');
    logger.info('Début de la génération pour le texte:', text);
    
    // 1. Analyser le texte localement
    logger.info('Étape 1: Analyse locale du texte');
    const analysis = analyzeText(text);
    
    // 2. Obtenir les paramètres vocaux
    logger.info('Étape 2: Obtention des paramètres vocaux');
    const emotion = 'sensuel'; // Émotion par défaut
    const settings = getVoiceSettings(emotion, analysis);
    
    // 3. Créer le SSML
    logger.info('Étape 3: Création du SSML');
    const textWithBreathing = addBreathingAndPauses(text, emotion, analysis);
    
    // Ajuster les paramètres en fonction de l'analyse
    const baseRate = '35%'; // Très lent pour une ambiance sensuelle
    const basePitch = '-10%'; // Plus grave pour plus de profondeur
    
    // Diviser le texte en segments plus courts pour éviter les limitations de l'API
    const segments = text.split(/[.!?…]+/).filter(s => s.trim().length > 0);
    logger.debug('Nombre de segments:', segments.length);
    
    // Générer l'audio pour chaque segment
    const audioBlobs: Blob[] = [];
    for (const segment of segments) {
      const segmentSSML = `<speak><prosody pitch="${basePitch}" rate="${baseRate}">${addBreathingAndPauses(segment, emotion, analysis)}</prosody></speak>`;
      logger.debug('SSML pour le segment:', segmentSSML);
      
      const response = await axiosInstance.post(
        API_URL,
        {
          text: segmentSSML,
          model_id: "eleven_multilingual_v2",
          voice_settings: settings
        },
        {
          headers: {
            'xi-api-key': API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          responseType: 'blob',
          timeout: config.api.timeout
        }
      );
      
      audioBlobs.push(response.data);
    }
    
    // Concaténer tous les blobs audio
    const combinedBlob = new Blob(audioBlobs, { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(combinedBlob);
    logger.debug('URL audio générée:', audioUrl);
    
    logger.groupEnd();
    return audioUrl;
  } catch (error: unknown) {
    logger.error('Erreur lors de la génération de la voix:', error);
    if (axios.isAxiosError(error)) {
      logger.error('Réponse de l\'API:', error.response?.data);
      logger.error('Status:', error.response?.status);
      logger.error('Headers:', error.response?.headers);
    }
    throw new Error('Échec de la génération de la voix');
  }
};

/**
 * Fonction pour générer la voix avec des sons d'environnement
 * @param text Le texte à convertir en voix
 * @param useAI Indique si on doit utiliser l'IA pour ajouter des sons d'environnement
 * @returns URL de l'audio généré
 */
export const generateVoiceWithEnvironment = async (text: string, useAI: boolean = false): Promise<string> => {
  try {
    logger.group('Génération de la voix avec environnement');
    logger.info('Texte à traiter:', text);
    logger.info('Utilisation de l\'IA:', useAI);
    
    // 1. Analyser le texte avec Grok pour obtenir les segments
    logger.info('Étape 1: Analyse du texte avec Grok');
    const segments = await analyzeTextEnvironments(text);
    logger.debug('Segments détectés:', segments.length);
    
    // 2. Générer la voix pour chaque segment
    logger.info('Étape 2: Génération des segments audio');
    const audioSegments: AudioSegment[] = [];
    
    // Paramètres de transition entre segments
    const defaultFadeIn = 0.15;  // 150ms de fondu d'entrée
    const defaultFadeOut = 0.2;  // 200ms de fondu de sortie
    const defaultCrossfade = 0.3; // 300ms de crossfade entre segments
    
    // Calculer les temps de début pour chaque segment
    let currentTime = 0;
    const segmentsWithTiming = segments.map((segment, index) => {
      // Estimer la durée du segment en fonction du nombre de caractères
      // En moyenne, on parle à environ 15 caractères par seconde pour une voix lente
      const speechRate = segment.speechRate === 'très lent' ? 10 :
                         segment.speechRate === 'lent' ? 12 :
                         segment.speechRate === 'modéré' ? 15 :
                         segment.speechRate === 'rapide' ? 18 : 13;
      
      const estimatedDuration = segment.segment.length / speechRate;
      
      // Ajouter des pauses pour la ponctuation
      const pauseCount = (segment.segment.match(/[.!?…]/g) || []).length;
      const pauseDuration = pauseCount * 0.3; // 300ms par pause
      
      const totalDuration = estimatedDuration + pauseDuration;
      
      // Créer un objet avec les informations de timing
      const segmentWithTiming = {
        ...segment,
        startTime: currentTime,
        duration: totalDuration,
        fadeIn: segment.fadeIn || defaultFadeIn,
        fadeOut: segment.fadeOut || defaultFadeOut
      };
      
      // Mettre à jour le temps courant pour le prochain segment
      // On soustrait le crossfade pour que les segments se chevauchent légèrement
      currentTime += totalDuration - defaultCrossfade;
      
      return segmentWithTiming;
    });
    
    // Générer l'audio pour chaque segment
    for (let i = 0; i < segmentsWithTiming.length; i++) {
      const segment = segmentsWithTiming[i];
      const prevSegment = i > 0 ? segmentsWithTiming[i - 1] : null;
      const nextSegment = i < segmentsWithTiming.length - 1 ? segmentsWithTiming[i + 1] : null;
      
      logger.debug(`Traitement du segment ${i+1}/${segmentsWithTiming.length}:`, segment.segment);
      logger.debug('Émotion détectée:', segment.emotionalTone);
      logger.debug('Environnement détecté:', segment.environment);
      
      // Ajuster les paramètres vocaux en fonction du contexte
      let analysis: TextAnalysis = {
        intensity: 0.7,
        rhythm: 0.5,
        pause: false,
        isQuestion: segment.segment.includes('?'),
        isExclamation: segment.segment.includes('!'),
        emotionalProgression: 0.5,
        contextualMood: 'intimacy',
        emphasis: [],
        tonalVariation: 0.3
      };
      
      // Ajuster l'analyse en fonction des segments voisins pour une transition plus fluide
      if (prevSegment) {
        // Transition depuis le segment précédent
        analysis.emotionalProgression = 0.7; // Augmenter la progression émotionnelle
        
        // Ajuster l'intensité en fonction de l'émotion précédente
        if (prevSegment.emotionalTone === 'intense' || prevSegment.emotionalTone === 'excite') {
          analysis.intensity = 0.8;
        } else if (prevSegment.emotionalTone === 'doux' || prevSegment.emotionalTone === 'murmure') {
          analysis.intensity = 0.5;
        }
      }
      
      // Construire le SSML pour ce segment avec des transitions fluides
      let ssml = `<speak>\n`;
      
      // Ajouter une respiration au début si c'est le premier segment ou après une pause
      if (i === 0 || (prevSegment && prevSegment.segment.match(/[.!?…]$/))) {
        ssml += `<break time="200ms"/>\n`;
      }
      
      // Ajouter la prosodie avec des transitions douces
      ssml += `<prosody rate="${segment.speechRate === 'très lent' ? '25%' :
                           segment.speechRate === 'lent' ? '35%' :
                           segment.speechRate === 'modéré' ? '45%' :
                           segment.speechRate === 'rapide' ? '55%' :
                           '40%'}"
                       volume="${segment.volume === 'doux' ? '-2dB' :
                              segment.volume === 'fort' ? '+4dB' :
                              '+0dB'}">\n`;
      
      // Ajouter le texte avec des respirations naturelles
      ssml += addBreathingAndPauses(segment.segment, segment.emotionalTone, analysis);
      
      // Fermer les balises
      ssml += `\n</prosody>\n`;
      
      // Ajouter une respiration à la fin si c'est le dernier segment
      if (i === segmentsWithTiming.length - 1) {
        ssml += `<break time="300ms"/>\n`;
      }
      
      ssml += `</speak>`;
      
      logger.debug('SSML généré:', ssml);

      // Obtenir les paramètres vocaux basés sur l'émotion
      const voiceSettings = getVoiceSettings(segment.emotionalTone, analysis);
      logger.debug('Paramètres vocaux:', voiceSettings);

      try {
        logger.info(`Appel à l'API ElevenLabs pour le segment ${i+1}/${segmentsWithTiming.length}`);
        // Générer l'audio pour ce segment
        const response = await axiosInstance.post(
          API_URL,
          {
            text: ssml,
            model_id: "eleven_multilingual_v2",
            voice_settings: voiceSettings
          },
          {
            headers: {
              'xi-api-key': API_KEY,
              'Content-Type': 'application/json',
              'Accept': 'audio/mpeg'
            },
            responseType: 'blob',
            timeout: config.api.timeout
          }
        );
        
        logger.debug('Réponse reçue de l\'API ElevenLabs');
        logger.debug('Type de la réponse:', response.data.type);
        logger.debug('Taille de la réponse:', response.data.size);

        // Créer l'URL du blob audio
        const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        logger.debug('URL du blob audio créée:', audioUrl);

        // Ajouter le segment à la liste avec les paramètres de transition
        audioSegments.push({
          startTime: segment.startTime,
          duration: segment.duration,
          audioUrl,
          environment: segment.environment,
          volume: segment.volume === 'doux' ? 0.7 :
                  segment.volume === 'fort' ? 1.0 :
                  0.85,
          fadeIn: segment.fadeIn,
          fadeOut: segment.fadeOut
        });
        
        logger.debug(`Segment audio ${i+1}/${segmentsWithTiming.length} ajouté à la liste`);
      } catch (segmentError) {
        logger.error(`Erreur lors de la génération du segment audio ${i+1}/${segmentsWithTiming.length}:`, segmentError);
        if (axios.isAxiosError(segmentError)) {
          logger.error('Réponse de l\'API pour le segment:', segmentError.response?.data);
          logger.error('Status pour le segment:', segmentError.response?.status);
        }
        // Continuer avec les autres segments même si celui-ci a échoué
      }
    }
    
    logger.debug('Nombre de segments audio générés:', audioSegments.length);
    
    if (audioSegments.length === 0) {
      logger.error('Aucun segment audio n\'a été généré');
      throw new Error('Aucun segment audio n\'a été généré');
    }

    // 3. Mixer tous les segments audio
    logger.info('Étape 3: Mixage des segments audio');
    const mixedAudio = await audioMixerService.mixAudioSegments(audioSegments);
    logger.debug('Audio mixé:', mixedAudio);
    
    logger.info('Génération terminée avec succès');
    logger.info('URL audio finale:', mixedAudio.audioUrl);
    logger.groupEnd();
    
    return mixedAudio.audioUrl;
  } catch (error) {
    logger.error('Erreur lors de la génération de la voix avec environnement:', error);
    if (axios.isAxiosError(error)) {
      logger.error('Réponse de l\'API:', error.response?.data);
      logger.error('Status:', error.response?.status);
      logger.error('Headers:', error.response?.headers);
    }
    
    // En cas d'erreur, essayer de générer une voix simple sans environnement
    logger.info('Tentative de génération de voix simple sans environnement');
    try {
      const simpleVoiceUrl = await generateVoice(text);
      logger.info('Génération de voix simple réussie');
      return simpleVoiceUrl;
    } catch (fallbackError) {
      logger.error('Échec de la génération de voix simple:', fallbackError);
      throw error; // Renvoyer l'erreur originale
    }
  }
};
