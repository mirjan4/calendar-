const db = require('../config/db');
const { logAction } = require('../utils/auditLogger');

/**
 * Admin: Get all unit assignments with filtering, search, and pagination
 */
async function getUnitAssignments(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit || '15', 10)));
    const offset = (page - 1) * limit;

    const {
      search,
      status, // 'active', 'released', 'all'
      district_id,
      zone_id,
      circle_id,
      unit_id
    } = req.query;

    let whereClauses = [];
    let params = [];

    if (search) {
      whereClauses.push('(s.reg_no LIKE ? OR s.admission_no LIKE ? OR s.candidate_name LIKE ? OR u.name LIKE ?)');
      const p = `%${search.trim()}%`;
      params.push(p, p, p, p);
    }

    if (status && status !== 'all') {
      whereClauses.push('ua.status = ?');
      params.push(status);
    }

    if (district_id) {
      whereClauses.push('z.district_id = ?');
      params.push(district_id);
    }

    if (zone_id) {
      whereClauses.push('c.zone_id = ?');
      params.push(zone_id);
    }

    if (circle_id) {
      whereClauses.push('u.circle_id = ?');
      params.push(circle_id);
    }

    if (unit_id) {
      whereClauses.push('ua.unit_id = ?');
      params.push(unit_id);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM unit_assignments ua
       JOIN units u ON ua.unit_id = u.id
       JOIN circles c ON u.circle_id = c.id
       JOIN zones z ON c.zone_id = z.id
       JOIN districts d ON z.district_id = d.id
       JOIN students s ON ua.student_id = s.id
       ${whereSql}`,
      params
    );
    const total = countRows[0].total;

    const [assignments] = await db.query(
      `SELECT ua.id, ua.unit_id, ua.student_id, ua.registration_id, ua.status,
              ua.assigned_at, ua.released_at, ua.release_reason, ua.created_at,
              u.name AS unit_name, c.name AS circle_name, z.name AS zone_name, d.name AS district_name,
              s.candidate_name, s.reg_no, s.admission_no, s.class_name, s.mobile,
              r.registration_code,
              admin.full_name AS released_by_name
       FROM unit_assignments ua
       JOIN units u ON ua.unit_id = u.id
       JOIN circles c ON u.circle_id = c.id
       JOIN zones z ON c.zone_id = z.id
       JOIN districts d ON z.district_id = d.id
       JOIN students s ON ua.student_id = s.id
       LEFT JOIN registrations r ON ua.registration_id = r.id
       LEFT JOIN admins admin ON ua.released_by = admin.id
       ${whereSql}
       ORDER BY ua.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      assignments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Get single assignment details
 */
async function getUnitAssignmentById(req, res, next) {
  try {
    const id = req.params.id;
    const [rows] = await db.query(
      `SELECT ua.*,
              u.name AS unit_name, c.name AS circle_name, z.name AS zone_name, d.name AS district_name,
              s.candidate_name, s.reg_no, s.admission_no, s.class_name, s.mobile, s.place,
              r.registration_code,
              admin.full_name AS released_by_name
       FROM unit_assignments ua
       JOIN units u ON ua.unit_id = u.id
       JOIN circles c ON u.circle_id = c.id
       JOIN zones z ON c.zone_id = z.id
       JOIN districts d ON z.district_id = d.id
       JOIN students s ON ua.student_id = s.id
       LEFT JOIN registrations r ON ua.registration_id = r.id
       LEFT JOIN admins admin ON ua.released_by = admin.id
       WHERE ua.id = ?
       LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Assignment record not found' });
    }

    return res.json({ success: true, assignment: rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Release a unit assignment with mandatory reason
 * Business Rule:
 * - Releases assignment so the unit can become available again.
 * - Requires reason.
 * - Preserves assignment history (never deletes).
 * - Maintains full audit trail.
 */
async function releaseUnitAssignment(req, res, next) {
  let connection;
  try {
    const id = req.params.id;
    const { release_reason } = req.body;

    if (!release_reason || !release_reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A detailed reason is required to release an assigned unit.'
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT ua.*, u.name AS unit_name, s.candidate_name, s.reg_no 
       FROM unit_assignments ua
       JOIN units u ON ua.unit_id = u.id
       JOIN students s ON ua.student_id = s.id
       WHERE ua.id = ? FOR UPDATE`,
      [id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Unit assignment not found' });
    }

    const assignment = rows[0];

    if (assignment.status === 'released') {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'This unit assignment has already been released.'
      });
    }

    // Mark assignment released
    await connection.query(
      `UPDATE unit_assignments 
       SET status = 'released', released_at = NOW(), release_reason = ?, released_by = ?
       WHERE id = ?`,
      [release_reason.trim(), req.user.id, id]
    );

    // Also update associated registration to cancelled so both tables stay in perfect sync
    if (assignment.registration_id) {
      await connection.query(
        `UPDATE registrations 
         SET status = 'cancelled', rejection_reason = ? 
         WHERE id = ?`,
        [release_reason ? `Unit assignment released: ${release_reason.trim()}` : 'Unit assignment released', assignment.registration_id]
      );
    }

    await connection.commit();
    connection.release();

    await logAction({
      adminId: req.user.id,
      action: 'RELEASE_UNIT_ASSIGNMENT',
      entityType: 'unit_assignment',
      entityId: parseInt(id, 10),
      details: {
        unitId: assignment.unit_id,
        unitName: assignment.unit_name,
        studentName: assignment.candidate_name,
        regNo: assignment.reg_no,
        reason: release_reason.trim()
      }
    });

    return res.json({
      success: true,
      message: `Assignment for unit "${assignment.unit_name}" released successfully. The unit is now available for new registrations.`
    });
  } catch (err) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    next(err);
  }
}

module.exports = {
  getUnitAssignments,
  getUnitAssignmentById,
  releaseUnitAssignment
};
