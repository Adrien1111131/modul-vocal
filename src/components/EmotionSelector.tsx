import React, { useState } from 'react';

const emotions = [
  { value: 'sensuel', label: 'Sensuel' },
  { value: 'excite', label: 'Excité' },
  { value: 'jouissance', label: 'Jouissance' },
  { value: 'murmure', label: 'Murmure' },
  { value: 'intense', label: 'Intense' },
  { value: 'doux', label: 'Doux' }
];

interface EmotionSelectorProps {
  onEmotionChange: (emotion: string) => void;
}

const EmotionSelector: React.FC<EmotionSelectorProps> = ({ onEmotionChange }) => {
  const [selectedEmotion, setSelectedEmotion] = useState(emotions[0].value);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const emotion = event.target.value;
    setSelectedEmotion(emotion);
    onEmotionChange(emotion);
  };

  return (
    <div className="emotion-selector">
      <label htmlFor="emotion-select">Sélectionnez le ton :</label>
      <select 
        id="emotion-select" 
        value={selectedEmotion} 
        onChange={handleChange}
        className="emotion-select"
      >
        {emotions.map((emotion) => (
          <option key={emotion.value} value={emotion.value}>
            {emotion.label}
          </option>
        ))}
      </select>
      <p className="emotion-help">
        Cette émotion sera utilisée comme ton par défaut si l'IA ne détecte pas d'émotion spécifique.<br/>
        L'IA analysera automatiquement le texte pour détecter les variations d'émotions.
      </p>
    </div>
  );
};

export default EmotionSelector;
