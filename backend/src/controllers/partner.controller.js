const mongoose = require('mongoose');
const { v4: uuid } = require('uuid');
const foodModel = require('../models/food.model');
const orderModel = require('../models/order.model');
const foodPartnerModel = require('../models/foodpartner.model');
const storageService = require('../services/stoage.service');

const partnerFields = 'businessName contactName email phone address cuisineType description openingHours profileImage backgroundImage';

function serializePartner(partner) {
  return {
    _id: partner._id,
    businessName: partner.businessName,
    contactName: partner.contactName,
    email: partner.email,
    phone: partner.phone,
    address: partner.address,
    cuisineType: partner.cuisineType || '',
    description: partner.description || '',
    openingHours: partner.openingHours || '',
    profileImage: partner.profileImage || '',
    backgroundImage: partner.backgroundImage || '',
  };
}

function orderBelongsToPartner(order, partnerId) {
  return order.items.some((item) => (
    item.food && String(item.food.foodPartner) === String(partnerId)
  ));
}

function getPartnerItems(order, partnerId) {
  return order.items.filter((item) => (
    item.food && String(item.food.foodPartner) === String(partnerId)
  ));
}

async function loadPartnerOrders(partnerId) {
  const foods = await foodModel.find({ foodPartner: partnerId }).select('_id').lean();
  const foodIds = foods.map((food) => food._id);
  if (!foodIds.length) return [];

  return orderModel.find({
    'items.food': { $in: foodIds },
    status: { $ne: 'Payment Pending' },
    paymentStatus: { $ne: 'Failed' },
  })
    .sort({ createdAt: -1 })
    .populate('user', 'fullname phone')
    .populate('items.food', 'name video foodPartner')
    .lean();
}

function serializeOrderForPartner(order, partnerId) {
  const items = getPartnerItems(order, partnerId);
  return {
    ...order,
    items,
    total: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  };
}

function summarizePartnerOrders(orders, partnerId, foodItems) {
  const foodStats = new Map(foodItems.map((food) => [
    String(food._id),
    { foodId: food._id, name: food.name, quantity: 0, revenue: 0 },
  ]));
  const revenueByDay = new Map();
  let totalRevenue = 0;
  let completedRevenue = 0;
  let activeOrders = 0;
  let deliveredOrders = 0;
  let cancelledOrders = 0;

  for (const order of orders) {
    const partnerItems = getPartnerItems(order, partnerId);
    if (!partnerItems.length) continue;
    if (order.status === 'Cancelled') cancelledOrders += 1;
    else {
      const amount = partnerItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      totalRevenue += amount;
      if (order.status === 'Delivered') {
        completedRevenue += amount;
        deliveredOrders += 1;
      } else {
        activeOrders += 1;
      }
      const day = new Date(order.createdAt).toISOString().slice(0, 10);
      revenueByDay.set(day, (revenueByDay.get(day) || 0) + amount);

      for (const item of partnerItems) {
        const stats = foodStats.get(String(item.food._id));
        if (stats) {
          stats.quantity += item.quantity;
          stats.revenue += item.unitPrice * item.quantity;
        }
      }
    }
  }

  const recentDays = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - offset));
    const key = date.toISOString().slice(0, 10);
    return { date: key, revenue: revenueByDay.get(key) || 0 };
  });

  return {
    stats: {
      totalOrders: activeOrders + deliveredOrders + cancelledOrders,
      activeOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
      completedRevenue,
      totalFoodItems: foodItems.length,
      publishedReels: foodItems.filter((food) => food.status !== 'Draft').length,
      drafts: foodItems.filter((food) => food.status === 'Draft').length,
    },
    revenueByDay: recentDays,
    topFoods: [...foodStats.values()].sort((left, right) => right.quantity - left.quantity).slice(0, 5),
  };
}

async function getDashboard(req, res) {
  try {
    const [partner, foodItems, orders] = await Promise.all([
      foodPartnerModel.findById(req.foodPartner._id).select(partnerFields).lean(),
      foodModel.find({ foodPartner: req.foodPartner._id }).sort({ createdAt: -1 }).lean(),
      loadPartnerOrders(req.foodPartner._id),
    ]);
    const analytics = summarizePartnerOrders(orders, req.foodPartner._id, foodItems);
    const visibleOrders = orders.filter((order) => orderBelongsToPartner(order, req.foodPartner._id));

    return res.status(200).json({
      partner: serializePartner(partner),
      foodItems,
      recentOrders: visibleOrders.slice(0, 5).map((order) => serializeOrderForPartner(order, req.foodPartner._id)),
      analytics,
    });
  } catch (error) {
    console.error('Partner dashboard fetch error:', error);
    return res.status(500).json({ message: 'Could not load the food partner dashboard.' });
  }
}

async function updateProfile(req, res) {
  const allowedFields = ['businessName', 'contactName', 'email', 'phone', 'address', 'cuisineType', 'description', 'openingHours'];
  const body = req.body || {};
  const fields = Object.keys(body).filter((key) => allowedFields.includes(key));
  if (!fields.length) {
    return res.status(400).json({ message: 'Provide restaurant details to update.' });
  }
  for (const key of fields) {
    if (typeof body[key] !== 'string') {
      return res.status(400).json({ message: `${key} must be text.` });
    }
    body[key] = body[key].trim();
    if (!body[key] && ['businessName', 'contactName', 'email', 'phone', 'address'].includes(key)) {
      return res.status(400).json({ message: `${key} is required.` });
    }
  }

  if (body.businessName?.length > 120 || body.contactName?.length > 100 ||
      body.email?.length > 254 || body.phone?.length > 20 ||
      body.address?.length > 300 || body.cuisineType?.length > 100 ||
      body.description?.length > 1000 || body.openingHours?.length > 100) {
    return res.status(400).json({ message: 'One or more restaurant fields exceed the allowed length.' });
  }
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return res.status(400).json({ message: 'Enter a valid email address.' });
  }
  if (body.phone && !/^[+0-9() -]{7,20}$/.test(body.phone)) {
    return res.status(400).json({ message: 'Enter a valid phone number.' });
  }
  if (body.email) body.email = body.email.toLowerCase();

  try {
    for (const key of fields) req.foodPartner[key] = body[key];
    await req.foodPartner.save();
    return res.status(200).json({
      message: 'Restaurant details updated.',
      partner: serializePartner(req.foodPartner),
    });
  } catch (error) {
    console.error('Partner profile update error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'That restaurant name or email is already in use.' });
    }
    return res.status(500).json({ message: 'Could not update restaurant details.' });
  }
}

async function updateProfileImages(req, res) {
  const files = req.files || {};
  const profileFile = files.profileImage?.[0];
  const backgroundFile = files.backgroundImage?.[0];
  if (!profileFile && !backgroundFile) {
    return res.status(400).json({ message: 'Choose a profile image or restaurant background image.' });
  }

  try {
    const uploads = await Promise.all([
      profileFile
        ? storageService.updoadFile(profileFile.buffer, `partner-profile-${req.foodPartner._id}-${uuid()}`)
        : Promise.resolve(null),
      backgroundFile
        ? storageService.updoadFile(backgroundFile.buffer, `partner-background-${req.foodPartner._id}-${uuid()}`)
        : Promise.resolve(null),
    ]);
    if ((profileFile && !uploads[0]?.url) || (backgroundFile && !uploads[1]?.url)) {
      throw new Error('Image upload did not return a URL.');
    }

    if (profileFile) req.foodPartner.profileImage = uploads[0].url;
    if (backgroundFile) req.foodPartner.backgroundImage = uploads[1].url;
    await req.foodPartner.save();
    return res.status(200).json({
      message: 'Restaurant images updated.',
      profileImage: req.foodPartner.profileImage || '',
      backgroundImage: req.foodPartner.backgroundImage || '',
    });
  } catch (error) {
    console.error('Partner image upload error:', error);
    return res.status(500).json({ message: 'Could not upload restaurant images.' });
  }
}

async function getFoodItems(req, res) {
  try {
    const foodItems = await foodModel.find({ foodPartner: req.foodPartner._id }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ foodItems });
  } catch (error) {
    console.error('Partner food list error:', error);
    return res.status(500).json({ message: 'Could not load your food items.' });
  }
}

async function createFood(req, res) {
  if (!req.file) return res.status(400).json({ message: 'Choose a video to upload.' });
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
  const category = typeof req.body.category === 'string' ? req.body.category.trim() : '';
  const price = Number(req.body.price);
  const rating = Number(req.body.rating);
  const status = req.body.status || 'Published';
  if (!name || name.length > 120) {
    return res.status(400).json({ message: 'Food title is required and must be under 120 characters.' });
  }
  if (!Number.isFinite(price) || price <= 0 || price > 1000000) {
    return res.status(400).json({ message: 'Enter a food price greater than ₹0 and no more than ₹10,00,000.' });
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Enter a partner-provided rating from 1 to 5.' });
  }
  if (description.length > 500 || category.length > 80 || !['Published', 'Draft'].includes(status)) {
    return res.status(400).json({ message: 'Check the food description, category, or publishing status.' });
  }

  try {
    const uploaded = await storageService.updoadFile(req.file.buffer, `reel-${req.foodPartner._id}-${uuid()}`);
    if (!uploaded?.url) throw new Error('Video upload did not return a URL.');
    const foodItem = await foodModel.create({
      name,
      description,
      category,
      price,
      rating,
      status,
      video: uploaded.url,
      foodPartner: req.foodPartner._id,
    });
    return res.status(201).json({ message: 'Food reel created.', foodItem });
  } catch (error) {
    console.error('Partner food create error:', error);
    return res.status(500).json({ message: 'Could not upload this food reel.' });
  }
}

async function updateFoodItem(req, res) {
  if (!mongoose.isValidObjectId(req.params.foodId)) {
    return res.status(400).json({ message: 'Invalid food item.' });
  }
  const body = req.body || {};
  const updates = {};
  for (const [key, maxLength] of Object.entries({ name: 120, description: 500, category: 80 })) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== 'string' || body[key].trim().length > maxLength ||
          (key === 'name' && !body[key].trim())) {
        return res.status(400).json({ message: `Enter a valid ${key}.` });
      }
      updates[key] = body[key].trim();
    }
  }
  for (const [key, { minimum, maximum }] of Object.entries({
    price: { minimum: 0.01, maximum: 1000000 },
    rating: { minimum: 1, maximum: 5 },
  })) {
    if (body[key] !== undefined) {
      const value = Number(body[key]);
      if (!Number.isFinite(value) || value < minimum || value > maximum) {
        return res.status(400).json({
          message: key === 'price'
            ? 'Enter a food price greater than ₹0 and no more than ₹10,00,000.'
            : 'Enter a partner-provided rating from 1 to 5.',
        });
      }
      updates[key] = value;
    }
  }
  if (body.status !== undefined) {
    if (!['Published', 'Draft'].includes(body.status)) {
      return res.status(400).json({ message: 'Status must be Published or Draft.' });
    }
    updates.status = body.status;
  }
  if (!Object.keys(updates).length) {
    return res.status(400).json({ message: 'Provide at least one field to update.' });
  }

  try {
    const foodItem = await foodModel.findOneAndUpdate(
      { _id: req.params.foodId, foodPartner: req.foodPartner._id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!foodItem) return res.status(404).json({ message: 'Food item not found.' });
    return res.status(200).json({ message: 'Food item updated.', foodItem });
  } catch (error) {
    console.error('Partner food update error:', error);
    return res.status(500).json({ message: 'Could not update this food item.' });
  }
}

async function deleteFoodItem(req, res) {
  if (!mongoose.isValidObjectId(req.params.foodId)) {
    return res.status(400).json({ message: 'Invalid food item.' });
  }
  try {
    const query = { _id: req.params.foodId, foodPartner: req.foodPartner._id };
    const existingFood = await foodModel.findOne(query).select('_id');
    if (!existingFood) return res.status(404).json({ message: 'Food item not found.' });
    const hasOrders = await orderModel.exists({ 'items.food': existingFood._id });
    if (hasOrders) {
      return res.status(409).json({ message: 'This item is part of order history. Move it to drafts instead of deleting it.' });
    }
    const foodItem = await foodModel.findOneAndDelete(query);
    if (!foodItem) return res.status(404).json({ message: 'Food item not found.' });
    return res.status(200).json({ message: 'Food item deleted.' });
  } catch (error) {
    console.error('Partner food delete error:', error);
    return res.status(500).json({ message: 'Could not delete this food item.' });
  }
}

async function getOrders(req, res) {
  try {
    const orders = await loadPartnerOrders(req.foodPartner._id);
    return res.status(200).json({
      orders: orders
        .filter((order) => orderBelongsToPartner(order, req.foodPartner._id))
        .map((order) => serializeOrderForPartner(order, req.foodPartner._id)),
    });
  } catch (error) {
    console.error('Partner orders fetch error:', error);
    return res.status(500).json({ message: 'Could not load incoming orders.' });
  }
}

async function getOrder(req, res) {
  if (!mongoose.isValidObjectId(req.params.orderId)) {
    return res.status(400).json({ message: 'Invalid order.' });
  }
  try {
    const order = await orderModel.findById(req.params.orderId)
      .populate('user', 'fullname phone')
      .populate('items.food', 'name video foodPartner')
      .lean();
    if (
      !order ||
      order.status === 'Payment Pending' ||
      order.paymentStatus === 'Failed' ||
      !orderBelongsToPartner(order, req.foodPartner._id)
    ) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    return res.status(200).json({ order: serializeOrderForPartner(order, req.foodPartner._id) });
  } catch (error) {
    console.error('Partner order detail error:', error);
    return res.status(500).json({ message: 'Could not load this order.' });
  }
}

async function updateOrderStatus(req, res) {
  if (!mongoose.isValidObjectId(req.params.orderId)) {
    return res.status(400).json({ message: 'Invalid order.' });
  }
  const { status } = req.body || {};
  if (!['Processing', 'Delivered', 'Cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Choose Processing, Delivered, or Cancelled.' });
  }
  try {
    const order = await orderModel.findById(req.params.orderId)
      .populate('items.food', 'foodPartner');
    if (
      !order ||
      order.status === 'Payment Pending' ||
      order.paymentStatus === 'Failed' ||
      !orderBelongsToPartner(order, req.foodPartner._id)
    ) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    const allItemsBelongToPartner = order.items.every(
      (item) => item.food && String(item.food.foodPartner) === String(req.foodPartner._id)
    );
    if (!allItemsBelongToPartner) {
      return res.status(409).json({ message: 'This order contains items from multiple partners and cannot be updated as one order.' });
    }
    order.status = status;
    await order.save();
    return res.status(200).json({ message: 'Order status updated.', status: order.status });
  } catch (error) {
    console.error('Partner order status update error:', error);
    return res.status(500).json({ message: 'Could not update this order.' });
  }
}

async function getAnalytics(req, res) {
  try {
    const [foodItems, orders] = await Promise.all([
      foodModel.find({ foodPartner: req.foodPartner._id }).lean(),
      loadPartnerOrders(req.foodPartner._id),
    ]);
    return res.status(200).json(summarizePartnerOrders(orders, req.foodPartner._id, foodItems));
  } catch (error) {
    console.error('Partner analytics error:', error);
    return res.status(500).json({ message: 'Could not load analytics.' });
  }
}

async function getEarnings(req, res) {
  try {
    const orders = await loadPartnerOrders(req.foodPartner._id);
    const earnings = orders
      .filter((order) => order.status === 'Delivered' && orderBelongsToPartner(order, req.foodPartner._id))
      .map((order) => ({
        orderId: order._id,
        date: order.createdAt,
        amount: getPartnerItems(order, req.foodPartner._id)
          .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
        status: 'Delivered',
      }));
    const payouts = orders
      .filter((order) => (
        order.paymentStatus === 'Paid' &&
        order.paymentLabel?.startsWith('Online payment') &&
        orderBelongsToPartner(order, req.foodPartner._id)
      ))
      .map((order) => ({
        orderId: order._id,
        date: order.createdAt,
        amount: order.payoutAmount ?? null,
        feeAmount: order.payoutFeeAmount ?? null,
        status: order.payoutStatus || 'Pending',
      }));
    const partner = await foodPartnerModel.findById(req.foodPartner._id)
      .select('+routeLinkedAccountId');
    return res.status(200).json({
      completedEarnings: earnings.reduce((sum, entry) => sum + entry.amount, 0),
      earnings,
      payouts,
      payoutIntegrationAvailable: Boolean(partner?.routeLinkedAccountId),
      payoutAccountStatus: partner?.routeOnboardingStatus || 'Not Started',
      payoutProductStatus: partner?.routeProductStatus || '',
    });
  } catch (error) {
    console.error('Partner earnings error:', error);
    return res.status(500).json({ message: 'Could not load earnings.' });
  }
}

async function logout(req, res) {
  res.clearCookie('token', { httpOnly: true, secure: false, sameSite: 'lax' });
  return res.status(200).json({ message: 'Food partner logged out.' });
}

module.exports = {
  getDashboard,
  updateProfile,
  updateProfileImages,
  getFoodItems,
  createFood,
  updateFoodItem,
  deleteFoodItem,
  getOrders,
  getOrder,
  updateOrderStatus,
  getAnalytics,
  getEarnings,
  logout,
};
