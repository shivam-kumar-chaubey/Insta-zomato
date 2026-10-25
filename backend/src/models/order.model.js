const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    food: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Food',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    video: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: 'An order must contain at least one item.',
      },
    },
    restaurantName: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['Payment Pending', 'Processing', 'Delivered', 'Cancelled'],
      default: 'Processing',
      index: true,
    },
    paymentLabel: { type: String, trim: true },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Pay on delivery'],
    },
    paymentGatewayOrderId: { type: String, select: false },
    paymentGatewayPaymentId: { type: String, select: false },
    payoutStatus: {
      type: String,
      enum: [
        'Not Applicable',
        'Pending',
        'Not Connected',
        'Setup Pending',
        'Fee Pending',
        'Creating',
        'Created',
        'Processed',
        'Failed',
        'Needs Review',
      ],
      default: 'Not Applicable',
    },
    payoutAmount: { type: Number, min: 0 },
    payoutFeeAmount: { type: Number, min: 0 },
    routeTransferId: { type: String, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
