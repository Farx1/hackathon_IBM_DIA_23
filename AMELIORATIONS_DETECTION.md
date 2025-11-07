# 🔍 Améliorations de la Détection des Messages LLM

## 📋 Analyse du Système Actuel

### Fonctionnement actuel
1. **Content Script** (`content.js`) :
   - Utilise des sélecteurs CSS génériques pour trouver les messages
   - Extrait le texte via `textContent`
   - Estime les tokens avec une formule approximative (chars/4)
   - Utilise des modèles par défaut (gpt-4, claude-3.5-sonnet, etc.)

### Limitations identifiées
1. ❌ **Pas d'interception des requêtes réseau** : Les vraies données (tokens, modèle) ne sont pas récupérées
2. ❌ **Sélecteurs DOM fragiles** : Les sélecteurs peuvent casser si les plateformes changent leur structure
3. ❌ **Estimation de tokens imprécise** : La formule chars/4 est trop approximative
4. ❌ **Modèle non détecté** : Utilise toujours le modèle par défaut, pas le vrai modèle utilisé
5. ❌ **Messages en streaming** : Ne gère pas bien les messages qui se génèrent en temps réel
6. ❌ **Pas de déduplication** : Peut compter plusieurs fois le même message

---

## 🎯 Améliorations Proposées

### 1. Interception des Requêtes Réseau (Priorité Haute)

**Objectif** : Récupérer les vraies données depuis les APIs des plateformes

#### ChatGPT (OpenAI)
- **Endpoint** : `https://chatgpt.com/backend-api/conversation` ou `/api/conversation`
- **Méthode** : Intercepter les requêtes POST
- **Données disponibles** :
  - `model` : Nom exact du modèle (gpt-4, gpt-3.5-turbo, etc.)
  - `messages[].content` : Contenu des messages
  - `usage.prompt_tokens` : Tokens du prompt (si disponible)
  - `usage.completion_tokens` : Tokens de la réponse

#### Claude (Anthropic)
- **Endpoint** : `https://api.anthropic.com/v1/messages` ou proxy via claude.ai
- **Méthode** : Intercepter les requêtes POST
- **Données disponibles** :
  - `model` : Nom exact du modèle (claude-3-opus, claude-3.5-sonnet, etc.)
  - `input` : Contenu du prompt
  - `usage.input_tokens` : Tokens du prompt
  - `usage.output_tokens` : Tokens de la réponse

#### Gemini (Google)
- **Endpoint** : `https://generativelanguage.googleapis.com/v1beta/models/*:generateContent`
- **Méthode** : Intercepter les requêtes POST
- **Données disponibles** :
  - `model` : Nom du modèle
  - `contents` : Contenu des messages
  - `usageMetadata` : Métadonnées des tokens (si disponible)

**Implémentation** :
- Utiliser `chrome.webRequest` (nécessite permission `webRequest`)
- Ou injecter un script qui intercepte `fetch` et `XMLHttpRequest`

### 2. Amélioration de la Détection DOM (Priorité Moyenne)

**Objectif** : Rendre les sélecteurs plus robustes et spécifiques

#### ChatGPT
- **Sélecteurs améliorés** :
  ```javascript
  messages: '[data-message-author-role], [class*="group"]',
  userMessage: '[data-message-author-role="user"], [class*="user"]',
  assistantMessage: '[data-message-author-role="assistant"], [class*="assistant"]',
  messageText: '.markdown, [class*="markdown"], .prose',
  messageContainer: '[data-testid*="conversation"], main, [role="main"]'
  ```

#### Claude
- **Sélecteurs améliorés** :
  ```javascript
  messages: '[data-test-render-count], [class*="Message"]',
  userMessage: '[class*="UserMessage"], [data-author="user"]',
  assistantMessage: '[class*="AssistantMessage"], [data-author="assistant"]',
  messageText: '.whitespace-pre-wrap, [class*="message-text"]',
  messageContainer: '[class*="Conversation"], main'
  ```

#### Gemini
- **Sélecteurs améliorés** :
  ```javascript
  messages: '[data-message-id], [class*="message"]',
  userMessage: '[data-author="user"], [class*="user"]',
  assistantMessage: '[data-author="model"], [class*="model"]',
  messageText: '[class*="content"], [class*="text"]',
  messageContainer: '[class*="conversation"], main'
  ```

### 3. Gestion des Messages en Streaming (Priorité Haute)

**Objectif** : Détecter et agréger les messages qui se génèrent progressivement

**Stratégie** :
1. Détecter quand un message assistant commence à être généré
2. Attendre que le message soit complet (plus de changements pendant 2-3 secondes)
3. Utiliser un système de "fingerprinting" pour éviter les doublons
4. Calculer les tokens seulement une fois le message complet

**Implémentation** :
```javascript
const streamingMessages = new Map(); // messageId -> {element, text, lastUpdate}

function detectStreamingMessage(element) {
  const messageId = generateMessageId(element);
  const currentText = extractMessageText(element);
  
  if (streamingMessages.has(messageId)) {
    const existing = streamingMessages.get(messageId);
    if (existing.text !== currentText) {
      // Message en cours de streaming
      existing.text = currentText;
      existing.lastUpdate = Date.now();
    } else if (Date.now() - existing.lastUpdate > 2000) {
      // Message complet (plus de changements depuis 2s)
      processCompleteMessage(element);
      streamingMessages.delete(messageId);
    }
  } else {
    streamingMessages.set(messageId, {
      element,
      text: currentText,
      lastUpdate: Date.now()
    });
  }
}
```

### 4. Détection du Modèle Réel (Priorité Haute)

**Objectif** : Identifier le vrai modèle utilisé, pas seulement le défaut

**Méthodes** :
1. **Depuis les requêtes réseau** (meilleure méthode)
2. **Depuis le DOM** : Chercher dans les éléments UI (sélecteur de modèle, texte)
3. **Depuis le localStorage/sessionStorage** : Certaines plateformes stockent le modèle

**Implémentation** :
```javascript
async function detectModel(platform) {
  // 1. Essayer depuis les requêtes interceptées
  if (interceptedModel) return interceptedModel;
  
  // 2. Essayer depuis le DOM
  const modelSelectors = {
    'chatgpt.com': '[data-model], [class*="model"], select[aria-label*="model"]',
    'claude.ai': '[data-model], [class*="model"]',
    'gemini.google.com': '[data-model], [class*="model"]'
  };
  
  const modelEl = document.querySelector(modelSelectors[platform]);
  if (modelEl) {
    const model = extractModelFromElement(modelEl);
    if (model) return model;
  }
  
  // 3. Fallback sur le modèle par défaut
  return PLATFORMS[platform].defaultModel;
}
```

### 5. Amélioration de l'Estimation de Tokens (Priorité Moyenne)

**Objectif** : Utiliser une meilleure estimation ou une bibliothèque de tokenisation

**Options** :
1. **Formule améliorée** : Prendre en compte les mots, caractères, et langue
2. **Bibliothèque tiktoken** : Utiliser tiktoken.js (plus précis mais plus lourd)
3. **API de tokenisation** : Appeler une API si disponible

**Formule améliorée** :
```javascript
function estimateTokens(text) {
  if (!text) return 0;
  
  // Approximations selon la langue
  const words = text.trim().split(/\s+/).length;
  const chars = text.length;
  
  // Pour l'anglais : ~1.3 tokens/mot, ~4 chars/token
  // Pour le français : ~1.5 tokens/mot, ~3.5 chars/token
  const tokensFromWords = words * 1.3;
  const tokensFromChars = chars / 4;
  
  // Moyenne pondérée
  return Math.ceil((tokensFromWords * 0.6 + tokensFromChars * 0.4));
}
```

### 6. Déduplication des Messages (Priorité Moyenne)

**Objectif** : Éviter de compter plusieurs fois le même message

**Stratégie** :
- Utiliser un hash du contenu + timestamp
- Stocker les IDs des messages déjà traités
- Vérifier avant de traiter un nouveau message

**Implémentation** :
```javascript
const processedMessages = new Set();

function generateMessageHash(element) {
  const text = extractMessageText(element);
  const role = isUserMessage(element) ? 'user' : 'assistant';
  const timestamp = Math.floor(Date.now() / 1000); // Arrondir à la seconde
  return `${role}-${text.substring(0, 50)}-${timestamp}`;
}

function isMessageProcessed(element) {
  const hash = generateMessageHash(element);
  if (processedMessages.has(hash)) {
    return true;
  }
  processedMessages.add(hash);
  return false;
}
```

---

## 📝 Plan d'Implémentation

### Phase 1 : Interception des Requêtes (Critique)
1. ✅ Ajouter permission `webRequest` au manifest
2. ✅ Créer un script d'interception pour chaque plateforme
3. ✅ Extraire les données (modèle, tokens) depuis les réponses
4. ✅ Stocker dans chrome.storage pour utilisation par content.js

### Phase 2 : Amélioration DOM (Important)
1. ✅ Mettre à jour les sélecteurs dans PLATFORMS
2. ✅ Ajouter des méthodes de fallback
3. ✅ Améliorer `extractMessageText` avec plus de sélecteurs

### Phase 3 : Gestion Streaming (Important)
1. ✅ Implémenter le système de détection de streaming
2. ✅ Ajouter un délai pour les messages complets
3. ✅ Tester avec des conversations réelles

### Phase 4 : Détection Modèle (Important)
1. ✅ Implémenter `detectModel()` avec toutes les méthodes
2. ✅ Ajouter des sélecteurs spécifiques par plateforme
3. ✅ Fallback sur les modèles par défaut

### Phase 5 : Optimisations (Nice to have)
1. ✅ Améliorer l'estimation de tokens
2. ✅ Implémenter la déduplication
3. ✅ Ajouter des logs pour le debugging

---

## 🚀 Prochaines Étapes

1. **Modifier le manifest.json** : Ajouter les permissions nécessaires
2. **Créer un intercepteur réseau** : Nouveau fichier `network-interceptor.js`
3. **Améliorer content.js** : Intégrer toutes les améliorations
4. **Tester** : Vérifier sur ChatGPT, Claude et Gemini

---

## ⚠️ Notes Importantes

- **Permissions** : `webRequest` nécessite une déclaration dans le manifest
- **Compatibilité** : Certaines plateformes peuvent changer leur structure, donc il faut des fallbacks
- **Performance** : L'interception réseau peut ralentir légèrement, mais les données sont plus précises
- **Privacy** : Ne stocker que les métadonnées (tokens, modèle), pas le contenu des messages

