import express from 'express';
import {
  getNextDeliveryNoteNumber,
  createDeliveryNote,
  getDeliveryNotes,
  getDeliveryNoteById,
  updateDeliveryNote,
  updateStatus,
  deleteDeliveryNote
} from '../controllers/deliveryNoteController.js';

const router = express.Router();

router.get('/nextDeliveryNoteNumber', getNextDeliveryNoteNumber);
router.post('/createDeliveryNote', createDeliveryNote);
router.get('/getDeliveryNotes', getDeliveryNotes);
router.get('/getDeliveryNoteById/:id', getDeliveryNoteById);
router.put('/updateDeliveryNote/:id', updateDeliveryNote);
router.put('/updateStatus/:id', updateStatus);
router.delete('/deleteDeliveryNote/:id', deleteDeliveryNote);

export default router;
