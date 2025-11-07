# 🔗 Plan d'Intégration Watsonx

## 📋 Objectif

Intégrer IBM watsonx.ai pour :
1. **Gérer le dataset** Hugging Face (ejhusom/llm-inference-energy-consumption)
2. **Stocker les données** d'analyse annuelle
3. **Analyser les données** avec les outils watsonx
4. **Mettre à jour le modèle** dynamiquement si nécessaire

## 🎯 Architecture Proposée

```
┌─────────────────────────────────────────────────────────┐
│                  Extension Chrome                        │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  content.js  │  │  popup.js    │  │ background.js│ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘ │
│         │                 │                 │           │
│         └─────────────────┴─────────────────┘           │
│                          │                              │
│                          ▼                              │
│              ┌───────────────────────┐                 │
│              │  watsonx-service.js   │                 │
│              │  (Client SDK)         │                 │
│              └───────────┬───────────┘                 │
└──────────────────────────┼──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              IBM Watsonx.ai                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Dataset: llm-inference-energy-consumption       │  │
│  │  - 78,728 mesures réelles                        │  │
│  │  - 80 variables                                  │  │
│  │  - 15 configurations (modèles × hardware)        │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Storage: Analytics Data                          │  │
│  │  - Daily stats                                   │  │
│  │  - Monthly stats                                 │  │
│  │  - Yearly stats                                  │  │
│  │  - User/Company analytics                        │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  ML Models (optionnel)                            │  │
│  │  - Modèle prédictif amélioré                     │  │
│  │  - Ré-entraînement automatique                   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 🔧 Étapes d'Implémentation

### Étape 1 : Configuration Watsonx

#### 1.1 Créer un compte IBM Cloud / Watsonx

```bash
# Se connecter à IBM Cloud
# https://cloud.ibm.com/

# Activer watsonx.ai
# https://dataplatform.cloud.ibm.com/
```

#### 1.2 Obtenir les credentials

```javascript
// watsonx-config.js
const WATSONX_CONFIG = {
  apiKey: process.env.WATSONX_API_KEY || 'YOUR_API_KEY',
  apiUrl: process.env.WATSONX_API_URL || 'https://us-south.ml.cloud.ibm.com',
  projectId: process.env.WATSONX_PROJECT_ID || 'YOUR_PROJECT_ID',
  instanceId: process.env.WATSONX_INSTANCE_ID || 'YOUR_INSTANCE_ID'
};

module.exports = WATSONX_CONFIG;
```

#### 1.3 Importer le dataset dans watsonx

```python
# scripts/import_dataset_to_watsonx.py
import ibm_watson_machine_learning
from datasets import load_dataset

# Charger le dataset Hugging Face
dataset = load_dataset("ejhusom/llm-inference-energy-consumption")

# Connecter à watsonx
wml_client = ibm_watson_machine_learning.APIClient(
    ibm_credentials={
        "apikey": "YOUR_API_KEY",
        "url": "https://us-south.ml.cloud.ibm.com"
    }
)

# Importer le dataset
# ... (code d'import)
```

### Étape 2 : Installation du SDK Watsonx

#### 2.1 Pour l'Extension Chrome (JavaScript)

```bash
# Option 1: Utiliser le SDK Node.js via un backend
npm install @ibm-watson/machine-learning

# Option 2: Utiliser fetch API directement (pas de SDK browser)
# Créer un service backend Node.js
```

#### 2.2 Pour le Backend (Node.js)

```bash
npm install @ibm-watson/machine-learning
npm install dotenv
```

### Étape 3 : Service Watsonx

#### 3.1 Créer le service watsonx-service.js

```javascript
// watsonx-service.js
const WMLClient = require('@ibm-watson/machine-learning');
const config = require('./watsonx-config');

class WatsonxService {
  constructor() {
    this.client = new WMLClient({
      apikey: config.apiKey,
      url: config.apiUrl
    });
    this.projectId = config.projectId;
  }

  /**
   * Charger le dataset depuis watsonx
   */
  async loadDataset() {
    try {
      // Requête pour charger le dataset
      const response = await this.client.dataAssets.list({
        project_id: this.projectId
      });
      
      // Trouver le dataset llm-inference-energy-consumption
      const dataset = response.resources.find(
        asset => asset.metadata.name.includes('llm-inference-energy')
      );
      
      if (!dataset) {
        throw new Error('Dataset non trouvé dans watsonx');
      }
      
      return dataset;
    } catch (error) {
      console.error('Erreur chargement dataset:', error);
      throw error;
    }
  }

  /**
   * Charger les statistiques stockées
   */
  async loadStats(dateRange = 'year') {
    try {
      // Charger depuis watsonx storage
      // Implementation dépend de la structure watsonx
      const response = await this.client.dataAssets.list({
        project_id: this.projectId,
        query: `type:stats AND range:${dateRange}`
      });
      
      return response.resources;
    } catch (error) {
      console.error('Erreur chargement stats:', error);
      return [];
    }
  }

  /**
   * Sauvegarder les statistiques
   */
  async saveStats(stats, dateRange) {
    try {
      // Sauvegarder dans watsonx
      const asset = {
        metadata: {
          name: `stats-${dateRange}-${Date.now()}`,
          asset_type: 'data_asset',
          tags: ['stats', dateRange, 'co2-tracking']
        },
        entity: {
          data: stats
        }
      };
      
      const response = await this.client.dataAssets.create({
        project_id: this.projectId,
        asset: asset
      });
      
      return response;
    } catch (error) {
      console.error('Erreur sauvegarde stats:', error);
      throw error;
    }
  }

  /**
   * Analyser les données avec watsonx
   */
  async analyzeData(query) {
    try {
      // Utiliser les outils d'analyse de watsonx
      // Exemple: analyse temporelle, comparaisons, etc.
      const response = await this.client.analytics.analyze({
        project_id: this.projectId,
        query: query
      });
      
      return response;
    } catch (error) {
      console.error('Erreur analyse:', error);
      throw error;
    }
  }
}

module.exports = WatsonxService;
```

### Étape 4 : Backend API (Optionnel mais Recommandé)

#### 4.1 Créer un backend Node.js/Express

```javascript
// backend/server.js
const express = require('express');
const cors = require('cors');
const WatsonxService = require('../watsonx-service');

const app = express();
app.use(cors());
app.use(express.json());

const watsonxService = new WatsonxService();

// Endpoint pour charger le dataset
app.get('/api/dataset', async (req, res) => {
  try {
    const dataset = await watsonxService.loadDataset();
    res.json(dataset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint pour charger les stats
app.get('/api/stats/:range', async (req, res) => {
  try {
    const { range } = req.params; // 'day', 'month', 'year'
    const stats = await watsonxService.loadStats(range);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint pour sauvegarder les stats
app.post('/api/stats', async (req, res) => {
  try {
    const { stats, range } = req.body;
    const result = await watsonxService.saveStats(stats, range);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
```

### Étape 5 : Modifier l'Extension Chrome

#### 5.1 Modifier background.js

```javascript
// background.js - Ajouter l'intégration watsonx

let watsonxService = null;

async function initWatsonx() {
  try {
    // Charger depuis le backend ou directement
    const config = await chrome.storage.local.get(['watsonxConfig']);
    
    if (config.watsonxConfig) {
      // Initialiser le service
      watsonxService = new WatsonxService(config.watsonxConfig);
      
      // Charger le dataset au démarrage
      const dataset = await watsonxService.loadDataset();
      console.log('✓ Dataset chargé depuis watsonx');
    }
  } catch (error) {
    console.error('Erreur init watsonx:', error);
    // Fallback vers le modèle local
  }
}

async function saveStatsToWatsonx(stats) {
  if (!watsonxService) return;
  
  try {
    // Sauvegarder les stats quotidiennes
    await watsonxService.saveStats(stats, 'day');
    
    // Agréger et sauvegarder les stats mensuelles
    const monthlyStats = aggregateMonthly(stats);
    await watsonxService.saveStats(monthlyStats, 'month');
    
    // Agréger et sauvegarder les stats annuelles
    const yearlyStats = aggregateYearly(monthlyStats);
    await watsonxService.saveStats(yearlyStats, 'year');
  } catch (error) {
    console.error('Erreur sauvegarde watsonx:', error);
  }
}
```

### Étape 6 : Configuration Variables d'Environnement

```bash
# .env
WATSONX_API_KEY=your_api_key_here
WATSONX_API_URL=https://us-south.ml.cloud.ibm.com
WATSONX_PROJECT_ID=your_project_id
WATSONX_INSTANCE_ID=your_instance_id
```

## 📊 Structure de Données dans Watsonx

### Dataset Source
```
llm-inference-energy-consumption/
├── metadata.json
├── data/
│   ├── alpaca_dataset.csv
│   ├── code_feedback_dataset.csv
│   └── ...
└── models/
    ├── gemma-2b/
    ├── llama-3-8b/
    └── ...
```

### Statistiques Stockées
```json
{
  "date": "2024-01-15",
  "range": "day",
  "stats": {
    "requests": 150,
    "tokens": 50000,
    "co2Grams": 0.5,
    "byModel": {
      "gpt-4": { "requests": 50, "tokens": 20000, "co2Grams": 0.2 },
      "gpt-3.5": { "requests": 100, "tokens": 30000, "co2Grams": 0.3 }
    },
    "byPlatform": {
      "chatgpt": { "requests": 120, "co2Grams": 0.4 },
      "claude": { "requests": 30, "co2Grams": 0.1 }
    }
  }
}
```

## ✅ Checklist d'Intégration

### Phase 1 : Configuration
- [ ] Créer compte IBM Cloud / Watsonx
- [ ] Obtenir API credentials
- [ ] Configurer les variables d'environnement
- [ ] Importer le dataset Hugging Face dans watsonx

### Phase 2 : Code
- [ ] Créer `watsonx-config.js`
- [ ] Créer `watsonx-service.js`
- [ ] Installer les dépendances (@ibm-watson/machine-learning)
- [ ] Créer le backend API (optionnel)

### Phase 3 : Intégration Extension
- [ ] Modifier `background.js` pour utiliser watsonx
- [ ] Ajouter fonctions de chargement depuis watsonx
- [ ] Ajouter fonctions de sauvegarde vers watsonx
- [ ] Tester la connexion

### Phase 4 : Migration Données
- [ ] Migrer les données existantes vers watsonx
- [ ] Tester la compatibilité
- [ ] Documenter le processus

### Phase 5 : Tests
- [ ] Tester le chargement du dataset
- [ ] Tester la sauvegarde des stats
- [ ] Tester l'analyse des données
- [ ] Tester les performances

## 🔐 Sécurité

### Gestion des Credentials
- ✅ Utiliser des variables d'environnement
- ✅ Ne jamais commiter les API keys
- ✅ Utiliser `.env` et `.gitignore`
- ✅ Rotation des clés si nécessaire

### Authentification
- ✅ Utiliser OAuth2 pour l'authentification
- ✅ Limiter les permissions API
- ✅ Utiliser HTTPS pour toutes les communications

## 📚 Ressources

- [Watsonx.ai Documentation](https://www.ibm.com/products/watsonx-ai)
- [IBM Watson Machine Learning SDK](https://github.com/IBM/watson-machine-learning-sdk)
- [Dataset Hugging Face](https://huggingface.co/datasets/ejhusom/llm-inference-energy-consumption)
- [IBM Cloud Documentation](https://cloud.ibm.com/docs)

## 🚀 Prochaines Étapes

1. **Priorité 1** : Configurer watsonx et importer le dataset
2. **Priorité 2** : Créer le service watsonx
3. **Priorité 3** : Intégrer dans l'extension
4. **Priorité 4** : Tester et documenter

---

**Note** : Cette intégration est **critique** pour répondre aux objectifs du projet académique et permettre l'analyse annuelle d'entreprise.

