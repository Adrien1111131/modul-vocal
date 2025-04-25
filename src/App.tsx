import React, { useState, useEffect } from 'react';
import EmotionSelector from './components/EmotionSelector';
import TextInput from './components/TextInput';
import VoicePlayer from './components/VoicePlayer';
import { generateVoice, generateVoiceWithEnvironment } from './services/elevenLabsAPI';
import { logger } from './config/development';
import './App.css';

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState('sensuel');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useAI, setUseAI] = useState(false);

  useEffect(() => {
    logger.group('État de l\'application');
    logger.debug('État actuel:', {
      inputText,
      selectedEmotion,
      audioUrl,
      isLoading,
      error,
      useAI
    });
    logger.groupEnd();
  }, [inputText, selectedEmotion, audioUrl, isLoading, error, useAI]);

  const handleTextChange = (text: string) => {
    logger.debug('Changement de texte:', text);
    setInputText(text);
    setError(null);
  };

  const handleEmotionChange = (emotion: string) => {
    logger.debug('Changement d\'émotion:', emotion);
    setSelectedEmotion(emotion);
    setError(null);
  };

  const handleToggleAI = () => {
    setUseAI(!useAI);
    logger.debug('Utilisation de l\'IA pour l\'analyse:', !useAI);
  };

  const handleGenerateVoice = async () => {
    logger.group('Génération de la voix');
    logger.info('Début de la génération');
    logger.debug('Texte actuel:', inputText);
    logger.debug('Utilisation de l\'IA:', useAI);
    
    if (!inputText.trim()) {
      const errorMsg = "Veuillez entrer du texte avant de générer la voix";
      logger.warn(errorMsg);
      setError(errorMsg);
      logger.groupEnd();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Si le texte n'a pas de balises d'émotion, on ajoute l'émotion sélectionnée
      const textWithEmotion = inputText.match(/\[\w+\]/) 
        ? inputText 
        : `[${selectedEmotion}]${inputText}[/${selectedEmotion}]`;
      
      logger.debug('Texte avec émotions:', textWithEmotion);

      let url;
      if (useAI) {
        // Utiliser l'analyse OpenAI et les sons d'environnement
        logger.info('Utilisation de l\'analyse OpenAI et des sons d\'environnement');
        url = await generateVoiceWithEnvironment(textWithEmotion, true);
      } else {
        // Utiliser la méthode standard
        url = await generateVoice(textWithEmotion);
      }
      
      logger.info('URL audio reçue:', url);
      
      // Vérifier que l'URL est valide
      if (!url) {
        throw new Error('URL audio invalide reçue');
      }

      setAudioUrl(url);
      logger.info('Audio URL mise à jour avec succès');
    } catch (err) {
      logger.error('Erreur lors de la génération de la voix:', err);
      let errorMessage = "Erreur lors de la génération de la voix. ";
      
      if (err instanceof Error) {
        errorMessage += err.message;
        logger.error('Message d\'erreur:', err.message);
        logger.error('Stack trace:', err.stack);
      }
      
      setError(errorMessage);
    } finally {
      logger.info('Fin de la génération');
      setIsLoading(false);
      logger.groupEnd();
    }
  };

  return (
    <div className="app">
      <h1>Générateur de Voix Érotique</h1>
      <div className="app-container">
        <div className="controls-section">
          <EmotionSelector onEmotionChange={handleEmotionChange} />
          <TextInput onTextChange={handleTextChange} />
          <div className="ai-toggle">
            <label>
              <input
                type="checkbox"
                checked={useAI}
                onChange={handleToggleAI}
                disabled={isLoading}
              />
              Utiliser l'IA pour analyser le texte et ajouter des sons d'environnement
            </label>
          </div>
          <button 
            onClick={handleGenerateVoice}
            disabled={isLoading || !inputText.trim()}
            className="generate-button"
          >
            {isLoading ? 'Génération en cours...' : 'Générer la Voix'}
          </button>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>
        <div className="player-section">
          <VoicePlayer audioUrl={audioUrl} />
          {audioUrl && (
            <div className="audio-info">
              Audio généré avec succès
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
