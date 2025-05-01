import React, { useRef, useEffect, useState } from 'react';
import { Howl } from 'howler';
import { analyzeTextEnvironments, EnvironmentDetection } from '../services/grokService';
import { getEnvironmentConfig, getSoundUrl } from '../config/soundEnvironments';
import { logger } from '../config/development';

interface VoicePlayerProps {
  audioUrl: string | null;
  environment?: string;
  emotion?: string;
}

const VoicePlayer: React.FC<VoicePlayerProps> = ({ 
  audioUrl,
  environment = '',
  emotion = 'sensuel'
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  
  const voiceSound = useRef<Howl | null>(null);
  const ambianceSounds = useRef<Map<string, Howl>>(new Map());
  const seekInterval = useRef<number | null>(null);
  const ambianceTimers = useRef<NodeJS.Timeout[]>([]);
  const detectedSegments = useRef<EnvironmentDetection[]>([]);

  // Pas besoin d'analyser le texte ici, l'environnement est déjà détecté

  // Initialiser les sons
  useEffect(() => {
    // Nettoyer les sons précédents
    cleanup();
    
    if (audioUrl) {
      // Initialiser le son principal (voix)
      voiceSound.current = new Howl({
        src: [audioUrl],
        volume: volume,
        html5: true, // Meilleure gestion mémoire pour des fichiers plus longs
        format: ['mp3'], // Spécifier le format pour éviter l'erreur
        onload: () => {
          logger.info('Son principal chargé:', audioUrl);
          setIsLoaded(true);
          setDuration(voiceSound.current?.duration() || 0);
          
          // Charger les sons d'ambiance seulement après que la voix soit chargée
          if (environment) {
            loadAmbianceSounds();
          }
        },
        onplay: () => {
          setIsPlaying(true);
          // Démarrer l'intervalle pour mettre à jour le temps actuel
          if (seekInterval.current) {
            clearInterval(seekInterval.current);
          }
          seekInterval.current = window.setInterval(() => {
            if (!isSeeking && voiceSound.current) {
              const time = voiceSound.current.seek() || 0;
              setCurrentTime(time);
            }
          }, 50); // Mise à jour plus fréquente
          
          // Programmer les sons d'ambiance selon les segments détectés
          scheduleAmbianceSounds();
        },
        onpause: () => {
          setIsPlaying(false);
          // Arrêter l'intervalle
          if (seekInterval.current) {
            clearInterval(seekInterval.current);
            seekInterval.current = null;
          }
          
          // Mettre en pause les sons d'ambiance
          pauseAmbianceSounds();
        },
        onstop: () => {
          setIsPlaying(false);
          setCurrentTime(0);
          // Arrêter l'intervalle
          if (seekInterval.current) {
            clearInterval(seekInterval.current);
            seekInterval.current = null;
          }
          
          // Arrêter les sons d'ambiance
          stopAmbianceSounds();
        },
        onend: () => {
          setIsPlaying(false);
          setCurrentTime(0);
          // Arrêter l'intervalle
          if (seekInterval.current) {
            clearInterval(seekInterval.current);
            seekInterval.current = null;
          }
          
          // Arrêter les sons d'ambiance avec fondu
          fadeOutAmbianceSounds();
        },
        onseek: () => {
          setCurrentTime(voiceSound.current?.seek() || 0);
        },
        onloaderror: (id, error) => {
          logger.error('Erreur lors du chargement du son principal:', error);
        },
        onplayerror: (id, error) => {
          logger.error('Erreur lors de la lecture du son principal:', error);
        }
      });
      // Ne pas charger les sons d'ambiance ici, mais dans onload
    }
    
    // Nettoyage lors du démontage du composant
    return cleanup;
  }, [audioUrl]);
  
  // Mettre à jour le volume
  useEffect(() => {
    if (voiceSound.current) {
      voiceSound.current.volume(volume);
    }
    
    // Mettre à jour le volume des sons d'ambiance (plus bas que le son principal)
    ambianceSounds.current.forEach(sound => {
      sound.volume(volume * 0.4); // 40% du volume principal
    });
  }, [volume]);
  
  // Charger les sons d'ambiance
  const loadAmbianceSounds = () => {
    if (!environment) return;
    
    try {
      // Obtenir la configuration de l'environnement
      const envConfig = getEnvironmentConfig(environment);
      
      // Créer un Howl pour le son principal
      const mainSoundUrl = getSoundUrl(envConfig.mainAmbience);
      logger.info('Chargement du son d\'ambiance principal:', mainSoundUrl);
      
      const mainSound = new Howl({
        src: [mainSoundUrl],
        volume: envConfig.volume * volume, // Ajuster en fonction du volume principal
        loop: envConfig.loop,
        html5: true,
        format: ['mp3'], // Spécifier le format pour éviter l'erreur
        preload: true,
        onload: () => {
          logger.info('Son d\'ambiance principal chargé:', mainSoundUrl);
        },
        onloaderror: (id, error) => {
          logger.error(`Erreur lors du chargement du son d'ambiance ${mainSoundUrl}:`, error);
        }
      });
      
      ambianceSounds.current.set(envConfig.mainAmbience, mainSound);
      
      // Charger les sons additionnels si présents
      envConfig.additionalSounds?.forEach(addSound => {
        const additionalSoundUrl = getSoundUrl(addSound.sound);
        logger.info('Chargement du son d\'ambiance additionnel:', additionalSoundUrl);
        
        const sound = new Howl({
          src: [additionalSoundUrl],
          volume: addSound.volume * volume, // Ajuster en fonction du volume principal
          loop: false,
          html5: true,
          format: ['mp3'], // Spécifier le format pour éviter l'erreur
          preload: true,
          onload: () => {
            logger.info('Son d\'ambiance additionnel chargé:', additionalSoundUrl);
          },
          onloaderror: (id, error) => {
            logger.error(`Erreur lors du chargement du son d'ambiance ${additionalSoundUrl}:`, error);
          },
          onend: () => {
            // Nettoyer le son une fois terminé (les sons additionnels ne sont pas en boucle par défaut)
            sound.unload();
          }
        });
        
        ambianceSounds.current.set(addSound.sound, sound);
      });
    } catch (error) {
      logger.error('Erreur lors du chargement des sons d\'ambiance:', error);
    }
  };
  
  // Programmer les sons d'ambiance
  const scheduleAmbianceSounds = () => {
    // Nettoyer les timers précédents
    ambianceTimers.current.forEach(timerId => clearTimeout(timerId));
    ambianceTimers.current = [];
    
    // Arrêter tous les sons d'ambiance
    stopAmbianceSounds();
    
    // Charger et démarrer les sons d'ambiance pour l'environnement actuel
    if (environment) {
      // Les sons sont déjà chargés dans onload
      
      // Obtenir la configuration de l'environnement
      const envConfig = getEnvironmentConfig(environment);
      
      // Démarrer les sons avec fondu
      ambianceSounds.current.forEach(sound => {
        try {
          const currentVolume = sound.volume();
          sound.volume(0);
          sound.play();
          sound.fade(0, currentVolume, envConfig.fadeInDuration);
        } catch (error) {
          logger.error('Erreur lors du démarrage du son d\'ambiance:', error);
        }
      });
      
      // Programmer les sons additionnels si nécessaire
      const additionalSounds = envConfig.additionalSounds || [];
      additionalSounds.forEach(addSound => {
        if (addSound.interval && ambianceSounds.current.has(addSound.sound)) {
          const sound = ambianceSounds.current.get(addSound.sound)!;
          
          // Fonction pour jouer le son additionnel
          const playAdditionalSound = () => {
            sound.play();
            
            // Programmer le prochain son si en boucle
            if (addSound.interval) {
              const delay = addSound.random 
                ? Math.random() * addSound.interval + (addSound.interval / 2)
                : addSound.interval;
                
              const timer = setTimeout(playAdditionalSound, delay);
              ambianceTimers.current.push(timer);
            }
          };
          
          // Démarrer le premier son après un délai aléatoire
          const initialDelay = addSound.random 
            ? Math.random() * 5000 + 1000
            : 2000;
            
          const timer = setTimeout(playAdditionalSound, initialDelay);
          ambianceTimers.current.push(timer);
        }
      });
    }
  };
  
  // Démarrer les sons d'ambiance
  const playAmbianceSounds = () => {
    if (!environment) return;
    
    const envConfig = getEnvironmentConfig(environment);
    
    ambianceSounds.current.forEach(sound => {
      // Démarrer avec fondu
      const currentVolume = sound.volume();
      sound.volume(0);
      sound.play();
      sound.fade(0, currentVolume, envConfig.fadeInDuration);
    });
  };
  
  // Mettre en pause les sons d'ambiance
  const pauseAmbianceSounds = () => {
    ambianceSounds.current.forEach(sound => {
      sound.pause();
    });
  };
  
  // Arrêter les sons d'ambiance
  const stopAmbianceSounds = () => {
    ambianceSounds.current.forEach(sound => {
      sound.stop();
    });
  };
  
  // Arrêter les sons d'ambiance avec fondu
  const fadeOutAmbianceSounds = () => {
    if (!environment) return;
    
    const envConfig = getEnvironmentConfig(environment);
    
    ambianceSounds.current.forEach(sound => {
      sound.fade(sound.volume(), 0, envConfig.fadeOutDuration);
      setTimeout(() => {
        sound.stop();
      }, envConfig.fadeOutDuration);
    });
  };
  
  // Nettoyer les sons
  const cleanup = () => {
    // Arrêter l'intervalle
    if (seekInterval.current) {
      clearInterval(seekInterval.current);
      seekInterval.current = null;
    }
    
    // Arrêter les timers
    ambianceTimers.current.forEach(timerId => clearTimeout(timerId));
    ambianceTimers.current = [];
    
    // Arrêter et décharger le son principal
    if (voiceSound.current) {
      voiceSound.current.stop();
      voiceSound.current.unload();
      voiceSound.current = null;
    }
    
    // Arrêter et décharger les sons d'ambiance
    ambianceSounds.current.forEach(sound => {
      sound.stop();
      sound.unload();
    });
    ambianceSounds.current.clear();
    
    setIsLoaded(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };
  
  // Formater le temps
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Gérer la lecture
  const handlePlay = () => {
    if (voiceSound.current && isLoaded) {
      voiceSound.current.play();
    }
  };
  
  // Gérer la pause
  const handlePause = () => {
    if (voiceSound.current && isPlaying) {
      voiceSound.current.pause();
    }
  };
  
  // Gérer l'arrêt
  const handleStop = () => {
    if (voiceSound.current) {
      voiceSound.current.stop();
    }
  };
  
  // Gérer le redémarrage
  const handleRestart = () => {
    if (voiceSound.current) {
      voiceSound.current.stop();
      voiceSound.current.play();
    }
  };
  
  // Gérer le début du déplacement du curseur
  const handleSeekStart = () => {
    setIsSeeking(true);
    // Mettre en pause temporairement pendant le déplacement
    if (voiceSound.current && isPlaying) {
      voiceSound.current.pause();
    }
  };
  
  // Gérer le déplacement du curseur en cours
  const handleSeeking = (event: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(event.target.value);
    setCurrentTime(time);
  };
  
  // Gérer la fin du déplacement du curseur
  const handleSeekEnd = (event: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(event.target.value);
    if (voiceSound.current) {
      // Sauvegarder l'état de lecture
      const wasPlaying = isPlaying;
      
      // Déplacer le curseur
      voiceSound.current.seek(time);
      setCurrentTime(time);
      
      // Synchroniser les sons d'ambiance
      ambianceSounds.current.forEach(sound => {
        sound.seek(0); // Remettre à zéro car les ambiances ne sont pas synchronisées au temps
      });
      
      // Reprendre la lecture si nécessaire
      if (wasPlaying) {
        voiceSound.current.play();
      }
    }
    setIsSeeking(false);
  };
  
  // Gestionnaires d'événements spécifiques pour les événements de souris et de toucher
  const handleMouseDown = () => handleSeekStart();
  const handleTouchStart = () => handleSeekStart();
  const handleMouseUp = (event: React.MouseEvent<HTMLInputElement>) => {
    const input = event.target as HTMLInputElement;
    const time = parseFloat(input.value);
    setCurrentTime(time);
    handleSeekEnd({ target: { value: input.value } } as React.ChangeEvent<HTMLInputElement>);
  };
  const handleTouchEnd = (event: React.TouchEvent<HTMLInputElement>) => {
    const input = event.target as HTMLInputElement;
    const time = parseFloat(input.value);
    setCurrentTime(time);
    handleSeekEnd({ target: { value: input.value } } as React.ChangeEvent<HTMLInputElement>);
  };
  
  // Gérer le changement de volume
  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    setVolume(newVolume);
  };

  return (
    <div className="voice-player">
      {audioUrl ? (
        <div>
          <div className="player-controls">
            <button onClick={handlePlay} className="player-button" disabled={isPlaying || !isLoaded}>
              Lecture
            </button>
            <button onClick={handlePause} className="player-button" disabled={!isPlaying}>
              Pause
            </button>
            <button onClick={handleStop} className="player-button" disabled={!isPlaying}>
              Arrêt
            </button>
            <button onClick={handleRestart} className="player-button" disabled={!isLoaded}>
              Recommencer
            </button>
          </div>
          <div className="progress-container">
            <span className="time">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onChange={handleSeeking}
              onMouseUp={handleMouseUp}
              onTouchEnd={handleTouchEnd}
              onBlur={handleSeekEnd}
              className="progress-slider"
              disabled={!isLoaded}
              style={{ cursor: 'pointer' }}
            />
            <span className="time">{formatTime(duration)}</span>
          </div>
          <div className="volume-container">
            <span className="volume-label">Volume:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="volume-slider"
            />
          </div>
          
          {environment && (
            <div className="environment-info">
              <h3>Ambiance: {environment}</h3>
              <p>Sons d'ambiance: {Array.from(ambianceSounds.current.keys()).join(', ')}</p>
            </div>
          )}
        </div>
      ) : (
        <p>Aucun audio disponible</p>
      )}
      <style>
        {`
          .voice-player {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }

          .player-controls {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
          }

          .player-button {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 4px;
            background: #007bff;
            color: white;
            cursor: pointer;
            transition: background-color 0.2s;
          }

          .player-button:disabled {
            background: #ccc;
            cursor: not-allowed;
          }

          .player-button:not(:disabled):hover {
            background: #0056b3;
          }

          .progress-container {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
          }

          .progress-slider {
            flex: 1;
            height: 4px;
            -webkit-appearance: none;
            background: #ddd;
            border-radius: 2px;
            outline: none;
          }

          .progress-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 12px;
            height: 12px;
            background: #007bff;
            border-radius: 50%;
            cursor: pointer;
          }

          .volume-container {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
          }

          .volume-slider {
            width: 100px;
            height: 4px;
            -webkit-appearance: none;
            background: #ddd;
            border-radius: 2px;
            outline: none;
          }

          .volume-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 12px;
            height: 12px;
            background: #007bff;
            border-radius: 50%;
            cursor: pointer;
          }

          .time {
            font-family: monospace;
            min-width: 4ch;
          }

          .volume-label {
            min-width: 60px;
          }

          .environment-info {
            margin-top: 1rem;
            padding: 0.8rem;
            background-color: #f0f8ff;
            border-radius: 6px;
          }

          .environment-info h3 {
            margin-top: 0;
            margin-bottom: 0.5rem;
          }

          .environment-info p {
            margin: 0.3rem 0;
          }
        `}
      </style>
    </div>
  );
};

export default VoicePlayer;
