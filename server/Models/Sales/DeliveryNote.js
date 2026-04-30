import mongoose from 'mongoose';

const DeliveryNoteSchema = new mongoose.Schema(
  {
    deliveryNoteNumber: { type: String, required: true, unique: true },
    financialYear: { type: String, default: '2025-26' },
    salesOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder', sparse: true },
    salesInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesInvoice' },
    date: { type: Date, required: true },
    deliveryDate: { type: Date, required: true },
    
    // Customer Info
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, required: true },
    customerPhone: { type: String },
    customerTRN: { type: String },
    customerAddress: { type: String },
    customerContact: { type: String },
    deliveredTo: { type: String },
    
    // Delivery Details
    vehicleNumber: { type: String },
    driverName: { type: String },
    driverPhone: { type: String },
    sealNumber: { type: String },
    receivedBy: { type: String },
    
    // Items with Delivery Tracking
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        itemName: { type: String },
        itemcode: { type: String },
        orderedQuantity: { type: Number, default: 0 },
        deliveredQuantity: { type: Number, required: true },
        unitPrice: { type: Number, default: 0 },
        lineAmount: { type: Number, default: 0 },
        discountPercentage: { type: Number, default: 0 },
        discountAmount: { type: Number, default: 0 },
        amountAfterDiscount: { type: Number, default: 0 },
        batchNumber: { type: String },
        expiryDate: { type: Date },
        serialNumbers: [{ type: String }],
        note: { type: String },
        remark: { type: String }
      }
    ],
    
    // Financial Summary
    totalOrderedQuantity: { type: Number, default: 0 },
    totalDeliveredQuantity: { type: Number, default: 0 },
    totalItems: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    discountPercentage: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    totalAfterDiscount: { type: Number, default: 0 },
    vatPercentage: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    totalIncludeVat: { type: Number, default: 0 },
    
    // Status & Notes
    status: {
      type: String,
      enum: ['Draft', 'Partial', 'Delivered', 'Returned', 'Cancelled'],
      default: 'Draft'
    },
    notes: { type: String },
    remarks: { type: String },
    terms: { type: String },
    
    // Tracking
    deliveryReference: { type: String },
    courierName: { type: String },
    trackingNumber: { type: String }
  },
  { timestamps: true, collection: 'delivery_notes' }
);

const DeliveryNote = mongoose.model('DeliveryNote', DeliveryNoteSchema);
export default DeliveryNote;
