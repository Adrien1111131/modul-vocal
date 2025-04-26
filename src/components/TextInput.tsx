import React, { useState, useEffect, useCallback } from 'react';

interface TextInputProps {
  onTextChange: (text: string) => void;
}

const TextInput: React.FC<TextInputProps> = ({ onTextChange }) => {
  const [inputText, setInputText] = useState('');

  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = event.target.value;
    console.log('TextInput - Nouveau texte saisi:', newText);
    setInputText(newText);
  }, []);

  useEffect(() => {
    console.log('TextInput - Mise à jour du texte:', inputText);
    onTextChange(inputText);
  }, [inputText, onTextChange]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const pastedText = event.clipboardData?.getData('text');
      if (pastedText) {
        console.log('TextInput - Texte collé:', pastedText);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      console.log('TextInput - Nouvelle ligne ajoutée');
    }
  }, []);

  return (
    <div className="text-input-container">
      <textarea
        value={inputText}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Écrivez votre texte ici... L'IA analysera automatiquement le ton et l'émotion de votre texte.
Exemple:
Je sens mon corps frémir sous tes caresses...
Viens plus près de moi, murmure-t-il doucement
Je ne peux plus résister, l'intensité me submerge !"
        rows={15}
        className="text-input"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
      <div className="text-input-help">
        <h4>Guide d'écriture :</h4>
        <ul>
          <li>Utilisez un vocabulaire expressif pour transmettre les émotions</li>
          <li>Variez l'intensité avec des mots comme "doucement", "passionnément", "intensément"</li>
          <li>Décrivez l'environnement pour créer l'ambiance</li>
          <li>Exprimez les sensations et les émotions naturellement</li>
        </ul>
        <p className="text-input-tip">
          Utilisez les points de suspension (...) pour créer des pauses naturelles dans le texte.<br/>
          L'IA analysera automatiquement le ton émotionnel et adaptera la voix en conséquence.
        </p>
      </div>
    </div>
  );
};

export default TextInput;
