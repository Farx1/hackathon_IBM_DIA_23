/**
 * Dashboard Enhancements - Nouvelles fonctionnalités
 * Prédictions long terme, conseils, et comparaisons par paliers
 */

/**
 * Générer des conseils basés sur la consommation
 */
function generateAdvice(totalEnergyKwh, monthlyEnergyKwh, annualEnergyKwh, totalCO2kg) {
  const adviceSection = document.getElementById('advice-section');
  const adviceContent = document.getElementById('advice-content');
  if (!adviceSection || !adviceContent) return;
  
  const advice = [];
  
  // Déterminer le palier de l'utilisateur
  let userTier = 'personne_normale';
  if (monthlyEnergyKwh >= REFERENCE_TIERS.power_user.monthly_kWh) {
    userTier = 'power_user';
  } else if (monthlyEnergyKwh >= REFERENCE_TIERS.entreprise.monthly_kWh) {
    userTier = 'entreprise';
  } else if (monthlyEnergyKwh >= REFERENCE_TIERS.developpeur.monthly_kWh) {
    userTier = 'developpeur';
  }
  
  const currentTier = REFERENCE_TIERS[userTier];
  
  // Conseils généraux
  if (monthlyEnergyKwh < REFERENCE_TIERS.developpeur.monthly_kWh) {
    advice.push({
      type: 'success',
      icon: '✅',
      title: 'Consommation modérée',
      message: `Votre consommation (${monthlyEnergyKwh.toFixed(2)} kWh/mois) est en dessous de la moyenne des développeurs. Vous pouvez continuer à utiliser l'IA sans problème.`
    });
  } else if (monthlyEnergyKwh < REFERENCE_TIERS.entreprise.monthly_kWh) {
    advice.push({
      type: 'info',
      icon: 'ℹ️',
      title: 'Consommation dans la moyenne',
      message: `Votre consommation (${monthlyEnergyKwh.toFixed(2)} kWh/mois) correspond à celle d'un développeur actif. C'est normal pour un usage professionnel régulier.`
    });
  } else {
    advice.push({
      type: 'warning',
      icon: '⚠️',
      title: 'Consommation élevée',
      message: `Votre consommation (${monthlyEnergyKwh.toFixed(2)} kWh/mois) est élevée. Considérez optimiser vos requêtes ou réduire la fréquence d'utilisation.`
    });
  }
  
  // Conseils spécifiques
  if (annualEnergyKwh > 50) {
    advice.push({
      type: 'warning',
      icon: '💡',
      title: 'Optimisation recommandée',
      message: `Avec ${annualEnergyKwh.toFixed(1)} kWh/an prévus, pensez à : utiliser des modèles plus efficaces, regrouper vos requêtes, ou utiliser des réponses plus courtes quand possible.`
    });
  }
  
  if (totalCO2kg > 10) {
    advice.push({
      type: 'info',
      icon: '🌱',
      title: 'Impact environnemental',
      message: `Votre empreinte carbone prévue est de ${(annualEnergyKwh * 0.48).toFixed(2)} kg CO₂/an. Pour compenser, plantez ~${Math.ceil(annualEnergyKwh * 0.48 / 20)} arbres ou utilisez des mix énergétiques plus propres (ex: France, Suède).`
    });
  }
  
  // Afficher les conseils
  adviceContent.innerHTML = advice.map(a => `
    <div style="padding: 15px; margin-bottom: 15px; border-left: 4px solid ${a.type === 'success' ? '#4CAF50' : a.type === 'warning' ? '#FF9800' : '#2196F3'}; background: #f8f9fa; border-radius: 4px;">
      <div style="font-weight: 600; margin-bottom: 5px;">${a.icon} ${a.title}</div>
      <div style="color: #666; font-size: 14px;">${a.message}</div>
    </div>
  `).join('');
  
  adviceSection.style.display = 'block';
}

/**
 * Charger le graphique d'évolution de la consommation
 */
function loadConsumptionTrendChart() {
  const ctx = document.getElementById('chart-consumption-trend');
  if (!ctx || !datasetData || datasetData.length === 0) return;
  
  // Grouper par jour
  const byDay = {};
  datasetData.forEach(row => {
    const date = new Date(row.timestamp || Date.now());
    const dayKey = date.toISOString().split('T')[0];
    if (!byDay[dayKey]) {
      byDay[dayKey] = { energy: 0, count: 0 };
    }
    byDay[dayKey].energy += parseFloat(row.energy_consumption_llm_total) || 0;
    byDay[dayKey].count++;
  });
  
  const sortedDays = Object.keys(byDay).sort();
  const labels = sortedDays.map(d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));
  const data = sortedDays.map(d => (byDay[d].energy / 3600000).toFixed(4)); // Convertir en kWh
  
  if (charts['consumption-trend']) {
    charts['consumption-trend'].destroy();
  }
  
  charts['consumption-trend'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Énergie (kWh)',
        data: data,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Énergie (kWh)'
          }
        }
      }
    }
  });
}

/**
 * Charger le graphique de prédiction long terme
 */
function loadLongTermPredictionChart(monthlyEnergyKwh) {
  const ctx = document.getElementById('chart-long-term-prediction');
  if (!ctx) return;
  
  const months = [];
  const predicted = [];
  const currentMonth = new Date();
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + i, 1);
    months.push(date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }));
    predicted.push(monthlyEnergyKwh);
  }
  
  if (charts['long-term-prediction']) {
    charts['long-term-prediction'].destroy();
  }
  
  charts['long-term-prediction'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [{
        label: 'Prédiction (kWh)',
        data: predicted,
        backgroundColor: 'rgba(102, 126, 234, 0.8)',
        borderColor: '#667eea',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Énergie (kWh)'
          }
        }
      }
    }
  });
}

/**
 * Charger le graphique de comparaison avec les références
 */
function loadReferenceComparisonChart(monthlyEnergyKwh) {
  const ctx = document.getElementById('chart-reference-comparison');
  if (!ctx) return;
  
  const tiers = Object.values(REFERENCE_TIERS);
  const labels = tiers.map(t => t.name);
  const referenceData = tiers.map(t => t.monthly_kWh);
  const userData = new Array(tiers.length).fill(monthlyEnergyKwh);
  
  if (charts['reference-comparison']) {
    charts['reference-comparison'].destroy();
  }
  
  charts['reference-comparison'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Votre consommation',
          data: userData,
          backgroundColor: 'rgba(102, 126, 234, 0.8)',
          borderColor: '#667eea',
          borderWidth: 1
        },
        {
          label: 'Moyennes de référence',
          data: referenceData,
          backgroundColor: 'rgba(200, 200, 200, 0.6)',
          borderColor: '#999',
          borderWidth: 1,
          borderDash: [5, 5]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Énergie (kWh/mois)'
          }
        }
      }
    }
  });
}

/**
 * Charger la comparaison des derniers prompts
 */
async function loadRecentPromptsComparison() {
  try {
    const loading = document.getElementById('compare-loading');
    const empty = document.getElementById('compare-empty');
    const results = document.getElementById('compare-results');
    
    if (loading) loading.style.display = 'block';
    if (empty) empty.style.display = 'none';
    if (results) results.style.display = 'none';
    
    // Charger les données locales
    const data = await loadLocalDatasetData();
    
    if (!data || data.length < 3) {
      if (loading) loading.style.display = 'none';
      if (empty) empty.style.display = 'block';
      return;
    }
    
    // Prendre les 4 derniers échanges
    const recentExchanges = data
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 4);
    
    // Afficher les résultats
    displayRecentPromptsComparison(recentExchanges);
    
    if (loading) loading.style.display = 'none';
    if (results) results.style.display = 'block';
  } catch (error) {
    console.error('Erreur chargement comparaison prompts:', error);
    const loading = document.getElementById('compare-loading');
    if (loading) {
      loading.innerHTML = `<div style="padding: 20px; color: red;">Erreur: ${error.message}</div>`;
      loading.style.display = 'block';
    }
  }
}

/**
 * Afficher la comparaison des derniers prompts
 */
function displayRecentPromptsComparison(exchanges) {
  const statsGrid = document.getElementById('compare-stats');
  const compareGrid = document.getElementById('compare-grid');
  const chartCanvas = document.getElementById('chart-compare-metrics');
  
  if (!statsGrid || !compareGrid) return;
  
  // Calculer les stats globales
  const totalEnergy = exchanges.reduce((sum, e) => sum + (parseFloat(e.energy_consumption_llm_total) || 0), 0);
  const totalTokens = exchanges.reduce((sum, e) => sum + (parseInt(e.prompt_token_length || 0) + parseInt(e.response_token_length || 0)), 0);
  const avgEnergy = totalEnergy / exchanges.length / 3600000; // en kWh
  
  statsGrid.innerHTML = `
    <div class="stat-card">
      <h3>Nombre de Prompts</h3>
      <div class="value">${exchanges.length}</div>
    </div>
    <div class="stat-card">
      <h3>Énergie Moyenne</h3>
      <div class="value">${avgEnergy.toFixed(4)}</div>
      <span class="unit">kWh</span>
    </div>
    <div class="stat-card">
      <h3>Total Tokens</h3>
      <div class="value">${totalTokens.toLocaleString()}</div>
    </div>
  `;
  
  // Afficher chaque prompt
  compareGrid.innerHTML = exchanges.map((exchange, index) => {
    const energy = parseFloat(exchange.energy_consumption_llm_total) || 0;
    const energyKwh = energy / 3600000;
    const tokens = parseInt(exchange.prompt_token_length || 0) + parseInt(exchange.response_token_length || 0);
    const date = new Date(exchange.timestamp || Date.now());
    
    return `
      <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h4 style="margin-bottom: 15px;">Prompt #${exchanges.length - index}</h4>
        <div style="margin-bottom: 10px;">
          <strong>Date:</strong> ${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div style="margin-bottom: 10px;">
          <strong>Plateforme:</strong> ${exchange.platform || 'Unknown'}
        </div>
        <div style="margin-bottom: 10px;">
          <strong>Tokens:</strong> ${tokens.toLocaleString()}
        </div>
        <div style="margin-bottom: 10px;">
          <strong>Énergie:</strong> ${energyKwh.toFixed(4)} kWh
        </div>
        <div>
          <strong>CO₂:</strong> ${((energyKwh * 480) / 1000).toFixed(4)} kg
        </div>
      </div>
    `;
  }).join('');
  
  // Créer le graphique de comparaison
  if (chartCanvas) {
    const labels = exchanges.map((_, i) => `Prompt #${exchanges.length - i}`);
    const energyData = exchanges.map(e => (parseFloat(e.energy_consumption_llm_total) || 0) / 3600000);
    const tokensData = exchanges.map(e => parseInt(e.prompt_token_length || 0) + parseInt(e.response_token_length || 0));
    
    if (charts['compare-metrics']) {
      charts['compare-metrics'].destroy();
    }
    
    charts['compare-metrics'] = new Chart(chartCanvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Énergie (kWh)',
            data: energyData,
            backgroundColor: 'rgba(102, 126, 234, 0.8)',
            yAxisID: 'y'
          },
          {
            label: 'Tokens',
            data: tokensData,
            backgroundColor: 'rgba(118, 75, 162, 0.8)',
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Énergie (kWh)'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Tokens'
            },
            grid: {
              drawOnChartArea: false
            }
          }
        }
      }
    });
  }
}

/**
 * Charger la comparaison énergétique avec les paliers
 */
async function loadEnergyComparisonNew() {
  try {
    const loading = document.getElementById('energy-loading');
    const empty = document.getElementById('energy-empty');
    const results = document.getElementById('energy-comparison-results');
    
    if (loading) loading.style.display = 'block';
    if (empty) empty.style.display = 'none';
    if (results) results.style.display = 'none';
    
    // Charger les données locales
    const data = await loadLocalDatasetData();
    
    if (!data || data.length === 0) {
      if (loading) loading.style.display = 'none';
      if (empty) empty.style.display = 'block';
      return;
    }
    
    // Calculer la consommation mensuelle
    const totalEnergyJoules = data.reduce((sum, e) => sum + (parseFloat(e.energy_consumption_llm_total) || 0), 0);
    const totalEnergyKwh = totalEnergyJoules / 3600000;
    
    const timestamps = data.map(d => d.timestamp || Date.now()).filter(Boolean);
    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);
    const daysDiff = Math.max(1, (maxTimestamp - minTimestamp) / (1000 * 60 * 60 * 24));
    const monthlyEnergyKwh = (totalEnergyKwh / daysDiff) * 30;
    
    // Obtenir le mix énergétique sélectionné
    const mixSelect = document.getElementById('filter-energy-mix');
    const selectedMix = mixSelect ? mixSelect.value : 'global_average';
    const intensity = carbonIntensityData?.countries?.[selectedMix]?.intensity || 480;
    
    // Créer les graphiques
    createEnergyComparisonChart(monthlyEnergyKwh);
    createCO2PaliersChart(monthlyEnergyKwh, intensity);
    displayPaliersDetails(monthlyEnergyKwh, intensity);
    
    if (loading) loading.style.display = 'none';
    if (results) results.style.display = 'block';
  } catch (error) {
    console.error('Erreur chargement comparaison énergétique:', error);
    const loading = document.getElementById('energy-loading');
    if (loading) {
      loading.innerHTML = `<div style="padding: 20px; color: red;">Erreur: ${error.message}</div>`;
      loading.style.display = 'block';
    }
  }
}

/**
 * Créer le graphique de comparaison énergétique
 */
function createEnergyComparisonChart(monthlyEnergyKwh) {
  const ctx = document.getElementById('chart-energy-comparison');
  if (!ctx) return;
  
  const tiers = Object.values(REFERENCE_TIERS);
  const labels = tiers.map(t => t.name);
  const referenceData = tiers.map(t => t.monthly_kWh);
  const userData = new Array(tiers.length).fill(monthlyEnergyKwh);
  
  if (charts['energy-comparison']) {
    charts['energy-comparison'].destroy();
  }
  
  charts['energy-comparison'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Votre consommation',
          data: userData,
          backgroundColor: 'rgba(102, 126, 234, 0.8)',
          borderColor: '#667eea',
          borderWidth: 1
        },
        {
          label: 'Moyennes de référence',
          data: referenceData,
          backgroundColor: 'rgba(200, 200, 200, 0.6)',
          borderColor: '#999',
          borderWidth: 1,
          borderDash: [5, 5]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Énergie (kWh/mois)'
          }
        }
      }
    }
  });
}

/**
 * Créer le graphique CO₂ par paliers
 */
function createCO2PaliersChart(monthlyEnergyKwh, intensity) {
  const ctx = document.getElementById('chart-co2-paliers');
  if (!ctx) return;
  
  const tiers = Object.values(REFERENCE_TIERS);
  const labels = tiers.map(t => t.name);
  const referenceCO2 = tiers.map(t => (t.monthly_kWh * intensity) / 1000); // en kg
  const userCO2 = new Array(tiers.length).fill((monthlyEnergyKwh * intensity) / 1000);
  
  if (charts['co2-paliers']) {
    charts['co2-paliers'].destroy();
  }
  
  charts['co2-paliers'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Votre CO₂',
          data: userCO2,
          backgroundColor: 'rgba(255, 99, 132, 0.8)',
          borderColor: '#F44336',
          borderWidth: 1
        },
        {
          label: 'CO₂ de référence',
          data: referenceCO2,
          backgroundColor: 'rgba(200, 200, 200, 0.6)',
          borderColor: '#999',
          borderWidth: 1,
          borderDash: [5, 5]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'CO₂ (kg/mois)'
          }
        }
      }
    }
  });
}

/**
 * Afficher les détails des paliers
 */
function displayPaliersDetails(monthlyEnergyKwh, intensity) {
  const detailsEl = document.getElementById('paliers-details');
  if (!detailsEl) return;
  
  const tiers = Object.values(REFERENCE_TIERS);
  const userTier = tiers.find(t => monthlyEnergyKwh <= t.monthly_kWh) || tiers[tiers.length - 1];
  
  detailsEl.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
      ${tiers.map(tier => {
        const isUserTier = tier === userTier;
        const diff = monthlyEnergyKwh - tier.monthly_kWh;
        const diffPercent = tier.monthly_kWh > 0 ? ((diff / tier.monthly_kWh) * 100).toFixed(1) : 0;
        
        return `
          <div style="padding: 15px; border-radius: 8px; border: 2px solid ${isUserTier ? tier.color : '#ddd'}; background: ${isUserTier ? tier.color + '15' : '#f8f9fa'};">
            <div style="font-weight: 600; margin-bottom: 8px; color: ${tier.color};">${tier.name}</div>
            <div style="font-size: 12px; color: #666; margin-bottom: 10px;">${tier.description}</div>
            <div style="margin-bottom: 5px;"><strong>Référence:</strong> ${tier.monthly_kWh} kWh/mois</div>
            <div style="margin-bottom: 5px;"><strong>CO₂:</strong> ${((tier.monthly_kWh * intensity) / 1000).toFixed(3)} kg/mois</div>
            ${isUserTier ? `<div style="margin-top: 10px; padding: 8px; background: ${tier.color}; color: white; border-radius: 4px; font-size: 12px; text-align: center;">Votre palier actuel</div>` : ''}
            ${!isUserTier ? `<div style="margin-top: 5px; font-size: 11px; color: #666;">Différence: ${diff > 0 ? '+' : ''}${diff.toFixed(2)} kWh (${diffPercent > 0 ? '+' : ''}${diffPercent}%)</div>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Ajouter les event listeners au chargement
document.addEventListener('DOMContentLoaded', () => {
  const btnLoadRecent = document.getElementById('btn-load-recent-prompts');
  if (btnLoadRecent) {
    btnLoadRecent.addEventListener('click', loadRecentPromptsComparison);
  }
  
  const btnLoadEnergy = document.getElementById('btn-load-energy-comparison');
  if (btnLoadEnergy) {
    btnLoadEnergy.addEventListener('click', loadEnergyComparisonNew);
  }
});

