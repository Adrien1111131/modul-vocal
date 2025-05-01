import React, { useEffect, useState, useRef } from 'react';
import { Howl, Howler } from 'howler';
import { mapEnvironmentToSounds } from '../services/grokService';
import { logger } from '../config/development';

interface HowlerPlayerProps {
  storyUrl: string | null;
  environment?: string;
  autoPlay?: boolean;
  volume?: number;
}

const HowlerPlayer: React.FC<HowlerPlayerProps> = ({
  storyUrl,
  environment = '',
  autoPlay = false,
  volume = 0.8
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(volume);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [environmentName, setEnvironmentName] = useState(environment);
  
  const storySound = useRef<Howl | null>(null);
  const ambienceSounds = useRef<Map<string, Howl>>(new Map());
  const seekInterval = useRef<number | null>(null);

  // Initialiser les sons
  useEffect(() => {
    // Nettoyer les sons précédents
    cleanup();
    
    if (storyUrl) {
      // Initialiser le son principal (histoire)
      storySound.current = new Howl({
        src: [storyUrl],
        volume: currentVolume,
        html5: true, // Meilleure gestion mémoire pour des fichiers plus longs
        onload: () => {
          logger.info('Son principal chargé:', storyUrl);
          setIsLoaded(true);
          setDuration(storySound.current?.duration() || 0);
          
          // Démarrer automatiquement si autoPlay est activé
          if (autoPlay) {
            handlePlay();
          }
        },
        onplay: () => {
          setIsPlaying(true);
          // Démarrer l'intervalle pour mettre à jour le temps actuel
          seekInterval.current = window.setInterval(() => {
            setCurrentTime(storySound.current?.seek() || 0);
          }, 100);
          
          // Démarrer les sons d'ambiance
          playAmbienceSounds();
        },
        onpause: () => {
          setIsPlaying(false);
          // Arrêter l'intervalle
          if (seekInterval.current) {
            clearInterval(seekInterval.current);
            seekInterval.current = null;
          }
          
          // Mettre en pause les sons d'ambiance
          pauseAmbienceSounds();
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
          stopAmbienceSounds();
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
          fadeOutAmbienceSounds();
        },
        onseek: () => {
          setCurrentTime(storySound.current?.seek() || 0);
        },
        onloaderror: (id, error) => {
          logger.error('Erreur lors du chargement du son principal:', error);
        },
        onplayerror: (id, error) => {
          logger.error('Erreur lors de la lecture du son principal:', error);
        }
      });
      
      // Charger les sons d'ambiance
      loadAmbienceSounds();
    }
    
    // Nettoyage lors du démontage du composant
    return cleanup;
  }, [storyUrl]);
  
  // Mettre à jour les sons d'ambiance lorsque l'environnement change
  useEffect(() => {
    if (environment !== environmentName) {
      setEnvironmentName(environment);
      
      // Arrêter les sons d'ambiance actuels avec fondu
      fadeOutAmbienceSounds();
      
      // Charger les nouveaux sons d'ambiance
      loadAmbienceSounds();
      
      // Démarrer les nouveaux sons d'ambiance si l'histoire est en cours de lecture
      if (isPlaying) {
        playAmbienceSounds();
      }
    }
  }, [environment]);
  
  // Mettre à jour le volume
  useEffect(() => {
    if (storySound.current) {
      storySound.current.volume(currentVolume);
    }
    
    // Mettre à jour le volume des sons d'ambiance (plus bas que le son principal)
    ambienceSounds.current.forEach(sound => {
      sound.volume(currentVolume * 0.4); // 40% du volume principal
    });
  }, [currentVolume]);
  
  // Charger les sons d'ambiance
  const loadAmbienceSounds = () => {
    if (!environment) return;
    
    // Obtenir les fichiers audio pour l'environnement
    const soundFiles = mapEnvironmentToSounds(environment);
    
    // Créer un Howl pour chaque fichier audio
    soundFiles.forEach(file => {
      const soundUrl = `/sounds/environments/mp3/${file}`;
      
      const sound = new Howl({
        src: [soundUrl],
        volume: currentVolume * 0.4, // 40% du volume principal
        loop: true,
        html5: true,
        onload: () => {
          logger.info('Son d\'ambiance chargé:', soundUrl);
        },
        onloaderror: (id, error) => {
          logger.error(`Erreur lors du chargement du son d'ambiance ${soundUrl}:`, error);
        }
      });
      
      ambienceSounds.current.set(file, sound);
    });
  };
  
  // Démarrer les sons d'ambiance
  const playAmbienceSounds = () => {
    ambienceSounds.current.forEach(sound => {
      // Démarrer avec fondu
      sound.volume(0);
      sound.play();
      sound.fade(0, currentVolume * 0.4, 2000); // Fondu sur 2 secondes
    });
  };
  
  // Mettre en pause les sons d'ambiance
  const pauseAmbienceSounds = () => {
    ambienceSounds.current.forEach(sound => {
      sound.pause();
    });
  };
  
  // Arrêter les sons d'ambiance
  const stopAmbienceSounds = () => {
    ambienceSounds.current.forEach(sound => {
      sound.stop();
    });
  };
  
  // Arrêter les sons d'ambiance avec fondu
  const fadeOutAmbienceSounds = () => {
    ambienceSounds.current.forEach(sound => {
      sound.fade(sound.volume(), 0, 2000); // Fondu sur 2 secondes
      setTimeout(() => {
        sound.stop();
      }, 2000);
    });
  };
  
  // Nettoyer les sons
  const cleanup = () => {
    // Arrêter l'intervalle
    if (seekInterval.current) {
      clearInterval(seekInterval.current);
      seekInterval.current = null;
    }
    
    // Arrêter et décharger le son principal
    if (storySound.current) {
      storySound.current.stop();
      storySound.current.unload();
      storySound.current = null;
    }
    
    // Arrêter et décharger les sons d'ambiance
    ambienceSounds.current.forEach(sound => {
      sound.stop();
      sound.unload();
    });
    ambienceSounds.current.clear();
    
    setIsLoaded(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };
  
  // Gérer la lecture
  const handlePlay = () => {
    if (storySound.current && isLoaded) {
      storySound.current.play();
    }
  };
  
  // Gérer la pause
  const handlePause = () => {
    if (storySound.current && isPlaying) {
      storySound.current.pause();
    }
  };
  
  // Gérer l'arrêt
  const handleStop = () => {
    if (storySound.current) {
      storySound.current.stop();
    }
  };
  
  // Gérer le redémarrage
  const handleRestart = () => {
    if (storySound.current) {
      storySound.current.stop();
      storySound.current.play();
    }
  };
  
  // Gérer la recherche
  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(event.target.value);
    if (storySound.current) {
      storySound.current.seek(time);
      setCurrentTime(time);
    }
  };
  
  // Gérer le changement de volume
  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    setCurrentVolume(newVolume);
  };
  
  // Formater le temps
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="howler-player">
      {storyUrl ? (
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
              onChange={handleSeek}
              className="progress-slider"
              disabled={!isLoaded}
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
              value={currentVolume}
              onChange={handleVolumeChange}
              className="volume-slider"
            />
          </div>
          
          {environment && (
            <div className="environment-info">
              <p>Environnement: {environment}</p>
              <p>Sons d'ambiance: {Array.from(ambienceSounds.current.keys()).join(', ')}</p>
            </div>
          )}
        </div>
      ) : (
        <p>Aucun audio disponible</p>
      )}
      <style>
        {`
          .howler-player {
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

          .environment-info p {
            margin: 0.3rem 0;
          }
        `}
      </style>
    </div>
  );
};

export default HowlerPlayer;
