require('dotenv').config(); // Load environment variables
const port = process.env.PORT || 3000; // Use PORT from .env or default to 3000
const dbPath = process.env.DATABASE_URL; // Use DATABASE_URL from .env

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error(err.message);
  console.log('Connected to SQLite database.');
});

// Database initialization
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS terms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    term TEXT NOT NULL,
    definition TEXT NOT NULL,
    letter TEXT NOT NULL
  )`);
});

app.use(express.static('public'));
app.set('view engine', 'ejs');

// Daily term generator (persistent through all routes)
function getDailyTerm(callback) {
  const today = new Date();
  const seed = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

  db.get(
    `SELECT * FROM terms
     ORDER BY ABS(CAST(substr(term,1,1) AS INTEGER) - ?)
     LIMIT 1`,
    [seed],
    (err, term) => {
      callback(err, term);
    }
  );
}

// Common render function
function renderView(res, termsPromise, activeLetter = 'all', searchQuery = '') {
  getDailyTerm((err, dailyTerm) => {
    termsPromise.then(terms => {
      const groupedTerms = terms.reduce((acc, term) => {
        const letter = term.letter;
        acc[letter] = acc[letter] || [];
        acc[letter].push(term);
        return acc;
      }, {});

      res.render('index', {
        groupedTerms,
        activeLetter,
        searchQuery,
        dailyTerm
      });
    }).catch(err => {
      console.error(err);
      res.status(500).send('Server error');
    });
  });
}

// Routes
app.get('/', (req, res) => {
  renderView(res, new Promise((resolve, reject) => {
    db.all('SELECT * FROM terms', (err, terms) => {
      if (err) reject(err);
      else resolve(terms);
    });
  }));
});

app.get('/letter/:letter', (req, res) => {
  const letter = req.params.letter;
  renderView(res, new Promise((resolve, reject) => {
    db.all('SELECT * FROM terms WHERE letter = ?', [letter], (err, terms) => {
      if (err) reject(err);
      else resolve(terms);
    });
  }), letter);
});

app.get('/search', (req, res) => {
  const query = req.query.q.toLowerCase();
  renderView(res, new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM terms
       WHERE LOWER(term) LIKE '%' || ? || '%'
       OR LOWER(definition) LIKE '%' || ? || '%'`,
      [query, query],
      (err, terms) => {
        if (err) reject(err);
        else resolve(terms);
      }
    );
  }), 'all', query);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
