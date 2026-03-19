import express from "express";
import {
  addAccountGroup,
  getAccountGroups,
  getAccountGroupById,
  updateAccountGroup,
  deleteAccountGroup,
  getGroupsByType
} from "../controllers/accountGroupController.js";

const router = express.Router();

router.post("/addaccountgroup", addAccountGroup);
router.get("/getaccountgroups", getAccountGroups);
router.get("/getaccountgroup/:id", getAccountGroupById);
router.put("/updateaccountgroup/:id", updateAccountGroup);
router.delete("/deleteaccountgroup/:id", deleteAccountGroup);
router.get("/getgroupsbytype/:type", getGroupsByType);

export default router;
