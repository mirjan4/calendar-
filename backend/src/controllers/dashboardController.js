const db = require('../config/db');

async function getDashboardStats(req, res, next) {
  try {
    // 1. Total Students
    const [totalStudents] = await db.query(`SELECT COUNT(*) AS total FROM students WHERE is_active = 1`);

    // 2. Registrations Stats (only active, excluding cancelled)
    const [regStats] = await db.query(
      `SELECT 
         COUNT(CASE WHEN status IN ('approved','pending') THEN 1 END) AS total_registrations,
         SUM(CASE WHEN registration_type = 'inside_kerala' AND status IN ('approved','pending') THEN 1 ELSE 0 END) AS inside_kerala_count,
         SUM(CASE WHEN registration_type = 'outside_kerala' AND status IN ('approved','pending') THEN 1 ELSE 0 END) AS outside_kerala_count,
         COALESCE(SUM(CASE WHEN status IN ('approved','pending') THEN calendars_allotted ELSE 0 END), 0) AS total_calendars
       FROM registrations`
    );

    const totalStudentCount = totalStudents[0].total || 0;
    const totalRegCount = regStats[0].total_registrations || 0;
    const balanceStudents = Math.max(0, totalStudentCount - totalRegCount);
    const totalCalendars = parseInt(regStats[0].total_calendars || 0, 10);

    // 3. Units Stats
    const [totalUnits] = await db.query(`SELECT COUNT(*) AS total FROM units WHERE is_active = 1`);
    const [assignedUnits] = await db.query(
      `SELECT COUNT(*) AS total FROM unit_assignments WHERE status = 'active'`
    );

    const totalUnitCount = totalUnits[0].total || 0;
    const assignedUnitCount = assignedUnits[0].total || 0;
    const availableUnitCount = Math.max(0, totalUnitCount - assignedUnitCount);

    // 4. Registrations by Class (for Chart)
    const [registrationsByClass] = await db.query(
      `SELECT s.class_name, COUNT(r.id) AS count
       FROM students s
       JOIN registrations r ON r.student_id = s.id AND r.status IN ('approved', 'pending')
       GROUP BY s.class_name
       ORDER BY count DESC, s.class_name ASC`
    );

    // 5. Registrations by Category (for Chart)
    const categoryStats = [
      { name: 'Inside Kerala', count: parseInt(regStats[0].inside_kerala_count || 0, 10) },
      { name: 'Outside Kerala', count: parseInt(regStats[0].outside_kerala_count || 0, 10) }
    ];

    // 6. Registration Trends (Last 14 days)
    const [registrationTrends] = await db.query(
      `SELECT DATE(submitted_at) AS date, COUNT(*) AS count
       FROM registrations
       WHERE submitted_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
       GROUP BY DATE(submitted_at)
       ORDER BY date ASC`
    );

    // 7. Unit Availability by District (for Chart - Full Districts)
    const [districtUnitSummary] = await db.query(
      `SELECT d.name AS district_name,
              COUNT(DISTINCT u.id) AS total_units,
              COUNT(DISTINCT ua.id) AS assigned_units
       FROM districts d
       JOIN zones z ON z.district_id = d.id
       JOIN circles c ON c.zone_id = z.id
       JOIN units u ON u.circle_id = c.id AND u.is_active = 1
       LEFT JOIN unit_assignments ua ON ua.unit_id = u.id AND ua.status = 'active'
       GROUP BY d.id, d.name
       ORDER BY total_units DESC`
    );

    const districtUnits = districtUnitSummary.map(d => ({
      district: d.district_name,
      assigned: parseInt(d.assigned_units || 0, 10),
      available: Math.max(0, parseInt(d.total_units || 0, 10) - parseInt(d.assigned_units || 0, 10))
    }));

    // 8. Recent 5 active registrations
    const [recentRegistrations] = await db.query(
      `SELECT r.id, r.registration_code, r.registration_type, r.calendars_allotted, r.submitted_at,
              s.candidate_name, s.reg_no, s.class_name
       FROM registrations r
       JOIN students s ON r.student_id = s.id
       WHERE r.status IN ('approved', 'pending')
       ORDER BY r.submitted_at DESC
       LIMIT 5`
    );

    return res.json({
      success: true,
      stats: {
        totalStudents: totalStudentCount,
        totalRegistrations: totalRegCount,
        balanceStudents: balanceStudents,
        totalCalendars: totalCalendars,
        insideKeralaRegistrations: regStats[0].inside_kerala_count || 0,
        outsideKeralaRegistrations: regStats[0].outside_kerala_count || 0,
        assignedUnits: assignedUnitCount,
        availableUnits: availableUnitCount
      },
      charts: {
        byClass: registrationsByClass,
        byCategory: categoryStats,
        trends: registrationTrends,
        unitAvailability: districtUnits
      },
      recentRegistrations
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardStats
};
