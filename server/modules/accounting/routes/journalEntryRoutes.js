import express from "express";
import {
  addJournalEntry,
  getJournalEntries,
  getJournalEntryById,
  updateJournalEntry,
  postJournalEntry,
  deleteJournalEntry,
  reverseJournalEntry,
  getAccountLedger
} from "../controllers/journalEntryController.js";

const router = express.Router();

router.post("/addjournalentry", addJournalEntry);
router.get("/getjournalentries", getJournalEntries);
router.get("/getjournalentry/:id", getJournalEntryById);
router.put("/updatejournalentry/:id", updateJournalEntry);
router.put("/postjournalentry/:id", postJournalEntry);
router.delete("/deletejournalentry/:id", deleteJournalEntry);
router.post("/reversejournalentry/:id", reverseJournalEntry);
router.get("/getaccountledger", getAccountLedger);

export default router;
