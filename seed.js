const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Connect to database
const db = new sqlite3.Database('./database/terms.db', (err) => {
  if (err) return console.error(err.message);
  console.log('Connected to SQLite database.');
});

// Read JSON data
const rawData = fs.readFileSync('./data/terms.json');
const terms = JSON.parse(rawData);

// Insert data
db.serialize(() => {
  db.run('DELETE FROM terms');

  const stmt = db.prepare(`
    INSERT INTO terms (term, definition, letter)
    VALUES (?, ?, ?)
  `);

  terms.forEach(term => {
    const letter = term.term.charAt(0).toUpperCase();
    stmt.run([term.term, term.definition, letter]);
  });

  stmt.finalize();
  console.log(`${terms.length} terms inserted successfully!`);
});

db.close();
