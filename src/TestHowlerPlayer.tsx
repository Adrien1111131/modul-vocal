import React, { useState } from 'react';
import HowlerPlayer from './components/HowlerPlayer';

const TestHowlerPlayer: React.FC = () => {
  // URL de l'audio (à remplacer par votre propre URL)
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('');
  
  // Liste des environnements disponibles
  const environments = [
    { id: 'mer', name: 'Mer' },
    { id: 'foret', name: 'Forêt' },
    { id: 'ville', name: 'Ville' },
    { id: 'pluie', name: 'Pluie' },
    { id: 'riviere', name: 'Rivière' },
    { id: 'nuit', name: 'Nuit' },
    { id: 'porte', name: 'Porte' },
    { id: 'vent', name: 'Vent' },
    { id: 'nature', name: 'Nature' },
    { id: 'oiseau', name: 'Oiseau' }
  ];

  // Fonction pour charger un fichier audio local
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
    }
  };
  
  // Fonction pour changer l'environnement
  const handleEnvironmentChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEnvironment(event.target.value);
  };

  return (
    <div className="test-container">
      <h1>Test du Lecteur Audio avec Ambiances</h1>
      
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
      
      <div className="environment-selector">
        <h3>Sélectionnez un environnement</h3>
        <select 
          value={selectedEnvironment} 
          onChange={handleEnvironmentChange}
          className="environment-select"
        >
          <option value="">Aucun environnement</option>
          {environments.map(env => (
            <option key={env.id} value={env.id}>{env.name}</option>
          ))}
        </select>
        <p className="help-text">
          L'environnement sélectionné détermine les sons d'ambiance qui seront joués.
        </p>
      </div>
      
      {audioUrl ? (
        <div className="player-section">
          <h3>Lecteur Audio avec Ambiances</h3>
          <HowlerPlayer 
            storyUrl={audioUrl}
            environment={selectedEnvironment}
          />
          
          <div className="info-section">
            <h3>Comment ça fonctionne</h3>
            <p>
              Ce lecteur utilise Howler.js pour synchroniser la lecture de l'audio principal avec des sons d'ambiance.
              Les sons d'ambiance sont joués en boucle et leur volume est automatiquement ajusté en fonction du volume principal.
            </p>
            <p>
              Lorsque vous démarrez la lecture, les sons d'ambiance correspondant à l'environnement sélectionné démarrent également.
              Lorsque vous mettez en pause ou arrêtez la lecture, les sons d'ambiance sont également mis en pause ou arrêtés.
            </p>
            <p>
              Vous pouvez changer d'environnement à tout moment, même pendant la lecture.
            </p>
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
          
          .file-upload, .environment-selector {
            background: #f5f5f5;
            padding: 1.5rem;
            border-radius: 8px;
            margin-bottom: 2rem;
          }
          
          .file-input {
            display: block;
            margin: 1rem 0;
          }
          
          .environment-select {
            display: block;
            width: 100%;
            padding: 0.5rem;
            margin: 1rem 0;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: white;
          }
          
          .help-text {
            color: #666;
            font-size: 0.9rem;
            margin-top: 0.5rem;
          }
          
          .player-section {
            margin-bottom: 2rem;
          }
          
          .info-section {
            background: #f9f9f9;
            padding: 1.5rem;
            border-radius: 8px;
            margin-top: 2rem;
          }
          
          .info-section p {
            margin-bottom: 1rem;
            line-height: 1.5;
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

export default TestHowlerPlayer;
