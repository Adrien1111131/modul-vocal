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
        placeholder="Écrivez votre texte ici... Utilisez les balises pour indiquer le ton.
Exemple:
[sensuel]Je sens mon corps frémir[/sensuel]
[murmure]Viens plus près de moi[/murmure]
[intense]Je ne peux plus résister[/intense]"
        rows={15}
        className="text-input"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
      <div className="text-input-help">
        <h4>Guide d'utilisation des balises :</h4>
        <ul>
          <li>[sensuel] pour un ton sensuel et séduisant</li>
          <li>[excite] pour un ton excité et passionné</li>
          <li>[jouissance] pour un ton d'extase</li>
          <li>[murmure] pour un ton doux et intime</li>
          <li>[intense] pour un ton intense et profond</li>
          <li>[doux] pour un ton tendre et délicat</li>
        </ul>
        <p className="text-input-tip">
          Utilisez les points de suspension (...) pour créer des pauses naturelles dans le texte.<br/>
          Les balises peuvent être combinées pour varier les tons au fil du texte.
        </p>
      </div>
    </div>
  );
};

export default TextInput;
