// netlify/functions/get-position.js
// Retourne la dernière position GPS du chauffeur

// Stockage simple en mémoire (persiste tant que la fonction est chaude)
// Pour production : remplacer par une base de données (Supabase, FaunaDB, etc.)
let lastPosition = null;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  // POST — sauvegarder une position (envoyée par le panneau conducteur)
  if (event.httpMethod === 'POST') {
    try {
      const { lat, lng, ts } = JSON.parse(event.body);
      if (!lat || !lng) return { statusCode: 400, headers, body: JSON.stringify({ error: 'lat/lng requis' }) };
      lastPosition = { lat, lng, ts: ts || Date.now(), updated: new Date().toISOString() };
      console.log('[GPS] Position sauvegardée:', lat, lng);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch(e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  // GET — récupérer la dernière position
  if (lastPosition) {
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, ...lastPosition }) };
  }
  return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: 'Aucune position disponible' }) };
};
