/**
 * Standalone CLI Script to bulk import Places (District, Zone, Circle, Unit) from CSV into MySQL
 * Usage:
 *   node scripts/import_places.js [path-to-csv]
 * Example:
 *   node scripts/import_places.js ../sample_data/sample_places.csv
 */
const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const db = require('../src/config/db');

async function importPlacesFromCsv(filePath) {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Error: File not found at ${fullPath}`);
    process.exit(1);
  }

  console.log(`\n========================================================`);
  console.log(` Importing Places from CSV: ${path.basename(fullPath)}`);
  console.log(`========================================================\n`);

  // 1. Parse CSV
  const rows = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(fullPath)
      .pipe(csvParser())
      .on('data', (data) => rows.push(data))
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`Total rows read from file: ${rows.length}`);

  if (rows.length === 0) {
    console.log('No rows found in file.');
    process.exit(0);
  }

  // Helper to find column case-insensitively
  const findVal = (row, candidates) => {
    const keys = Object.keys(row);
    for (const c of candidates) {
      for (const k of keys) {
        if (k.trim().toUpperCase() === c.toUpperCase()) {
          return (row[k] || '').toString().trim();
        }
      }
    }
    return '';
  };

  // 2. Pre-fetch existing hierarchy to avoid duplicate key errors
  const [existingDistricts] = await db.query(`SELECT id, LOWER(TRIM(name)) AS name FROM districts`);
  const districtMap = new Map(existingDistricts.map((d) => [d.name, d.id]));

  const [existingZones] = await db.query(`SELECT id, district_id, LOWER(TRIM(name)) AS name FROM zones`);
  const zoneMap = new Map(existingZones.map((z) => [`${z.district_id}_${z.name}`, z.id]));

  const [existingCircles] = await db.query(`SELECT id, zone_id, LOWER(TRIM(name)) AS name FROM circles`);
  const circleMap = new Map(existingCircles.map((c) => [`${c.zone_id}_${c.name}`, c.id]));

  const [existingUnits] = await db.query(`SELECT id, circle_id, LOWER(TRIM(name)) AS name FROM units`);
  const unitMap = new Map(existingUnits.map((u) => [`${u.circle_id}_${u.name}`, u.id]));

  let createdDistricts = 0;
  let createdZones = 0;
  let createdCircles = 0;
  let createdUnits = 0;
  let skippedUnits = 0;
  let processedRows = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const dName = findVal(row, ['DISTRICT', 'DISTRICT NAME', 'DIST', 'DISTRICTS']);
    const zName = findVal(row, ['ZONE', 'ZONE NAME', 'ZONES']);
    const cName = findVal(row, ['CIRCLE', 'CIRCLE NAME', 'CIRCLES']);
    const uName = findVal(row, ['UNIT', 'UNIT NAME', 'UNITS', 'UNIT_NAME', 'PLACE']);

    if (!dName || !zName || !cName || !uName) {
      console.warn(`[Row ${i + 2}] Skipping invalid or incomplete row:`, row);
      continue;
    }

    processedRows++;

    // 1. District
    const dKey = dName.toLowerCase();
    let districtId = districtMap.get(dKey);
    if (!districtId) {
      const [res] = await db.query(`INSERT INTO districts (name, is_active) VALUES (?, 1)`, [dName]);
      districtId = res.insertId;
      districtMap.set(dKey, districtId);
      createdDistricts++;
    }

    // 2. Zone
    const zKey = `${districtId}_${zName.toLowerCase()}`;
    let zoneId = zoneMap.get(zKey);
    if (!zoneId) {
      const [res] = await db.query(`INSERT INTO zones (district_id, name, is_active) VALUES (?, ?, 1)`, [
        districtId,
        zName
      ]);
      zoneId = res.insertId;
      zoneMap.set(zKey, zoneId);
      createdZones++;
    }

    // 3. Circle
    const cKey = `${zoneId}_${cName.toLowerCase()}`;
    let circleId = circleMap.get(cKey);
    if (!circleId) {
      const [res] = await db.query(`INSERT INTO circles (zone_id, name, is_active) VALUES (?, ?, 1)`, [
        zoneId,
        cName
      ]);
      circleId = res.insertId;
      circleMap.set(cKey, circleId);
      createdCircles++;
    }

    // 4. Unit
    const uKey = `${circleId}_${uName.toLowerCase()}`;
    let unitId = unitMap.get(uKey);
    if (!unitId) {
      const [res] = await db.query(`INSERT INTO units (circle_id, name, is_active) VALUES (?, ?, 1)`, [
        circleId,
        uName
      ]);
      unitId = res.insertId;
      unitMap.set(uKey, unitId);
      createdUnits++;
    } else {
      skippedUnits++;
    }
  }

  console.log(`\n========================================================`);
  console.log(` Place Import Complete!`);
  console.log(`========================================================`);
  console.log(`Rows Processed:     ${processedRows}`);
  console.log(`Districts Created:   +${createdDistricts}`);
  console.log(`Zones Created:       +${createdZones}`);
  console.log(`Circles Created:     +${createdCircles}`);
  console.log(`Units Created:       +${createdUnits}`);
  console.log(`Units Already Exist: ${skippedUnits}`);
  console.log(`========================================================\n`);

  process.exit(0);
}

const targetFile = process.argv[2] || '../sample_data/sample_places.csv';
importPlacesFromCsv(targetFile).catch((err) => {
  console.error('Fatal error importing places:', err);
  process.exit(1);
});
