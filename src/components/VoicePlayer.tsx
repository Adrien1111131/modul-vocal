import React, { useRef, useEffect } from 'react';

interface VoicePlayerProps {
  audioUrl: string | null;
}

const VoicePlayer: React.FC<VoicePlayerProps> = ({ audioUrl }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.load();
    }
  }, [audioUrl]);

  const handlePlay = () => {
    if (audioRef.current) {
      audioRef.current.play();
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
      audioRef.current.play();
    }
  };

  return (
    <div className="voice-player">
      {audioUrl ? (
        <div>
          <audio 
            ref={audioRef} 
            src={audioUrl} 
            controls 
            style={{ width: '100%', marginBottom: '1rem' }}
          />
          <div className="player-controls">
            <button onClick={handlePlay} className="player-button">
              Lecture
            </button>
            <button onClick={handlePause} className="player-button">
              Pause
            </button>
            <button onClick={handleRestart} className="player-button">
              Recommencer
            </button>
          </div>
        </div>
      ) : (
        <p>Aucun audio disponible</p>
      )}
    </div>
  );
};

export default VoicePlayer;
