const multer = require('multer');
const path = require('path');
const fs = require('fs');

const importsDir = path.join(__dirname, '../../uploads/imports');
if (!fs.existsSync(importsDir)) fs.mkdirSync(importsDir, { recursive: true });

// Storage for Excel/CSV student files
const importStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, importsDir);
  },
  filename: (req, file, cb) => {
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1E6)}`;
    cb(null, `import_${uniqueSuffix}_${sanitizedName}`);
  }
});

const importFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.xlsx', '.xls', '.csv'];
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV (.csv) files are permitted.'), false);
  }
};

const uploadImport = multer({
  storage: importStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: importFileFilter
});

module.exports = {
  uploadImport
};
