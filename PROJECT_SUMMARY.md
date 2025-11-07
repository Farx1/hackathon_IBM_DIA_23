# 📊 Track Sustainability - Résumé du Projet

## Vue d'ensemble

**Track Sustainability** est une extension Chrome qui estime et visualise l'impact carbone (CO₂) des requêtes envoyées aux modèles de langage (LLM). Le projet combine machine learning, analyse de données et développement web pour sensibiliser aux impacts environnementaux de l'IA.

## 🎯 Objectifs atteints

✅ Analyse complète du dataset LLM energy consumption (78,728 mesures)
✅ Construction d'un modèle prédictif performant (R² = 0.984)
✅ Développement d'une extension Chrome fonctionnelle
✅ Détection automatique de ChatGPT, Claude et Gemini
✅ Système de conversion CO₂ avec 30+ pays
✅ Interface utilisateur intuitive et responsive
✅ Documentation complète

## 📈 Résultats du modèle ML

### Performance

| Métrique | Valeur |
|----------|--------|
| R² Score | 0.9841 |
| MAE | 0.000014 J |
| MSE | 5.01e-09 J² |
| Algorithme | Gradient Boosting |
| Features | 7 |
| Samples (train) | 62,982 |
| Samples (test) | 15,746 |

### Top 3 Features

1. **response_token_length** : 46.81% d'importance
2. **total_tokens** : 25.53% d'importance
3. **model_size** : 20.17% d'importance

### Consommation énergétique par taille

| Taille | Énergie/token | Médiane | Exemple |
|--------|---------------|---------|---------|
| 2B | 1.89e-07 J | 5.14e-05 J | Gemma 2B |
| 7B | 4.60e-07 J | 1.38e-04 J | LLaMA 3 8B |
| 70B | 7.75e-06 J | 1.95e-03 J | GPT-4, Claude 3 |

**Insight clé** : Un modèle 70B consomme **~40× plus** d'énergie par token qu'un modèle 7B.

## 🌍 Facteurs d'émission CO₂

### Pays avec le mix le plus propre

| Pays | Intensité (gCO₂/kWh) | Mix dominant |
|------|----------------------|--------------|
| 🇸🇪 Suède | 13 | Hydro + Nucléaire |
| 🇳🇴 Norvège | 18 | Hydro (92%) |
| 🇨🇭 Suisse | 24 | Hydro + Nucléaire |
| 🇫🇷 France | 52 | Nucléaire (65%) |

### Pays avec le mix le plus carboné

| Pays | Intensité (gCO₂/kWh) | Mix dominant |
|------|----------------------|--------------|
| 🇿🇦 Afrique du Sud | 750 | Charbon (86%) |
| 🇵🇱 Pologne | 652 | Charbon (70%) |
| 🇮🇳 Inde | 632 | Charbon (75%) |
| 🇨🇳 Chine | 581 | Charbon (62%) |

**Moyenne mondiale** : 480 gCO₂/kWh

## 💻 Architecture technique

### Extension Chrome

```
Structure Manifest V3
├── popup.html/js       → Interface utilisateur
├── content.js          → Détection conversations
├── background.js       → Service worker (calculs)
├── predictor.js        → Modèle ML simplifié
└── data/
    ├── model_simplified.json
    └── carbon_intensity.json
```

### Pipeline ML

```
Dataset (158 MB)
    ↓
Nettoyage & EDA
    ↓
Feature Engineering
    ↓
Entraînement (4 modèles)
    ↓
Sélection (Gradient Boosting)
    ↓
Export JavaScript
    ↓
Intégration Extension
```

## 📊 Statistiques du dataset

- **Lignes** : 78,728 mesures
- **Colonnes** : 80 variables
- **Modèles** : 7 (Gemma 2B/7B, LLaMA 3, CodeLlama)
- **Hardware** : 4 types (laptop, workstation, server)
- **Datasets** : 2 (Alpaca, Code-Feedback)
- **Taille** : 158 MB (15 fichiers CSV)

## 🎨 Interface utilisateur

### Fonctionnalités

- ✅ Statut de détection en temps réel
- ✅ Statistiques session actuelle
- ✅ Statistiques cumulées
- ✅ Équivalences CO₂ concrètes
- ✅ Sélecteur de mix énergétique
- ✅ Bouton de réinitialisation
- ✅ Design moderne (gradient violet)

### Équivalences affichées

- < 1g : Minutes de respiration
- < 100g : Recherches Google
- < 1kg : Emails envoyés
- < 10kg : Km en voiture
- > 10kg : Arbres nécessaires/an

## 🔬 Méthodologie scientifique

### Sources de données

1. **Dataset principal** : Hugging Face - ejhusom/llm-inference-energy-consumption
2. **Facteurs CO₂** : Ember Global Electricity Review 2024, IEA
3. **Paper de référence** : "The Price of Prompting" (2024)

### Formule de calcul

```
Énergie (J) = Base + (Prompt × 0.3 × E/token) + (Response × 1.0 × E/token)

CO₂ (g) = (Énergie_J / 3,600,000) × Intensité_carbone
```

### Validation

- **Cross-validation** : 5-fold
- **Test set** : 20% des données
- **Métriques** : R², MAE, MSE
- **Comparaison** : 4 algorithmes testés

## 📦 Livrables

### Code source

- ✅ Scripts Python d'analyse (4 fichiers)
- ✅ Extension Chrome complète
- ✅ Modèle ML entraîné (.pkl)
- ✅ Modèle simplifié (.json)
- ✅ Données CO₂ (30+ pays)

### Documentation

- ✅ README.md (complet, 300+ lignes)
- ✅ INSTALLATION.md (guide pas à pas)
- ✅ PROJECT_SUMMARY.md (ce fichier)
- ✅ Code commenté et structuré

### Visualisations

- ✅ Distribution de l'énergie
- ✅ Consommation par modèle
- ✅ Tokens vs Énergie
- ✅ Matrice de corrélation
- ✅ Importance des features
- ✅ Analyse des prédictions

### Package

- ✅ Extension ZIP (41 KB)
- ✅ Icônes PNG (16, 48, 128 px)
- ✅ Manifest V3 valide

## 🎓 Contexte académique

**Projet** : Track Sustainability - Estimation et Simulation du CO₂ Impact des LLM
**Objectif** : Concevoir une solution complète combinant IA et interface pour estimer l'empreinte carbone des requêtes LLM
**Expert** : Hernan Carrillo (Data & AI Scientist, Capgemini)
**Dataset** : 5,200 lignes, 80 variables, 15 configurations

## 🚀 Utilisation

### Installation

1. Télécharger l'extension
2. Ouvrir `chrome://extensions/`
3. Activer le mode développeur
4. Charger l'extension non empaquetée

### Test

1. Aller sur chat.openai.com
2. Envoyer un message
3. Ouvrir le popup de l'extension
4. Voir l'impact CO₂ en temps réel

## 📈 Exemples de résultats

### Exemple 1 : Requête simple à GPT-4

- **Prompt** : "Bonjour, comment vas-tu ?" (50 tokens)
- **Réponse** : 200 tokens
- **Énergie** : 0.00194 J
- **CO₂ (France)** : 0.000028 g
- **CO₂ (Chine)** : 0.000313 g

### Exemple 2 : Conversation longue (10 échanges)

- **Total tokens** : 5,000
- **Énergie** : 0.0388 J
- **CO₂ (mix mondial)** : 0.0052 g
- **Équivalent** : ~0.026 recherches Google

### Exemple 3 : Comparaison modèles

| Modèle | Tokens | Énergie (J) | CO₂ (g, mondial) |
|--------|--------|-------------|------------------|
| GPT-3.5 (7B) | 500 | 0.00023 | 0.000031 |
| GPT-4 (70B) | 500 | 0.00388 | 0.000517 |

**Ratio** : GPT-4 consomme **~17× plus** que GPT-3.5 pour la même réponse.

## 🔮 Perspectives d'amélioration

### Court terme

- [ ] Support de plus de plateformes (Perplexity, HuggingChat)
- [ ] Graphiques d'historique
- [ ] Export des données (CSV)
- [ ] Mode sombre

### Moyen terme

- [ ] Comparaison entre modèles
- [ ] Suggestions d'optimisation
- [ ] Badge avec impact en temps réel
- [ ] API publique

### Long terme

- [ ] Modèle ML plus précis (deep learning)
- [ ] Intégration hardware réel
- [ ] Support mobile (Firefox, Safari)
- [ ] Dashboard web complet

## 📚 Références

1. Husom et al. (2024). "The Price of Prompting: Profiling Energy Use in Large Language Models Inference"
2. Ember (2024). "Global Electricity Review 2024"
3. IEA (2024). "Emissions Factors 2024"
4. Our World in Data. "Carbon Intensity of Electricity Generation"

## 🏆 Points forts du projet

1. **Données réelles** : Basé sur 78k+ mesures réelles
2. **Modèle performant** : R² = 0.984
3. **Interface intuitive** : Design moderne et responsive
4. **Détection automatique** : Fonctionne sans configuration
5. **Personnalisable** : 30+ pays disponibles
6. **Documentation complète** : README, guides, commentaires
7. **Open source** : Code clair et réutilisable

## ⚠️ Limitations

1. **Estimations** : Basées sur des modèles statistiques
2. **Détection heuristique** : Peut échouer si DOM change
3. **Modèles propriétaires** : Extrapolés depuis open-source
4. **Pas de hardware réel** : Calculs théoriques

## 📧 Contact

**Expert** : Hernan Carrillo
**Email** : hernan-camilo.carrillo-lindado@capgemini.com

---

**Projet réalisé avec 💚 pour un futur plus durable**
