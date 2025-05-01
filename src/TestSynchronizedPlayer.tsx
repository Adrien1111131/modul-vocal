import React, { useState } from 'react';
import SynchronizedPlayer from './components/SynchronizedPlayer';

const TestSynchronizedPlayer: React.FC = () => {
  // URL de l'audio (à remplacer par votre propre URL)
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  // Exemple de phrases
  const phrases = [
    "Bonjour et bienvenue sur cette plage magnifique. Écoutez le son des vagues qui viennent s'échouer sur le sable.",
    "Maintenant, nous allons nous diriger vers la ville. Vous pouvez entendre le bruit des voitures et des passants.",
    "Pour finir, nous allons ouvrir cette porte et entrer dans une forêt paisible où le vent souffle doucement dans les arbres."
  ];
  
  // Environnements correspondants
  const environments = [
    "mer",      // Pour la plage
    "ville",    // Pour la ville
    "foret"     // Pour la forêt
  ];

  // Fonction pour charger un fichier audio local
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
    }
  };

  return (
    <div className="test-container">
      <h1>Test de Synchronisation Audio</h1>
      
      <div className="file-upload">
        <h3>Chargez un fichier audio</h3>
        <input 
          type="file" 
          accept="audio/*" 
          onChange={handleFileChange}
          className="file-input"
        />
        <p className="help-text">
          Sélectionnez un fichier audio pour tester la synchronisation avec les ambiances.
        </p>
      </div>
      
      {audioUrl ? (
        <div className="player-section">
          <h3>Lecteur Synchronisé</h3>
          <SynchronizedPlayer 
            audioUrl={audioUrl}
            phrases={phrases}
            environments={environments}
          />
          
          <div className="phrases-section">
            <h3>Phrases et Environnements</h3>
            <ul>
              {phrases.map((phrase, index) => (
                <li key={index} className="phrase-item">
                  <strong>Phrase {index + 1}:</strong> {phrase}
                  <br />
                  <span className="environment-tag">
                    Environnement: {environments[index] || "aucun"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="placeholder">
          <p>Veuillez charger un fichier audio pour commencer.</p>
        </div>
      )}
      
      <style>
        {`
          .test-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            font-family: Arial, sans-serif;
          }
          
          h1 {
            color: #333;
            text-align: center;
            margin-bottom: 2rem;
          }
          
          h3 {
            color: #555;
            margin-bottom: 1rem;
          }
          
          .file-upload {
            background: #f5f5f5;
            padding: 1.5rem;
            border-radius: 8px;
            margin-bottom: 2rem;
          }
          
          .file-input {
            display: block;
            margin: 1rem 0;
          }
          
          .help-text {
            color: #666;
            font-size: 0.9rem;
            margin-top: 0.5rem;
          }
          
          .player-section {
            margin-bottom: 2rem;
          }
          
          .phrases-section {
            background: #f9f9f9;
            padding: 1.5rem;
            border-radius: 8px;
            margin-top: 2rem;
          }
          
          .phrase-item {
            margin-bottom: 1rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #eee;
          }
          
          .phrase-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
          }
          
          .environment-tag {
            display: inline-block;
            background: #e0f7fa;
            padding: 0.3rem 0.6rem;
            border-radius: 4px;
            font-size: 0.8rem;
            margin-top: 0.5rem;
          }
          
          .placeholder {
            text-align: center;
            padding: 3rem;
            background: #f9f9f9;
            border-radius: 8px;
            color: #666;
          }
        `}
      </style>
    </div>
  );
};

export default TestSynchronizedPlayer;
