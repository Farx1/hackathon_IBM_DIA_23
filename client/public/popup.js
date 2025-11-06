/**
 * Track Sustainability - Popup Script
 */

// Variables globales
let carbonIntensityData = null;
let currentCountry = 'global_average';

/**
 * Initialiser le popup
 */
async function init() {
  try {
    // Charger les données d'intensité carbone
    const response = await fetch(chrome.runtime.getURL('data/carbon_intensity.json'));
    carbonIntensityData = await response.json();
    
    // Charger les préférences utilisateur
    const result = await chrome.storage.local.get(['selectedCountry']);
    if (result.selectedCountry) {
      currentCountry = result.selectedCountry;
      document.getElementById('country-select').value = currentCountry;
    }
    
    // Charger et afficher les statistiques
    await loadStats();
    
    // Masquer le loading, afficher le contenu
    document.getElementById('loading').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
    
    // Configurer les event listeners
    setupEventListeners();
    
    // Rafraîchir les stats toutes les 2 secondes
    setInterval(loadStats, 2000);
    
  } catch (error) {
    console.error('Erreur d\'initialisation:', error);
    document.getElementById('loading').innerHTML = '<p>❌ Erreur de chargement</p>';
  }
}

/**
 * Charger les statistiques depuis le storage
 */
async function loadStats() {
  try {
    const result = await chrome.storage.local.get([
      'lastExchange',
      'totalStats',
      'isActive',
      'conversationHistory'
    ]);
    
    // Récupérer le dernier échange (input actuel)
    const lastExchange = result.lastExchange || null;
    
    // Calculer les stats cumulées depuis l'historique
    const history = result.conversationHistory || [];
    let cumulativeStats = {
      requests: history.length,
      promptTokens: 0,
      responseTokens: 0,
      energyJoules: 0,
      co2Grams: 0
    };
    
    history.forEach(exchange => {
      cumulativeStats.promptTokens += exchange.prompt_token_length || exchange.promptTokens || 0;
      cumulativeStats.responseTokens += exchange.response_token_length || exchange.responseTokens || 0;
      cumulativeStats.energyJoules += exchange.energyJoules || 0;
      cumulativeStats.co2Grams += exchange.co2Grams || 0;
    });
    
    // Utiliser totalStats si disponible (plus précis)
    const totalStats = result.totalStats || {
      requests: cumulativeStats.requests,
      tokens: cumulativeStats.promptTokens + cumulativeStats.responseTokens,
      co2Grams: cumulativeStats.co2Grams
    };
    
    const isActive = result.isActive || false;
    
    // Mettre à jour le statut
    const statusEl = document.getElementById('status');
    if (isActive) {
      statusEl.className = 'status active';
      statusEl.textContent = '✅ Conversation active détectée';
    } else {
      statusEl.className = 'status inactive';
      statusEl.textContent = '⚠️ Aucune conversation détectée';
    }
    
    // Input actuel (dernier échange)
    if (lastExchange) {
      document.getElementById('current-prompt-tokens').textContent = (lastExchange.prompt_token_length || lastExchange.promptTokens || 0).toLocaleString();
      document.getElementById('current-response-tokens').textContent = (lastExchange.response_token_length || lastExchange.responseTokens || 0).toLocaleString();
      document.getElementById('current-energy').textContent = (lastExchange.energyJoules || 0).toFixed(6);
      document.getElementById('current-co2').textContent = formatCO2(lastExchange.co2Grams || 0);
      
      // Afficher la source de prédiction
      const predictionSource = lastExchange.predictionSource || 'local';
      const sourceText = predictionSource === 'watsonx' || predictionSource === 'deployed' ? '🤖 Watsonx' : 
                         predictionSource === 'local' ? '💻 Local' : 
                         predictionSource === 'server' ? '🖥️ Serveur' : '💻 Local';
      document.getElementById('current-prediction-source').textContent = sourceText;
    } else {
      document.getElementById('current-prompt-tokens').textContent = '0';
      document.getElementById('current-response-tokens').textContent = '0';
      document.getElementById('current-energy').textContent = '0.000000';
      document.getElementById('current-co2').textContent = '0.0000';
      document.getElementById('current-prediction-source').textContent = '-';
    }
    
    // Total cumulé
    document.getElementById('total-requests').textContent = totalStats.requests.toLocaleString();
    document.getElementById('total-tokens').textContent = totalStats.tokens.toLocaleString();
    document.getElementById('total-co2').textContent = formatCO2(totalStats.co2Grams);
    
    // Équivalence
    updateEquivalence(totalStats.co2Grams);
    
    // Envoyer les deux au modèle pour comparaison si on a des données
    if (lastExchange && history.length > 0) {
      await sendComparisonToModel(lastExchange, cumulativeStats);
    }
    
  } catch (error) {
    console.error('Erreur de chargement des stats:', error);
  }
}

/**
 * Envoyer l'input actuel et le cumulé au modèle pour comparaison
 */
async function sendComparisonToModel(lastExchange, cumulativeStats) {
  try {
    // Envoyer la demande de comparaison au background script
    // Le background a accès à WatsonxService
    const response = await chrome.runtime.sendMessage({
      type: 'COMPARE_PREDICTIONS',
      data: {
        lastExchange: lastExchange,
        cumulativeStats: cumulativeStats
      }
    });
    
    if (response && response.success) {
      console.log('📊 Comparaison effectuée:', {
        currentPrediction: response.currentPrediction,
        cumulativePrediction: response.cumulativePrediction,
        difference: response.difference,
        percentDiff: response.percentDiff
      });
    } else {
      console.log('⚠️ Comparaison non disponible:', response?.error || 'Service non disponible');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la comparaison:', error);
  }
}

/**
 * Formater le CO₂ pour l'affichage (gère les très petites valeurs)
 */
function formatCO2(co2Grams) {
  if (co2Grams === 0 || isNaN(co2Grams)) {
    return '0.0000';
  }
  
  // Si très petit (< 0.0001), utiliser la notation scientifique
  if (co2Grams < 0.0001) {
    return co2Grams.toExponential(2);
  }
  
  // Sinon, afficher avec 4 décimales
  return co2Grams.toFixed(4);
}

/**
 * Mettre à jour l'équivalence CO₂
 */
function updateEquivalence(co2Grams) {
  const equivalenceEl = document.getElementById('equivalence');
  
  // Seuils ajustés pour les très petites valeurs
  if (co2Grams < 0.00001) {
    equivalenceEl.textContent = '-';
    return;
  }
  
  // Équivalences approximatives (ajustées pour les très petites valeurs)
  const co2Mg = co2Grams * 1000; // Convertir en milligrammes
  
  if (co2Grams < 0.0001) {
    // Très petit : en microgrammes ou notation scientifique
    const microGrams = (co2Grams * 1000000).toFixed(2);
    equivalenceEl.textContent = `${microGrams} µg CO₂`;
  } else if (co2Grams < 0.001) {
    // Moins d'1mg : en secondes de respiration
    const breathingSeconds = (co2Grams * 1000 / (0.2 / 60)).toFixed(0); // ~0.2g/min = 0.0033g/sec
    equivalenceEl.textContent = `${breathingSeconds} sec de respiration`;
  } else if (co2Grams < 0.01) {
    // Moins de 10mg : en milligrammes
    const mg = (co2Grams * 1000).toFixed(2);
    equivalenceEl.textContent = `${mg} mg CO₂`;
  } else if (co2Grams < 0.1) {
    // Moins de 100mg : en recherches Google
    const googleSearches = (co2Grams / 0.2).toFixed(1); // ~0.2g CO2/recherche
    equivalenceEl.textContent = `${googleSearches} recherches Google`;
  } else if (co2Grams < 1) {
    // Moins d'1g : en emails
    const emails = (co2Grams / 4).toFixed(0); // ~4g CO2/email
    equivalenceEl.textContent = `${emails} emails envoyés`;
  } else if (co2Grams < 10) {
    // Moins de 10g : en km en voiture
    const carKm = (co2Grams / 0.12).toFixed(2); // ~120g CO2/km
    equivalenceEl.textContent = `${carKm} km en voiture`;
  } else {
    // Plus de 10g : en arbres nécessaires
    const co2Kg = co2Grams / 1000;
    const trees = (co2Kg / 21).toFixed(2); // 1 arbre absorbe ~21kg CO2/an
    equivalenceEl.textContent = `${trees} arbres/an nécessaires`;
  }
}

/**
 * Configurer les event listeners
 */
function setupEventListeners() {
  // Bouton dashboard
  const dashboardBtn = document.getElementById('dashboard-btn');
  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }
  // Changement de pays
  document.getElementById('country-select').addEventListener('change', async (e) => {
    currentCountry = e.target.value;
    
    // Sauvegarder la préférence
    await chrome.storage.local.set({ selectedCountry: currentCountry });
    
    // Recalculer les stats avec le nouveau mix énergétique
    await recalculateStats();
    
    // Recharger les stats
    await loadStats();
  });
  
  // Bouton scan
  const scanBtn = document.getElementById('scan-btn');
  if (scanBtn) {
    scanBtn.addEventListener('click', async () => {
      scanBtn.disabled = true;
      scanBtn.textContent = '⏳ Scan en cours...';
      
      try {
        // Obtenir l'onglet actif
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
          alert('⚠️ Impossible d\'accéder à l\'onglet actif');
          scanBtn.disabled = false;
          scanBtn.textContent = '🔍 Scanner la conversation actuelle';
          return;
        }
        
        // Vérifier que l'onglet est sur une page supportée
        const supportedDomains = ['chatgpt.com', 'claude.ai', 'gemini.google.com'];
        const isSupported = supportedDomains.some(domain => tab.url && tab.url.includes(domain));
        
        if (!isSupported) {
          alert('⚠️ Cette page n\'est pas supportée. Veuillez ouvrir ChatGPT, Claude ou Gemini.');
          scanBtn.disabled = false;
          scanBtn.textContent = '🔍 Scanner la conversation actuelle';
          return;
        }
        
        // Essayer d'envoyer le message directement
        // Ne pas injecter manuellement car le manifest injecte déjà le script automatiquement
        // Si ça échoue, c'est que la page n'est pas supportée ou pas chargée
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: 'SCAN_CONVERSATION'
        });
        
        if (response && response.success) {
          const scannedCount = response.scanned || 0;
          if (scannedCount > 0) {
            scanBtn.textContent = `✅ ${scannedCount} message(s) scanné(s)`;
          } else {
            scanBtn.textContent = '✅ Scan terminé';
          }
          // Recharger les stats après un court délai
          setTimeout(async () => {
            await loadStats();
            scanBtn.disabled = false;
            scanBtn.textContent = '🔍 Scanner la conversation actuelle';
          }, 2000);
        } else {
          alert('⚠️ ' + (response?.error || 'Impossible de scanner la conversation. Assurez-vous d\'être sur ChatGPT, Claude ou Gemini.'));
          scanBtn.disabled = false;
          scanBtn.textContent = '🔍 Scanner la conversation actuelle';
        }
      } catch (error) {
        console.error('Erreur scan:', error);
        alert('⚠️ Erreur lors du scan: ' + error.message + '\n\nAssurez-vous d\'être sur une page ChatGPT, Claude ou Gemini et que la page est complètement chargée.');
        scanBtn.disabled = false;
        scanBtn.textContent = '🔍 Scanner la conversation actuelle';
      }
    });
  }
  
  // Bouton reset
  document.getElementById('reset-btn').addEventListener('click', async () => {
    if (confirm('Voulez-vous vraiment réinitialiser toutes les statistiques ? (Input actuel + Total cumulé)')) {
      // Envoyer un message au background pour réinitialiser TOUT
      await chrome.runtime.sendMessage({
        type: 'RESET_ALL_STATS'
      });
      
      await loadStats();
    }
  });
}

/**
 * Recalculer les statistiques avec le nouveau mix énergétique
 */
async function recalculateStats() {
  try {
    const result = await chrome.storage.local.get(['conversationHistory']);
    const history = result.conversationHistory || [];
    
    if (history.length === 0) return;
    
    // Obtenir l'intensité carbone
    const intensity = carbonIntensityData.countries[currentCountry]?.intensity || 480;
    
    // Recalculer toutes les entrées
    let totalCO2 = 0;
    
    for (const entry of history) {
      // Convertir l'énergie en CO₂ avec le nouveau mix
      const energyKwh = entry.energyJoules / 3600000;
      const co2Grams = energyKwh * intensity;
      totalCO2 += co2Grams;
    }
    
    // Mettre à jour les stats
    const currentResult = await chrome.storage.local.get(['currentSession', 'totalStats']);
    
    if (currentResult.currentSession) {
      const energyKwh = currentResult.currentSession.energyJoules / 3600000;
      currentResult.currentSession.co2Grams = energyKwh * intensity;
    }
    
    if (currentResult.totalStats) {
      currentResult.totalStats.co2Grams = totalCO2;
    }
    
    await chrome.storage.local.set({
      currentSession: currentResult.currentSession,
      totalStats: currentResult.totalStats
    });
    
  } catch (error) {
    console.error('Erreur de recalcul:', error);
  }
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', init);
