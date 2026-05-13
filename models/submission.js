const mongoose = require("mongoose");

const SubmissionSchema = new mongoose.Schema(
  {
    // ── Meta ──────────────────────────────────────────────────
    estate:    { type: String, required: true },
    sheetName: { type: String, required: true },
    status:    { type: String, enum: ["pending", "accepted", "denied"], default: "pending" },
    fileNo:    { type: String, default: "" },
    passportPhoto: {type: String, default: ""},

    // ── Personal Data ─────────────────────────────────────────
    title:               { type: String, default: "" },
    surname:             { type: String, required: true },
    firstName:           { type: String, required: true },
    otherName:           { type: String, default: "" },
    gender:              { type: String, default: "" },
    maritalStatus:       { type: String, default: "" },
    maidenName:          { type: String, default: "" },
    dob:                 { type: String, default: "" },
    nationality:         { type: String, default: "" },
    residentialAddress:  { type: String, default: "" },
    mailingAddress:      { type: String, default: "" },
    email:               { type: String, required: true },
    mobile:              { type: String, required: true },
    homeTelephone:       { type: String, default: "" },

    // ── Identification ────────────────────────────────────────
    idType:       { type: String, default: "" },
    idIssueDate:  { type: String, default: "" },
    idExpiryDate: { type: String, default: "" },
    idNo:         { type: String, default: "" },
    pep:          { type: Boolean, default: false },

    // ── Next of Kin ───────────────────────────────────────────
    kinFullName:    { type: String, default: "" },
    kinRelationship:{ type: String, default: "" },
    kinMobile:      { type: String, default: "" },
    kinAddress:     { type: String, default: "" },
    kinOccupation:  { type: String, default: "" },
    kinEmail:       { type: String, default: "" },

    // ── Employment ────────────────────────────────────────────
    employer:          { type: String, default: "" },
    designation:       { type: String, default: "" },
    employerAddress:   { type: String, default: "" },
    employerTelephone: { type: String, default: "" },

    // ── Payment & Plots ───────────────────────────────────────
    paymentOption: { type: String, default: "" },
    numberOfPlots: { type: String, default: "" },
    plotSize:      { type: String, default: "" },
    plotType:      { type: String, default: "" },
    conerpiece:          { type: Boolean, default: false },

    // ── Extra Charges ─────────────────────────────────────────
extraCharges: {
  type: [{ label: { type: String }, amount: { type: String } }],
  default: [],
},

    // ── Declaration ───────────────────────────────────────────
    declarationName: { type: String, default: "" },
    declarationOf:   { type: String, default: "" },
    signatureDate:   { type: String, default: "" },
    signatureData:   { type: String, default: "" },

    // ── Document Pickup ───────────────────────────────────────
    documentPickup: { type: String, default: "" },

    // ── Realtor (optional, admin can also fill) ───────────────
    realtorName:  { type: String, default: "" },
    realtorGroup: { type: String, default: "" },
    realtorPhone: { type: String, default: "" },
    realtorEmail: { type: String, default: "" },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

module.exports = mongoose.model("Submission", SubmissionSchema);