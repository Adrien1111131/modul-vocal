import React, { useRef, useEffect, useState } from 'react';
import { audioSyncService, AmbianceQueueItem } from '../services/audioSyncService';
import { logger } from '../config/development';

interface SynchronizedPlayerProps {
  audioUrl: string | null;
  phrases?: string[];
  environments?: string[];
}

const SynchronizedPlayer: React.FC<SynchronizedPlayerProps> = ({
  audioUrl,
  phrases = [],
  environments = []
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ambianceQueue, setAmbianceQueue] = useState<AmbianceQueueItem[]>([]);

  // Créer la file d'attente d'ambiance lorsque les phrases ou les environnements changent
  useEffect(() => {
    if (phrases.length > 0 && environments.length > 0) {
      const queue = audioSyncService.createAmbianceQueue(phrases, environments);
      setAmbianceQueue(queue);
      logger.info('File d\'attente d\'ambiance créée:', queue);
    }
  }, [phrases, environments]);

  // Gérer le chargement de l'audio
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.load();
      
      // Ajouter un gestionnaire d'événements pour les erreurs de chargement
      const handleError = (e: ErrorEvent) => {
        logger.error('Erreur de chargement audio:', e);
      };
      
      // Ajouter un gestionnaire d'événements pour le chargement réussi
      const handleCanPlay = () => {
        logger.info('Audio prêt à être lu');
      };
      
      audioRef.current.addEventListener('error', handleError as any);
      audioRef.current.addEventListener('canplay', handleCanPlay);
      
      // Initialiser le service de synchronisation
      audioSyncService.resume();
      
      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('error', handleError as any);
          audioRef.current.removeEventListener('canplay', handleCanPlay);
        }
        // Nettoyer le service de synchronisation
        audioSyncService.stopAll();
      };
    }
    
    return () => {
      // Nettoyer le service de synchronisation
      audioSyncService.stopAll();
    };
  }, [audioUrl]);

  // Gérer les événements de lecture/pause de l'audio
  useEffect(() => {
    const handleAudioPlay = () => {
      setIsPlaying(true);
      // Jouer les sons d'ambiance synchronisés
      audioSyncService.playMixedAudio(ambianceQueue);
    };

    const handleAudioPause = () => {
      setIsPlaying(false);
      // Mettre en pause les sons d'ambiance
      audioSyncService.suspend();
    };

    const handleAudioEnded = () => {
      setIsPlaying(false);
      // Arrêter les sons d'ambiance
      audioSyncService.stopAll();
    };

    const handleTimeUpdate = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration);
      }
    };

    if (audioRef.current) {
      audioRef.current.addEventListener('play', handleAudioPlay);
      audioRef.current.addEventListener('pause', handleAudioPause);
      audioRef.current.addEventListener('ended', handleAudioEnded);
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('play', handleAudioPlay);
        audioRef.current.removeEventListener('pause', handleAudioPause);
        audioRef.current.removeEventListener('ended', handleAudioEnded);
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
      }
    };
  }, [ambianceQueue]);

  const handlePlay = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(error => {
        logger.error('Erreur lors de la lecture:', error);
      });
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(error => {
        logger.error('Erreur lors du redémarrage:', error);
      });
    }
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(event.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      
      // Arrêter et redémarrer les sons d'ambiance pour les synchroniser avec la nouvelle position
      audioSyncService.stopAll();
      if (isPlaying) {
        audioSyncService.playMixedAudio(
          ambianceQueue.map(item => ({
            ...item,
            startTime: Math.max(0, item.startTime - time)
          }))
        );
      }
    }
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="synchronized-player">
      {audioUrl ? (
        <div>
          <audio 
            ref={audioRef} 
            src={audioUrl}
            style={{ display: 'none' }}
          />
          <div className="player-controls">
            <button onClick={handlePlay} className="player-button" disabled={isPlaying}>
              Lecture
            </button>
            <button onClick={handlePause} className="player-button" disabled={!isPlaying}>
              Pause
            </button>
            <button onClick={handleRestart} className="player-button">
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
          
          {/* Affichage des informations de synchronisation */}
          {ambianceQueue.length > 0 && (
            <div className="ambiance-info">
              <h4>Sons d'ambiance synchronisés:</h4>
              <ul>
                {ambianceQueue.map((item, index) => (
                  <li key={index}>
                    {item.url.split('/').pop()} - Début: {formatTime(item.startTime)}, 
                    Durée: {formatTime(item.duration)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p>Aucun audio disponible</p>
      )}
      <style>
        {`
          .synchronized-player {
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

          .ambiance-info {
            margin-top: 1rem;
            padding: 0.8rem;
            background-color: #f0f8ff;
            border-radius: 6px;
          }

          .ambiance-info h4 {
            margin-top: 0;
            margin-bottom: 0.5rem;
          }

          .ambiance-info ul {
            margin: 0;
            padding-left: 1.5rem;
          }

          .ambiance-info li {
            margin-bottom: 0.3rem;
            font-size: 0.9rem;
          }
        `}
      </style>
    </div>
  );
};

export default SynchronizedPlayer;
