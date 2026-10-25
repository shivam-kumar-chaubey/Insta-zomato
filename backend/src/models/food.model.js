const mongoose=require('mongoose');

const foodSchema=new mongoose.Schema({
  name:{
    type:String,
    require:true,
  },
  video:{
    type:String,
    require:true,
  },


  description:{
    type:String,
    trim:true,
    maxlength:500,
  },
  category:{
    type:String,
    trim:true,
    maxlength:80,
  },
  price:{
    type:Number,
    min:0.01,
  },
  rating:{
    type:Number,
    min:1,
    max:5,
  },
  status:{
    type:String,
    enum:['Published','Draft'],
    default:'Published',
  },
  foodPartner:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"foodPartner"
  }
})

const foodModel= mongoose.model("Food",foodSchema);

module.exports=foodModel;
