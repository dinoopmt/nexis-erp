import SalesOrder from '../../../Models/Sales/SalesOrder.js';
import Sequence from '../../../Models/SequenceModel.js';

// Get next order number
export const getNextOrderNumber = async (req, res) => {
  try {
    const { financialYear } = req.query;
    let sequence = await Sequence.findOne({ name: 'SalesOrder', financialYear });
    
    if (!sequence) {
      sequence = new Sequence({
        name: 'SalesOrder',
        financialYear,
        lastNumber: 0,
      });
    }

    sequence.lastNumber += 1;
    await sequence.save();

    const orderNumber = `SO-${financialYear}-${String(sequence.lastNumber).padStart(5, '0')}`;
    res.json({ orderNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create sales order
export const createSalesOrder = async (req, res) => {
  try {
    const order = new SalesOrder(req.body);
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all sales orders
export const getSalesOrders = async (req, res) => {
  try {
    const orders = await SalesOrder.find()
      .populate('customerId')
      .populate('items.productId')
      .sort({ createdDate: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get sales order by ID
export const getSalesOrderById = async (req, res) => {
  try {
    const order = await SalesOrder.findById(req.params.id)
      .populate('customerId')
      .populate('items.productId');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update sales order
export const updateSalesOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await SalesOrder.findByIdAndUpdate(id, req.body, { 
      returnDocument: 'after',
      runValidators: true 
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await SalesOrder.findByIdAndUpdate(
      id, 
      { status, updatedDate: new Date() }, 
      { returnDocument: 'after', runValidators: true }
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete sales order
export const deleteSalesOrder = async (req, res) => {
  try {
    const order = await SalesOrder.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted', orderId: order._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
