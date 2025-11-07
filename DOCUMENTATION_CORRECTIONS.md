# 🔧 Fonctionnalités Avancées du Projet

Ce document présente les fonctionnalités avancées implémentées dans Track Sustainability.

## 📋 Table des matières

1. [Système de Déduplication Intelligent](#système-de-déduplication-intelligent)
2. [Affichage Adaptatif des Valeurs](#affichage-adaptatif-des-valeurs)
3. [Dashboard Multi-Datasets](#dashboard-multi-datasets)

---

## 🔧 Système de Déduplication Intelligent

### Fonctionnalités

#### 1. Double Système de Déduplication

Le système utilise deux niveaux de déduplication pour garantir l'exactitude des statistiques :

- **Mémoire** (`processedMessages`) : Pour les performances (rapide)
- **Persistant** (`processedMessagesPersistent`) : Stocké dans `chrome.storage.local`
- Les messages sont sauvegardés par conversation et persistent même après rechargement

#### 2. Hash Stable Basé sur le Contenu

**Implémentation** :
```javascript
const hash = `${conversationId}-${role}-${contentHash}-${messageId}`; // ✅ Stable
```

**Avantages** :
- Le même message a toujours le même hash
- Fonctionne même si le message est déplacé dans le DOM lors du scroll
- Inclut l'ID de conversation pour éviter les collisions

#### 3. ID de Conversation Unique

Chaque conversation a un ID unique basé sur :
- L'URL de la conversation (si disponible)
- Sinon, un hash de l'URL complète

**Avantages** :
- Les messages sont isolés par conversation
- Évite les collisions entre différentes conversations
- Permet de charger les messages déjà traités pour une conversation spécifique

#### 4. Vérification Complète

Le système vérifie TOUS les messages visibles :
```javascript
for (const messageEl of messages) { // ✅ Vérifie tous les messages
  if (!processedMessages.has(hash) && !processedMessagesPersistent.has(hash)) {
    // Nouveau message
  }
}
```

**Avantages** :
- Détecte correctement les nouveaux messages même lors du scroll
- Ignore les messages déjà traités, même s'ils réapparaissent

#### 5. Détection des Changements d'URL

Détection automatique des changements d'URL (nouvelle conversation) :
- Réinitialise les compteurs
- Charge les messages déjà traités pour la nouvelle conversation
- Fonctionne avec les Single Page Applications (SPAs)

#### 6. Nettoyage Automatique

Nettoyage automatique toutes les 5 minutes :
- Garde seulement les 10 conversations les plus récentes
- Limite à 1000 messages par conversation
- Évite le stockage excessif

### 📊 Résultat

| Aspect | Fonctionnalité |
|--------|----------------|
| **Scroll** | ✅ Messages ignorés automatiquement |
| **Déduplication** | ✅ Mémoire + Persistant |
| **Hash** | ✅ Basé sur contenu (stable) |
| **Conversation** | ✅ ID unique par conversation |
| **Précision** | ✅ Comptage unique garanti |

### 📝 Fichiers Modifiés

- ✅ `client/public/content.js` : 
  - Système de déduplication persistant
  - Hash stable basé sur contenu
  - ID de conversation
  - Détection changements d'URL
  - Nettoyage automatique

---

## 🔧 Affichage Adaptatif des Valeurs

### Fonctionnalités

#### 1. Affichage CO₂ Intelligent

**Fonction `formatCO2()`** :
```javascript
function formatCO2(co2Grams) {
  if (co2Grams === 0 || isNaN(co2Grams)) {
    return '0.0000';
  }
  
  // Si très petit (< 0.0001), utiliser la notation scientifique
  if (co2Grams < 0.0001) {
    return co2Grams.toExponential(2); // Ex: 6.87e-5
  }
  
  // Sinon, afficher avec 4 décimales
  return co2Grams.toFixed(4);
}
```

**Résultat** :
- ✅ Petites valeurs affichées en notation scientifique (ex: `6.87e-5 g`)
- ✅ Valeurs normales affichées avec 4 décimales (ex: `0.0012 g`)

#### 2. Estimation de Tokens Améliorée

**Fonctionnalités** :
- ✅ Détection du markdown/code (facteur ×1.3)
- ✅ Formule précise : `0.75 tokens/mot`
- ✅ Poids adaptatif selon la longueur du texte
- ✅ Meilleure gestion des textes longs

**Implémentation** :
```javascript
// Détection markdown/code
const isCodeOrMarkdown = /[#*`{}[\]()]/.test(text) || ...;
const codeFactor = isCodeOrMarkdown ? 1.3 : 1.0;

// Formule améliorée
tokensFromWords = words * 0.75 * codeFactor;
tokensFromChars = chars / 4;

// Poids adaptatif
const weight = chars > 500 ? 0.7 : 0.6;
estimatedTokens = (tokensFromWords * weight + tokensFromChars * (1 - weight));
```

**Résultat** :
- ✅ Estimation précise pour les textes longs
- ✅ Meilleure prise en compte du markdown/code
- ✅ Tokens proches de la réalité

#### 3. Équivalences CO₂ Adaptatives

**Seuils intelligents** :
- ✅ **< 0.00001 g** : Affiche "-"
- ✅ **< 0.0001 g** : Affiche en microgrammes (µg)
- ✅ **< 0.001 g** : Affiche en secondes de respiration
- ✅ **< 0.01 g** : Affiche en milligrammes (mg)
- ✅ **< 0.1 g** : Affiche en recherches Google
- ✅ **< 1 g** : Affiche en emails
- ✅ **< 10 g** : Affiche en km en voiture
- ✅ **≥ 10 g** : Affiche en arbres nécessaires

### 📝 Fichiers Modifiés

- ✅ `client/public/popup.js` :
  - Fonction `formatCO2()` ajoutée
  - Amélioration de `updateEquivalence()`
  
- ✅ `client/public/content.js` :
  - Amélioration de `estimateTokens()`
  - Logs de diagnostic ajoutés

---

## 🔧 Dashboard Multi-Datasets

### Fonctionnalités

#### 1. Chargement Multi-Datasets

**Fonctionnement** :
- ✅ Recherche automatique de tous les datasets contenant "llm-inference"
- ✅ Chargement séquentiel de chaque dataset
- ✅ Combinaison de toutes les données
- ✅ Normalisation des colonnes
- ✅ Gestion robuste (continue même si un dataset est temporairement indisponible)

**Logs** :
```
📊 Chargement de 3 datasets...
✓ Dataset "alpaca_gemma_2b_laptop2" chargé: 1250 lignes
✓ Dataset "alpaca_llama3_8b_workstation" chargé: 2100 lignes
✓ Dataset "code_feedback_codellama_7b_server" chargé: 1800 lignes
✓ Total: 5150 mesures chargées depuis 3 datasets
```

#### 2. Normalisation des Colonnes

**Colonnes supportées** :

| Colonne Normalisée | Variantes Acceptées |
|-------------------|---------------------|
| `model_name` | `model_name`, `model`, `Model` |
| `hardware_type` | `hardware_type`, `hardware`, `Hardware`, `type` |
| `prompt_token_length` | `prompt_token_length`, `prompt_tokens`, `Prompt Tokens` |
| `response_token_length` | `response_token_length`, `response_tokens`, `Response Tokens` |
| `energy_consumption_llm_total` | `energy_consumption_llm_total`, `energy_total`, `Energy Total`, `energy` |
| `energy_consumption_llm_cpu` | `energy_consumption_llm_cpu`, `cpu_energy` |
| `energy_consumption_llm_gpu` | `energy_consumption_llm_gpu`, `gpu_energy` |

#### 3. Liste des Datasets

**Fonction** : `listDatasets()` dans le dashboard
- Affiche tous les datasets llm-inference trouvés dans Watsonx
- Montre l'ID, le nom et le type de chaque dataset
- Permet de vérifier que les datasets sont bien importés

**Utilisation** :
1. Aller dans l'onglet "⚙️ Configuration"
2. Cliquer sur "📋 Lister les Datasets Disponibles"
3. Voir la liste des datasets trouvés

### Structure du Dataset

D'après Hugging Face, le dataset comprend :

- **Modèles** : Llama 2, LLaMA 3 (7B, 8B, 70B), CodeLlama, Gemma
- **Hardware** : Workstation, Laptops (2 types), Server
- **Prompt Datasets** : Alpaca, Code-Feedback
- **Total** : ~78,728 mesures, 80 variables, 15 configurations

### Améliorations Techniques

#### Parser CSV Amélioré

**Fonctionnalités** :
- ✅ Parse correctement les valeurs avec guillemets
- ✅ Gère les colonnes manquantes
- ✅ Compatible avec tous les formats du dataset

#### Normalisation des Colonnes

**Fonctionnalités** :
- ✅ Mapping intelligent des variantes
- ✅ Gestion des colonnes manquantes
- ✅ Compatibilité avec tous les formats du dataset

#### Chargement Robuste

**Fonctionnalités** :
- ✅ Recherche de tous les datasets
- ✅ Combinaison automatique
- ✅ Continue même si un dataset échoue
- ✅ Logs détaillés

---

## 📊 Résultats

### Avant les améliorations
```
- Déduplication : Aucune
- Affichage CO₂ : Format fixe
- Tokens : Estimation basique
- Datasets : Support d'un seul
```

### Après les améliorations
```
- Déduplication : Système intelligent persistant ✅
- Affichage CO₂ : Format adaptatif (notation scientifique si nécessaire) ✅
- Tokens : Estimation améliorée avec détection code/markdown ✅
- Datasets : Support multi-datasets avec normalisation automatique ✅
```

---

✅ **Toutes les fonctionnalités avancées sont implémentées et opérationnelles.**
