# 🔗 Guide Complet d'Intégration Watsonx

Ce guide regroupe toutes les informations nécessaires pour configurer et utiliser Watsonx avec l'extension Track Sustainability.

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Configuration Initiale](#configuration-initiale)
3. [Configuration du Serveur Local](#configuration-du-serveur-local)
4. [Utilisation du Dashboard](#utilisation-du-dashboard)
5. [Dépannage](#dépannage)
6. [Structure des Données](#structure-des-données)
7. [Sécurité](#sécurité)

---

## 🔍 Prérequis

### Informations Nécessaires

Avant de commencer, vous devez avoir :

- [ ] **Compte IBM Cloud / Watsonx**
  - Si oui : API key disponible ?
  - Si non : Créer un compte sur https://cloud.ibm.com/registration

- [ ] **Région Watsonx**
  - `us-south` (Dallas)
  - `eu-de` (Frankfurt)
  - `eu-gb` (London)
  - `jp-tok` (Tokyo)

- [ ] **Niveau d'accès**
  - Free tier
  - Pay-as-you-go
  - Enterprise

### Ce qui a été créé

1. **`watsonx-config.js`** : Configuration Watsonx avec gestion des credentials
2. **`watsonx-service.js`** : Service d'accès au dataset Watsonx
3. **`dashboard.html`** : Dashboard complet avec visualisations
4. **`dashboard.js`** : Logique du dashboard avec Chart.js

### Modifications apportées

1. **`manifest.json`** : 
   - Ajout des permissions pour watsonx.cloud.ibm.com
   - Ajout de `options_page` pour le dashboard
   - Ajout des fichiers watsonx dans `web_accessible_resources`

2. **`background.js`** :
   - Intégration Watsonx avec fallback local
   - Conversion des données Watsonx en format modèle

---

## 🚀 Configuration Initiale

### Étape 1 : Configurer Watsonx dans le Dashboard

1. **Ouvrir le dashboard** :
   - Clic droit sur l'icône de l'extension → "Options"
   - Ou : `chrome://extensions/` → Track Sustainability → "Options"

2. **Remplir la configuration** :
   - **API Key** : Votre clé API Watsonx
   - **API URL** : La région (ex: `https://us-south.ml.cloud.ibm.com`)
   - **Project ID** : L'ID de votre projet Watsonx
   - **Deployment ID** : L'ID du déploiement de votre modèle (ex: `hckt23`)

3. **Tester la connexion** :
   - Cliquer sur "🔍 Tester l'Authentification"
   - Vérifier que la connexion réussit
   - Les prédictions seront automatiquement mises à jour

4. **Sauvegarder** :
   - Cliquer sur "💾 Sauvegarder Configuration"

### Étape 2 : Vérifier le Dataset

Le dataset doit être importé dans Watsonx avec le nom :
- `llm-inference-energy-consumption`

Ou contenant `llm-inference` dans le nom.

---

## 🖥️ Configuration du Serveur Local

### Prérequis

- Node.js installé
- Un compte IBM Cloud avec accès à Watsonx
- Un modèle ML déployé sur Watsonx (Deployment ID: `hckt23`)

### Installation

1. **Créer le fichier `.env`** :
```bash
cp .env.example .env
```

2. **Remplir les variables d'environnement** :
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

3. **Installer les dépendances** :
```bash
npm install
# ou
pnpm install
```

4. **Démarrer le serveur** :
```bash
# Mode développement
npm run dev

# Mode production
npm run build
npm start
```

Le serveur démarre sur `http://localhost:3000` par défaut.

### Endpoints API

- `GET /api/health` - Vérifier l'état du serveur et la configuration
- `GET /api/test-auth` - Tester l'authentification avec IBM Cloud
- `POST /api/predict` - Faire une prédiction unique
- `POST /api/predict-batch` - Faire des prédictions en batch

### Utilisation avec l'Extension Chrome

Une fois le serveur démarré :

1. Ouvrez le dashboard de l'extension
2. Allez dans l'onglet "Prédictions ML"
3. Sélectionnez "🖥️ Serveur Local" comme modèle de prédiction
4. Le statut du serveur s'affichera automatiquement

L'extension appellera automatiquement le serveur local au lieu d'appeler Watsonx directement, ce qui permet de garder les credentials sécurisés dans le fichier `.env`.

---

## 📊 Utilisation du Dashboard

### Onglets disponibles

1. **📊 Vue d'ensemble**
   - Statistiques globales
   - Graphiques comparatifs
   - Total des mesures
   - Prédictions annuelles

2. **🤖 Modèles**
   - Comparaison des modèles LLM
   - Filtres par hardware et taille
   - Graphiques énergie par token
   - Tableau comparatif

3. **💻 GPUs/Hardware**
   - Comparaison des types de hardware
   - Filtres par modèle
   - Graphiques consommation énergétique
   - Tableau comparatif

4. **⚡ Mix Énergétique**
   - Comparaison des pays
   - Impact CO₂ selon le mix énergétique
   - Graphiques d'émissions
   - Filtres par modèle

5. **⚙️ Configuration**
   - Configuration Watsonx
   - Test de connexion
   - Sauvegarde des paramètres

### Fonctionnalités

#### Comparaison des Modèles
- **Énergie par token** : Comparaison de la consommation énergétique
- **Filtres** : Par hardware, par taille de modèle
- **Tableau** : Vue détaillée avec toutes les métriques

#### Comparaison des GPUs
- **Consommation moyenne** : Par type de hardware
- **Modèles testés** : Quels modèles ont été testés sur chaque hardware
- **Nombre de tests** : Volume de données par hardware

#### Comparaison des Mix Énergétiques
- **Impact CO₂ par pays** : Visualisation selon le mix énergétique
- **Comparaison** : Entre différents pays (Suède, France, Chine, etc.)
- **Filtres** : Par modèle pour voir l'impact spécifique

---

## ✅ Vérification de la Configuration

### Vérifier que tout fonctionne

Une fois la configuration terminée, vous pouvez vérifier que tout fonctionne correctement :

1. **Vérifier la connexion Watsonx** :
   - Cliquer sur "🔍 Tester l'Authentification"
   - Le statut devrait afficher "✅ Authentification réussie !"

2. **Vérifier le chargement des datasets** :
   - Cliquer sur "📋 Lister les Datasets Disponibles"
   - La liste des datasets devrait s'afficher

3. **Vérifier les graphiques** :
   - Aller dans l'onglet "📊 Vue d'ensemble"
   - Les graphiques devraient s'afficher avec les données

4. **Vérifier le serveur local** (si utilisé) :
   - Le serveur devrait démarrer sur `http://localhost:3000`
   - Le statut devrait afficher "✅ Serveur connecté"

---

## 📚 Structure des Données

### Format attendu du Dataset Watsonx

Le dataset doit contenir les colonnes suivantes :
- `model_name` ou `model` : Nom du modèle
- `hardware_type` : Type de hardware (laptop, workstation, server)
- `prompt_token_length` : Longueur du prompt en tokens
- `response_token_length` : Longueur de la réponse en tokens
- `energy_consumption_llm_total` : Consommation énergétique totale (Joules)

### Format des Statistiques Sauvegardées

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "stats": {
    "requests": 150,
    "tokens": 50000,
    "co2Grams": 0.5
  },
  "metadata": {
    "range": "day",
    "date": "2024-01-15"
  }
}
```

---

## 🔐 Sécurité

### Credentials

- Les credentials sont stockés dans `chrome.storage.local` (extension)
- Pour le serveur local, utilisez le fichier `.env` (jamais commité)
- Ne jamais commiter les credentials dans le code
- Utiliser des variables d'environnement pour le développement

### Permissions

L'extension nécessite :
- `storage` : Pour sauvegarder la configuration
- `host_permissions` : Pour accéder à Watsonx API

⚠️ **Important** : Ne commitez jamais le fichier `.env` dans Git. Il contient des credentials sensibles.

Le fichier `.env` est déjà dans `.gitignore` par défaut.

---

## 🎯 Fonctionnalités Disponibles

### Analyses temporelles
- ✅ Graphiques par jour/mois/année
- ✅ Tendances et projections
- ✅ Comparaisons temporelles

### Export de données
- ✅ Export CSV/JSON (via dashboard)
- ✅ Partage de visualisations
- ✅ Rapports détaillés

### Multi-utilisateurs
- ✅ Statistiques par utilisateur
- ✅ Comparaison entre équipes
- ✅ Dashboard complet avec toutes les métriques

---

## 📞 Support

Pour toute question :
1. Consulter la console du navigateur pour les logs détaillés
2. Vérifier les logs du service worker
3. Tester la connexion Watsonx via le dashboard
4. Consulter la documentation Watsonx officielle

---

**Note** : Le dashboard utilise Chart.js pour les visualisations. Assurez-vous d'avoir une connexion internet pour charger la bibliothèque depuis le CDN.
