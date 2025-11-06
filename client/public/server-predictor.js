/**
 * Track Sustainability - Prédicteur via Serveur Local
 * Appelle le serveur local qui gère les prédictions avec Watsonx
 * Les credentials sont stockés dans .env côté serveur pour la sécurité
 */

const SERVER_URL = 'http://localhost:3000';

/**
 * Vérifier si le serveur est disponible
 */
async function checkServerHealth() {
  try {
    const response = await fetch(`${SERVER_URL}/api/health`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('⚠️ Serveur local non disponible:', error);
    return null;
  }
}

/**
 * Tester l'authentification du serveur
 */
async function testServerAuth() {
  try {
    const response = await fetch(`${SERVER_URL}/api/test-auth`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Erreur test authentification serveur:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Prédire l'énergie via le serveur local
 * @param {Object} params - Paramètres de la requête
 * @param {number} params.totalDuration - Durée totale en nanosecondes
 * @param {number} params.promptTokens - Nombre de tokens du prompt
 * @param {number} params.responseTokens - Nombre de tokens de la réponse
 * @param {number} params.responseDuration - Durée de la réponse en nanosecondes
 * @param {number} params.wordCount - Nombre de mots
 * @param {number} params.readingTime - Temps de lecture en secondes
 * @returns {Promise<number|null>} - Énergie consommée en Joules ou null si erreur
 */
async function predictEnergyViaServer(params) {
  try {
    // S'assurer que toutes les valeurs sont des nombres valides
    const totalDuration = typeof params.totalDuration === 'number' ? params.totalDuration : (parseFloat(params.totalDuration) || 0);
    const promptTokens = typeof params.promptTokens === 'number' ? params.promptTokens : (parseInt(params.promptTokens) || 0);
    const responseTokens = typeof params.responseTokens === 'number' ? params.responseTokens : (parseInt(params.responseTokens) || 0);
    const responseDuration = typeof params.responseDuration === 'number' ? params.responseDuration : (parseFloat(params.responseDuration) || 0);
    const wordCount = typeof params.wordCount === 'number' ? params.wordCount : (parseInt(params.wordCount) || 0);
    const readingTime = typeof params.readingTime === 'number' ? params.readingTime : (parseFloat(params.readingTime) || 0);
    
    // Log pour debug
    console.log('📤 Envoi au serveur:', {
      totalDuration,
      promptTokens,
      responseTokens,
      responseDuration,
      wordCount,
      readingTime
    });
    
    const response = await fetch(`${SERVER_URL}/api/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        totalDuration,
        promptTokens,
        responseTokens,
        responseDuration,
        wordCount,
        readingTime
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && typeof data.energyJoules === 'number') {
      console.log('✅ Prédiction via serveur local:', data.energyJoules.toFixed(8), 'J');
      return data.energyJoules;
    } else {
      throw new Error(data.error || 'Prédiction échouée');
    }
  } catch (error) {
    console.warn('⚠️ Erreur prédiction via serveur:', error);
    return null;
  }
}

/**
 * Prédire en batch via le serveur local
 * @param {Array} data - Tableau de données à prédire
 * @returns {Promise<Array>} - Tableau de résultats
 */
async function predictBatchViaServer(data) {
  try {
    const response = await fetch(`${SERVER_URL}/api/predict-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Prédictions batch via serveur: ${result.stats.success}/${result.stats.total} réussies`);
      return result.results;
    } else {
      throw new Error(result.error || 'Prédiction batch échouée');
    }
  } catch (error) {
    console.error('❌ Erreur prédiction batch via serveur:', error);
    throw error;
  }
}

// Exposer les fonctions globalement
if (typeof window !== 'undefined') {
  window.ServerPredictor = {
    checkHealth: checkServerHealth,
    testAuth: testServerAuth,
    predict: predictEnergyViaServer,
    predictBatch: predictBatchViaServer
  };
  console.log('✓ ServerPredictor exposé sur window');
}

// Pour Service Worker
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  self.ServerPredictor = {
    checkHealth: checkServerHealth,
    testAuth: testServerAuth,
    predict: predictEnergyViaServer,
    predictBatch: predictBatchViaServer
  };
  console.log('✓ ServerPredictor exposé sur self (Service Worker)');
}

