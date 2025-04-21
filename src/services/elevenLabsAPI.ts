import axiosInstance from './axiosConfig';
import axios from 'axios';
import { config, logger } from '../config/development';

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

// Définition de l'interface pour les patterns d'intonation
interface IntonationPattern {
  pitch: string;
  rate: string;
  volume: string;
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

// Définition des patterns d'intonation
const intonationPatterns: Record<string, IntonationPattern> = {
  crescendo: { pitch: '+20%', rate: '110%', volume: '+3dB' },
  diminuendo: { pitch: '-10%', rate: '90%', volume: '-3dB' },
  whisper: { pitch: '-20%', rate: '80%', volume: '-6dB' },
  emphasis: { pitch: '+10%', rate: '105%', volume: '+2dB' },
  dramatic: { pitch: '+15%', rate: '95%', volume: '+4dB' },
  soft: { pitch: '-15%', rate: '85%', volume: '-4dB' }
};

const contextualMoodPatterns: Record<Exclude<ContextualMoodType, 'neutral'>, ContextualMoodPattern> = {
  anticipation: { pitch: '+5%', rate: '75%' },   // Ralenti pour plus de tension
  tension: { pitch: '+10%', rate: '85%' },       // Ralenti pour plus d'impact
  relaxation: { pitch: '-5%', rate: '70%' },     // Très lent pour la détente
  intimacy: { pitch: '-10%', rate: '65%' },      // Extrêmement lent pour l'intimité
  passion: { pitch: '+15%', rate: '80%' }        // Ralenti pour plus de profondeur
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
  const markers: IntonationMarker[] = [];
  const contexts: IntonationContext[] = [];
  let cleanText = text;

  // Ne plus traiter les guillemets comme des instructions, mais traiter les pauses spéciales
  const pauseRegex = /\(\.\.\.\)/g;
  const longPauseRegex = /\(\.\.\.\.\.\)/g;
  const semiColonRegex = /;/g;
  
  // Remplacer les pauses par des marqueurs temporaires
  cleanText = cleanText.replace(longPauseRegex, "__LONG_PAUSE__");
  cleanText = cleanText.replace(pauseRegex, "__PAUSE__");
  cleanText = cleanText.replace(semiColonRegex, "__SEMI__");
  
  // Nettoyer les espaces multiples
  cleanText = cleanText.replace(/\s+/g, ' ').trim();

  return { text: cleanText, markers, contexts };
};

// Fonction conservée pour référence mais non utilisée
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _calculateTransitionDuration = (_currentType: IntonationType, _nextType?: IntonationType): number => {
  if (!_nextType) return 0;

  // Définir les "distances" entre les types d'intonation
  const transitionMap: Record<IntonationType, Record<IntonationType, number>> = {
    whisper: {
      crescendo: 800,
      diminuendo: 400,
      emphasis: 300,
      dramatic: 600,
      soft: 200,
      whisper: 0
    },
    crescendo: {
      whisper: 800,
      diminuendo: 600,
      emphasis: 400,
      dramatic: 300,
      soft: 700,
      crescendo: 0
    },
    diminuendo: {
      whisper: 400,
      crescendo: 600,
      emphasis: 300,
      dramatic: 500,
      soft: 300,
      diminuendo: 0
    },
    emphasis: {
      whisper: 300,
      crescendo: 400,
      diminuendo: 300,
      dramatic: 200,
      soft: 300,
      emphasis: 0
    },
    dramatic: {
      whisper: 600,
      crescendo: 300,
      diminuendo: 500,
      emphasis: 200,
      soft: 600,
      dramatic: 0
    },
    soft: {
      whisper: 200,
      crescendo: 700,
      diminuendo: 300,
      emphasis: 300,
      dramatic: 600,
      soft: 0
    }
  };

  return transitionMap[_currentType][_nextType];
};

// Fonction conservée pour référence mais non utilisée
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _determineIntonationType = (_text: string): IntonationType => {
  if (_text.includes('murmur') || _text.includes('douc')) return 'whisper';
  if (_text.includes('fort') || _text.includes('intens')) return 'crescendo';
  if (_text.includes('baiss') || _text.includes('diminue')) return 'diminuendo';
  if (_text.includes('dramatique')) return 'dramatic';
  if (_text.includes('doux') || _text.includes('tendre')) return 'soft';
  return 'emphasis';
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
  
  // Intensité de respiration plus forte pour plus de sensualité
  const breathIntensity = {
    sensuel: 'medium',
    excite: 'strong',
    jouissance: 'x-strong',
    murmure: 'medium',
    intense: 'strong',
    doux: 'medium'
  }[emotion] || 'medium';

  // Extraire les marqueurs d'intonation avec contexte
  const { text: cleanText, markers, contexts } = extractIntonationMarkers(text);
  text = cleanText;

  // Pauses beaucoup plus longues pour un rythme plus sensuel
  const pauseDuration = Math.min(1500, 1000 + (analysis.intensity * 700));
  
  // Remplacer les marqueurs de pause spéciaux avec des pauses plus longues
  text = text.replace(/__LONG_PAUSE__/g, `<break time="${pauseDuration * 2}ms"/> <break strength="x-strong"/> `);
  text = text.replace(/__PAUSE__/g, `<break time="${pauseDuration * 1.2}ms"/> <break strength="${breathIntensity}"/> `);
  text = text.replace(/__SEMI__/g, `<break time="${pauseDuration * 0.5}ms"/> `);
  
  // Pauses standard plus longues
  text = text.replace(/\.\.\./g, `<break time="${pauseDuration * 1.2}ms"/> <break strength="${breathIntensity}"/> `);
  text = text.replace(/([.!?])/g, (match) => {
    const duration = match === '?' ? pauseDuration * 1.1 : 
                    match === '!' ? pauseDuration * 1.5 : 
                    pauseDuration;
    return `${match}<break time="${duration}ms"/> <break strength="${breathIntensity}"/> `;
  });
  text = text.replace(/,/g, `,<break time="${pauseDuration * 0.7}ms"/> `);

  // Respirations plus profondes pour les mots sensuels
  const breathingWords = /(gémis|soupir|souffle|caresse|frisson|désir|plaisir|extase)/gi;
  text = text.replace(breathingWords, (match) => {
    const intensity = analysis.intensity > 0.6 ? 'x-strong' :
                     analysis.intensity > 0.3 ? 'strong' :
                     breathIntensity;
    return `<break strength="${intensity}"/> ${match}`;
  });

  // Variations contextuelles plus prononcées avec débit ralenti
  if (analysis.contextualMood !== 'neutral') {
    const contextPattern = contextualMoodPatterns[analysis.contextualMood];
    const moodIntensity = analysis.intensity * 120; // Intensité augmentée
    // Ralentir considérablement le débit global pour plus de sensualité
    const baseRate = "70%";
    text = `<prosody pitch="${contextPattern.pitch}" rate="${baseRate}" volume="+${moodIntensity}%">${text}</prosody>`;
  } else {
    // Même sans contexte spécifique, ralentir considérablement le débit
    text = `<prosody rate="70%" pitch="-5%">${text}</prosody>`;
  }

  // Appliquer les marqueurs d'intonation avec transitions
  markers.forEach((marker, index) => {
    const pattern = intonationPatterns[marker.type];
    const context = contexts[index];
    
    if (pattern && context) {
      let prosodyStart = '';
      let prosodyEnd = '';

      // Ajouter une transition si nécessaire
      if (context.previousType && context.transitionDuration) {
        const prevPattern = intonationPatterns[context.previousType];
        prosodyStart = `<prosody pitch="${prevPattern.pitch}" rate="${prevPattern.rate}" volume="${prevPattern.volume}">`;
        prosodyEnd = `</prosody>`;
      }

      // Créer une transition graduelle
      if (context.transitionDuration) {
        const transitionTime = context.transitionDuration;
        text = `${prosodyStart}<prosody gradual="${transitionTime}ms" pitch="${pattern.pitch}" rate="${pattern.rate}" volume="${pattern.volume}">${text}${prosodyEnd}`;
      } else {
        text = `<prosody pitch="${pattern.pitch}" rate="${pattern.rate}" volume="${pattern.volume}">${text}</prosody>`;
      }
    }
  });

  // Ajouter des emphases sur les mots importants avec variation d'intensité
  analysis.emphasis.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const emphasisLevel = analysis.intensity > 0.7 ? 'x-strong' :
                         analysis.intensity > 0.4 ? 'strong' :
                         'moderate';
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

const parseTextSegments = (text: string): TextSegment[] => {
  logger.group('Parsing des segments');
  logger.debug('Texte à parser:', text);
  
  const segments: TextSegment[] = [];
  const regex = /\[(\w+)\](.*?)\[\/\1\]|([^\[\]]+)/g;
  const matches: { emotion: string; content: string; isTagged: boolean }[] = [];
  let match;

  // Première passe : collecter tous les segments
  while ((match = regex.exec(text)) !== null) {
    if (match[1] && match[2]) {
      matches.push({
        emotion: match[1],
        content: match[2].trim(),
        isTagged: true
      });
    } else if (match[3]) {
      const content = match[3].trim();
      if (content) {
        matches.push({
          emotion: 'sensuel',
          content,
          isTagged: false
        });
      }
    }
  }

  // Deuxième passe : analyser et créer les segments avec contexte
  matches.forEach((m, i) => {
    if (m.content) {
      const analysis = analyzeText(m.content);
      const { markers, contexts } = extractIntonationMarkers(m.content);

      // Créer le contexte du segment
      const segmentContext: SegmentContext = {
        previousEmotion: i > 0 ? matches[i - 1].emotion : undefined,
        nextEmotion: i < matches.length - 1 ? matches[i + 1].emotion : undefined,
        transitionDuration: i < matches.length - 1 ? 
          calculateEmotionTransitionDuration(m.emotion, matches[i + 1].emotion) : undefined
      };

      // Ajuster l'analyse en fonction du contexte
      if (segmentContext.previousEmotion) {
        analysis.emotionalProgression *= 1.2; // Augmenter la progression émotionnelle pour les transitions
      }

      // Créer le segment avec les informations de contexte
      segments.push({
        text: m.content,
        emotion: m.emotion,
        analysis,
        intonationMarkers: markers,
        context: segmentContext,
        intonationContexts: contexts
      });
    }
  });

  logger.debug('Segments générés:', segments);
  logger.groupEnd();
  return segments;
};

export const generateVoice = async (text: string): Promise<string> => {
  try {
    logger.group('Génération de la voix');
    logger.info('Début de la génération pour le texte:', text);
    
    const segments = parseTextSegments(text);
    logger.debug('Segments analysés:', segments);

    const firstSegment = segments[0];
    const settings = getVoiceSettings(firstSegment.emotion, firstSegment.analysis);

    const processedText = segments
      .map((segment, index) => {
        // Appliquer les variations de base en fonction de l'émotion avec débit très ralenti
        const baseRate = segment.emotion === 'murmure' ? '55%' : // Extrêmement ralenti
                        segment.emotion === 'intense' ? '65%' :  // Très ralenti
                        '60%';                                   // Débit de base très ralenti
        
        // Ajuster la hauteur pour plus de profondeur
        const basePitch = segment.emotion === 'murmure' ? '-25%' : // Plus grave
                         segment.emotion === 'intense' ? '+15%' :  // Moins aigu
                         '-5%';                                    // Légèrement plus grave par défaut

        // Ajouter les respirations et pauses avec l'analyse complète
        const textWithBreathing = addBreathingAndPauses(segment.text, segment.emotion, segment.analysis);

        // Ajuster les paramètres en fonction de l'analyse et du contexte
        // Variations plus importantes entre les phrases
        const adjustedRate = `${parseFloat(baseRate) * (1 + segment.analysis.tonalVariation * 0.25)}%`;
        const adjustedPitch = `${parseFloat(basePitch) + (segment.analysis.emotionalProgression * 10)}%`;
        // Volume augmenté pour plus de présence
        const adjustedVolume = segment.analysis.intensity > 0.7 ? '+4dB' :
                             segment.analysis.intensity < 0.3 ? '-2dB' :
                             '+1dB';

        // Construire le SSML avec transitions
        let ssml = textWithBreathing;

        // Ajouter les transitions entre segments
        if (segment.context?.transitionDuration && index > 0) {
          // Utiliser la durée de transition du contexte
          ssml = `<prosody gradual="${segment.context.transitionDuration}ms" pitch="${adjustedPitch}" rate="${adjustedRate}" volume="${adjustedVolume}">${ssml}</prosody>`;
        } else {
          ssml = `<prosody pitch="${adjustedPitch}" rate="${adjustedRate}" volume="${adjustedVolume}">${ssml}</prosody>`;
        }

        // Ajouter une pause dynamique entre les segments
        const nextSegment = index < segments.length - 1 ? segments[index + 1] : null;
        if (nextSegment) {
          const pauseDuration = segment.context?.transitionDuration || 1000;
          const pauseStrength = segment.analysis.intensity > 0.7 ? 'x-strong' :
                              segment.analysis.intensity > 0.4 ? 'strong' :
                              'medium';
          ssml += `<break time="${pauseDuration}ms" strength="${pauseStrength}"/>`;
        }

        return ssml;
      })
      .join('');

    const ssmlText = `<speak>${processedText}</speak>`;
    logger.debug('Texte SSML final:', ssmlText);

    logger.info('Envoi de la requête à l\'API');
    const response = await axiosInstance.post(
      API_URL,
      {
        text: ssmlText,
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

    logger.info('Réponse reçue de l\'API');
    const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);
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
