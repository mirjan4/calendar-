const ExcelJS = require('exceljs');
const csvParser = require('csv-parser');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { logAction } = require('../utils/auditLogger');

/**
 * Standardize column headers
 */
function normalizeHeader(header) {
  if (!header) return '';
  return header.toString().trim().toUpperCase().replace(/[\s_]+/g, ' ');
}

/**
 * Parse an Excel file into row objects
 */
async function parseExcelFile(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error('Spreadsheet contains no worksheets');
  }

  const rows = [];
  let headerMap = {};

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        headerMap[colNumber] = normalizeHeader(cell.value);
      });
    } else {
      let rowData = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headerMap[colNumber];
        if (header) {
          // Format text values nicely
          let val = cell.value;
          if (val && typeof val === 'object' && val.text) val = val.text;
          rowData[header] = val !== null && val !== undefined ? val.toString().trim() : '';
        }
      });
      rows.push(rowData);
    }
  });

  return rows;
}

/**
 * Parse a CSV file into row objects
 */
function parseCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csvParser({
        mapHeaders: ({ header }) => normalizeHeader(header)
      }))
      .on('data', (data) => rows.push(data))
      .on('end', () => resolve(rows))
      .on('error', (err) => reject(err));
  });
}

/**
 * Map flexible column variants to standard fields:
 * SL, CLASS, HN, REG, CANDIDATE NAME, PLACE, MOBILE
 */
function mapRowToStudent(raw) {
  const keys = Object.keys(raw);

  const findVal = (patterns) => {
    for (const key of keys) {
      for (const p of patterns) {
        if (key === p || key.includes(p)) {
          return (raw[key] || '').toString().trim();
        }
      }
    }
    return '';
  };

  const sl = findVal(['SL', 'SL NO', 'SLNO', 'SERIAL']);
  const className = findVal(['CLASS', 'CLASS NAME', 'COURSE']);
  const hn = findVal(['HN', 'HAJER', 'HAJER NO', 'HAJERNO', 'HALL', 'HALL NO', 'HALLNO']);
  const reg = findVal(['REG', 'REG NO', 'REGNO', 'REGISTRATION NO', 'REGISTRATION NUMBER']);
  const admn = findVal(['ADMN', 'ADMN NO', 'ADMISSION NO', 'ADMISSION NUMBER']) || reg;
  const name = findVal(['CANDIDATE NAME', 'STUDENT NAME', 'CANDIDATE', 'NAME']);
  const place = findVal(['PLACE', 'LOCATION', 'CITY', 'ADDRESS']);
  const mobile = findVal(['MOBILE', 'MOBILE NO', 'PHONE', 'CONTACT']);

  return {
    raw,
    sl: sl ? parseInt(sl, 10) || null : null,
    className: className.toUpperCase(),
    hn: hn || null,
    regNo: reg,
    admissionNo: admn,
    candidateName: name.toUpperCase(),
    place: place || null,
    mobile: mobile.replace(/[^0-9]/g, '')
  };
}

/**
 * Step 1: Preview uploaded file
 */
async function previewImport(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel (.xlsx, .xls) or CSV file.' });
    }

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    let rawRows = [];
    if (ext === '.csv') {
      rawRows = await parseCsvFile(filePath);
    } else {
      rawRows = await parseExcelFile(filePath);
    }

    if (rawRows.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ success: false, message: 'The uploaded file is empty.' });
    }

    // Fetch existing students from database for duplicate checking
    const [existingStudents] = await db.query(`SELECT reg_no FROM students`);
    const existingRegSet = new Set(existingStudents.map(s => s.reg_no.toString().toLowerCase()));

    const seenInFile = new Set();
    let validCount = 0;
    let invalidCount = 0;
    let newCount = 0;
    let existingCount = 0;

    const evaluatedRows = [];

    rawRows.forEach((raw, idx) => {
      const rowNumber = idx + 2; // Accounting for 1-based index + header
      const mapped = mapRowToStudent(raw);
      const errors = [];

      // Validation Rules
      if (!mapped.regNo) {
        errors.push('Missing Registration Number (REG)');
      } else {
        const lowerReg = mapped.regNo.toLowerCase();
        if (seenInFile.has(lowerReg)) {
          errors.push(`Duplicate Registration Number "${mapped.regNo}" within spreadsheet`);
        } else {
          seenInFile.add(lowerReg);
        }
      }

      if (!mapped.candidateName) {
        errors.push('Missing Candidate Name');
      }

      if (!mapped.className) {
        errors.push('Missing Class');
      }

      if (!mapped.hn) {
        errors.push('Missing HN (Hajer No)');
      }

      // Mobile is optional - validate format only if provided
      if (mapped.mobile && (mapped.mobile.length < 7 || mapped.mobile.length > 15)) {
        errors.push(`Invalid Mobile Number "${mapped.mobile}"`);
      }

      const isValid = errors.length === 0;
      const isExistingInDb = mapped.regNo ? existingRegSet.has(mapped.regNo.toLowerCase()) : false;

      if (isValid) {
        validCount++;
        if (isExistingInDb) {
          existingCount++;
        } else {
          newCount++;
        }
      } else {
        invalidCount++;
      }

      evaluatedRows.push({
        rowNumber,
        ...mapped,
        isValid,
        isExistingInDb,
        errors
      });
    });

    return res.json({
      success: true,
      fileKey: path.basename(filePath),
      originalName: req.file.originalname,
      totalRows: rawRows.length,
      validRows: validCount,
      invalidRows: invalidCount,
      newStudents: newCount,
      existingStudents: existingCount,
      sampleRows: evaluatedRows.slice(0, 25), // Preview first 25 rows
      sampleErrors: evaluatedRows.filter(r => !r.isValid).slice(0, 20)
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(err);
  }
}

/**
 * Step 2: Confirm and Execute Import with Transaction
 */
async function confirmImport(req, res, next) {
  let connection;
  try {
    const { fileKey, importMode } = req.body; // 'insert_only', 'update_only', 'insert_and_update'

    if (!fileKey) {
      return res.status(400).json({ success: false, message: 'fileKey is required.' });
    }

    if (!['insert_only', 'update_only', 'insert_and_update'].includes(importMode)) {
      return res.status(400).json({ success: false, message: 'Invalid importMode specified.' });
    }

    const filePath = path.join(__dirname, '../../uploads/imports', fileKey);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Uploaded file has expired or was removed. Please upload again.' });
    }

    const ext = path.extname(filePath).toLowerCase();
    let rawRows = [];
    if (ext === '.csv') {
      rawRows = await parseCsvFile(filePath);
    } else {
      rawRows = await parseExcelFile(filePath);
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Create Import History Record
    const [historyResult] = await connection.query(
      `INSERT INTO student_import_history (file_name, import_mode, total_rows, uploaded_by, status)
       VALUES (?, ?, ?, ?, 'partial')`,
      [path.basename(filePath), importMode, rawRows.length, req.user.id]
    );
    const importHistoryId = historyResult.insertId;

    // Fetch existing students map for fast lookups
    const [existingStudents] = await connection.query(`SELECT id, reg_no FROM students`);
    const dbStudentMap = new Map();
    existingStudents.forEach(s => dbStudentMap.set(s.reg_no.toLowerCase(), s.id));

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errorsToInsert = [];
    const seenInFile = new Set();

    for (let i = 0; i < rawRows.length; i++) {
      const rowNumber = i + 2;
      const raw = rawRows[i];
      const mapped = mapRowToStudent(raw);
      const errors = [];

      // Validations
      if (!mapped.regNo) {
        errors.push('Missing Registration Number');
      } else {
        const lowerReg = mapped.regNo.toLowerCase();
        if (seenInFile.has(lowerReg)) {
          errors.push(`Duplicate Registration Number "${mapped.regNo}" within file`);
        } else {
          seenInFile.add(lowerReg);
        }
      }

      if (!mapped.candidateName) errors.push('Missing Candidate Name');
      if (!mapped.className) errors.push('Missing Class');
      if (!mapped.hn) errors.push('Missing HN (Hajer No)');
      if (mapped.mobile && (mapped.mobile.length < 7 || mapped.mobile.length > 15)) {
        errors.push('Invalid Mobile Number');
      }

      if (errors.length > 0) {
        failedCount++;
        errorsToInsert.push([importHistoryId, rowNumber, JSON.stringify(raw), errors.join('; ')]);
        continue;
      }

      const lowerReg = mapped.regNo.toLowerCase();
      const existingStudentId = dbStudentMap.get(lowerReg);

      if (existingStudentId) {
        if (importMode === 'insert_only') {
          skippedCount++;
        } else {
          // Update existing student
          await connection.query(
            `UPDATE students SET
               class_name = ?,
               hajer_no = COALESCE(?, hajer_no),
               admission_no = COALESCE(?, admission_no),
               candidate_name = ?,
               place = COALESCE(?, place),
               mobile = COALESCE(?, mobile)
             WHERE id = ?`,
            [
              mapped.className,
              mapped.hn,
              mapped.admissionNo,
              mapped.candidateName,
              mapped.place,
              mapped.mobile || null,
              existingStudentId
            ]
          );
          updatedCount++;
        }
      } else {
        if (importMode === 'update_only') {
          skippedCount++;
        } else {
          // Insert new student
          const [insResult] = await connection.query(
            `INSERT INTO students (class_name, hajer_no, reg_no, admission_no, candidate_name, place, mobile, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
            [
              mapped.className,
              mapped.hn,
              mapped.regNo,
              mapped.admissionNo,
              mapped.candidateName,
              mapped.place,
              mapped.mobile || null
            ]
          );
          dbStudentMap.set(lowerReg, insResult.insertId);
          importedCount++;
        }
      }
    }

    // Insert error rows if any
    if (errorsToInsert.length > 0) {
      await connection.query(
        `INSERT INTO student_import_errors (import_id, row_number, raw_data, error_reason) VALUES ?`,
        [errorsToInsert]
      );
    }

    // Update History Record
    await connection.query(
      `UPDATE student_import_history SET
         imported_rows = ?,
         updated_rows = ?,
         skipped_rows = ?,
         failed_rows = ?,
         status = 'completed'
       WHERE id = ?`,
      [importedCount, updatedCount, skippedCount, failedCount, importHistoryId]
    );

    await connection.commit();
    connection.release();

    await logAction({
      adminId: req.user.id,
      action: 'IMPORT_STUDENTS',
      entityType: 'student_import_history',
      entityId: importHistoryId,
      details: {
        fileKey,
        importMode,
        totalRows: rawRows.length,
        importedCount,
        updatedCount,
        skippedCount,
        failedCount
      }
    });

    return res.json({
      success: true,
      message: 'Student import completed successfully!',
      summary: {
        importId: importHistoryId,
        totalRows: rawRows.length,
        imported: importedCount,
        updated: updatedCount,
        skipped: skippedCount,
        failed: failedCount
      }
    });
  } catch (err) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    next(err);
  }
}

/**
 * Get past import history
 */
async function getImportHistory(req, res, next) {
  try {
    const [history] = await db.query(
      `SELECT h.*, a.full_name AS uploaded_by_name
       FROM student_import_history h
       LEFT JOIN admins a ON h.uploaded_by = a.id
       ORDER BY h.id DESC`
    );
    return res.json({ success: true, history });
  } catch (err) {
    next(err);
  }
}

/**
 * Download rejected rows for a specific import
 */
async function downloadRejectedRows(req, res, next) {
  try {
    const importId = req.params.id;
    const [errors] = await db.query(
      `SELECT row_number, raw_data, error_reason FROM student_import_errors WHERE import_id = ? ORDER BY row_number ASC`,
      [importId]
    );

    if (errors.length === 0) {
      return res.status(404).json({ success: false, message: 'No rejected rows found for this import.' });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Rejected Rows');

    sheet.columns = [
      { header: 'Row Number', key: 'row_number', width: 12 },
      { header: 'Error Reason', key: 'error_reason', width: 40 },
      { header: 'Raw Data', key: 'raw_data', width: 60 }
    ];

    errors.forEach(err => {
      sheet.addRow({
        row_number: err.row_number,
        error_reason: err.error_reason,
        raw_data: typeof err.raw_data === 'string' ? err.raw_data : JSON.stringify(err.raw_data)
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=rejected_rows_import_${importId}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  previewImport,
  confirmImport,
  getImportHistory,
  downloadRejectedRows
};
