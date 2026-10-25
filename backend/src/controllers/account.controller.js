const mongoose = require('mongoose');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { v4: uuid } = require('uuid');
const foodModel = require('../models/food.model');
const orderModel = require('../models/order.model');
const userModel = require('../models/user.model');
const storageService = require('../services/stoage.service');
const routePayoutService = require('../services/razorpayRoute.service');

function serializePaymentMethod(method) {
  return {
    _id: method._id,
    type: method.type,
    label: method.label,
    upiId: method.upiId,
    cardBrand: method.cardBrand,
    last4: method.last4,
    isDefault: method.isDefault,
  };
}

function serializeAddress(address) {
  return address.toObject ? address.toObject() : address;
}

async function getAccount(req, res) {
  try {
    const user = await req.user.populate({
      path: 'savedFoods',
      select: 'name video description category price rating foodPartner',
      populate: { path: 'foodPartner', select: 'businessName address cuisineType description openingHours profileImage backgroundImage' },
    });
    const orders = await orderModel.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('items.food', 'name video');
    const orderCount = await orderModel.countDocuments({ user: req.user._id });

    return res.status(200).json({
      user: {
        _id: user._id,
        fullname: user.fullname,
        email: user.email,
        phone: user.phone || '',
        profileImage: user.profileImage || '',
      },
      savedFoods: user.savedFoods,
      addresses: user.addresses.map(serializeAddress),
      paymentMethods: user.paymentMethods.map(serializePaymentMethod),
      recentOrders: orders,
      orderCount,
    });
  } catch (error) {
    console.error('Account fetch error:', error);
    return res.status(500).json({ message: 'Could not load account details.' });
  }
}

async function updateProfile(req, res) {
  try {
    const { fullname, email, phone } = req.body;
    if (typeof fullname !== 'string' || !fullname.trim() || fullname.trim().length > 100) {
      return res.status(400).json({ message: 'Enter a name between 1 and 100 characters.' });
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (phone !== undefined && (
      typeof phone !== 'string' ||
      phone.length > 20 ||
      (phone.trim() !== '' && !/^[+0-9() -]{7,20}$/.test(phone.trim()))
    )) {
      return res.status(400).json({ message: 'Enter a valid phone number.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailOwner = await userModel.findOne({
      email: normalizedEmail,
      _id: { $ne: req.user._id },
    }).select('_id');
    if (emailOwner) {
      return res.status(409).json({ message: 'That email address is already in use.' });
    }

    req.user.fullname = fullname.trim();
    req.user.email = normalizedEmail;
    req.user.phone = (phone || '').trim();
    await req.user.save();

    return res.status(200).json({
      message: 'Profile updated successfully.',
      user: {
        _id: req.user._id,
        fullname: req.user.fullname,
        email: req.user.email,
        phone: req.user.phone,
        profileImage: req.user.profileImage || '',
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'That email address is already in use.' });
    }
    return res.status(500).json({ message: 'Could not update your profile.' });
  }
}

async function updateProfilePhoto(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'Choose an image to upload.' });
  }

  try {
    const uploaded = await storageService.updoadFile(
      req.file.buffer,
      `user-${req.user._id}-${uuid()}`
    );
    if (!uploaded?.url) {
      throw new Error('Image upload did not return a URL.');
    }

    req.user.profileImage = uploaded.url;
    await req.user.save();
    return res.status(200).json({
      message: 'Profile photo updated.',
      profileImage: req.user.profileImage,
    });
  } catch (error) {
    console.error('Profile photo upload error:', error);
    return res.status(500).json({ message: 'Could not upload your profile photo.' });
  }
}

const addressFieldLimits = {
  recipientName: 100,
  phone: 20,
  line1: 200,
  line2: 200,
  city: 100,
  state: 100,
  postalCode: 20,
  instructions: 300,
};

function validateAddress(body, { partial = false } = {}) {
  const required = ['line1', 'city', 'state', 'postalCode'];
  if (!partial && required.some((key) => typeof body[key] !== 'string' || !body[key].trim())) {
    return 'Address, city, state, and postal code are required.';
  }
  if (partial && !Object.keys(addressFieldLimits).some((key) => Object.hasOwn(body, key)) && !Object.hasOwn(body, 'label')) {
    return 'Provide at least one address field to update.';
  }
  if (body.label !== undefined && (
    typeof body.label !== 'string' ||
    !['Home', 'Office', 'Other'].includes(body.label.trim())
  )) {
    return 'Address label must be Home, Office, or Other.';
  }
  for (const [key, maxLength] of Object.entries(addressFieldLimits)) {
    if (body[key] !== undefined && (
      typeof body[key] !== 'string' ||
      body[key].length > maxLength ||
      (required.includes(key) && !body[key].trim())
    )) {
      return `Enter a valid ${key === 'line1' ? 'address' : key}.`;
    }
  }
  return '';
}

async function addAddress(req, res) {
  const body = req.body || {};
  const validationError = validateAddress(body);
  if (validationError) return res.status(400).json({ message: validationError });

  try {
    const address = {
      label: body.label?.trim() || 'Home',
      recipientName: body.recipientName?.trim() || '',
      phone: body.phone?.trim() || '',
      line1: body.line1.trim(),
      line2: body.line2?.trim() || '',
      city: body.city.trim(),
      state: body.state.trim(),
      postalCode: body.postalCode.trim(),
      instructions: body.instructions?.trim() || '',
      isDefault: req.user.addresses.length === 0,
    };
    req.user.addresses.push(address);
    await req.user.save();
    return res.status(201).json({
      address: serializeAddress(req.user.addresses[req.user.addresses.length - 1]),
    });
  } catch (error) {
    console.error('Address create error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Please check the address details and try again.' });
    }
    return res.status(500).json({ message: 'Could not save this address.' });
  }
}

async function updateAddress(req, res) {
  const body = req.body || {};
  const validationError = validateAddress(body, { partial: true });
  if (validationError) return res.status(400).json({ message: validationError });
  if (!mongoose.isValidObjectId(req.params.addressId)) {
    return res.status(400).json({ message: 'Invalid address.' });
  }

  try {
    const address = req.user.addresses.id(req.params.addressId);
    if (!address) return res.status(404).json({ message: 'Address not found.' });

    for (const key of ['label', ...Object.keys(addressFieldLimits)]) {
      if (body[key] !== undefined) address[key] = body[key].trim();
    }
    await req.user.save();
    return res.status(200).json({ address: serializeAddress(address) });
  } catch (error) {
    console.error('Address update error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Please check the address details and try again.' });
    }
    return res.status(500).json({ message: 'Could not update this address.' });
  }
}

async function deleteAddress(req, res) {
  if (!mongoose.isValidObjectId(req.params.addressId)) {
    return res.status(400).json({ message: 'Invalid address.' });
  }

  try {
    const address = req.user.addresses.id(req.params.addressId);
    if (!address) return res.status(404).json({ message: 'Address not found.' });
    const wasDefault = address.isDefault;
    req.user.addresses.pull(address._id);
    if (wasDefault && req.user.addresses.length > 0) {
      req.user.addresses[0].isDefault = true;
    }
    await req.user.save();
    return res.status(200).json({ message: 'Address deleted.' });
  } catch (error) {
    console.error('Address delete error:', error);
    return res.status(500).json({ message: 'Could not delete this address.' });
  }
}

async function setDefaultAddress(req, res) {
  if (!mongoose.isValidObjectId(req.params.addressId)) {
    return res.status(400).json({ message: 'Invalid address.' });
  }

  try {
    const address = req.user.addresses.id(req.params.addressId);
    if (!address) return res.status(404).json({ message: 'Address not found.' });
    req.user.addresses.forEach((entry) => {
      entry.isDefault = entry._id.equals(address._id);
    });
    await req.user.save();
    return res.status(200).json({ message: 'Default address updated.' });
  } catch (error) {
    console.error('Default address update error:', error);
    return res.status(500).json({ message: 'Could not update the default address.' });
  }
}

async function addSavedFood(req, res) {
  if (!mongoose.isValidObjectId(req.params.foodId)) {
    return res.status(400).json({ message: 'Invalid food item.' });
  }

  try {
    const food = await foodModel.findById(req.params.foodId).select('_id');
    if (!food) return res.status(404).json({ message: 'Food item not found.' });
    if (!req.user.savedFoods.some((id) => id.equals(food._id))) {
      req.user.savedFoods.push(food._id);
      await req.user.save();
    }
    return res.status(200).json({ message: 'Food item saved.' });
  } catch (error) {
    console.error('Save food error:', error);
    return res.status(500).json({ message: 'Could not save this food item.' });
  }
}

async function removeSavedFood(req, res) {
  if (!mongoose.isValidObjectId(req.params.foodId)) {
    return res.status(400).json({ message: 'Invalid food item.' });
  }

  try {
    req.user.savedFoods = req.user.savedFoods.filter(
      (foodId) => !foodId.equals(req.params.foodId)
    );
    await req.user.save();
    return res.status(200).json({ message: 'Food item removed from saved items.' });
  } catch (error) {
    console.error('Remove saved food error:', error);
    return res.status(500).json({ message: 'Could not remove this food item.' });
  }
}

async function addPaymentMethod(req, res) {
  const { type, upiId, cardBrand, last4, providerToken } = req.body;
  if (!['UPI', 'CARD', 'COD'].includes(type)) {
    return res.status(400).json({ message: 'Choose UPI, a tokenized card, or Cash on Delivery.' });
  }
  if (type === 'UPI' && (typeof upiId !== 'string' || !/^[\w.-]+@[\w.-]+$/.test(upiId.trim()))) {
    return res.status(400).json({ message: 'Enter a valid UPI ID.' });
  }
  if (type === 'CARD' && (
    typeof providerToken !== 'string' ||
    !providerToken.trim() ||
    typeof cardBrand !== 'string' ||
    !/^\d{4}$/.test(String(last4 || ''))
  )) {
    return res.status(400).json({
      message: 'Cards can only be saved as a payment-provider token with the brand and last four digits. Never send a card number or CVV.',
    });
  }
  if (type === 'COD' && req.user.paymentMethods.some((method) => method.type === 'COD')) {
    return res.status(409).json({ message: 'Cash on Delivery is already available.' });
  }

  try {
    const method = {
      type,
      label: type === 'UPI' ? upiId.trim() : type === 'CARD' ? `${cardBrand.trim()} ending ${last4}` : 'Cash on Delivery',
      upiId: type === 'UPI' ? upiId.trim() : undefined,
      cardBrand: type === 'CARD' ? cardBrand.trim() : undefined,
      last4: type === 'CARD' ? String(last4) : undefined,
      providerToken: type === 'CARD' ? providerToken.trim() : undefined,
      isDefault: req.user.paymentMethods.length === 0,
    };
    req.user.paymentMethods.push(method);
    await req.user.save();
    const saved = req.user.paymentMethods[req.user.paymentMethods.length - 1];
    return res.status(201).json({ paymentMethod: serializePaymentMethod(saved) });
  } catch (error) {
    console.error('Payment method create error:', error);
    return res.status(500).json({ message: 'Could not save this payment method.' });
  }
}

async function deletePaymentMethod(req, res) {
  if (!mongoose.isValidObjectId(req.params.methodId)) {
    return res.status(400).json({ message: 'Invalid payment method.' });
  }

  try {
    const method = req.user.paymentMethods.id(req.params.methodId);
    if (!method) return res.status(404).json({ message: 'Payment method not found.' });
    const wasDefault = method.isDefault;
    req.user.paymentMethods.pull(method._id);
    if (wasDefault && req.user.paymentMethods.length > 0) {
      req.user.paymentMethods[0].isDefault = true;
    }
    await req.user.save();
    return res.status(200).json({ message: 'Payment method removed.' });
  } catch (error) {
    console.error('Payment method delete error:', error);
    return res.status(500).json({ message: 'Could not remove this payment method.' });
  }
}

async function setDefaultPaymentMethod(req, res) {
  if (!mongoose.isValidObjectId(req.params.methodId)) {
    return res.status(400).json({ message: 'Invalid payment method.' });
  }

  try {
    const method = req.user.paymentMethods.id(req.params.methodId);
    if (!method) return res.status(404).json({ message: 'Payment method not found.' });
    req.user.paymentMethods.forEach((entry) => {
      entry.isDefault = entry._id.equals(method._id);
    });
    await req.user.save();
    return res.status(200).json({ message: 'Default payment method updated.' });
  } catch (error) {
    console.error('Default payment update error:', error);
    return res.status(500).json({ message: 'Could not update the default payment method.' });
  }
}

async function getOrders(req, res) {
  try {
    const orders = await orderModel.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.food', 'name video description');
    return res.status(200).json({ orders });
  } catch (error) {
    console.error('Order history fetch error:', error);
    return res.status(500).json({ message: 'Could not load your orders.' });
  }
}

async function getOrder(req, res) {
  if (!mongoose.isValidObjectId(req.params.orderId)) {
    return res.status(400).json({ message: 'Invalid order.' });
  }

  try {
    const order = await orderModel.findOne({
      _id: req.params.orderId,
      user: req.user._id,
    }).populate('items.food', 'name video description');
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    return res.status(200).json({ order });
  } catch (error) {
    console.error('Order detail fetch error:', error);
    return res.status(500).json({ message: 'Could not load this order.' });
  }
}

async function createOrder(req, res) {
  const { foodId, addressId, quantity = 1 } = req.body || {};
  if (!mongoose.isValidObjectId(foodId) || !mongoose.isValidObjectId(addressId)) {
    return res.status(400).json({ message: 'Choose a valid food item and delivery address.' });
  }
  if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > 20) {
    return res.status(400).json({ message: 'Quantity must be between 1 and 20.' });
  }

  try {
    const address = req.user.addresses.id(addressId);
    if (!address) return res.status(404).json({ message: 'Delivery address not found.' });

    const food = await foodModel.findOne({
      _id: foodId,
      $or: [{ status: 'Published' }, { status: { $exists: false } }],
    }).populate('foodPartner', 'businessName');
    if (!food) return res.status(404).json({ message: 'This food item is not available to order.' });
    if (!Number.isFinite(food.price) || food.price <= 0) {
      return res.status(409).json({ message: 'This food item does not have an orderable price yet.' });
    }
    if (!food.foodPartner) {
      return res.status(409).json({ message: 'This restaurant is not available for ordering.' });
    }

    const itemQuantity = Number(quantity);
    const addressText = [
      address.line1,
      address.line2,
      address.city,
      address.state,
      address.postalCode,
    ].filter(Boolean).join(', ');
    const order = await orderModel.create({
      user: req.user._id,
      restaurantName: food.foodPartner.businessName,
      address: addressText,
      total: food.price * itemQuantity,
      status: 'Processing',
      paymentLabel: 'Cash on Delivery',
      paymentStatus: 'Pay on delivery',
      items: [{
        food: food._id,
        name: food.name,
        video: food.video,
        quantity: itemQuantity,
        unitPrice: food.price,
      }],
    });
    return res.status(201).json({ message: 'Order placed successfully.', order });
  } catch (error) {
    console.error('Order create error:', error);
    return res.status(500).json({ message: 'Could not place this order.' });
  }
}

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Razorpay keys are not configured.');
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

async function createOnlineOrder(req, res) {
  const { foodId, addressId, quantity = 1 } = req.body || {};
  if (!mongoose.isValidObjectId(foodId) || !mongoose.isValidObjectId(addressId)) {
    return res.status(400).json({ message: 'Choose a valid food item and delivery address.' });
  }
  if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > 20) {
    return res.status(400).json({ message: 'Quantity must be between 1 and 20.' });
  }

  try {
    const razorpay = getRazorpayClient();
    const address = req.user.addresses.id(addressId);
    if (!address) return res.status(404).json({ message: 'Delivery address not found.' });

    const food = await foodModel.findOne({
      _id: foodId,
      $or: [{ status: 'Published' }, { status: { $exists: false } }],
    }).populate('foodPartner', 'businessName');
    if (!food) return res.status(404).json({ message: 'This food item is not available to order.' });
    if (!Number.isFinite(food.price) || food.price <= 0) {
      return res.status(409).json({ message: 'This food item does not have an orderable price yet.' });
    }
    if (!food.foodPartner) {
      return res.status(409).json({ message: 'This restaurant is not available for ordering.' });
    }

    const itemQuantity = Number(quantity);
    const amountPaise = Math.round(food.price * itemQuantity * 100);
    const gatewayOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `food-${Date.now()}-${String(req.user._id).slice(-8)}`,
      notes: { userId: String(req.user._id), foodId: String(food._id) },
    });
    const addressText = [
      address.line1,
      address.line2,
      address.city,
      address.state,
      address.postalCode,
    ].filter(Boolean).join(', ');
    const order = await orderModel.create({
      user: req.user._id,
      restaurantName: food.foodPartner.businessName,
      address: addressText,
      total: amountPaise / 100,
      status: 'Payment Pending',
      paymentLabel: 'Online payment (Razorpay)',
      paymentStatus: 'Pending',
      paymentGatewayOrderId: gatewayOrder.id,
      items: [{
        food: food._id,
        name: food.name,
        video: food.video,
        quantity: itemQuantity,
        unitPrice: food.price,
      }],
    });

    return res.status(201).json({
      order: { _id: order._id },
      payment: {
        keyId: process.env.RAZORPAY_KEY_ID,
        gatewayOrderId: gatewayOrder.id,
        amount: gatewayOrder.amount,
        currency: gatewayOrder.currency,
        restaurantName: food.foodPartner.businessName,
        foodName: food.name,
        customerName: req.user.fullname,
        customerEmail: req.user.email,
        customerPhone: req.user.phone || '',
      },
    });
  } catch (error) {
    console.error('Online order creation error:', error);
    return res.status(error.message === 'Razorpay keys are not configured.' ? 503 : 500).json({
      message: error.message === 'Razorpay keys are not configured.'
        ? 'Online payment is not configured yet. Please choose Cash on Delivery.'
        : 'Could not start online payment.',
    });
  }
}

async function verifyOnlineOrder(req, res) {
  const {
    localOrderId,
    razorpay_order_id: gatewayOrderId,
    razorpay_payment_id: gatewayPaymentId,
    razorpay_signature: signature,
  } = req.body || {};
  if (
    !mongoose.isValidObjectId(localOrderId) ||
    typeof gatewayOrderId !== 'string' ||
    typeof gatewayPaymentId !== 'string' ||
    typeof signature !== 'string'
  ) {
    return res.status(400).json({ message: 'Invalid payment verification details.' });
  }

  try {
    const razorpay = getRazorpayClient();
    const order = await orderModel.findOne({
      _id: localOrderId,
      user: req.user._id,
      status: 'Payment Pending',
    }).select('+paymentGatewayOrderId');
    if (!order || order.paymentGatewayOrderId !== gatewayOrderId) {
      const alreadyPaidOrder = await orderModel.findOne({
        _id: localOrderId,
        user: req.user._id,
        paymentStatus: 'Paid',
        paymentGatewayOrderId: gatewayOrderId,
        paymentGatewayPaymentId: gatewayPaymentId,
      }).select('+paymentGatewayOrderId +paymentGatewayPaymentId');
      if (alreadyPaidOrder) {
        return res.status(200).json({
          message: 'Payment was already verified.',
          order: alreadyPaidOrder,
        });
      }
      return res.status(404).json({ message: 'Pending order not found.' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${gatewayOrderId}|${gatewayPaymentId}`)
      .digest();
    const receivedSignature = Buffer.from(signature, 'hex');
    if (
      receivedSignature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(receivedSignature, expectedSignature)
    ) {
      return res.status(400).json({ message: 'Payment signature could not be verified.' });
    }

    let payment = await razorpay.payments.fetch(gatewayPaymentId);
    const expectedAmount = Math.round(order.total * 100);
    if (
      payment.order_id !== gatewayOrderId ||
      payment.amount !== expectedAmount ||
      payment.currency !== 'INR'
    ) {
      return res.status(409).json({ message: 'Payment details do not match this order.' });
    }
    if (payment.status === 'authorized') {
      payment = await razorpay.payments.capture(gatewayPaymentId, expectedAmount, 'INR');
    }
    if (payment.status !== 'captured') {
      return res.status(409).json({ message: 'Payment has not been captured. Please try again.' });
    }

    const paidOrder = await orderModel.findOneAndUpdate(
      {
        _id: localOrderId,
        user: req.user._id,
        status: 'Payment Pending',
        paymentGatewayOrderId: gatewayOrderId,
      },
      {
        $set: {
          status: 'Processing',
          paymentStatus: 'Paid',
          paymentGatewayPaymentId: gatewayPaymentId,
          payoutStatus: 'Pending',
        },
      },
      { new: true },
    ).select('+paymentGatewayOrderId +paymentGatewayPaymentId');
    if (!paidOrder) {
      const alreadyPaidOrder = await orderModel.findOne({
        _id: localOrderId,
        user: req.user._id,
        paymentStatus: 'Paid',
        paymentGatewayOrderId: gatewayOrderId,
        paymentGatewayPaymentId: gatewayPaymentId,
      }).select('+paymentGatewayOrderId +paymentGatewayPaymentId');
      if (alreadyPaidOrder) {
        return res.status(200).json({
          message: 'Payment was already verified.',
          order: alreadyPaidOrder,
        });
      }
      return res.status(409).json({ message: 'The order payment state changed. Refresh your orders.' });
    }

    try {
      const food = await foodModel.findById(paidOrder.items[0].food).select('foodPartner');
      if (food?.foodPartner) {
        await routePayoutService.initiateOrderTransfer(paidOrder._id, food.foodPartner);
      } else {
        await orderModel.updateOne(
          { _id: paidOrder._id, payoutStatus: 'Pending' },
          { $set: { payoutStatus: 'Needs Review' } },
        );
      }
    } catch (error) {
      console.error('Could not initiate Route transfer for paid order:', error);
      await orderModel.updateOne(
        { _id: paidOrder._id, payoutStatus: { $in: ['Pending', 'Creating'] } },
        { $set: { payoutStatus: 'Needs Review' } },
      );
    }
    const completedOrder = await orderModel.findById(paidOrder._id);
    return res.status(200).json({
      message: 'Payment verified and order placed.',
      order: completedOrder || paidOrder,
    });
  } catch (error) {
    console.error('Online order verification error:', error);
    return res.status(error.message === 'Razorpay keys are not configured.' ? 503 : 500).json({
      message: error.message === 'Razorpay keys are not configured.'
        ? 'Online payment is not configured yet.'
        : 'Could not verify the payment.',
    });
  }
}

async function cancelOnlineOrder(req, res) {
  const { localOrderId } = req.body || {};
  if (!mongoose.isValidObjectId(localOrderId)) {
    return res.status(400).json({ message: 'Invalid pending order.' });
  }

  try {
    const order = await orderModel.findOneAndUpdate(
      { _id: localOrderId, user: req.user._id, status: 'Payment Pending' },
      { $set: { status: 'Cancelled', paymentStatus: 'Failed' } },
      { new: true },
    );
    if (!order) return res.status(404).json({ message: 'Pending order not found.' });
    return res.status(200).json({ message: 'Unpaid order cancelled.' });
  } catch (error) {
    console.error('Online order cancellation error:', error);
    return res.status(500).json({ message: 'Could not cancel this unpaid order.' });
  }
}

module.exports = {
  getAccount,
  updateProfile,
  updateProfilePhoto,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  addSavedFood,
  removeSavedFood,
  addPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  getOrders,
  getOrder,
  createOrder,
  createOnlineOrder,
  verifyOnlineOrder,
  cancelOnlineOrder,
};
