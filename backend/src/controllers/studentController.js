const db = require('../config/db');
const { logAction } = require('../utils/auditLogger');

/**
 * Public Student Lookup by Admission Number OR Registration Number
 */
async function lookupStudent(req, res, next) {
  try {
    const rawNumber = (req.query.number || req.query.q || '').trim();

    if (!rawNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an Admission Number or Registration Number'
      });
    }

    // Validate alphanumeric format to prevent invalid query formats
    if (!/^[a-zA-Z0-9_-]+$/.test(rawNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid number format. Only letters and numbers are permitted.'
      });
    }

    // Search students
    const [students] = await db.query(
      `SELECT id, class_name, hajer_no, hajer_no AS hall_no, reg_no, admission_no, candidate_name, place, mobile, is_active
       FROM students 
       WHERE (reg_no = ? OR admission_no = ?)
       LIMIT 1`,
      [rawNumber, rawNumber]
    );

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No student found matching this Admission Number or Registration Number'
      });
    }

    const student = students[0];

    if (!student.is_active) {
      return res.status(403).json({
        success: false,
        message: 'This student record is currently marked inactive. Please contact administration.'
      });
    }

    // Check if student has already registered
    const [existingRegistrations] = await db.query(
      `SELECT r.id, r.registration_code, r.registration_type, r.status, r.submitted_at,
              d.name AS district_name, z.name AS zone_name, c.name AS circle_name, u.name AS unit_name,
              r.state_name, r.outside_district, r.outside_zone, r.outside_circle, r.outside_unit
       FROM registrations r
       LEFT JOIN districts d ON r.district_id = d.id
       LEFT JOIN zones z ON r.zone_id = z.id
       LEFT JOIN circles c ON r.circle_id = c.id
       LEFT JOIN units u ON r.unit_id = u.id
       WHERE r.student_id = ? AND r.status IN ('pending', 'approved')
       ORDER BY r.submitted_at DESC
       LIMIT 1`,
      [student.id]
    );

    const isAlreadyRegistered = existingRegistrations.length > 0;

    return res.json({
      success: true,
      student: {
        id: student.id,
        class: student.class_name,
        hn: student.hajer_no,
        hajerNo: student.hajer_no,
        hall_no: student.hajer_no,
        regNo: student.reg_no,
        admissionNo: student.admission_no,
        candidateName: student.candidate_name,
        place: student.place,
        mobile: student.mobile
      },
      isAlreadyRegistered,
      existingRegistration: isAlreadyRegistered ? existingRegistrations[0] : null
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Public Real-time Student Search by Reg No, Admission No, or Candidate Name
 * Automatically triggers when 3 or more characters are entered
 */
async function liveSearchStudents(req, res, next) {
  try {
    const rawQuery = (req.query.q || req.query.query || req.query.number || '').trim();

    // Enforce 3-character minimum requirement
    if (!rawQuery || rawQuery.length < 3) {
      return res.json({
        success: true,
        results: [],
        query: rawQuery,
        message: 'Minimum 3 characters required for real-time search'
      });
    }

    // Sanitize query string
    const sanitized = rawQuery.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim();
    if (!sanitized) {
      return res.json({ success: true, results: [] });
    }

    const likeTerm = `%${sanitized}%`;
    const prefixTerm = `${sanitized}%`;

    // Query active students matching reg_no, admission_no, or candidate_name
    // Prioritizing exact matches first, then prefix matches, then substring matches
    const [students] = await db.query(
      `SELECT s.id, s.reg_no, s.admission_no, s.candidate_name, s.class_name, s.place, s.mobile,
              s.hajer_no, s.hajer_no AS hall_no,
              EXISTS (
                SELECT 1 FROM registrations r 
                WHERE r.student_id = s.id AND r.status IN ('pending', 'approved')
              ) AS is_already_registered
       FROM students s
       WHERE s.is_active = 1
         AND (s.reg_no LIKE ? OR s.admission_no LIKE ? OR s.candidate_name LIKE ?)
       ORDER BY 
         CASE 
           WHEN s.reg_no = ? OR s.admission_no = ? THEN 1
           WHEN s.reg_no LIKE ? OR s.admission_no LIKE ? THEN 2
           WHEN s.candidate_name LIKE ? THEN 3
           ELSE 4 
         END,
         s.reg_no ASC
       LIMIT 10`,
      [
        likeTerm, likeTerm, likeTerm,
        sanitized, sanitized,
        prefixTerm, prefixTerm,
        prefixTerm
      ]
    );

    const formatted = students.map((s) => ({
      id: s.id,
      regNo: s.reg_no,
      admissionNo: s.admission_no,
      candidateName: s.candidate_name,
      className: s.class_name,
      class: s.class_name,
      place: s.place,
      mobile: s.mobile,
      hajerNo: s.hajer_no,
      hall_no: s.hall_no,
      isAlreadyRegistered: Boolean(s.is_already_registered)
    }));

    return res.json({
      success: true,
      query: sanitized,
      count: formatted.length,
      results: formatted
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Get paginated student list with search and filters
 */
async function getStudents(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit || '15', 10)));
    const offset = (page - 1) * limit;

    const search = (req.query.search || '').trim();
    const className = (req.query.class || '').trim();
    const place = (req.query.place || '').trim();
    const status = req.query.status; // 'active', 'inactive', 'all'

    let whereClauses = [];
    let queryParams = [];

    if (search) {
      whereClauses.push('(s.reg_no LIKE ? OR s.admission_no LIKE ? OR s.candidate_name LIKE ? OR s.mobile LIKE ?)');
      const pattern = `%${search}%`;
      queryParams.push(pattern, pattern, pattern, pattern);
    }

    if (className) {
      whereClauses.push('s.class_name = ?');
      queryParams.push(className);
    }

    if (place) {
      whereClauses.push('s.place LIKE ?');
      queryParams.push(`%${place}%`);
    }

    if (status === 'active') {
      whereClauses.push('s.is_active = 1');
    } else if (status === 'inactive') {
      whereClauses.push('s.is_active = 0');
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count total rows
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM students s ${whereSql}`,
      queryParams
    );
    const total = countRows[0].total;

    // Fetch paginated rows with registration summary
    const [students] = await db.query(
      `SELECT s.id, s.class_name, s.hajer_no, s.hajer_no AS hall_no, s.reg_no, s.admission_no, 
              s.candidate_name, s.place, s.mobile, s.is_active, s.created_at,
              r.id AS registration_id, r.registration_code, r.registration_type, r.status AS registration_status
       FROM students s
       LEFT JOIN registrations r ON r.student_id = s.id AND r.status IN ('approved', 'pending')
       ${whereSql}
       ORDER BY s.id ASC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    // Fetch distinct classes for filter dropdown
    const [classes] = await db.query(`SELECT DISTINCT class_name FROM students ORDER BY class_name ASC`);

    return res.json({
      success: true,
      students,
      classes: classes.map(c => c.class_name),
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
 * Admin: Get single student by ID
 */
async function getStudentById(req, res, next) {
  try {
    const studentId = req.params.id;
    const [students] = await db.query(
      `SELECT id, class_name, hajer_no, hajer_no AS hall_no, reg_no, admission_no, candidate_name, place, mobile, is_active, created_at, updated_at
       FROM students WHERE id = ? LIMIT 1`,
      [studentId]
    );

    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'Student record not found' });
    }

    const student = students[0];

    // Get registration history
    const [registrations] = await db.query(
      `SELECT r.*, 
              d.name AS district_name, z.name AS zone_name, c.name AS circle_name, u.name AS unit_name
       FROM registrations r
       LEFT JOIN districts d ON r.district_id = d.id
       LEFT JOIN zones z ON r.zone_id = z.id
       LEFT JOIN circles c ON r.circle_id = c.id
       LEFT JOIN units u ON r.unit_id = u.id
       WHERE r.student_id = ?
       ORDER BY r.submitted_at DESC`,
      [studentId]
    );

    return res.json({
      success: true,
      student,
      registrations
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Create student manually
 */
async function createStudent(req, res, next) {
  try {
    const { class_name, hajer_no, hall_no, hn, reg_no, admission_no, candidate_name, place, mobile, is_active } = req.body;
    const effectiveHajerNo = hajer_no || hall_no || hn;

    if (!class_name || !effectiveHajerNo || !reg_no || !candidate_name) {
      return res.status(400).json({
        success: false,
        message: 'Class, HN (Hajer No), Registration Number, and Candidate Name are required.'
      });
    }

    // Check duplicate reg_no
    const [existing] = await db.query(`SELECT id FROM students WHERE reg_no = ? LIMIT 1`, [reg_no.trim()]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: `A student with Registration Number "${reg_no}" already exists.`
      });
    }

    const [result] = await db.query(
      `INSERT INTO students (class_name, hajer_no, reg_no, admission_no, candidate_name, place, mobile, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        class_name.trim().toUpperCase(),
        effectiveHajerNo ? effectiveHajerNo.toString().trim() : null,
        reg_no.trim(),
        admission_no ? admission_no.trim() : reg_no.trim(),
        candidate_name.trim().toUpperCase(),
        place ? place.trim() : null,
        mobile ? mobile.trim() : null,
        is_active !== undefined ? (is_active ? 1 : 0) : 1
      ]
    );

    await logAction({
      adminId: req.user.id,
      action: 'CREATE_STUDENT',
      entityType: 'student',
      entityId: result.insertId,
      details: { reg_no, candidate_name, class_name }
    });

    return res.status(201).json({
      success: true,
      message: 'Student record created successfully',
      studentId: result.insertId
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Update student details
 */
async function updateStudent(req, res, next) {
  try {
    const studentId = req.params.id;
    const { class_name, hajer_no, hall_no, hn, reg_no, admission_no, candidate_name, place, mobile, is_active } = req.body;
    const effectiveHajerNo = hajer_no !== undefined ? hajer_no : (hall_no !== undefined ? hall_no : hn);

    // Check student existence
    const [students] = await db.query(`SELECT id FROM students WHERE id = ?`, [studentId]);
    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'Student record not found' });
    }

    // Check duplicate reg_no on other students
    if (reg_no) {
      const [duplicate] = await db.query(
        `SELECT id FROM students WHERE reg_no = ? AND id != ? LIMIT 1`,
        [reg_no.trim(), studentId]
      );
      if (duplicate.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Another student already uses Registration Number "${reg_no}".`
        });
      }
    }

    await db.query(
      `UPDATE students SET
         class_name = COALESCE(?, class_name),
         hajer_no = COALESCE(?, hajer_no),
         reg_no = COALESCE(?, reg_no),
         admission_no = COALESCE(?, admission_no),
         candidate_name = COALESCE(?, candidate_name),
         place = COALESCE(?, place),
         mobile = COALESCE(?, mobile),
         is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        class_name ? class_name.trim().toUpperCase() : null,
        effectiveHajerNo !== undefined ? effectiveHajerNo : null,
        reg_no ? reg_no.trim() : null,
        admission_no ? admission_no.trim() : null,
        candidate_name ? candidate_name.trim().toUpperCase() : null,
        place !== undefined ? place.trim() : null,
        mobile ? mobile.trim() : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        studentId
      ]
    );

    await logAction({
      adminId: req.user.id,
      action: 'UPDATE_STUDENT',
      entityType: 'student',
      entityId: parseInt(studentId, 10),
      details: { updatedFields: req.body }
    });

    return res.json({
      success: true,
      message: 'Student updated successfully'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Toggle student active/inactive status
 */
async function toggleStudentStatus(req, res, next) {
  try {
    const studentId = req.params.id;
    const { is_active } = req.body;

    const [students] = await db.query(`SELECT id, is_active, candidate_name FROM students WHERE id = ?`, [studentId]);
    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const newStatus = is_active !== undefined ? (is_active ? 1 : 0) : (students[0].is_active ? 0 : 1);
    await db.query(`UPDATE students SET is_active = ? WHERE id = ?`, [newStatus, studentId]);

    await logAction({
      adminId: req.user.id,
      action: 'TOGGLE_STUDENT_STATUS',
      entityType: 'student',
      entityId: parseInt(studentId, 10),
      details: { newStatus, studentName: students[0].candidate_name }
    });

    return res.json({
      success: true,
      message: `Student status updated to ${newStatus ? 'Active' : 'Inactive'}`,
      is_active: newStatus
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Permanently delete a student record and cleanly release any linked unit assignment
 */
async function deleteStudent(req, res, next) {
  const connection = await db.getConnection();
  try {
    const studentId = parseInt(req.params.id, 10);
    if (!studentId || isNaN(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID' });
    }

    const [students] = await connection.query(
      `SELECT id, candidate_name, reg_no FROM students WHERE id = ?`,
      [studentId]
    );

    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'Student record not found' });
    }

    const student = students[0];

    await connection.beginTransaction();

    // 1. Remove unit assignments for this student
    await connection.query(`DELETE FROM unit_assignments WHERE student_id = ?`, [studentId]);

    // 2. Remove registrations for this student
    await connection.query(`DELETE FROM registrations WHERE student_id = ?`, [studentId]);

    // 3. Delete student record
    await connection.query(`DELETE FROM students WHERE id = ?`, [studentId]);

    await connection.commit();

    await logAction({
      adminId: req.user.id,
      action: 'DELETE_STUDENT',
      entityType: 'student',
      entityId: studentId,
      details: { candidateName: student.candidate_name, regNo: student.reg_no }
    });

    return res.json({
      success: true,
      message: `Student "${student.candidate_name}" (Reg No: ${student.reg_no}) deleted successfully.`
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
}

module.exports = {
  lookupStudent,
  liveSearchStudents,
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  toggleStudentStatus,
  deleteStudent
};


