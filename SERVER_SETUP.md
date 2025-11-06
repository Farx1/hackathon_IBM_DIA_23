# Configuration du Serveur Local

Ce guide explique comment configurer le serveur local pour les prédictions ML avec Watsonx.

## Prérequis

- Node.js installé
- Un compte IBM Cloud avec accès à Watsonx
- Un modèle ML déployé sur Watsonx (Deployment ID: `hckt23`)

## Configuration

### 1. Créer le fichier `.env`

Copiez le fichier `.env.example` en `.env` :

```bash
cp .env.example .env
```

### 2. Remplir les variables d'environnement

Ouvrez le fichier `.env` et remplissez les valeurs :

```env
# IBM Watsonx Configuration
IBM_API_KEY=cpd-apikey-VOTRE_CLE_API_ICI
IBM_PROJECT_ID=votre-project-id-ici
IBM_DEPLOYMENT_ID=hckt23
IBM_REGION=eu-de
PORT=3000
```

**Où trouver ces valeurs :**

- **IBM_API_KEY** : Dans IBM Cloud, allez dans "Gérer" > "Clés d'accès" > Créez une nouvelle clé API
- **IBM_PROJECT_ID** : Dans Watsonx, ouvrez votre projet et copiez l'ID depuis l'URL ou les paramètres
- **IBM_DEPLOYMENT_ID** : L'ID du déploiement de votre modèle (par défaut: `hckt23`)
- **IBM_REGION** : La région de votre instance Watsonx (`eu-de` pour Frankfurt, `us-south` pour Dallas, etc.)

### 3. Installer les dépendances

```bash
npm install
# ou
pnpm install
```

### 4. Démarrer le serveur

**Mode développement :**
```bash
npm run dev
```

**Mode production :**
```bash
npm run build
npm start
```

Le serveur démarre sur `http://localhost:3000` par défaut.

## Endpoints API

Le serveur expose les endpoints suivants :

- `GET /api/health` - Vérifier l'état du serveur et la configuration
- `GET /api/test-auth` - Tester l'authentification avec IBM Cloud
- `POST /api/predict` - Faire une prédiction unique
- `POST /api/predict-batch` - Faire des prédictions en batch

### Exemple de requête de prédiction

```bash
curl -X POST http://localhost:3000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "totalDuration": 1234567890,
    "promptTokens": 100,
    "responseTokens": 200,
    "responseDuration": 987654321,
    "wordCount": 150,
    "readingTime": 45.5
  }'
```

### Exemple de réponse

```json
{
  "success": true,
  "energyJoules": 0.00123456,
  "source": "watsonx-deployed"
}
```

## Utilisation avec l'Extension Chrome

Une fois le serveur démarré :

1. Ouvrez le dashboard de l'extension
2. Allez dans l'onglet "Prédictions ML"
3. Sélectionnez "🖥️ Serveur Local" comme modèle de prédiction
4. Le statut du serveur s'affichera automatiquement

L'extension appellera automatiquement le serveur local au lieu d'appeler Watsonx directement, ce qui permet de garder les credentials sécurisés dans le fichier `.env`.

## Sécurité

⚠️ **Important** : Ne commitez jamais le fichier `.env` dans Git. Il contient des credentials sensibles.

Le fichier `.env` est déjà dans `.gitignore` par défaut.

## Dépannage

### Le serveur ne démarre pas

- Vérifiez que le port 3000 n'est pas déjà utilisé
- Vérifiez que toutes les variables d'environnement sont définies dans `.env`
- Vérifiez les logs pour les erreurs de configuration

### Erreur d'authentification

- Vérifiez que votre `IBM_API_KEY` est correcte et active
- Vérifiez que votre `IBM_PROJECT_ID` correspond à un projet existant
- Vérifiez que votre `IBM_DEPLOYMENT_ID` correspond à un déploiement actif

### L'extension ne peut pas se connecter au serveur

- Vérifiez que le serveur tourne sur `http://localhost:3000`
- Vérifiez que CORS est activé (déjà configuré par défaut)
- Vérifiez la console du navigateur pour les erreurs

