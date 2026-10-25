const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: ['Food', 'Partner'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 1000,
    },
  },
  { timestamps: true },
);

reviewSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
reviewSchema.index({ targetType: 1, targetId: 1, user: 1 }, { unique: true });

module.exports = mongoose.models.Review || mongoose.model('Review', reviewSchema);
