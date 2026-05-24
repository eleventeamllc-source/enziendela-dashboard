const express = require('express');
const cors    = require('cors');
const fetch   = require('node-fetch');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/payouts', async (req, res) => {
  const apiKey = process.env.MERCURY_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key no configurada' });

  try {
    const accountsRes = await fetch('https://api.mercury.com/api/v1/accounts', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!accountsRes.ok) {
      return res.status(accountsRes.status).json({ error: 'Error autenticando con Mercury' });
    }

    const accountsData = await accountsRes.json();
    const accounts = accountsData.accounts || [];

    const desde = new Date();
    desde.setDate(desde.getDate() - 15);
    const desdeStr = desde.toISOString().split('T')[0];

    let todosLosPayouts = [];

    for (const account of accounts) {
      const txRes = await fetch(
        `https://api.mercury.com/api/v1/account/${account.id}/transactions?start=${desdeStr}&limit=500`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!txRes.ok) continue;

      const txData = await txRes.json();
      const transactions = txData.transactions || [];

      const PAYOUT_KEYWORDS = ['shopify', 'enziendela sp', 'bppr', 'flexicuenta'];

      const payouts = transactions
        .filter(tx => {
          const nombre = (tx.counterpartyName || tx.externalMemo || tx.note || '').toLowerCase();
          const esEntrada = tx.amount > 0;
          const esPayout  = PAYOUT_KEYWORDS.some(kw => nombre.includes(kw));
          return esEntrada && esPayout;
        })
        .map(tx => ({
          id:          tx.id,
          fecha:       tx.postedAt || tx.createdAt,
          monto:       tx.amount,
          descripcion: tx.counterpartyName || tx.externalMemo || tx.note || 'Shopify Payout',
          cuenta:      account.name || account.id,
          metodo:      tx.kind || 'ACH'
        }));

      todosLosPayouts = [...todosLosPayouts, ...payouts];
    }

    todosLosPayouts.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    res.json({ payouts: todosLosPayouts, total: todosLosPayouts.length });

  } catch (err) {
    console.error('Error Mercury API:', err);
    res.status(500).json({ error: 'Error conectando con Mercury', detalle: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Enziendela Dashboard corriendo en puerto ${PORT}`);
});
