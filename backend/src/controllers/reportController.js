const ExcelJS = require('exceljs');
const db = require('../config/db');

/**
 * Helper to generate and stream Excel file from columns and rows
 */
async function streamExcelReport(res, filename, sheetName, columns, rows) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = columns;

  // Header style with Markaz Brand Blue
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0C629E' }
  };
  worksheet.getRow(1).height = 24;

  rows.forEach((r, idx) => {
    const row = worksheet.addRow({ sl_no: idx + 1, ...r });
    row.alignment = { vertical: 'middle' };
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);

  await workbook.xlsx.write(res);
  res.end();
}

/**
 * Helper to stream CSV
 */
function streamCsvReport(res, filename, columns, rows) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);

  const headerLine = columns.map(c => `"${c.header.replace(/"/g, '""')}"`).join(',');
  let csvContent = '\uFEFF' + headerLine + '\r\n'; // Add BOM for Excel UTF-8 compatibility

  rows.forEach((row, idx) => {
    const fullRow = { sl_no: idx + 1, ...row };
    const rowLine = columns.map(c => {
      const val = fullRow[c.key] !== null && fullRow[c.key] !== undefined ? fullRow[c.key].toString() : '';
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',');
    csvContent += rowLine + '\r\n';
  });

  res.send(csvContent);
}

/**
 * High-Value Curated Institutional Reports Handler
 */
async function getReport(req, res, next) {
  try {
    const reportType = (req.params.type || 'registrations').toLowerCase();
    const format = (req.query.format || 'json').toLowerCase();
    const search = (req.query.search || '').trim();
    const category = (req.query.category || 'all').toLowerCase();
    const className = (req.query.class_name || '').trim();

    let columns = [];
    let rows = [];
    let summary = {};
    let title = 'Report';

    switch (reportType) {
      // 1. REGISTRATIONS & CALENDAR ALLOTMENT REPORT (Primary Operational Report)
      case 'registrations':
      case 'allotments':
      case 'inside-kerala':
      case 'outside-kerala': {
        title = 'Registrations_And_Calendar_Allotments';
        columns = [
          { header: 'SL', key: 'sl_no', width: 8 },
          { header: 'Student Name', key: 'candidate_name', width: 28 },
          { header: 'Reg No', key: 'reg_no', width: 12 },
          { header: 'Class', key: 'class_name', width: 12 },
          { header: 'Category', key: 'category_label', width: 16 },
          { header: 'District / State', key: 'location_primary', width: 20 },
          { header: 'Unit Name', key: 'location_unit', width: 22 },
          { header: 'Calendars', key: 'calendars_allotted', width: 18 },
          { header: 'Submitted Date', key: 'submitted_at_formatted', width: 20 }
        ];

        let sql = `
          SELECT r.id, s.reg_no, s.candidate_name, s.class_name, r.registration_type,
                 IF(r.registration_type = 'inside_kerala', 'Inside Kerala', 'Outside Kerala') AS category_label,
                 IF(r.registration_type = 'inside_kerala', d.name, r.state_name) AS location_primary,
                 IF(r.registration_type = 'inside_kerala', u.name, r.outside_unit) AS location_unit,
                 r.calendars_requested,
                 r.additional_calendars,
                 r.calendars_allotted,
                 DATE_FORMAT(r.submitted_at, '%d-%b-%Y %h:%i %p') AS submitted_at_formatted,
                 r.submitted_at
          FROM registrations r
          JOIN students s ON r.student_id = s.id
          LEFT JOIN districts d ON r.district_id = d.id
          LEFT JOIN units u ON r.unit_id = u.id
          WHERE 1=1 AND r.status IN ('approved', 'pending')`;
        const params = [];

        // Legacy compatibility: route params
        if (reportType === 'inside-kerala' || category === 'inside_kerala') {
          sql += ` AND r.registration_type = 'inside_kerala'`;
        } else if (reportType === 'outside-kerala' || category === 'outside_kerala') {
          sql += ` AND r.registration_type = 'outside_kerala'`;
        }

        if (className) {
          sql += ` AND s.class_name = ?`;
          params.push(className);
        }

        if (search) {
          sql += ` AND (s.candidate_name LIKE ? OR s.reg_no LIKE ? OR r.registration_code LIKE ? OR u.name LIKE ? OR d.name LIKE ?)`;
          const searchTerm = `%${search}%`;
          params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }

        sql += ` ORDER BY r.submitted_at DESC`;

        const [results] = await db.query(sql, params);
        rows = results;

        // Calculate summary KPIs
        const totalRegistrations = rows.length;
        const totalCalendars = rows.reduce((sum, r) => sum + (parseInt(r.calendars_allotted, 10) || 0), 0);
        const insideCount = rows.filter(r => r.registration_type === 'inside_kerala').length;
        const outsideCount = rows.filter(r => r.registration_type === 'outside_kerala').length;

        summary = {
          totalRegistrations,
          totalCalendars,
          insideCount,
          outsideCount
        };
        break;
      }

      // 2. STUDENT DIRECTORY & REGISTRATION STATUS REPORT
      case 'students':
      case 'student-list': {
        title = 'Student_Directory_And_Coverage';
        columns = [
          { header: 'SL', key: 'sl_no', width: 8 },
          { header: 'Class', key: 'class_name', width: 12 },
          { header: 'Reg No', key: 'reg_no', width: 12 },
          { header: 'Admission No', key: 'admission_no', width: 14 },
          { header: 'Candidate Name', key: 'candidate_name', width: 28 },
          { header: 'HN / Hajer', key: 'hajer_no', width: 12 },
          { header: 'Place', key: 'place', width: 20 },
          { header: 'Mobile', key: 'mobile', width: 14 },
          { header: 'Registration Status', key: 'reg_status', width: 18 },
          { header: 'Calendars', key: 'calendars_allotted', width: 16 }
        ];

        let sql = `
          SELECT s.id, s.class_name, s.reg_no, s.admission_no, s.candidate_name, s.hajer_no, s.place, s.mobile,
                 IF(r.id IS NOT NULL, 'Registered', 'Pending Registration') AS reg_status,
                 COALESCE(r.calendars_allotted, 0) AS calendars_allotted,
                 r.registration_code
          FROM students s
          LEFT JOIN registrations r ON r.student_id = s.id AND r.status IN ('pending', 'approved')
          WHERE s.is_active = 1`;
        const params = [];

        if (className) {
          sql += ` AND s.class_name = ?`;
          params.push(className);
        }

        if (search) {
          sql += ` AND (s.candidate_name LIKE ? OR s.reg_no LIKE ? OR s.admission_no LIKE ? OR s.place LIKE ?)`;
          const searchTerm = `%${search}%`;
          params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        sql += ` ORDER BY s.reg_no ASC`;

        const [results] = await db.query(sql, params);
        rows = results;

        const totalStudents = rows.length;
        const registeredStudents = rows.filter(r => r.reg_status === 'Registered').length;
        const balanceStudents = totalStudents - registeredStudents;
        const totalCalendars = rows.reduce((sum, r) => sum + (parseInt(r.calendars_allotted, 10) || 0), 0);

        summary = {
          totalStudents,
          registeredStudents,
          balanceStudents,
          totalCalendars
        };
        break;
      }

      // 3. CLASS-WISE ALLOTMENT SUMMARY
      case 'class-wise': {
        title = 'Class_Wise_Distribution_Summary';
        columns = [
          { header: 'SL', key: 'sl_no', width: 8 },
          { header: 'Class Name', key: 'class_name', width: 18 },
          { header: 'Total Students', key: 'total_students', width: 16 },
          { header: 'Registered', key: 'registered_students', width: 16 },
          { header: 'Balance Students', key: 'balance_students', width: 16 },
          { header: 'Completion %', key: 'completion_rate', width: 16 },
          { header: 'Total Calendars', key: 'total_calendars', width: 18 }
        ];

        let sql = `
          SELECT s.class_name,
                 COUNT(DISTINCT s.id) AS total_students,
                 COUNT(DISTINCT r.id) AS registered_students,
                 GREATEST(0, COUNT(DISTINCT s.id) - COUNT(DISTINCT r.id)) AS balance_students,
                 CONCAT(ROUND((COUNT(DISTINCT r.id) / NULLIF(COUNT(DISTINCT s.id), 0)) * 100, 1), '%') AS completion_rate,
                 COALESCE(SUM(r.calendars_allotted), 0) AS total_calendars
          FROM students s
          LEFT JOIN registrations r ON r.student_id = s.id AND r.status IN ('pending', 'approved')
          WHERE s.is_active = 1
          GROUP BY s.class_name
          ORDER BY s.class_name ASC`;

        const [results] = await db.query(sql);
        rows = results;

        const totalClasses = rows.length;
        const totalStudents = rows.reduce((sum, r) => sum + (parseInt(r.total_students, 10) || 0), 0);
        const registeredStudents = rows.reduce((sum, r) => sum + (parseInt(r.registered_students, 10) || 0), 0);
        const balanceStudents = totalStudents - registeredStudents;
        const totalCalendars = rows.reduce((sum, r) => sum + (parseInt(r.total_calendars, 10) || 0), 0);

        summary = {
          totalClasses,
          totalStudents,
          registeredStudents,
          balanceStudents,
          totalCalendars
        };
        break;
      }

      // 4. DISTRICT-WISE PLACE DISTRIBUTION
      case 'district-wise': {
        title = 'District_Wise_Place_Distribution';
        columns = [
          { header: 'SL', key: 'sl_no', width: 8 },
          { header: 'District', key: 'district_name', width: 20 },
          { header: 'Total Zones', key: 'total_zones', width: 14 },
          { header: 'Total Units', key: 'total_units', width: 14 },
          { header: 'Allotted Units', key: 'assigned_units', width: 16 },
          { header: 'Available Units', key: 'available_units', width: 16 },
          { header: 'Calendars Total', key: 'total_calendars', width: 16 }
        ];

        let sql = `
          SELECT d.name AS district_name,
                 COUNT(DISTINCT z.id) AS total_zones,
                 COUNT(DISTINCT u.id) AS total_units,
                 COUNT(DISTINCT ua.id) AS assigned_units,
                 GREATEST(0, COUNT(DISTINCT u.id) - COUNT(DISTINCT ua.id)) AS available_units,
                 COALESCE(SUM(r.calendars_allotted), 0) AS total_calendars
          FROM districts d
          LEFT JOIN zones z ON z.district_id = d.id
          LEFT JOIN circles c ON c.zone_id = z.id
          LEFT JOIN units u ON u.circle_id = c.id AND u.is_active = 1
          LEFT JOIN unit_assignments ua ON ua.unit_id = u.id AND ua.status = 'active'
          LEFT JOIN registrations r ON r.unit_id = u.id AND r.status IN ('pending', 'approved')
          GROUP BY d.id, d.name
          ORDER BY d.name ASC`;

        const [results] = await db.query(sql);
        rows = results;

        const totalDistricts = rows.length;
        const totalUnits = rows.reduce((sum, r) => sum + (parseInt(r.total_units, 10) || 0), 0);
        const assignedUnits = rows.reduce((sum, r) => sum + (parseInt(r.assigned_units, 10) || 0), 0);
        const availableUnits = rows.reduce((sum, r) => sum + (parseInt(r.available_units, 10) || 0), 0);
        const totalCalendars = rows.reduce((sum, r) => sum + (parseInt(r.total_calendars, 10) || 0), 0);

        summary = {
          totalDistricts,
          totalUnits,
          assignedUnits,
          availableUnits,
          totalCalendars
        };
        break;
      }

      // 5. AVAILABLE / VACANT UNITS DIRECTORY
      case 'available-units':
      case 'vacant-units': {
        title = 'Vacant_Available_Units_Directory';
        columns = [
          { header: 'SL', key: 'sl_no', width: 8 },
          { header: 'District', key: 'district_name', width: 18 },
          { header: 'Zone', key: 'zone_name', width: 18 },
          { header: 'Circle', key: 'circle_name', width: 18 },
          { header: 'Available Unit Name', key: 'unit_name', width: 24 }
        ];

        let sql = `
          SELECT d.name AS district_name, z.name AS zone_name, c.name AS circle_name, u.name AS unit_name
          FROM units u
          JOIN circles c ON u.circle_id = c.id
          JOIN zones z ON c.zone_id = z.id
          JOIN districts d ON z.district_id = d.id
          WHERE u.is_active = 1
            AND u.id NOT IN (SELECT ua.unit_id FROM unit_assignments ua WHERE ua.status = 'active')`;
        const params = [];

        if (search) {
          sql += ` AND (u.name LIKE ? OR d.name LIKE ? OR z.name LIKE ? OR c.name LIKE ?)`;
          const searchTerm = `%${search}%`;
          params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        sql += ` ORDER BY d.name ASC, z.name ASC, c.name ASC, u.name ASC`;

        const [results] = await db.query(sql, params);
        rows = results;

        const uniqueDistricts = new Set(rows.map(r => r.district_name)).size;
        summary = {
          totalAvailableUnits: rows.length,
          districtsWithVacantUnits: uniqueDistricts
        };
        break;
      }

      default: {
        return res.status(400).json({ success: false, message: `Unknown report type "${reportType}"` });
      }
    }

    if (format === 'excel') {
      return streamExcelReport(res, title, title.replace(/_/g, ' '), columns, rows);
    } else if (format === 'csv') {
      return streamCsvReport(res, title, columns, rows);
    } else {
      return res.json({
        success: true,
        reportType,
        title: title.replace(/_/g, ' '),
        columns,
        totalRows: rows.length,
        summary,
        rows
      });
    }
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getReport
};

