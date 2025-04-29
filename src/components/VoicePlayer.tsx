import React, { useRef, useEffect, useState } from 'react';
import { EnvironmentPlayer } from './EnvironmentPlayer';
import { audioMixerService } from '../services/audioMixerService';
import { audioEnvironmentService } from '../services/audioEnvironmentService';
import { logger } from '../config/development';

interface VoicePlayerProps {
  audioUrl: string | null;
  environment?: string;
  emotion?: string;
}

const VoicePlayer: React.FC<VoicePlayerProps> = ({ 
  audioUrl,
  environment = 'default',
  emotion = 'sensuel'
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    console.log('VoicePlayer - useEffect [audioUrl]', { audioUrl });
    
    if (audioRef.current && audioUrl) {
      console.log('VoicePlayer - Chargement de l\'audio', { audioUrl });
      audioRef.current.load();
      
      // Ajouter un gestionnaire d'événements pour les erreurs de chargement
      const handleError = (e: ErrorEvent) => {
        console.error('VoicePlayer - Erreur de chargement audio:', e);
      };
      
      // Ajouter un gestionnaire d'événements pour le chargement réussi
      const handleCanPlay = () => {
        console.log('VoicePlayer - Audio prêt à être lu');
      };
      
      audioRef.current.addEventListener('error', handleError as any);
      audioRef.current.addEventListener('canplay', handleCanPlay);
      
      // Initialiser le mixeur audio
      audioMixerService.resume();
      
      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('error', handleError as any);
          audioRef.current.removeEventListener('canplay', handleCanPlay);
        }
        // Nettoyer le mixeur audio
        audioMixerService.stopAll();
      };
    }
    
    return () => {
      // Nettoyer le mixeur audio
      audioMixerService.stopAll();
    };
  }, [audioUrl]);

  useEffect(() => {
    // Gérer les événements de lecture/pause de l'audio
    const handleAudioPlay = () => {
      setIsPlaying(true);
      // Reprendre l'ambiance et le mixeur
      audioEnvironmentService.resume();
      audioMixerService.resume();
    };

    const handleAudioPause = () => {
      setIsPlaying(false);
      // Mettre en pause l'ambiance et le mixeur
      audioEnvironmentService.suspend();
      audioMixerService.suspend();
    };

    const handleAudioEnded = () => {
      setIsPlaying(false);
      // Arrêter l'ambiance et le mixeur
      audioEnvironmentService.stopCurrentEnvironment();
      audioMixerService.stopAll();
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
  }, []);

  useEffect(() => {
    // Synchroniser le volume du mixeur avec le volume du lecteur
    audioMixerService.setMasterVolume(volume);
  }, [volume]);

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
    }
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="voice-player">
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
          <EnvironmentPlayer
            environment={environment}
            autoPlay={false}
            volume={volume * 0.3}
          />
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

          .player-info {
            margin-top: 1rem;
            padding: 0.8rem;
            background-color: #f0f8ff;
            border-radius: 6px;
            display: flex;
            justify-content: space-between;
            margin-bottom: 1rem;
          }

          .environment-display {
            font-style: italic;
            color: #666;
          }

          .emotion-display {
            color: #ff69b4;
            font-weight: bold;
          }
        `}
      </style>
    </div>
  );
};

export default VoicePlayer;
