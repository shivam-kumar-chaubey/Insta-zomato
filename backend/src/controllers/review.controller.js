const mongoose = require('mongoose');
const foodModel = require('../models/food.model');
const foodPartnerModel = require('../models/foodpartner.model');
const reviewModel = require('../models/review.model');

function isReviewableType(targetType) {
  return targetType === 'Food' || targetType === 'Partner';
}

async function getReviews(req, res) {
  const { targetType } = req.params;
  const { targetId } = req.params;
  if (!isReviewableType(targetType) || !mongoose.isValidObjectId(targetId)) {
    return res.status(400).json({ message: 'Choose a valid review target.' });
  }

  try {
    const targetExists = targetType === 'Food'
      ? await foodModel.exists({
        _id: targetId,
        $or: [{ status: 'Published' }, { status: { $exists: false } }],
      })
      : await foodPartnerModel.exists({ _id: targetId });
    if (!targetExists) return res.status(404).json({ message: 'Review target not found.' });

    const reviews = await reviewModel.find({ targetType, targetId })
      .sort({ updatedAt: -1 })
      .limit(50)
      .populate('user', 'fullname profileImage')
      .lean();
    const aggregate = await reviewModel.aggregate([
      { $match: { targetType, targetId: new mongoose.Types.ObjectId(targetId) } },
      { $group: { _id: null, averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
    ]);
    const summary = aggregate[0] || { averageRating: 0, reviewCount: 0 };

    return res.status(200).json({
      averageRating: Number(summary.averageRating.toFixed(1)),
      reviewCount: summary.reviewCount,
      reviews,
    });
  } catch (error) {
    console.error('Review list error:', error);
    return res.status(500).json({ message: 'Could not load reviews.' });
  }
}

async function saveReview(req, res) {
  const { targetType, targetId, rating, comment } = req.body || {};
  if (!isReviewableType(targetType) || !mongoose.isValidObjectId(targetId)) {
    return res.status(400).json({ message: 'Choose a valid food item or food partner.' });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Choose a rating from 1 to 5 stars.' });
  }
  if (typeof comment !== 'string' || comment.trim().length < 2 || comment.trim().length > 1000) {
    return res.status(400).json({ message: 'Review must be between 2 and 1000 characters.' });
  }

  try {
    const targetExists = targetType === 'Food'
      ? await foodModel.exists({
        _id: targetId,
        $or: [{ status: 'Published' }, { status: { $exists: false } }],
      })
      : await foodPartnerModel.exists({ _id: targetId });
    if (!targetExists) return res.status(404).json({ message: 'Review target not found.' });

    const review = await reviewModel.findOneAndUpdate(
      { targetType, targetId, user: req.user._id },
      { $set: { rating, comment: comment.trim() } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).populate('user', 'fullname profileImage');

    return res.status(200).json({ message: 'Your review has been saved.', review });
  } catch (error) {
    console.error('Review save error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Your review could not be saved. Please try again.' });
    }
    return res.status(500).json({ message: 'Could not save your review.' });
  }
}

module.exports = { getReviews, saveReview };
