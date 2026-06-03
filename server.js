const express = require('express');
const cors    = require('cors');
const fetch   = require('node-fetch');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

    const CUENTA_PAYOUT = '202481174037';
    const cuentasFiltradas = accounts
      .filter(a => {
        const num = (a.accountNumber || a.routingInfo?.accountNumber || a.id || '').toString();
        return num.includes(CUENTA_PAYOUT);
      })
      .map(a => ({
        id:      a.id,
        nombre:  a.name || a.nickname || 'Cuenta Payout',
        balance: a.availableBalance ?? a.currentBalance ?? 0,
        tipo:    a.type || 'checking'
      }));

    const cuentas = cuentasFiltradas.length > 0 ? cuentasFiltradas : accounts.slice(0, 1).map(a => ({
      id:      a.id,
      nombre:  a.name || a.nickname || 'Cuenta Payout',
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
