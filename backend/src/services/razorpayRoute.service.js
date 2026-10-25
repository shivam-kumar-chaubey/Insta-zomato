const Razorpay = require('razorpay');
const foodModel = require('../models/food.model');
const orderModel = require('../models/order.model');
const foodPartnerModel = require('../models/foodpartner.model');

const RETRYABLE_PAYOUT_STATUSES = ['Pending', 'Not Connected', 'Setup Pending', 'Fee Pending'];

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay keys are not configured.');
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

async function setPayoutStatus(orderId, status, extra = {}) {
  await orderModel.updateOne(
    { _id: orderId, payoutStatus: 'Creating' },
    { $set: { payoutStatus: status, ...extra } },
  );
}

async function initiateOrderTransfer(orderId, partnerId) {
  const order = await orderModel.findOneAndUpdate(
    {
      _id: orderId,
      paymentStatus: 'Paid',
      payoutStatus: { $in: RETRYABLE_PAYOUT_STATUSES },
    },
    { $set: { payoutStatus: 'Creating' } },
    { new: true },
  ).select('+paymentGatewayPaymentId');
  if (!order) return;

  const partner = await foodPartnerModel.findById(partnerId)
    .select('+routeLinkedAccountId +routeProductId');
  if (!partner?.routeLinkedAccountId) {
    await setPayoutStatus(order._id, 'Not Connected');
    return;
  }
  if (partner.routeProductStatus !== 'activated') {
    await setPayoutStatus(order._id, 'Setup Pending');
    return;
  }
  if (
    partner.routeAccountCreatedAt &&
    Date.now() - partner.routeAccountCreatedAt.getTime() < 24 * 60 * 60 * 1000
  ) {
    await setPayoutStatus(order._id, 'Setup Pending');
    return;
  }
  if (!order.paymentGatewayPaymentId) {
    await setPayoutStatus(order._id, 'Needs Review');
    return;
  }

  let razorpay;
  try {
    razorpay = getRazorpayClient();
  } catch (error) {
    console.error('Razorpay credentials unavailable for Route transfer:', error.message);
    await setPayoutStatus(order._id, 'Needs Review');
    return;
  }

  let payment;
  try {
    payment = await razorpay.payments.fetch(order.paymentGatewayPaymentId);
  } catch (error) {
    console.error('Razorpay payment details unavailable for Route transfer:', error.message);
    const status = [401, 403].includes(error.statusCode) ? 'Needs Review' : 'Fee Pending';
    await setPayoutStatus(order._id, status);
    return;
  }

  if (
    payment.status !== 'captured' ||
    payment.currency !== 'INR' ||
    !Number.isSafeInteger(payment.amount) ||
    payment.amount !== Math.round(order.total * 100) ||
    !Number.isSafeInteger(payment.fee) ||
    !Number.isSafeInteger(payment.tax) ||
    payment.fee < 0 ||
    payment.tax < 0
  ) {
    await setPayoutStatus(order._id, 'Fee Pending');
    return;
  }

  const payoutAmount = payment.amount - payment.fee - payment.tax;
  if (payoutAmount <= 0) {
    await setPayoutStatus(order._id, 'Needs Review');
    return;
  }

  let response;
  try {
    response = await razorpay.payments.transfer(order.paymentGatewayPaymentId, {
      transfers: [{
        account: partner.routeLinkedAccountId,
        amount: payoutAmount,
        currency: 'INR',
        notes: { order_id: String(order._id) },
      }],
    });
  } catch (error) {
    console.error('Razorpay Route transfer request failed; manual reconciliation required:', error.message);
    await setPayoutStatus(order._id, 'Needs Review');
    return;
  }

  const transfer = response?.items?.[0] || response?.transfers?.[0] || response;
  if (!transfer?.id) {
    await setPayoutStatus(order._id, 'Needs Review');
    return;
  }

  const status = transfer.status === 'processed'
    ? 'Processed'
    : transfer.status === 'failed'
      ? 'Failed'
      : 'Created';
  await setPayoutStatus(order._id, status, {
    routeTransferId: transfer.id,
    payoutAmount: payoutAmount / 100,
    payoutFeeAmount: (payment.fee + payment.tax) / 100,
  });
}

async function processPartnerPendingTransfers(partnerId) {
  const foods = await foodModel.find({ foodPartner: partnerId }).select('_id').lean();
  if (!foods.length) return;

  const orders = await orderModel.find({
    'items.food': { $in: foods.map((food) => food._id) },
    paymentStatus: 'Paid',
    payoutStatus: { $in: RETRYABLE_PAYOUT_STATUSES },
  }).select('_id').lean();

  for (const order of orders) {
    await initiateOrderTransfer(order._id, partnerId);
  }
}

module.exports = {
  getRazorpayClient,
  initiateOrderTransfer,
  processPartnerPendingTransfers,
};
