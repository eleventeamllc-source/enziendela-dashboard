const express = require('express');
const cors    = require('cors');
const fetch   = require('node-fetch');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Balance de la cuenta operacional
app.get('/api/balance', async (req, res) => {
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

    const cuentas = accounts.map(a => ({
      id:      a.id,
      nombre:  a.name || a.nickname || 'Cuenta operacional',
      balance: a.availableBalance ?? a.currentBalance ?? 0,
      tipo:    a.type || 'checking'
    }));

    res.json({ cuentas });

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
