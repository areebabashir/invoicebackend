const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');


/**
* Create an .xlsx workbook from a 2D array (AOA) and save to disk.
* Returns absolute path to the saved file.
*/
function aoaToWorkbookAndSave(aoa, sheetName = 'Invoice', outDir, outFileBase) {
const ws = XLSX.utils.aoa_to_sheet(aoa);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, sheetName);


if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${outFileBase}.xlsx`);
XLSX.writeFile(wb, outPath);
return outPath;
}


/** Convert AOA to CSV string */
function aoaToCsvString(aoa) {
// Basic CSV join; for more complex cases use csv-stringify
return aoa.map(row => row.map(cell => {
const v = (cell === undefined || cell === null) ? '' : String(cell);
if (v.includes(',') || v.includes('"') || v.includes('\n')) {
return '"' + v.replace(/"/g, '""') + '"';
}
return v;
}).join(',')).join('\n');
}


module.exports = { aoaToWorkbookAndSave, aoaToCsvString };