require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.use(express.json());

// Settings come from environment variables so nothing private lives in the code.
const PIN = process.env.APP_PIN || '';                                   // shared passcode (optional but recommended)
const PEOPLE = (process.env.PEOPLE || 'Me,Friend').split(',').map(s => s.trim());
const dbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
const pool = mysql.createPool(
  dbUrl
    ? { uri: dbUrl, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined }
    : { host: 'localhost', user: 'root', password: '', database: 'roommate_split' }
);

async function init() {
  await pool.query(`CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    spent_on DATE NOT NULL,
    paid_by VARCHAR(60) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description VARCHAR(200) NOT NULL,
    category VARCHAR(40) NOT NULL DEFAULT 'Other',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
}

// Public: tells the page who the roommates are and whether a PIN is needed.
app.get('/api/config', (req, res) => res.json({ people: PEOPLE, pinRequired: !!PIN }));

// Everything below needs the PIN (if one is set).
app.use('/api', (req, res, next) => {
  if (PIN && req.get('x-pin') !== PIN) return res.status(401).json({ error: 'Wrong PIN' });
  next();
});

app.get('/api/expenses', async (req, res) => {
  const [rows] = await pool.query("SELECT id, DATE_FORMAT(spent_on, '%Y-%m-%d') AS spent_on, paid_by, amount, description, category FROM expenses ORDER BY spent_on DESC, id DESC");
  res.json(rows.map(r => ({ ...r, amount: Number(r.amount) })));
});

app.post('/api/expenses', async (req, res) => {
  const { spent_on, paid_by, amount, description, category } = req.body;
  if (!PEOPLE.includes(paid_by) || !(Number(amount) > 0) || !description || !spent_on)
    return res.status(400).json({ error: 'Please fill date, payer, amount and description.' });
  await pool.query('INSERT INTO expenses (spent_on, paid_by, amount, description, category) VALUES (?,?,?,?,?)',
    [spent_on, paid_by, Number(amount), String(description).slice(0, 200), category || 'Other']);
  res.status(201).json({ ok: true });
});

app.delete('/api/expenses/:id', async (req, res) => {
  await pool.query('DELETE FROM expenses WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

app.use(express.static(path.join(__dirname, 'public')));

init().then(() => app.listen(process.env.PORT || 3000, () => console.log('Running on port ' + (process.env.PORT || 3000))))
  .catch(e => { console.error('Database error:', e.message); process.exit(1); });