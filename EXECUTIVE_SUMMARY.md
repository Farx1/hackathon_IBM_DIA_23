# 🌱 Track Sustainability - Résumé Exécutif

## Projet

Extension Chrome pour estimer et visualiser l'impact carbone (CO₂) des requêtes envoyées aux modèles de langage (LLM).

## Résultats clés

### Modèle ML
- **Performance** : R² = 0.984 (98.4% de variance expliquée)
- **Algorithme** : Gradient Boosting
- **Dataset** : 78,728 mesures réelles de consommation énergétique
- **Features principales** : Longueur de réponse (47%), Total tokens (26%), Taille du modèle (20%)

### Consommation énergétique

| Modèle | Énergie/token | Ratio vs 7B |
|--------|---------------|-------------|
| 2B (Gemma) | 0.000000189 J | 0.4× |
| 7B (LLaMA 3) | 0.000000460 J | 1× |
| 70B (GPT-4) | 0.000007753 J | 17× |

**Insight** : GPT-4 (70B) consomme **17× plus** d'énergie que GPT-3.5 (7B) pour la même réponse.

### Facteurs CO₂

| Pays | Intensité (gCO₂/kWh) | Mix |
|------|----------------------|-----|
| 🇸🇪 Suède | 13 | Nucléaire + Hydro |
| 🇫🇷 France | 52 | Nucléaire (65%) |
| 🌍 Mondial | 480 | Mix |
| 🇨🇳 Chine | 581 | Charbon (62%) |
| 🇿🇦 Afr. Sud | 750 | Charbon (86%) |

## Fonctionnalités

✅ Détection automatique ChatGPT, Claude, Gemini
✅ Estimation en temps réel de l'énergie et du CO₂
✅ Choix du mix énergétique (30+ pays)
✅ Tracking cumulatif des conversations
✅ Équivalences concrètes (km voiture, emails, arbres)
✅ Interface moderne et intuitive

## Exemple d'utilisation

**Conversation type (10 échanges avec GPT-4)**
- Tokens : 5,000
- Énergie : 0.0388 J
- CO₂ (France) : 0.00055 g
- CO₂ (Chine) : 0.0062 g
- Équivalent : ~0.03 recherches Google

## Livrables

📦 Extension Chrome complète (41 KB)
📊 Modèle ML entraîné (R² = 0.984)
📚 Documentation complète (README, guides)
📈 6 visualisations de données
🔬 Scripts Python d'analyse

## Impact

Ce projet permet de :
- **Sensibiliser** aux impacts environnementaux de l'IA
- **Quantifier** précisément la consommation des LLM
- **Comparer** les modèles et les mix énergétiques
- **Optimiser** l'utilisation des LLM

---

**Projet réalisé pour Capgemini - Expert : Hernan Carrillo**
