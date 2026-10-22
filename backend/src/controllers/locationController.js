const db = require('../config/db');
const { logAction } = require('../utils/auditLogger');
const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const ExcelJS = require('exceljs');

/**
 * Public: Get active districts for Inside Kerala
 */
async function getDistricts(req, res, next) {
  try {
    const [districts] = await db.query(
      `SELECT id, name, is_active FROM districts WHERE is_active = 1 ORDER BY name ASC`
    );
    return res.json({ success: true, districts });
  } catch (err) {
    next(err);
  }
}

/**
 * Public: Get active zones by districtId
 */
async function getZones(req, res, next) {
  try {
    const districtId = req.query.districtId || req.params.districtId;
    if (!districtId) {
      return res.status(400).json({ success: false, message: 'districtId is required' });
    }

    const [zones] = await db.query(
      `SELECT id, district_id, name, is_active FROM zones 
       WHERE district_id = ? AND is_active = 1 
       ORDER BY name ASC`,
      [districtId]
    );
    return res.json({ success: true, zones });
  } catch (err) {
    next(err);
  }
}

/**
 * Public: Get active circles by zoneId
 */
async function getCircles(req, res, next) {
  try {
    const zoneId = req.query.zoneId || req.params.zoneId;
    if (!zoneId) {
      return res.status(400).json({ success: false, message: 'zoneId is required' });
    }

    const [circles] = await db.query(
      `SELECT id, zone_id, name, is_active FROM circles 
       WHERE zone_id = ? AND is_active = 1 
       ORDER BY name ASC`,
      [zoneId]
    );
    return res.json({ success: true, circles });
  } catch (err) {
    next(err);
  }
}

/**
 * Public: Get all units under circleId
 */
async function getUnits(req, res, next) {
  try {
    const circleId = req.query.circleId || req.params.circleId;
    if (!circleId) {
      return res.status(400).json({ success: false, message: 'circleId is required' });
    }

    const [units] = await db.query(
      `SELECT u.id, u.circle_id, u.name, u.is_active,
              (
                (SELECT COUNT(*) FROM unit_assignments ua WHERE ua.unit_id = u.id AND ua.status = 'active') > 0
                OR
                (SELECT COUNT(*) FROM registrations r WHERE r.unit_id = u.id AND r.registration_type = 'inside_kerala' AND r.status IN ('approved', 'pending')) > 0
              ) AS is_assigned
       FROM units u
       WHERE u.circle_id = ? AND u.is_active = 1
       ORDER BY u.name ASC`,
      [circleId]
    );
    return res.json({ success: true, units });
  } catch (err) {
    next(err);
  }
}

/**
 * CRITICAL REQUIREMENT: Get ONLY AVAILABLE units under circleId
 * When a unit has an active confirmed assignment or registration, it must NOT appear as available to other students.
 */
async function getAvailableUnits(req, res, next) {
  try {
    const circleId = req.query.circleId || req.params.circleId;
    if (!circleId) {
      return res.status(400).json({ success: false, message: 'circleId is required' });
    }

    const [availableUnits] = await db.query(
      `SELECT u.id, u.circle_id, u.name 
       FROM units u
       WHERE u.circle_id = ? 
         AND u.is_active = 1
         AND u.id NOT IN (
           SELECT ua.unit_id 
           FROM unit_assignments ua 
           WHERE ua.status = 'active'
         )
         AND u.id NOT IN (
           SELECT r.unit_id 
           FROM registrations r 
           WHERE r.registration_type = 'inside_kerala' 
             AND r.status IN ('approved', 'pending')
             AND r.unit_id IS NOT NULL
         )
       ORDER BY u.name ASC`,
      [circleId]
    );

    return res.json({ success: true, units: availableUnits });
  } catch (err) {
    next(err);
  }
}

/* ==================== ADMIN LOCATION MANAGEMENT ==================== */

// Districts
async function getAllDistrictsAdmin(req, res, next) {
  try {
    const [districts] = await db.query(
      `SELECT d.*, 
              (SELECT COUNT(*) FROM zones z WHERE z.district_id = d.id) AS total_zones,
              (SELECT COUNT(*) FROM registrations r WHERE r.district_id = d.id AND r.status IN ('approved','pending')) AS total_registrations
       FROM districts d 
       ORDER BY d.name ASC`
    );
    return res.json({ success: true, districts });
  } catch (err) {
    next(err);
  }
}

async function createDistrict(req, res, next) {
  try {
    const { name, is_active } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'District name is required' });
    }

    const [existing] = await db.query(`SELECT id FROM districts WHERE name = ? LIMIT 1`, [name.trim()]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: `District "${name}" already exists` });
    }

    const [result] = await db.query(
      `INSERT INTO districts (name, is_active) VALUES (?, ?)`,
      [name.trim(), is_active !== undefined ? (is_active ? 1 : 0) : 1]
    );

    await logAction({
      adminId: req.user.id,
      action: 'CREATE_DISTRICT',
      entityType: 'district',
      entityId: result.insertId,
      details: { name }
    });

    return res.status(201).json({ success: true, message: 'District created successfully', id: result.insertId });
  } catch (err) {
    next(err);
  }
}

async function updateDistrict(req, res, next) {
  try {
    const id = req.params.id;
    const { name, is_active } = req.body;

    const [existing] = await db.query(`SELECT id FROM districts WHERE id = ?`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'District not found' });
    }

    if (name) {
      const [duplicate] = await db.query(`SELECT id FROM districts WHERE name = ? AND id != ? LIMIT 1`, [name.trim(), id]);
      if (duplicate.length > 0) {
        return res.status(409).json({ success: false, message: `District name "${name}" is already in use` });
      }
    }

    // Check if deactivating when active registrations exist
    if (is_active === 0 || is_active === false) {
      const [regs] = await db.query(
        `SELECT COUNT(*) AS active_regs FROM registrations WHERE district_id = ? AND status = 'approved'`,
        [id]
      );
      if (regs[0].active_regs > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot deactivate district. There are ${regs[0].active_regs} active registrations associated with it.`
        });
      }
    }

    await db.query(
      `UPDATE districts SET 
         name = COALESCE(?, name), 
         is_active = COALESCE(?, is_active) 
       WHERE id = ?`,
      [name ? name.trim() : null, is_active !== undefined ? (is_active ? 1 : 0) : null, id]
    );

    await logAction({
      adminId: req.user.id,
      action: 'UPDATE_DISTRICT',
      entityType: 'district',
      entityId: parseInt(id, 10),
      details: { name, is_active }
    });

    return res.json({ success: true, message: 'District updated successfully' });
  } catch (err) {
    next(err);
  }
}

// Zones
async function getAllZonesAdmin(req, res, next) {
  try {
    const districtId = req.query.districtId;
    let sql = `SELECT z.*, d.name AS district_name,
                      (SELECT COUNT(*) FROM circles c WHERE c.zone_id = z.id) AS total_circles,
                      (SELECT COUNT(*) FROM registrations r WHERE r.zone_id = z.id AND r.status IN ('approved','pending')) AS total_registrations
               FROM zones z
               JOIN districts d ON z.district_id = d.id`;
    let params = [];

    if (districtId) {
      sql += ` WHERE z.district_id = ?`;
      params.push(districtId);
    }
    sql += ` ORDER BY d.name ASC, z.name ASC`;

    const [zones] = await db.query(sql, params);
    return res.json({ success: true, zones });
  } catch (err) {
    next(err);
  }
}

async function createZone(req, res, next) {
  try {
    const { district_id, name, is_active } = req.body;
    if (!district_id || !name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'District and Zone name are required' });
    }

    const [existing] = await db.query(
      `SELECT id FROM zones WHERE district_id = ? AND name = ? LIMIT 1`,
      [district_id, name.trim()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: `Zone "${name}" already exists in this district` });
    }

    const [result] = await db.query(
      `INSERT INTO zones (district_id, name, is_active) VALUES (?, ?, ?)`,
      [district_id, name.trim(), is_active !== undefined ? (is_active ? 1 : 0) : 1]
    );

    await logAction({
      adminId: req.user.id,
      action: 'CREATE_ZONE',
      entityType: 'zone',
      entityId: result.insertId,
      details: { district_id, name }
    });

    return res.status(201).json({ success: true, message: 'Zone created successfully', id: result.insertId });
  } catch (err) {
    next(err);
  }
}

async function updateZone(req, res, next) {
  try {
    const id = req.params.id;
    const { district_id, name, is_active } = req.body;

    const [existing] = await db.query(`SELECT id, district_id FROM zones WHERE id = ?`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Zone not found' });
    }

    const targetDistrictId = district_id || existing[0].district_id;
    if (name) {
      const [duplicate] = await db.query(
        `SELECT id FROM zones WHERE district_id = ? AND name = ? AND id != ? LIMIT 1`,
        [targetDistrictId, name.trim(), id]
      );
      if (duplicate.length > 0) {
        return res.status(409).json({ success: false, message: `Zone "${name}" already exists in this district` });
      }
    }

    await db.query(
      `UPDATE zones SET 
         district_id = COALESCE(?, district_id),
         name = COALESCE(?, name),
         is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [district_id || null, name ? name.trim() : null, is_active !== undefined ? (is_active ? 1 : 0) : null, id]
    );

    await logAction({
      adminId: req.user.id,
      action: 'UPDATE_ZONE',
      entityType: 'zone',
      entityId: parseInt(id, 10),
      details: { district_id, name, is_active }
    });

    return res.json({ success: true, message: 'Zone updated successfully' });
  } catch (err) {
    next(err);
  }
}

// Circles
async function getAllCirclesAdmin(req, res, next) {
  try {
    const zoneId = req.query.zoneId;
    let sql = `SELECT c.*, z.name AS zone_name, d.name AS district_name,
                      (SELECT COUNT(*) FROM units u WHERE u.circle_id = c.id) AS total_units,
                      (SELECT COUNT(*) FROM registrations r WHERE r.circle_id = c.id AND r.status IN ('approved','pending')) AS total_registrations
               FROM circles c
               JOIN zones z ON c.zone_id = z.id
               JOIN districts d ON z.district_id = d.id`;
    let params = [];

    if (zoneId) {
      sql += ` WHERE c.zone_id = ?`;
      params.push(zoneId);
    }
    sql += ` ORDER BY d.name ASC, z.name ASC, c.name ASC`;

    const [circles] = await db.query(sql, params);
    return res.json({ success: true, circles });
  } catch (err) {
    next(err);
  }
}

async function createCircle(req, res, next) {
  try {
    const { zone_id, name, is_active } = req.body;
    if (!zone_id || !name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Zone and Circle name are required' });
    }

    const [existing] = await db.query(
      `SELECT id FROM circles WHERE zone_id = ? AND name = ? LIMIT 1`,
      [zone_id, name.trim()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: `Circle "${name}" already exists in this zone` });
    }

    const [result] = await db.query(
      `INSERT INTO circles (zone_id, name, is_active) VALUES (?, ?, ?)`,
      [zone_id, name.trim(), is_active !== undefined ? (is_active ? 1 : 0) : 1]
    );

    await logAction({
      adminId: req.user.id,
      action: 'CREATE_CIRCLE',
      entityType: 'circle',
      entityId: result.insertId,
      details: { zone_id, name }
    });

    return res.status(201).json({ success: true, message: 'Circle created successfully', id: result.insertId });
  } catch (err) {
    next(err);
  }
}

async function updateCircle(req, res, next) {
  try {
    const id = req.params.id;
    const { zone_id, name, is_active } = req.body;

    const [existing] = await db.query(`SELECT id, zone_id FROM circles WHERE id = ?`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Circle not found' });
    }

    const targetZoneId = zone_id || existing[0].zone_id;
    if (name) {
      const [duplicate] = await db.query(
        `SELECT id FROM circles WHERE zone_id = ? AND name = ? AND id != ? LIMIT 1`,
        [targetZoneId, name.trim(), id]
      );
      if (duplicate.length > 0) {
        return res.status(409).json({ success: false, message: `Circle "${name}" already exists in this zone` });
      }
    }

    await db.query(
      `UPDATE circles SET 
         zone_id = COALESCE(?, zone_id),
         name = COALESCE(?, name),
         is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [zone_id || null, name ? name.trim() : null, is_active !== undefined ? (is_active ? 1 : 0) : null, id]
    );

    await logAction({
      adminId: req.user.id,
      action: 'UPDATE_CIRCLE',
      entityType: 'circle',
      entityId: parseInt(id, 10),
      details: { zone_id, name, is_active }
    });

    return res.json({ success: true, message: 'Circle updated successfully' });
  } catch (err) {
    next(err);
  }
}

// Units
async function getAllUnitsAdmin(req, res, next) {
  try {
    const { circleId, zoneId, districtId, status } = req.query;
    let whereClauses = [];
    let params = [];

    if (circleId) {
      whereClauses.push('u.circle_id = ?');
      params.push(circleId);
    }
    if (zoneId) {
      whereClauses.push('c.zone_id = ?');
      params.push(zoneId);
    }
    if (districtId) {
      whereClauses.push('z.district_id = ?');
      params.push(districtId);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [units] = await db.query(
      `SELECT u.*, c.name AS circle_name, z.name AS zone_name, d.name AS district_name,
              ua.id AS active_assignment_id, ua.student_id AS assigned_student_id, ua.assigned_at,
              s.candidate_name AS assigned_student_name, s.reg_no AS assigned_student_reg_no,
              r.registration_code
       FROM units u
       JOIN circles c ON u.circle_id = c.id
       JOIN zones z ON c.zone_id = z.id
       JOIN districts d ON z.district_id = d.id
       LEFT JOIN unit_assignments ua ON ua.unit_id = u.id AND ua.status = 'active'
       LEFT JOIN students s ON ua.student_id = s.id
       LEFT JOIN registrations r ON ua.registration_id = r.id
       ${whereSql}
       ORDER BY d.name ASC, z.name ASC, c.name ASC, u.name ASC`,
      params
    );

    return res.json({ success: true, units });
  } catch (err) {
    next(err);
  }
}

async function createUnit(req, res, next) {
  try {
    const { circle_id, name, is_active } = req.body;
    if (!circle_id || !name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Circle and Unit name are required' });
    }

    const [existing] = await db.query(
      `SELECT id FROM units WHERE circle_id = ? AND name = ? LIMIT 1`,
      [circle_id, name.trim()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: `Unit "${name}" already exists in this circle` });
    }

    const [result] = await db.query(
      `INSERT INTO units (circle_id, name, is_active) VALUES (?, ?, ?)`,
      [circle_id, name.trim(), is_active !== undefined ? (is_active ? 1 : 0) : 1]
    );

    await logAction({
      adminId: req.user.id,
      action: 'CREATE_UNIT',
      entityType: 'unit',
      entityId: result.insertId,
      details: { circle_id, name }
    });

    return res.status(201).json({ success: true, message: 'Unit created successfully', id: result.insertId });
  } catch (err) {
    next(err);
  }
}

async function updateUnit(req, res, next) {
  try {
    const id = req.params.id;
    const { circle_id, name, is_active } = req.body;

    const [existing] = await db.query(`SELECT id, circle_id FROM units WHERE id = ?`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    const targetCircleId = circle_id || existing[0].circle_id;
    if (name) {
      const [duplicate] = await db.query(
        `SELECT id FROM units WHERE circle_id = ? AND name = ? AND id != ? LIMIT 1`,
        [targetCircleId, name.trim(), id]
      );
      if (duplicate.length > 0) {
        return res.status(409).json({ success: false, message: `Unit "${name}" already exists in this circle` });
      }
    }

    await db.query(
      `UPDATE units SET 
         circle_id = COALESCE(?, circle_id),
         name = COALESCE(?, name),
         is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [circle_id || null, name ? name.trim() : null, is_active !== undefined ? (is_active ? 1 : 0) : null, id]
    );

    await logAction({
      adminId: req.user.id,
      action: 'UPDATE_UNIT',
      entityType: 'unit',
      entityId: parseInt(id, 10),
      details: { circle_id, name, is_active }
    });

    return res.json({ success: true, message: 'Unit updated successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Get combined place management list (Districts -> Zones -> Circles -> Units + Assigned Student)
 * ONE combined table with search, filters, pagination, and sorting.
 */
async function getCombinedPlacesAdmin(req, res, next) {
  try {
    const isExportAll = req.query.limit === 'all';
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = isExportAll ? 999999 : Math.min(200, Math.max(5, parseInt(req.query.limit || '25', 10)));
    const offset = isExportAll ? 0 : (page - 1) * limit;

    const {
      search,
      districtId,
      zoneId,
      circleId,
      status, // 'all', 'assigned', 'unassigned'
      sortBy = 'district',
      sortOrder = 'ASC'
    } = req.query;

    let whereConditions = [];
    let params = [];

    // District filter
    if (districtId) {
      whereConditions.push('d.id = ?');
      params.push(parseInt(districtId, 10));
    }

    // Zone filter
    if (zoneId) {
      whereConditions.push('z.id = ?');
      params.push(parseInt(zoneId, 10));
    }

    // Circle filter
    if (circleId) {
      whereConditions.push('c.id = ?');
      params.push(parseInt(circleId, 10));
    }

    // Status filter (assigned vs unassigned)
    if (status === 'assigned') {
      whereConditions.push('ua.id IS NOT NULL');
    } else if (status === 'unassigned') {
      whereConditions.push('ua.id IS NULL');
    }

    // Search query
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereConditions.push(
        '(d.name LIKE ? OR z.name LIKE ? OR c.name LIKE ? OR u.name LIKE ? OR s.candidate_name LIKE ? OR s.reg_no LIKE ? OR s.admission_no LIKE ?)'
      );
      params.push(term, term, term, term, term, term, term);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Safe Sorting mapping
    const sortColumns = {
      district: 'd.name',
      zone: 'z.name',
      circle: 'c.name',
      unit: 'u.name',
      student: 'COALESCE(s.candidate_name, "ZZZZZ")',
      status: 'ua.id'
    };
    const orderCol = sortColumns[sortBy] || 'd.name';
    const orderDir = (sortOrder || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const orderByClause = `ORDER BY ${orderCol} ${orderDir}, d.name ASC, z.name ASC, c.name ASC, u.name ASC`;

    // 1. Total matching count
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM units u
       JOIN circles c ON u.circle_id = c.id
       JOIN zones z ON c.zone_id = z.id
       JOIN districts d ON z.district_id = d.id
       LEFT JOIN unit_assignments ua ON ua.unit_id = u.id AND ua.status = 'active'
       LEFT JOIN students s ON ua.student_id = s.id
       ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    // 2. Fetch paginated data
    const queryParams = [...params, limit, offset];
    const [rows] = await db.query(
      `SELECT 
         u.id AS unit_id,
         u.name AS unit_name,
         u.is_active AS unit_is_active,
         c.id AS circle_id,
         c.name AS circle_name,
         z.id AS zone_id,
         z.name AS zone_name,
         d.id AS district_id,
         d.name AS district_name,
         ua.id AS assignment_id,
         ua.assigned_at,
         s.id AS student_id,
         s.candidate_name,
         s.reg_no,
         s.admission_no,
         s.class_name,
         s.mobile,
         COALESCE(s.candidate_name, 'Unassigned') AS assigned_student_name,
         CASE WHEN ua.id IS NOT NULL THEN 'Assigned' ELSE 'Unassigned' END AS assignment_status
       FROM units u
       JOIN circles c ON u.circle_id = c.id
       JOIN zones z ON c.zone_id = z.id
       JOIN districts d ON z.district_id = d.id
       LEFT JOIN unit_assignments ua ON ua.unit_id = u.id AND ua.status = 'active'
       LEFT JOIN students s ON ua.student_id = s.id
       ${whereClause}
       ${orderByClause}
       LIMIT ? OFFSET ?`,
      queryParams
    );

    // 3. Overall summary KPIs
    const [summaryRows] = await db.query(
      `SELECT 
         COUNT(DISTINCT u.id) AS total_units,
         COUNT(DISTINCT CASE WHEN ua.id IS NOT NULL THEN u.id END) AS assigned_units,
         COUNT(DISTINCT CASE WHEN ua.id IS NULL THEN u.id END) AS unassigned_units,
         COUNT(DISTINCT d.id) AS total_districts,
         COUNT(DISTINCT z.id) AS total_zones,
         COUNT(DISTINCT c.id) AS total_circles
       FROM units u
       JOIN circles c ON u.circle_id = c.id
       JOIN zones z ON c.zone_id = z.id
       JOIN districts d ON z.district_id = d.id
       LEFT JOIN unit_assignments ua ON ua.unit_id = u.id AND ua.status = 'active'`
    );

    return res.json({
      success: true,
      places: rows,
      pagination: {
        total,
        page,
        limit: isExportAll ? total : limit,
        totalPages: isExportAll ? 1 : Math.ceil(total / limit)
      },
      summary: summaryRows[0]
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Bulk Import Places (District -> Zone -> Circle -> Unit) via CSV / Excel
 */
async function importPlaces(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a CSV (.csv) or Excel (.xlsx, .xls) file.' });
    }

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const rows = [];

    if (ext === '.csv') {
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csvParser())
          .on('data', (data) => rows.push(data))
          .on('end', resolve)
          .on('error', reject);
      });
    } else {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.worksheets[0];
      if (worksheet) {
        let headers = {};
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) {
            row.eachCell((cell, col) => {
              headers[col] = (cell.value || '').toString().trim().toUpperCase();
            });
          } else {
            let rowObj = {};
            row.eachCell({ includeEmpty: true }, (cell, col) => {
              const h = headers[col];
              if (h) {
                let val = cell.value;
                if (val && typeof val === 'object' && val.text) val = val.text;
                rowObj[h] = val !== null && val !== undefined ? val.toString().trim() : '';
              }
            });
            rows.push(rowObj);
          }
        });
      }
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'The uploaded file is empty or contained no readable rows.' });
    }

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

    // Pre-fetch existing hierarchy
    const [existingDistricts] = await db.query(`SELECT id, LOWER(TRIM(name)) AS name FROM districts`);
    const districtMap = new Map(existingDistricts.map(d => [d.name, d.id]));

    const [existingZones] = await db.query(`SELECT id, district_id, LOWER(TRIM(name)) AS name FROM zones`);
    const zoneMap = new Map(existingZones.map(z => [`${z.district_id}_${z.name}`, z.id]));

    const [existingCircles] = await db.query(`SELECT id, zone_id, LOWER(TRIM(name)) AS name FROM circles`);
    const circleMap = new Map(existingCircles.map(c => [`${c.zone_id}_${c.name}`, c.id]));

    const [existingUnits] = await db.query(`SELECT id, circle_id, LOWER(TRIM(name)) AS name FROM units`);
    const unitMap = new Map(existingUnits.map(u => [`${u.circle_id}_${u.name}`, u.id]));

    let createdDistricts = 0;
    let createdZones = 0;
    let createdCircles = 0;
    let createdUnits = 0;
    let skippedUnits = 0;
    let processedRows = 0;

    for (const row of rows) {
      const dName = findVal(row, ['DISTRICT', 'DISTRICT NAME', 'DIST', 'DISTRICTS']);
      const zName = findVal(row, ['ZONE', 'ZONE NAME', 'ZONES']);
      const cName = findVal(row, ['CIRCLE', 'CIRCLE NAME', 'CIRCLES']);
      const uName = findVal(row, ['UNIT', 'UNIT NAME', 'UNITS', 'UNIT_NAME', 'PLACE']);

      if (!dName || !zName || !cName || !uName) continue;
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
        const [res] = await db.query(`INSERT INTO zones (district_id, name, is_active) VALUES (?, ?, 1)`, [districtId, zName]);
        zoneId = res.insertId;
        zoneMap.set(zKey, zoneId);
        createdZones++;
      }

      // 3. Circle
      const cKey = `${zoneId}_${cName.toLowerCase()}`;
      let circleId = circleMap.get(cKey);
      if (!circleId) {
        const [res] = await db.query(`INSERT INTO circles (zone_id, name, is_active) VALUES (?, ?, 1)`, [zoneId, cName]);
        circleId = res.insertId;
        circleMap.set(cKey, circleId);
        createdCircles++;
      }

      // 4. Unit
      const uKey = `${circleId}_${uName.toLowerCase()}`;
      let unitId = unitMap.get(uKey);
      if (!unitId) {
        const [res] = await db.query(`INSERT INTO units (circle_id, name, is_active) VALUES (?, ?, 1)`, [circleId, uName]);
        unitId = res.insertId;
        unitMap.set(uKey, unitId);
        createdUnits++;
      } else {
        skippedUnits++;
      }
    }

    if (req.user && req.user.id) {
      await logAction({
        adminId: req.user.id,
        action: 'IMPORT_PLACES',
        entityType: 'places',
        entityId: null,
        details: { processedRows, createdDistricts, createdZones, createdCircles, createdUnits, skippedUnits }
      });
    }

    return res.json({
      success: true,
      message: `Successfully processed ${processedRows} rows. Created ${createdDistricts} Districts, ${createdZones} Zones, ${createdCircles} Circles, and ${createdUnits} Units. (${skippedUnits} existing units preserved)`,
      stats: {
        processedRows,
        createdDistricts,
        createdZones,
        createdCircles,
        createdUnits,
        skippedUnits
      }
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(err);
  }
}

/**
 * Admin: Delete Unit
 */
async function deleteUnit(req, res, next) {
  try {
    const unitId = parseInt(req.params.id, 10);
    const [units] = await db.query(`SELECT * FROM units WHERE id = ?`, [unitId]);
    if (units.length === 0) return res.status(404).json({ success: false, message: 'Unit not found' });

    // Check if unit is actively assigned
    const [assignments] = await db.query(
      `SELECT ua.id, s.candidate_name FROM unit_assignments ua JOIN students s ON ua.student_id = s.id WHERE ua.unit_id = ? AND ua.status = 'active'`,
      [unitId]
    );
    if (assignments.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete unit "${units[0].name}": It is currently assigned to student "${assignments[0].candidate_name}". Release the assignment first.`
      });
    }

    await db.query(`DELETE FROM unit_assignments WHERE unit_id = ?`, [unitId]);
    await db.query(`DELETE FROM units WHERE id = ?`, [unitId]);

    return res.json({ success: true, message: `Unit "${units[0].name}" deleted successfully.` });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Delete Circle
 */
async function deleteCircle(req, res, next) {
  try {
    const circleId = parseInt(req.params.id, 10);
    const [circles] = await db.query(`SELECT * FROM circles WHERE id = ?`, [circleId]);
    if (circles.length === 0) return res.status(404).json({ success: false, message: 'Circle not found' });

    const [active] = await db.query(
      `SELECT ua.id FROM unit_assignments ua JOIN units u ON ua.unit_id = u.id WHERE u.circle_id = ? AND ua.status = 'active'`,
      [circleId]
    );
    if (active.length > 0) {
      return res.status(409).json({ success: false, message: 'Cannot delete circle: Contains units with active student assignments.' });
    }

    await db.query(`DELETE FROM units WHERE circle_id = ?`, [circleId]);
    await db.query(`DELETE FROM circles WHERE id = ?`, [circleId]);

    return res.json({ success: true, message: `Circle "${circles[0].name}" deleted successfully.` });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Delete Zone
 */
async function deleteZone(req, res, next) {
  try {
    const zoneId = parseInt(req.params.id, 10);
    const [zones] = await db.query(`SELECT * FROM zones WHERE id = ?`, [zoneId]);
    if (zones.length === 0) return res.status(404).json({ success: false, message: 'Zone not found' });

    const [active] = await db.query(
      `SELECT ua.id FROM unit_assignments ua 
       JOIN units u ON ua.unit_id = u.id 
       JOIN circles c ON u.circle_id = c.id 
       WHERE c.zone_id = ? AND ua.status = 'active'`,
      [zoneId]
    );
    if (active.length > 0) {
      return res.status(409).json({ success: false, message: 'Cannot delete zone: Contains units with active student assignments.' });
    }

    await db.query(`DELETE u FROM units u JOIN circles c ON u.circle_id = c.id WHERE c.zone_id = ?`, [zoneId]);
    await db.query(`DELETE FROM circles WHERE zone_id = ?`, [zoneId]);
    await db.query(`DELETE FROM zones WHERE id = ?`, [zoneId]);

    return res.json({ success: true, message: `Zone "${zones[0].name}" deleted successfully.` });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Delete District
 */
async function deleteDistrict(req, res, next) {
  try {
    const districtId = parseInt(req.params.id, 10);
    const [districts] = await db.query(`SELECT * FROM districts WHERE id = ?`, [districtId]);
    if (districts.length === 0) return res.status(404).json({ success: false, message: 'District not found' });

    const [active] = await db.query(
      `SELECT ua.id FROM unit_assignments ua 
       JOIN units u ON ua.unit_id = u.id 
       JOIN circles c ON u.circle_id = c.id 
       JOIN zones z ON c.zone_id = z.id 
       WHERE z.district_id = ? AND ua.status = 'active'`,
      [districtId]
    );
    if (active.length > 0) {
      return res.status(409).json({ success: false, message: 'Cannot delete district: Contains units with active student assignments.' });
    }

    await db.query(`DELETE u FROM units u JOIN circles c ON u.circle_id = c.id JOIN zones z ON c.zone_id = z.id WHERE z.district_id = ?`, [districtId]);
    await db.query(`DELETE c FROM circles c JOIN zones z ON c.zone_id = z.id WHERE z.district_id = ?`, [districtId]);
    await db.query(`DELETE FROM zones WHERE district_id = ?`, [districtId]);
    await db.query(`DELETE FROM districts WHERE id = ?`, [districtId]);

    return res.json({ success: true, message: `District "${districts[0].name}" deleted successfully.` });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDistricts,
  getZones,
  getCircles,
  getUnits,
  getAvailableUnits,
  getAllDistrictsAdmin,
  createDistrict,
  updateDistrict,
  deleteDistrict,
  getAllZonesAdmin,
  createZone,
  updateZone,
  deleteZone,
  getAllCirclesAdmin,
  createCircle,
  updateCircle,
  deleteCircle,
  getAllUnitsAdmin,
  createUnit,
  updateUnit,
  deleteUnit,
  getCombinedPlacesAdmin,
  importPlaces
};

