const foodModel=require('../models/food.model');
const foodPartnerModel=require('../models/foodpartner.model');
const mongoose=require('mongoose');
const stoageService=require('../services/stoage.service');
const { v4:uuid }= require("uuid");

async function createFood(req, res){
  if (!req.file) {
    return res.status(400).json({ message: 'Choose a video to upload.' });
  }
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!name || name.length > 120) {
    return res.status(400).json({ message: 'Food title is required and must be under 120 characters.' });
  }
  try {
    const uploaded = await stoageService.updoadFile(req.file.buffer, uuid());
    if (!uploaded?.url) throw new Error('Video upload did not return a URL.');
    const foodItem = await foodModel.create({
      name,
      video: uploaded.url,
      description: typeof req.body.description === 'string' ? req.body.description.trim() : '',
      foodPartner: req.foodPartner._id,
    });
    return res.status(201).json({
      message: 'Food reel created successfully.',
      food: foodItem,
    });
  } catch (error) {
    console.error('Food reel upload error:', error);
    return res.status(500).json({ message: 'Could not upload this food reel.' });
  }
}

async function getFoodItems(req,res){
  const foodItems=await foodModel.find({
    $or: [{ status: 'Published' }, { status: { $exists: false } }],
  }).populate('foodPartner', 'businessName address cuisineType description openingHours profileImage backgroundImage')
  res.status(200).json({
    message:"food items fetched successfully",
    foodItems:foodItems
  })
}

async function getRestaurantProfile(req,res){
  const { partnerId } = req.params;
  if (!mongoose.isValidObjectId(partnerId)) {
    return res.status(400).json({ message: 'Invalid restaurant.' });
  }

  try {
    const partner = await foodPartnerModel.findById(partnerId)
      .select('businessName address cuisineType description openingHours profileImage backgroundImage')
      .lean();
    if (!partner) {
      return res.status(404).json({ message: 'Restaurant not found.' });
    }

    const foodItems = await foodModel.find({
      foodPartner: partnerId,
      $or: [{ status: 'Published' }, { status: { $exists: false } }],
    })
      .select('name video description category price rating status foodPartner')
      .lean();
    return res.status(200).json({ partner, foodItems });
  } catch (error) {
    console.error('Restaurant profile fetch error:', error);
    return res.status(500).json({ message: 'Could not load this restaurant.' });
  }
}

module.exports={
  createFood,
  getFoodItems,
  getRestaurantProfile
}