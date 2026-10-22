const db = require('../config/db');

async function migrate() {
  try {
    console.log('[Migration] Checking registrations columns...');
    const [cols] = await db.query('DESCRIBE registrations');
    const fieldNames = cols.map(c => c.Field);

    if (!fieldNames.includes('calendars_requested')) {
      console.log('[Migration] Adding calendars_requested column...');
      await db.query(`
        ALTER TABLE registrations 
        ADD COLUMN calendars_requested INT NOT NULL DEFAULT 100 COMMENT 'Student requested calendar quantity' 
        AFTER registration_type
      `);
    }

    if (!fieldNames.includes('additional_calendars')) {
      console.log('[Migration] Adding additional_calendars column...');
      await db.query(`
        ALTER TABLE registrations 
        ADD COLUMN additional_calendars INT NOT NULL DEFAULT 0 COMMENT 'Additional calendars granted by administrator' 
        AFTER calendars_requested
      `);
    }

    console.log('[Migration] Backfilling existing records...');
    await db.query(`
      UPDATE registrations 
      SET calendars_requested = COALESCE(calendars_requested, 100),
          additional_calendars = GREATEST(0, calendars_allotted - COALESCE(calendars_requested, 100))
    `);

    console.log('[Migration] Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[Migration] Failed:', err);
    process.exit(1);
  }
}

migrate();
