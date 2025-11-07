# Track Sustainability Extension - TODO

## Phase 1: Structure de l'extension Chrome
- [x] Créer manifest.json pour l'extension Chrome
- [x] Créer le popup HTML/CSS/JS
- [x] Créer le content script pour détecter les conversations LLM
- [x] Créer le service worker (background script)

## Phase 2: Intégration du modèle ML
- [x] Convertir le modèle Python en JavaScript (règles simplifiées)
- [x] Implémenter la fonction de prédiction d'énergie
- [x] Créer le système de mapping modèle → taille

## Phase 3: Système de conversion CO₂
- [x] Créer la base de données des mix énergétiques par pays
- [x] Implémenter la conversion Joules → kWh → CO₂
- [x] Ajouter le sélecteur de pays/région dans le popup

## Phase 4: Interface utilisateur
- [x] Design du popup avec affichage de l'impact CO₂
- [x] Affichage du tracking cumulatif de conversation
- [ ] Graphiques de visualisation (historique, comparaison)
- [x] Paramètres utilisateur (mix énergétique, unités)

## Phase 5: Détection automatique
- [x] Détecter ChatGPT (chat.openai.com)
- [x] Détecter Claude (claude.ai)
- [x] Détecter Gemini (gemini.google.com)
- [ ] Détecter autres plateformes LLM populaires

## Phase 6: Features bonus
- [ ] Export des données (CSV, JSON)
- [ ] Comparaison entre modèles
- [ ] Suggestions d'optimisation
- [ ] Badge avec impact en temps réel

## Phase 7: Tests et documentation
- [x] Tests de l'extension sur différents sites
- [x] Documentation utilisateur
- [x] README avec instructions d'installation
- [ ] Vidéo de démonstration

## Phase 8: Configuration pour Cursor IDE
- [x] Créer package.json avec scripts npm
- [x] Ajouter script de build pour l'extension
- [x] Créer guide de démarrage rapide pour Cursor
- [x] Configurer hot-reload pour le développement
- [x] Créer .cursorrules pour l'IA
- [x] Configurer VS Code/Cursor settings
- [x] Ajouter tasks.json pour les commandes rapides
