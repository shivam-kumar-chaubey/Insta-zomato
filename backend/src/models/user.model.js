const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      enum: ['Home', 'Office', 'Other'],
      default: 'Home',
      trim: true,
    },
    recipientName: { type: String, trim: true, maxlength: 100 },
    phone: { type: String, trim: true, maxlength: 20 },
    line1: { type: String, required: true, trim: true, maxlength: 200 },
    line2: { type: String, trim: true, maxlength: 200 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, required: true, trim: true, maxlength: 100 },
    postalCode: { type: String, required: true, trim: true, maxlength: 20 },
    instructions: { type: String, trim: true, maxlength: 300 },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const paymentMethodSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['UPI', 'CARD', 'COD'],
      required: true,
    },
    label: { type: String, trim: true, maxlength: 80 },
    upiId: { type: String, trim: true, maxlength: 100 },
    cardBrand: { type: String, trim: true, maxlength: 30 },
    last4: { type: String, match: /^\d{4}$/ },
    providerToken: { type: String, select: false },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const userSchema=new mongoose.Schema({
  fullname:{
    type:String,
    required:true,
    trim:true,
    maxlength:100,
  },
  email:{
    type:String,
    required:true,
    trim:true,
    lowercase:true,
    maxlength:254,
    unique:true,
  },
  phone:{
    type:String,
    trim:true,
    maxlength:20,
  },
  profileImage:{
    type:String,
    trim:true,
  },
  password:{
    type:String,
    required:true,
  },
  savedFoods: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Food',
  }],
  addresses: [addressSchema],
  paymentMethods: [paymentMethodSchema],
}, {
  timestamps:true,
})

const userModel=mongoose.models.user || mongoose.model('user',userSchema);

module.exports=userModel;