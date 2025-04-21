# Vite React Eleven Labs App

Cette application React utilise l'API Eleven Labs pour générer des sorties vocales avec différentes émotions. L'application propose une interface conviviale où les utilisateurs peuvent saisir du texte, sélectionner une émotion et écouter la voix générée.

## Fonctionnalités

- Zone de saisie de texte pour que l'utilisateur entre le texte souhaité.
- Sélecteur d'émotion pour choisir l'émotion de la sortie vocale.
- Lecteur audio pour écouter la voix générée.

## Structure du projet

```
vite-react-elevenlabs-app
├── src
│   ├── components
│   │   ├── EmotionSelector.tsx
│   │   ├── TextInput.tsx
│   │   └── VoicePlayer.tsx
│   ├── config
│   │   └── development.ts
│   ├── services
│   │   ├── axiosConfig.ts
│   │   └── elevenLabsAPI.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── styles
│       └── App.css
├── public
│   └── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Installation

1. Clonez le dépôt :
   ```
   git clone <url-du-dépôt>
   ```
2. Naviguez vers le répertoire du projet :
   ```
   cd vite-react-elevenlabs-app
   ```
3. Installez les dépendances :
   ```
   npm install
   ```

## Configuration

1. Créez un fichier `.env` à la racine du projet avec les variables suivantes :
   ```
   VITE_ELEVENLABS_API_KEY=votre_clé_api
   VITE_ELEVENLABS_VOICE_ID=votre_id_de_voix
   ```

## Utilisation

1. Démarrez le serveur de développement :
   ```
   npm run dev
   ```
2. Ouvrez votre navigateur et accédez à `http://localhost:3002` pour voir l'application.

## Déploiement sur GitHub Pages

1. Installez la dépendance gh-pages si ce n'est pas déjà fait :
   ```
   npm install --save-dev gh-pages
   ```

2. Assurez-vous que la configuration de base dans `vite.config.ts` est correcte :
   ```typescript
   base: mode === 'production' ? '/vite-react-elevenlabs-app/' : '/',
   ```

3. Configurez votre dépôt GitHub :
   - Créez un nouveau dépôt sur GitHub
   - Initialisez Git dans votre projet local si ce n'est pas déjà fait :
     ```
     git init
     git add .
     git commit -m "Initial commit"
     git remote add origin <url-de-votre-dépôt>
     git push -u origin main
     ```

4. Déployez l'application :
   ```
   npm run deploy
   ```

5. Configurez GitHub Pages dans les paramètres de votre dépôt :
   - Allez dans "Settings" > "Pages"
   - Sélectionnez la branche "gh-pages" comme source
   - Cliquez sur "Save"

Votre application sera accessible à l'adresse : `https://<votre-nom-utilisateur>.github.io/vite-react-elevenlabs-app/`

## Intégration de l'API

Cette application interagit avec l'API Eleven Labs pour générer des sorties vocales. Les clés API et les configurations nécessaires sont maintenant gérées via des variables d'environnement pour plus de sécurité.

## Sécurité

- Ne jamais commiter le fichier `.env` contenant vos clés API
- Assurez-vous que `.env` est inclus dans votre fichier `.gitignore`
- Pour le déploiement en production, utilisez les variables d'environnement du service d'hébergement

## Contribution

N'hésitez pas à soumettre des problèmes ou des pull requests pour toute amélioration ou fonctionnalité que vous aimeriez voir dans ce projet.
