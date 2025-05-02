# Module Vocal - Application de Génération de Voix

Cette application permet de générer des voix avec des ambiances sonores à partir de texte en utilisant l'API ElevenLabs.

## Configuration pour le déploiement sur Vercel

### Variables d'environnement

Pour que l'application fonctionne correctement sur Vercel, vous devez configurer les variables d'environnement suivantes dans les paramètres de votre projet Vercel :

1. `VITE_ELEVENLABS_VOICE_ID` : L'ID de la voix ElevenLabs à utiliser
2. `VITE_ELEVENLABS_API_KEY` : Votre clé API ElevenLabs
3. `VITE_GROK_API_KEY` : Votre clé API Grok (si utilisée)

#### Comment configurer les variables d'environnement sur Vercel :

1. Connectez-vous à votre compte Vercel
2. Accédez à votre projet
3. Cliquez sur "Settings" (Paramètres)
4. Allez dans la section "Environment Variables" (Variables d'environnement)
5. Ajoutez chaque variable avec sa valeur correspondante
6. Cliquez sur "Save" (Enregistrer)
7. Redéployez votre application

### Problèmes courants et solutions

#### 1. Erreur "Variables d'environnement manquantes"

Si vous voyez cette erreur dans la console du navigateur, cela signifie que les variables d'environnement ne sont pas correctement configurées sur Vercel. Suivez les étapes ci-dessus pour les configurer.

#### 2. Problèmes de CORS

Si vous rencontrez des erreurs CORS lors des appels API, vous pouvez :

- Vérifier que l'API ElevenLabs autorise les requêtes depuis votre domaine Vercel
- Utiliser un proxy CORS si nécessaire

#### 3. Problèmes avec les fichiers audio d'ambiance

Si les fichiers audio d'ambiance ne se chargent pas correctement :

- Assurez-vous que tous les fichiers audio sont bien inclus dans le dossier `public/sounds/environments/mp3/`
- Vérifiez que les chemins relatifs sont corrects dans le code

#### 4. Problèmes avec l'API Web Audio

Si le mixage audio ne fonctionne pas correctement :

- Assurez-vous que le navigateur prend en charge l'API Web Audio
- Vérifiez que l'interaction utilisateur a eu lieu avant de tenter de créer un contexte audio (requis par certains navigateurs)

## Développement local

1. Clonez ce dépôt
2. Créez un fichier `.env` à la racine du projet en vous basant sur `.env.example`
3. Installez les dépendances : `npm install`
4. Lancez le serveur de développement : `npm run dev`

## Build et déploiement

Pour construire l'application pour la production :

```bash
npm run build
```

Les fichiers générés seront dans le dossier `dist/`.

## Technologies utilisées

- React
- TypeScript
- Vite
- Howler.js
- Web Audio API
- ElevenLabs API
- Grok API (optionnel)
