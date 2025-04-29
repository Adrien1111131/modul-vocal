import React, { useEffect, useState } from 'react';
import { audioEnvironmentService } from '../services/audioEnvironmentService';
import { SoundEnvironment, getEnvironmentConfig } from '../config/soundEnvironments';

interface EnvironmentPlayerProps {
  environment: string;
  autoPlay?: boolean;
  volume?: number;
}

export const EnvironmentPlayer: React.FC<EnvironmentPlayerProps> = ({
  environment,
  autoPlay = true,
  volume = 0.5
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(volume);
  const [currentEnvironment, setCurrentEnvironment] = useState<SoundEnvironment | null>(null);

  useEffect(() => {
    // Charger la configuration de l'environnement
    const config = getEnvironmentConfig(environment);
    setCurrentEnvironment(config);

    // Démarrer automatiquement si autoPlay est activé
    if (autoPlay) {
      handlePlay();
    }

    // Cleanup lors du démontage du composant
    return () => {
      audioEnvironmentService.stopCurrentEnvironment();
    };
  }, [environment, autoPlay]);

  useEffect(() => {
    audioEnvironmentService.setVolume(currentVolume);
  }, [currentVolume]);

  const handlePlay = async () => {
    try {
      await audioEnvironmentService.resume();
      await audioEnvironmentService.playEnvironment(environment);
      setIsPlaying(true);
    } catch (error) {
      console.error('Erreur lors de la lecture de l\'environnement:', error);
    }
  };

  const handleStop = async () => {
    try {
      await audioEnvironmentService.stopCurrentEnvironment();
      setIsPlaying(false);
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de l\'environnement:', error);
    }
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    setCurrentVolume(newVolume);
  };

  return (
    <div className="environment-player">
      <div className="environment-info">
        <h3>Ambiance: {currentEnvironment?.name}</h3>
        <div className="controls">
          <button
            onClick={isPlaying ? handleStop : handlePlay}
            className={`control-button ${isPlaying ? 'playing' : ''}`}
          >
            {isPlaying ? 'Arrêter' : 'Démarrer'} l'ambiance
          </button>
          <div className="volume-control">
            <label htmlFor="volume">Volume:</label>
            <input
              type="range"
              id="volume"
              min="0"
              max="1"
              step="0.1"
              value={currentVolume}
              onChange={handleVolumeChange}
            />
          </div>
        </div>
      </div>
      <style>
        {`
          .environment-player {
            background: rgba(0, 0, 0, 0.05);
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
          }

          .environment-info {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .environment-info h3 {
            margin: 0;
            color: #333;
          }

          .controls {
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .control-button {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 4px;
            background: #007bff;
            color: white;
            cursor: pointer;
            transition: background-color 0.2s;
          }

          .control-button:hover {
            background: #0056b3;
          }

          .control-button.playing {
            background: #dc3545;
          }

          .control-button.playing:hover {
            background: #c82333;
          }

          .volume-control {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .volume-control input[type="range"] {
            width: 100px;
          }
        `}
      </style>
    </div>
  );
};
