import React, { useState, useEffect } from 'react';
import TextInput from './components/TextInput';
import VoicePlayer from './components/VoicePlayer';
import { generateVoice, generateVoiceWithEnvironment } from './services/elevenLabsAPI';
import { analyzeTextEnvironments } from './services/grokService';
import { logger } from './config/development';
import './App.css';

// Vérification des variables d'environnement
const ELEVENLABS_VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID;
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const GROK_API_KEY = import.meta.env.VITE_GROK_API_KEY;

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedEnvironment, setDetectedEnvironment] = useState<string>('default');
  const [detectedEmotion, setDetectedEmotion] = useState<string>('sensuel');
  const [envError, setEnvError] = useState<string | null>(null);
  // État de l'application

  // Vérification des variables d'environnement au chargement
  useEffect(() => {
    // Vérifier les variables d'environnement requises
    if (!ELEVENLABS_VOICE_ID || !ELEVENLABS_API_KEY) {
      const errorMsg = "Variables d'environnement manquantes: VITE_ELEVENLABS_VOICE_ID ou VITE_ELEVENLABS_API_KEY. Veuillez configurer ces variables dans les paramètres de Vercel.";
      setEnvError(errorMsg);
      logger.error(errorMsg);
      console.error(errorMsg);
    } else {
      setEnvError(null);
    }
  }, []);

  useEffect(() => {
    logger.group('État de l\'application');
    logger.debug('État actuel:', {
      inputText,
      audioUrl,
      isLoading,
      error,
      envError,
      detectedEnvironment,
      detectedEmotion
    });
    logger.groupEnd();
  }, [inputText, audioUrl, isLoading, error, envError, detectedEnvironment, detectedEmotion]);

  const handleTextChange = (text: string) => {
    logger.debug('Changement de texte:', text);
    setInputText(text);
    setError(null);

    // Analyser le texte pour détecter l'environnement, l'émotion et les paramètres vocaux
    if (text.trim()) {
      analyzeTextEnvironments(text)
        .then(detections => {
          if (detections.length > 0) {
            setDetectedEnvironment(detections[0].environment);
            setDetectedEmotion(detections[0].emotionalTone);
            logger.debug('Environnement détecté:', detections[0].environment);
            logger.debug('Émotion détectée:', detections[0].emotionalTone);
          }
        })
        .catch(err => {
          logger.error('Erreur lors de la détection de l\'environnement et de l\'émotion:', err);
          setDetectedEnvironment('default');
          setDetectedEmotion('sensuel');
        });
    } else {
      setDetectedEnvironment('default');
      setDetectedEmotion('sensuel');
    }
  };


  const handleGenerateVoice = async () => {
    logger.group('Génération de la voix');
    logger.info('Début de la génération');
    logger.debug('Texte actuel:', inputText);
    logger.debug('Environnement détecté:', detectedEnvironment);
    logger.debug('Émotion détectée:', detectedEmotion);
    
    // Afficher les logs dans la console du navigateur
    console.log('Début de la génération de la voix');
    console.log('Texte:', inputText);
    console.log('Environnement:', detectedEnvironment);
    console.log('Émotion:', detectedEmotion);
    
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
      
      // Utiliser directement le texte brut sans ajouter de balises
      logger.debug('Analyse du texte par Grok:', inputText);
      console.log('Analyse du texte par Grok');

      // Essayer d'abord avec la méthode simple
      console.log('Tentative de génération de voix simple');
      let url;
      try {
        url = await generateVoice(inputText);
        console.log('Génération de voix simple réussie');
      } catch (simpleError) {
        console.error('Échec de la génération simple:', simpleError);
        
        // Si la méthode simple échoue, essayer avec l'environnement
        console.log('Tentative de génération avec environnement');
        url = await generateVoiceWithEnvironment(inputText, true);
        console.log('Génération avec environnement réussie');
      }
      
      logger.info('URL audio reçue:', url);
      console.log('URL audio reçue:', url);
      
      // Vérifier que l'URL est valide
      if (!url) {
        throw new Error('URL audio invalide reçue');
      }

      setAudioUrl(url);
      logger.info('Audio URL mise à jour avec succès');
      console.log('Audio URL mise à jour avec succès');
      
      // Forcer une mise à jour de l'interface
      setTimeout(() => {
        console.log('Mise à jour forcée de l\'interface');
        setIsLoading(false);
      }, 500);
    } catch (err) {
      logger.error('Erreur lors de la génération de la voix:', err);
      console.error('Erreur lors de la génération de la voix:', err);
      
      let errorMessage = "Erreur lors de la génération de la voix. ";
      
      if (err instanceof Error) {
        errorMessage += err.message;
        logger.error('Message d\'erreur:', err.message);
        logger.error('Stack trace:', err.stack);
        console.error('Message d\'erreur:', err.message);
        console.error('Stack trace:', err.stack);
      }
      
      setError(errorMessage);
    } finally {
      logger.info('Fin de la génération');
      console.log('Fin de la génération');
      setIsLoading(false);
      logger.groupEnd();
    }
  };

  // Pas de navigation entre les vues

  return (
    <div className="app">
      <h1>Générateur de Voix Érotique</h1>
      
      {envError ? (
        <div className="env-error">
          <h2>Erreur de configuration</h2>
          <p>{envError}</p>
          <div className="env-help">
            <h3>Comment résoudre ce problème :</h3>
            <ol>
              <li>Connectez-vous à votre compte Vercel</li>
              <li>Accédez à votre projet</li>
              <li>Cliquez sur "Settings" (Paramètres)</li>
              <li>Allez dans la section "Environment Variables" (Variables d'environnement)</li>
              <li>Ajoutez les variables VITE_ELEVENLABS_VOICE_ID et VITE_ELEVENLABS_API_KEY avec leurs valeurs</li>
              <li>Cliquez sur "Save" (Enregistrer)</li>
              <li>Redéployez votre application</li>
            </ol>
            <p>Pour plus d'informations, consultez le fichier README.md du projet.</p>
          </div>
        </div>
      ) : (
        <div className="app-container">
          <div className="controls-section">
            <TextInput onTextChange={handleTextChange} />
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
            <VoicePlayer 
              audioUrl={audioUrl} 
              environment={detectedEnvironment} // Passer l'environnement détecté
              emotion={detectedEmotion}
            />
            {audioUrl && (
              <div className="audio-info">
                Audio généré avec succès
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
