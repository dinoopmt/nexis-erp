import express from "express";
import {
  addChartOfAccount,
  getChartOfAccounts,
  getChartOfAccountById,
  updateChartOfAccount,
  deleteChartOfAccount,
  getBankAccounts,
  updateAccountBalance
} from "../controllers/chartOfAccountsController.js";

const router = express.Router();

router.post("/addchartofaccount", addChartOfAccount);
router.get("/getchartofaccounts", getChartOfAccounts);
router.get("/getchartofaccount/:id", getChartOfAccountById);
router.put("/updatechartofaccount/:id", updateChartOfAccount);
router.delete("/deletechartofaccount/:id", deleteChartOfAccount);
router.get("/getbankaccounts", getBankAccounts);
router.put("/updateaccountbalance/:id", updateAccountBalance);

export default router;
