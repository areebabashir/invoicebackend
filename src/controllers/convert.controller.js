const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const { Parser } = require("json2csv");
const PDFParser = require("pdf2json");
const {
  GoogleGenerativeAI,
} = require("@google/generative-ai");
require("dotenv").config();

// Upload + Convert Controller
exports.uploadAndConvert = async (req, res) => {
  try {
    console.log("📥 Incoming file:", req.file);

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = path.join(__dirname, "../../uploads", req.file.filename);
    console.log("📂 File saved at:", filePath);

    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    if (fileExtension === ".pdf") {
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

      const pdfParser = new PDFParser(this, 1);

      pdfParser.on("pdfParser_dataError", (errData) => {
        console.error(errData.parserError);
        res.status(500).json({ error: "PDF parsing error" });
      });

      pdfParser.on("pdfParser_dataReady", async (pdfData) => {
        try {
          const rawText = pdfParser.getRawTextContent();

          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

          const prompt = `You are an expert financial data analyst specializing in bank statements. Your task is to extract transaction data from the following text and format it as comma-separated values (CSV).

The CSV must have these exact columns: "Date", "Transaction ID", "Sender/Receiver Name", "Debit", "Credit".

- "Date": The transaction date. Standardize it to YYYY-MM-DD format if possible.
- "Transaction ID": The unique reference code for the transaction.
- "Sender/Receiver Name": The name of the other party (sender or receiver).
- "Debit": The outgoing amount.
- "Credit": The incoming amount.

The first line of your output must be the headers: "Date,Transaction ID,Sender/Receiver Name,Debit,Credit".
Analyze the text carefully. If a value for a column is not present in a transaction, leave it blank.

Here is the text from the bank statement:
${rawText}`;

          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();

          const lines = text.trim().split("\n");
          const header = lines.shift().split(",");
          const dateIndex = header.findIndex((h) => h.trim() === "Date");

          const data = lines.map((line) => line.split(","));

          if (dateIndex !== -1) {
            data.sort((a, b) => {
              const dateA = new Date(a[dateIndex]);
              const dateB = new Date(b[dateIndex]);
              if (isNaN(dateA.getTime())) return 1;
              if (isNaN(dateB.getTime())) return -1;
              return dateA - dateB;
            });
          }

          const sortedData = [header, ...data];

          const workbook = xlsx.utils.book_new();
          const worksheet = xlsx.utils.aoa_to_sheet(sortedData);
          xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1");

          const excelFilename = `${Date.now()}_converted.xlsx`;
          const excelPath = path.join(
            __dirname,
            "../../uploads",
            excelFilename
          );

          xlsx.writeFile(workbook, excelPath);

          res.download(excelPath, excelFilename, (err) => {
            if (err) {
              console.error("❌ Download failed:", err);
            }
            fs.unlinkSync(filePath);
          });
        } catch (error) {
          console.error("🔥 Error processing PDF data:", error);
          res
            .status(500)
            .json({
              error: "Failed to process PDF data",
              details: error.message,
            });
        }
      });

      pdfParser.loadPDF(filePath);
    } else if (fileExtension === ".xlsx" || fileExtension === ".xls") {
      // Existing Excel to CSV conversion
      let workbook;
      try {
        workbook = xlsx.readFile(filePath);
      } catch (err) {
        console.error("❌ Error reading Excel file:", err);
        return res
          .status(500)
          .json({ error: "Failed to read Excel file", details: err.message });
      }

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      let jsonData;
      try {
        jsonData = xlsx.utils.sheet_to_json(sheet, { defval: "" });
        console.log("✅ Extracted JSON (first 5 rows):", jsonData.slice(0, 5));
      } catch (err) {
        console.error("❌ Error converting to JSON:", err);
        return res
          .status(500)
          .json({ error: "Failed to parse sheet", details: err.message });
      }

      if (!jsonData || jsonData.length === 0) {
        return res.status(400).json({ error: "No data found in Excel sheet" });
      }

      let csv;
      try {
        const fields = Object.keys(jsonData[0]);
        console.log("📑 Detected Columns:", fields);

        const json2csvParser = new Parser({ fields });
        csv = json2csvParser.parse(jsonData);
      } catch (err) {
        console.error("❌ Error converting to CSV:", err);
        return res
          .status(500)
          .json({ error: "Failed to convert JSON to CSV", details: err.message });
      }

      const csvFilename = `${Date.now()}_converted.csv`;
      const csvPath = path.join(__dirname, "../../uploads", csvFilename);

      try {
        fs.writeFileSync(csvPath, csv);
        console.log("💾 CSV saved at:", csvPath);
      } catch (err) {
        console.error("❌ Error saving CSV:", err);
        return res
          .status(500)
          .json({ error: "Failed to save CSV", details: err.message });
      }

      res.download(csvPath, csvFilename, (err) => {
        if (err) {
          console.error("❌ Download failed:", err);
        }
        fs.unlinkSync(filePath);
      });
    } else {
      return res.status(400).json({ error: "Unsupported file type" });
    }
  } catch (error) {
    console.error("🔥 Unexpected error:", error);
    res
      .status(500)
      .json({ error: "Unexpected server error", details: error.message });
  }
};
