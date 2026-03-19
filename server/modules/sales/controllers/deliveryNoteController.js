import DeliveryNote from '../../../Models/Sales/DeliveryNote.js';
import Sequence from '../../../Models/SequenceModel.js';
import SalesOrder from '../../../Models/Sales/SalesOrder.js';

export const getNextDeliveryNoteNumber = async (req, res) => {
  try {
    const { financialYear = '2025-26' } = req.query;
    const sequence = await Sequence.findOneAndUpdate(
      { documentType: 'DeliveryNote', financialYear },
      { $inc: { sequenceNumber: 1 } },
      { new: true, upsert: true }
    );
    const deliveryNoteNumber = `DN-${financialYear}-${String(sequence.sequenceNumber).padStart(5, '0')}`;
    res.json({ deliveryNoteNumber, sequenceNumber: sequence.sequenceNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createDeliveryNote = async (req, res) => {
  try {
    const note = new DeliveryNote(req.body);
    await note.save();
    
    // Update Sales Order status if all items delivered
    if (req.body.salesOrderId) {
      const salesOrder = await SalesOrder.findById(req.body.salesOrderId);
      if (salesOrder && req.body.status === 'Delivered') {
        salesOrder.status = 'Delivered';
        await salesOrder.save();
      }
    }
    
    const populated = await note.populate(['customerId', 'salesOrderId']);
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getDeliveryNotes = async (req, res) => {
  try {
    const notes = await DeliveryNote.find()
      .populate('customerId')
      .populate('salesOrderId')
      .sort({ date: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getDeliveryNoteById = async (req, res) => {
  try {
    const note = await DeliveryNote.findById(req.params.id)
      .populate('customerId')
      .populate('salesOrderId');
    if (!note) return res.status(404).json({ error: 'Delivery note not found' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateDeliveryNote = async (req, res) => {
  try {
    const note = await DeliveryNote.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('customerId').populate('salesOrderId');
    if (!note) return res.status(404).json({ error: 'Delivery note not found' });
    res.json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const note = await DeliveryNote.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    ).populate('customerId').populate('salesOrderId');
    if (!note) return res.status(404).json({ error: 'Delivery note not found' });
    
    // Update related Sales Order status
    if (note.salesOrderId && status === 'Delivered') {
      await SalesOrder.findByIdAndUpdate(
        note.salesOrderId,
        { status: 'Delivered' },
        { new: true }
      );
    }
    
    res.json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteDeliveryNote = async (req, res) => {
  try {
    const note = await DeliveryNote.findByIdAndDelete(req.params.id);
    if (!note) return res.status(404).json({ error: 'Delivery note not found' });
    res.json({ _id: note._id, deliveryNoteNumber: note.deliveryNoteNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
