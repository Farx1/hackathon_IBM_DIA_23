/**
 * Track Sustainability - Modèle de prédiction d'énergie
 * Version simplifiée basée sur des règles statistiques
 */

// Charger le modèle simplifié
let modelData = null;

/**
 * Initialiser le modèle
 */
async function initModel() {
  try {
    const response = await fetch(chrome.runtime.getURL('data/model_simplified.json'));
    modelData = await response.json();
    console.log('✓ Modèle chargé:', modelData.model_type);
    return true;
  } catch (error) {
    console.error('Erreur lors du chargement du modèle:', error);
    return false;
  }
}

/**
 * Détecter la taille du modèle depuis son nom
 * @param {string} modelName - Nom du modèle (ex: "gpt-4", "claude-3-opus")
 * @returns {string} - Taille du modèle ("2b", "7b", "8b", "70b")
 */
function detectModelSize(modelName) {
  if (!modelData) {
    console.warn('Modèle non initialisé');
    return modelData?.default_size || '7b';
  }
  
  const normalizedName = modelName.toLowerCase().trim();
  
  // Chercher dans les mappings
  for (const [key, size] of Object.entries(modelData.model_mappings)) {
    if (normalizedName.includes(key.toLowerCase())) {
      return size;
    }
  }
  
  // Extraire la taille depuis le nom si possible
  if (normalizedName.includes('70b')) return '70b';
  if (normalizedName.includes('34b')) return '70b';
  if (normalizedName.includes('13b')) return '7b';
  if (normalizedName.includes('8b')) return '8b';
  if (normalizedName.includes('7b')) return '7b';
  if (normalizedName.includes('2b')) return '2b';
  
  // Par défaut
  return modelData.default_size;
}

/**
 * Prédire la consommation énergétique d'une requête LLM
 * @param {Object} params - Paramètres de la requête
 * @param {string} params.modelName - Nom du modèle
 * @param {number} params.promptTokens - Nombre de tokens du prompt
 * @param {number} params.responseTokens - Nombre de tokens de la réponse
 * @returns {number} - Énergie consommée en Joules
 */
function predictEnergy(params) {
  if (!modelData) {
    console.error('Modèle non initialisé. Appelez initModel() d'abord.');
    return 0;
  }
  
  const { modelName, promptTokens, responseTokens } = params;
  
  // Détecter la taille du modèle
  const modelSize = detectModelSize(modelName);
  
  // Calculer le nombre total de tokens
  const totalTokens = promptTokens + responseTokens;
  
  // Énergie de base pour ce modèle
  const baseEnergy = modelData.base_energy[modelSize] || modelData.base_energy['7b'];
  
  // Énergie par token
  const energyPerToken = modelData.energy_per_token[modelSize] || modelData.energy_per_token['7b'];
  
  // Formule simplifiée: Énergie = base + (tokens × énergie_par_token)
  // On donne plus de poids aux tokens de réponse car ils consomment plus
  const promptWeight = 0.3;
  const responseWeight = 1.0;
  
  const energy = baseEnergy + 
                 (promptTokens * energyPerToken * promptWeight) + 
                 (responseTokens * energyPerToken * responseWeight);
  
  return Math.max(0, energy); // S'assurer que l'énergie est positive
}

/**
 * Convertir l'énergie en CO₂
 * @param {number} energyJoules - Énergie en Joules
 * @param {number} carbonIntensity - Intensité carbone en gCO₂/kWh
 * @returns {Object} - { co2Grams, co2Kg, energyKwh }
 */
function energyToCO2(energyJoules, carbonIntensity = 480) {
  // Convertir Joules en kWh (1 kWh = 3,600,000 Joules)
  const energyKwh = energyJoules / 3600000;
  
  // Calculer le CO₂ en grammes
  const co2Grams = energyKwh * carbonIntensity;
  
  // Convertir en kg
  const co2Kg = co2Grams / 1000;
  
  return {
    co2Grams,
    co2Kg,
    energyKwh,
    energyJoules
  };
}

/**
 * Estimer le nombre de tokens depuis le texte
 * Approximation: 1 token ≈ 4 caractères pour l'anglais
 * @param {string} text - Texte à analyser
 * @returns {number} - Nombre estimé de tokens
 */
function estimateTokens(text) {
  if (!text) return 0;
  
  // Approximation simple: 1 token ≈ 4 caractères
  // Pour être plus précis, on pourrait utiliser une bibliothèque de tokenization
  const chars = text.length;
  const estimatedTokens = Math.ceil(chars / 4);
  
  return estimatedTokens;
}

// Exporter les fonctions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initModel,
    predictEnergy,
    energyToCO2,
    estimateTokens,
    detectModelSize
  };
}
