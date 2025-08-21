const multer = require('multer');
const path = require('path');
const fs = require('fs');


const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };


const storage = multer.diskStorage({
destination: (req, file, cb) => {
const dir = path.join(__dirname, '../../uploads');
ensureDir(dir);
cb(null, dir);
},
filename: (req, file, cb) => {
const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
cb(null, unique + path.extname(file.originalname));
}
});


const fileFilter = (req, file, cb) => {
  // Accept Excel and PDF files
  const allowed = /(xlsx|xls|pdf)$/i;
  const ext = path.extname(file.originalname);
  if (allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only Excel and PDF files are allowed"));
  }
};


module.exports = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });