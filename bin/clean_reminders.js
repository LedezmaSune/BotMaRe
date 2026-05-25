const db = require('better-sqlite3')('data/database.db');
const info = db.prepare("DELETE FROM reminders WHERE status = 'pending'").run();
console.log(`Deleted ${info.changes} reminders.`);
