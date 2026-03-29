
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { montantCentimes, ref, nom, email, depart, arrivee } = JSON.parse(event.body);
    if (!montantCentimes || montantCentimes < 2000)
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Montant invalide (minimum 20€)' }) };

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Clé Stripe manquante' }) };

    const successUrl = 'https://www.iovers.fr/reservation?paiement=succes&ref=' + encodeURIComponent(ref);
    const cancelUrl  = 'https://www.iovers.fr/reservation?paiement=annule&ref='  + encodeURIComponent(ref);

    const params = new URLSearchParams({
      'payment_method_types[]':                               'card',
      'line_items[0][price_data][currency]':                  'eur',
      'line_items[0][price_data][unit_amount]':               String(montantCentimes),
      'line_items[0][price_data][product_data][name]':        'Course VTC iovers Mobility',
      'line_items[0][price_data][product_data][description]': depart + ' → ' + arrivee,
      'line_items[0][quantity]':                              '1',
      'mode':                                                 'payment',
      'customer_email':                                       email,
      'success_url':                                          successUrl,
      'cancel_url':                                           cancelUrl,
      'metadata[ref]':                                        ref,
      'metadata[client]':                                     nom,
      'locale':                                               'fr',
      'automatic_tax[enabled]':                               'false',
    });

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + secretKey, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const session = await response.json();
    if (session.error) {
      console.error('[stripe]', session.error.message);
      return { statusCode: 400, headers, body: JSON.stringify({ error: session.error.message }) };
    }

    console.log('[stripe] Session:', session.id, '| Montant:', montantCentimes/100, '€');
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, url: session.url, sessionId: session.id }) };

  } catch (err) {
    console.error('[stripe] Erreur:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
