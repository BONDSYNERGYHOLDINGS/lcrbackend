const express    = require("express");
const router     = express.Router();
const multer     = require("multer");
const sharp = require("sharp");
const path = require("path");
const fetch      = require("node-fetch");
const Submission = require("../models/submission");
const cloudinary = require("../config/cloudinary");


// MULTER MEMORY STORAGE
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
});



// ── Helper: build the row that goes to Google Sheets ─────────────────────────
// Only sends the columns your sheet header expects
function buildSheetRow(sub) {
   const plotSummary =
    sub.numberOfPlots && sub.plotType && sub.plotSize
      ? `${sub.numberOfPlots} ${sub.plotType.toLowerCase()} plots, ${sub.plotSize}sqm each`
      : "";

  return {
    estate:       sub.estate,
    fileNo:       sub.fileNo          || "",
    clientName:   `${sub.surname} ${sub.firstName} ${sub.otherName || ""}`.trim(),
    phoneNumber:  sub.mobile          || "",
    optionalPhone:sub.homeTelephone   || "",
    email:        sub.email           || "",
    gender:       sub.gender          || "",
    maritalStatus:sub.maritalStatus   || "",
    dob:          sub.dob             || "",
    address:      sub.residentialAddress || "",
    paymentPlan:  sub.paymentOption   || "",
    type:         plotSummary,
    nextOfKin:    sub.kinFullName     || "",
    relationship: sub.kinRelationship || "",
    kinPhone:     sub.kinMobile       || "",
    kinAddress:   sub.kinAddress      || "",
    realtor:      sub.realtorName     || "",
    realtorNo:    sub.realtorPhone    || "",
    realtorEmail: sub.realtorEmail    || "",
  };
}

// ── Helper: send data to Google Apps Script ───────────────────────────────────
async function syncToGoogleSheet(sheetRow) {
  const url = process.env.APPS_SCRIPT_URL;
//   console.log("📤 Sending to Google Sheets:", sheetRow);
// console.log("📤 Apps Script URL:", url);
  if (!url || url.includes("YOUR_SCRIPT")) {

    console.warn("⚠️  APPS_SCRIPT_URL not set — skipping sheet sync");
    return;
  }
  try {
    const res = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "accept", data: sheetRow }),

      
    });
    const text = await res.text();
    // console.log("✅ Apps Script response:", text);
  } catch (err) {
    // Log but don't crash — the submission is already accepted in MongoDB
    console.error("❌ Apps Script sync failed:", err.message);
  }
}

// ── Middleware: verify admin token ────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    if (decoded === process.env.ADMIN_PASSWORD) return next();
    return res.status(401).json({ error: "Unauthorized" });
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
router.post("/auth/login", (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password required" });
  if (password !== process.env.ADMIN_PASSWORD)
    return res.status(401).json({ error: "Incorrect password" });

  const token = Buffer.from(password).toString("base64");
  return res.json({ success: true, token });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/submissions
// Client submits the form — supports multipart (with photo) or JSON (without)
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/submission",
  upload.single("passportPhoto"), // "passportPhoto" must match the field name in FormData
  async (req, res) => {
    try {
      // When sending multipart/form-data, all fields come as strings in req.body
      // When sending JSON (no photo), req.body is already parsed
      const data = req.body;
      // pep comes as a string "true"/"false" from FormData — convert to boolean
      if (typeof data.pep === "string") {
        data.pep = data.pep === "true";
      }

      if (typeof data.conerpiece === "string") {
        data.conerpiece = data.conerpiece === "true";
      }

      if (typeof data.extraCharges === "string") {
  try {
    data.extraCharges = JSON.parse(data.extraCharges);
  } catch {
    data.extraCharges = [];
  }
}
       // HANDLE IMAGE
     let imageUrl = "";

if (req.file) {
  // compress image first
  const compressedBuffer = await sharp(req.file.buffer)
    .resize(300, 300)
    .jpeg({ quality: 55 })
    .toBuffer();

  // upload to Cloudinary using buffer
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "passport_photos",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(compressedBuffer);
  });

  imageUrl = result.secure_url;
}

data.passportPhoto = imageUrl;



      const sub = new Submission(data);
      await sub.save();
      res.status(201).json({ success: true, id: sub._id });
    } catch (err) {
      console.error("Submit error:", err);
      res.status(500).json({ error: "Failed to save submission", detail: err.message });
    }
  }
);

//======================================================================
// POST /api/upload-signature
//=======================================================================
router.post("/upload-signature", upload.single("signatureFile"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "signatures" },
        (error, result) => error ? reject(error) : resolve(result)
      );
      stream.end(req.file.buffer);
    });
    res.json({ url: result.secure_url });
  } catch (err) {
    res.status(500).json({ error: "Upload failed", detail: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/submissions  (admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/submissions", requireAdmin, async (req, res) => {
  try {
    const { status, estate, search } = req.query;
    const query = {};
    if (status && status !== "all") query.status = status;
    if (estate) query.estate = estate;
    if (search) {
      query.$or = [
        { surname:   { $regex: search, $options: "i" } },
        { firstName: { $regex: search, $options: "i" } },
        { email:     { $regex: search, $options: "i" } },
        { estate:    { $regex: search, $options: "i" } },
      ];
    }
    const submissions = await Submission.find(query).sort({ createdAt: -1 });
    res.json(submissions);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/submissions/:id  (admin only)
// Update realtor info / fileNo before accepting
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/submissions/:id", requireAdmin, async (req, res) => {
  try {
    const allowed = ["realtorName", "realtorGroup", "realtorPhone", "realtorEmail", "fileNo"];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const sub = await Submission.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!sub) return res.status(404).json({ error: "Submission not found" });
    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: "Failed to update submission" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/submissions/:id/accept  (admin only)
// Accept + sync to Google Sheet
// ─────────────────────────────────────────────────────────────────────────────
router.post("/submissions/:id/accept", requireAdmin, async (req, res) => {
  try {
    // Patch any last-minute edits (realtor info, fileNo) into MongoDB first
    const patch = { status: "accepted" };
    ["realtorName","realtorGroup","realtorPhone","realtorEmail","fileNo"].forEach((k) => {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    });

    const sub = await Submission.findByIdAndUpdate(req.params.id, patch, { new: true });
    if (!sub) return res.status(404).json({ error: "Submission not found" });

    // Sync to Google Sheet — runs in background, won't block the response
    await syncToGoogleSheet(buildSheetRow(sub));
    

    res.json({ success: true, submission: sub });
  } catch (err) {
    console.error("Accept error:", err);
    res.status(500).json({ error: "Failed to accept submission", detail: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/submissions/:id/deny  (admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/submissions/:id/deny", requireAdmin, async (req, res) => {
  try {
    const sub = await Submission.findByIdAndUpdate(
      req.params.id,
      { status: "denied" },
      { new: true }
    );
    if (!sub) return res.status(404).json({ error: "Submission not found" });
    res.json({ success: true, submission: sub });
  } catch (err) {
    res.status(500).json({ error: "Failed to deny submission" });
  }
});

module.exports = router;