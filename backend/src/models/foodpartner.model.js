const mongoose = require('mongoose');

const foodpartnerSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    contactName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },
    cuisineType: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    openingHours: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
    profileImage: {
      type: String,
      trim: true,
      default: '',
    },
    backgroundImage: {
      type: String,
      trim: true,
      default: '',
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },
    routeLinkedAccountId: {
      type: String,
      select: false,
    },
    routeProductId: {
      type: String,
      select: false,
    },
    routeOnboardingStatus: {
      type: String,
      enum: ['Not Started', 'Creating', 'Created', 'Needs Review'],
      default: 'Not Started',
    },
    routeProductStatus: {
      type: String,
      default: '',
    },
    routeAccountCreatedAt: {
      type: Date,
    },
    routeBankLast4: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const foodPartnerModel =
  mongoose.models.foodPartner ||
  mongoose.model('foodPartner', foodpartnerSchema);

module.exports = foodPartnerModel;