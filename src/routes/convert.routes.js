const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { uploadAndConvert } = require("../controllers/convert.controller");

router.post("/", upload.single("file"), uploadAndConvert);

module.exports = router;
