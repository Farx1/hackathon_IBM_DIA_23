/**
 * Track Sustainability - Prédicteur Random Forest Local
 * Utilise le modèle Random Forest entraîné pour prédire la consommation énergétique
 * Compatible avec le système existant (Watsonx, modèle simplifié)
 */

let randomForestModel = null;
let modelInitialized = false;

/**
 * Initialiser le modèle Random Forest
 */
async function initRandomForestModel() {
  try {
    if (modelInitialized && randomForestModel) {
      console.log('✓ Modèle Random Forest déjà initialisé');
      return true;
    }

    const response = await fetch(chrome.runtime.getURL('data/random_forest_model.json'));
    randomForestModel = await response.json();
    modelInitialized = true;
    
    console.log('✓ Modèle Random Forest chargé:', {
      type: randomForestModel.model_type,
      version: randomForestModel.version,
      features: randomForestModel.features,
      performance: randomForestModel.performance
    });
    
    return true;
  } catch (error) {
    console.error('❌ Erreur chargement modèle Random Forest:', error);
    return false;
  }
}

/**
 * Normaliser les features selon les statistiques du modèle
 */
function normalizeFeatures(features) {
  if (!randomForestModel || !randomForestModel.data_stats) {
    return features;
  }

  const means = randomForestModel.data_stats.feature_means;
  const stds = randomForestModel.data_stats.feature_stds;
  
  return features.map((value, index) => {
    if (stds[index] === 0) return 0;
    return (value - means[index]) / stds[index];
  });
}

/**
 * Prédire l'énergie avec le modèle linéaire (fallback)
 * Le modèle Random Forest complet nécessiterait tous les arbres, 
 * donc on utilise le modèle linéaire comme approximation
 */
function predictWithLinearModel(features) {
  if (!randomForestModel || !randomForestModel.linear_model) {
    return null;
  }

  const normalized = normalizeFeatures(features);
  const coefficients = randomForestModel.linear_model.coefficients;
  const intercept = randomForestModel.linear_model.intercept;

  let prediction = intercept;
  for (let i = 0; i < normalized.length; i++) {
    prediction += normalized[i] * coefficients[i];
  }

  return Math.max(0, prediction); // S'assurer que l'énergie est positive
}

/**
 * Prédire l'énergie avec une approximation basée sur les feature importances
 * Utilise les importances des features pour pondérer les valeurs
 */
function predictWithFeatureImportances(features) {
  if (!randomForestModel || !randomForestModel.feature_importances) {
    return null;
  }

  const importances = randomForestModel.feature_importances;
  const normalized = normalizeFeatures(features);
  
  // Utiliser une combinaison pondérée basée sur les importances
  // Approximation: moyenne pondérée des features normalisées
  let weightedSum = 0;
  let totalImportance = 0;
  
  for (let i = 0; i < normalized.length; i++) {
    weightedSum += normalized[i] * importances[i];
    totalImportance += importances[i];
  }
  
  // Normaliser par l'importance totale
  const normalizedWeighted = totalImportance > 0 ? weightedSum / totalImportance : 0;
  
  // Convertir en énergie (approximation basée sur les stats)
  const meanEnergy = randomForestModel.data_stats?.target_mean || 0.0001;
  const stdEnergy = randomForestModel.data_stats?.target_std || 0.0001;
  
  const prediction = meanEnergy + (normalizedWeighted * stdEnergy);
  
  return Math.max(0, prediction);
}

/**
 * Prédire la consommation énergétique avec le modèle Random Forest
 * @param {Object} params - Paramètres de la requête
 * @param {number} params.totalDuration - Durée totale en nanosecondes
 * @param {number} params.promptTokens - Nombre de tokens du prompt
 * @param {number} params.responseTokens - Nombre de tokens de la réponse
 * @param {number} params.responseDuration - Durée de la réponse en nanosecondes
 * @param {number} params.wordCount - Nombre de mots
 * @param {number} params.readingTime - Temps de lecture en secondes
 * @returns {number} - Énergie consommée en Joules
 */
function predictEnergyWithRandomForest(params) {
  if (!modelInitialized || !randomForestModel) {
    console.warn('⚠️ Modèle Random Forest non initialisé');
    return null;
  }

  // Extraire les features dans l'ordre attendu par le modèle
  const features = [
    params.totalDuration || 0,
    params.promptTokens || 0,
    params.responseTokens || 0,
    params.responseDuration || 0,
    params.wordCount || 0,
    params.readingTime || 0
  ];

  // Vérifier que toutes les features sont valides
  if (features.some(f => isNaN(f) || f < 0)) {
    console.warn('⚠️ Features invalides pour Random Forest:', features);
    return null;
  }

  // Essayer d'abord le modèle linéaire (plus fiable)
  let prediction = predictWithLinearModel(features);
  
  // Si le modèle linéaire échoue, utiliser les feature importances
  if (prediction === null || isNaN(prediction)) {
    prediction = predictWithFeatureImportances(features);
  }

  if (prediction === null || isNaN(prediction)) {
    console.warn('⚠️ Impossible de prédire avec Random Forest');
    return null;
  }

  console.log('✅ Prédiction Random Forest:', {
    features: features.map((f, i) => `${randomForestModel.features[i]}: ${f}`),
    prediction: prediction.toFixed(10),
    method: 'linear_model'
  });

  return prediction;
}

/**
 * Initialiser automatiquement le modèle au chargement
 */
(async function autoInit() {
  try {
    await initRandomForestModel();
  } catch (error) {
    console.error('❌ Erreur initialisation automatique Random Forest:', error);
  }
})();

// Exposer les fonctions globalement
if (typeof window !== 'undefined') {
  window.RandomForestPredictor = {
    init: initRandomForestModel,
    predict: predictEnergyWithRandomForest,
    isInitialized: () => modelInitialized && randomForestModel !== null
  };
  console.log('✓ RandomForestPredictor exposé sur window');
}

// Pour Service Worker
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  self.RandomForestPredictor = {
    init: initRandomForestModel,
    predict: predictEnergyWithRandomForest,
    isInitialized: () => modelInitialized && randomForestModel !== null
  };
  console.log('✓ RandomForestPredictor exposé sur self (Service Worker)');
}

