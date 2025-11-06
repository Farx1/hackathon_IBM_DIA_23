# 🌱 Track Sustainability - CO₂ Impact Tracker for LLMs

Extension Chrome pour estimer et visualiser l'impact carbone (CO₂) de vos requêtes aux modèles de langage (LLM).

## 📋 Description

Track Sustainability analyse en temps réel vos conversations avec ChatGPTpour estimer la consommation énergétique et les émissions de CO₂ associées. L'extension utilise un modèle de machine learning entraîné sur des données réelles de consommation énergétique de modèles open-source.

### ✨ Fonctionnalités

- **Détection automatique** des conversations sur ChatGPT
- **Estimation précise** de la consommation énergétique basée sur un modèle ML (R² = 0.874)
- **Conversion en CO₂** avec choix du mix énergétique par pays (30+ pays disponibles)
- **Tracking cumulatif** de toutes vos conversations
- **Équivalences concrètes** (km en voiture, emails, arbres nécessaires)
- **Interface intuitive** avec statistiques en temps réel

### 🎯 Modèles supportés

L'extension reconnaît automatiquement les modèles suivants :

- **OpenAI** : GPT-4, GPT-4 Turbo, GPT-4o, GPT-3.5 Turbo
- **Anthropic** : Claude 3 Opus, Claude 3.5 Sonnet, Claude 3 Haiku
- **Google** : Gemini Pro, Gemini 1.5 Pro, Gemini 1.5 Flash
- **Meta** : LLaMA 2, LLaMA 3 (7B, 8B, 70B)
- **Mistral** : Mistral 7B, Mixtral 8x7B
- **Autres** : CodeLlama, et plus...

## 🚀 Installation

### Option 1 : Installation en mode développeur (recommandé)

1. **Télécharger l'extension**
   ```bash
   # Cloner ou télécharger le dossier client/public
   cd track-sustainability-extension/client/public
   ```

2. **Ouvrir Chrome**
   - Aller dans `chrome://extensions/`
   - Activer le **Mode développeur** (en haut à droite)

3. **Charger l'extension**
   - Cliquer sur **"Charger l'extension non empaquetée"**
   - Sélectionner le dossier `client/public`

4. **Vérifier l'installation**
   - L'icône 🌱 devrait apparaître dans la barre d'outils
   - Cliquer dessus pour ouvrir le popup

### Option 2 : Package Chrome (.crx)

```bash
# Créer un package
cd track-sustainability-extension/client/public
zip -r track-sustainability.zip . -x "*.git*" -x "node_modules/*"
```

Puis charger le fichier .zip dans Chrome.

## 📊 Utilisation

1. **Ouvrir une plateforme LLM**
   - Aller sur chat.openai.com, claude.ai ou gemini.google.com

2. **Commencer une conversation**
   - L'extension détecte automatiquement vos échanges
   - Le statut passe à "✅ Conversation active détectée"

3. **Consulter les statistiques**
   - Cliquer sur l'icône de l'extension
   - Voir l'impact CO₂ en temps réel

4. **Choisir votre mix énergétique**
   - Dans les paramètres, sélectionner votre pays
   - Les calculs sont automatiquement mis à jour

## 🔬 Méthodologie

### Modèle de prédiction

L'extension utilise un modèle **Gradient Boosting** entraîné sur le dataset [LLM Inference Energy Consumption](https://huggingface.co/datasets/ejhusom/llm-inference-energy-consumption) :

- **78,728 mesures** réelles de consommation énergétique
- **15 configurations** (modèles × hardware)
- **Performance** : R² = 0.984, MAE = 0.000014 J

### Formule de calcul

```
Énergie (J) = Énergie_base + (Tokens_prompt × 0.3 × E/token) + (Tokens_réponse × 1.0 × E/token)

CO₂ (g) = (Énergie_J / 3,600,000) × Intensité_carbone (gCO₂/kWh)
```

### Facteurs d'émission

Les facteurs d'émission CO₂ proviennent de sources officielles :

- **Ember Global Electricity Review 2024**
- **IEA (International Energy Agency)**
- **Our World in Data**

Exemples d'intensité carbone :
- 🇸🇪 Suède : 13 gCO₂/kWh (nucléaire + hydro)
- 🇫🇷 France : 52 gCO₂/kWh (nucléaire dominant)
- 🇺🇸 États-Unis : 369 gCO₂/kWh
- 🌍 Moyenne mondiale : 480 gCO₂/kWh
- 🇨🇳 Chine : 581 gCO₂/kWh
- 🇵🇱 Pologne : 652 gCO₂/kWh (charbon dominant)

## 📈 Données scientifiques

### Consommation énergétique par modèle

| Taille | Énergie/token | Exemple |
|--------|---------------|---------|
| 2B | 0.000000189 J | Gemma 2B |
| 7B | 0.000000460 J | LLaMA 3 8B, Mistral 7B |
| 70B | 0.000007753 J | GPT-4, Claude 3 Opus |

**Note** : Un modèle 70B consomme environ **40× plus** d'énergie par token qu'un modèle 7B.

### Équivalences CO₂

Pour 1000 requêtes à GPT-4 (moyenne 500 tokens/réponse) :

- **Énergie** : ~3.9 J
- **CO₂** (mix mondial) : ~0.52 g
- **Équivalent** : ~2.6 recherches Google

## 🛠️ Architecture technique

```
track-sustainability-extension/
├── client/public/
│   ├── manifest.json          # Configuration Chrome
│   ├── popup.html             # Interface utilisateur
│   ├── popup.js               # Logique du popup
│   ├── content.js             # Détection des conversations
│   ├── background.js          # Service worker (calculs)
│   ├── predictor.js           # Modèle de prédiction
│   ├── data/
│   │   ├── model_simplified.json      # Modèle ML
│   │   └── carbon_intensity.json      # Facteurs CO₂
│   └── icon-*.png             # Icônes
```

### Technologies utilisées

- **Manifest V3** (Chrome Extensions)
- **Machine Learning** : Gradient Boosting (scikit-learn)
- **Storage API** : Chrome Storage Local
- **Content Scripts** : Détection DOM
- **Service Workers** : Calculs en arrière-plan

## 📝 Développement

### Prérequis

- Node.js 18+
- Chrome/Chromium
- Python 3.11+ (pour l'entraînement du modèle)

### Structure du projet

```bash
# Modèle ML et analyse
/home/ubuntu/track-sustainability/
├── 01_explore_dataset.py      # Exploration des données
├── 02_clean_and_eda.py         # Nettoyage et EDA
├── 03_build_model.py           # Entraînement du modèle
├── 04_export_model_js.py       # Export en JavaScript
├── data/                       # Datasets
├── models/                     # Modèles entraînés
└── visualizations/             # Graphiques

# Extension Chrome
/home/ubuntu/track-sustainability-extension/
└── client/public/              # Fichiers de l'extension
```

### Entraîner le modèle

```bash
cd /home/ubuntu/track-sustainability

# 1. Télécharger le dataset
python3 01_explore_dataset.py

# 2. Nettoyer et analyser
python3 02_clean_and_eda.py

# 3. Entraîner le modèle
python3 03_build_model.py

# 4. Exporter en JavaScript
python3 04_export_model_js.py
```

## 🎓 Contexte académique

Ce projet a été développé dans le cadre d'un projet académique sur la **durabilité de l'IA** :

- **Objectif** : Sensibiliser aux impacts environnementaux des LLM
- **Dataset** : Hugging Face - ejhusom/llm-inference-energy-consumption
- **Expert** : Hernan Carrillo (Data & AI Scientist, Capgemini)

## 📚 Références

1. **Dataset** : [LLM Inference Energy Consumption](https://huggingface.co/datasets/ejhusom/llm-inference-energy-consumption)
2. **Paper** : "The Price of Prompting: Profiling Energy Use in Large Language Models Inference" (2024)
3. **Ember** : [Global Electricity Review 2024](https://ember-energy.org/latest-insights/global-electricity-review-2024/)
4. **IEA** : [Emissions Factors 2024](https://www.iea.org/data-and-statistics/data-product/emissions-factors-2024)

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

### Idées d'amélioration

- [ ] Support de plus de plateformes (Perplexity, HuggingChat, etc.)
- [ ] Graphiques d'historique et tendances
- [ ] Export des données (CSV, JSON)
- [ ] Comparaison entre modèles
- [ ] Suggestions d'optimisation
- [ ] Badge avec impact en temps réel
- [ ] Mode sombre/clair

## 📄 Licence

Ce projet est sous licence **CC BY-SA 4.0** (Creative Commons Attribution-ShareAlike 4.0).

Le dataset utilisé est également sous licence CC BY-SA 4.0.

## ⚠️ Limitations

- **Estimations approximatives** : Les calculs sont basés sur des modèles statistiques et peuvent varier selon le hardware réel
- **Détection heuristique** : L'extraction des messages peut ne pas fonctionner si les plateformes changent leur structure DOM
- **Modèles propriétaires** : Les estimations pour GPT-4, Claude et Gemini sont extrapolées depuis des modèles open-source similaires

## 📧 Contact

Pour toute question ou suggestion :

- **Email** : hernan-camilo.carrillo-lindado@capgemini.com
- **GitHub** : [Créer une issue](https://github.com/votre-repo/track-sustainability/issues)

---

**Fait avec 💚 pour un futur plus durable**
