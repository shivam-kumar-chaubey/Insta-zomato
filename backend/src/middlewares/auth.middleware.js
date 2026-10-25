const foodPartnerModel= require('../models/foodpartner.model')
const userModel = require('../models/user.model')
const jwt=require('jsonwebtoken');

async function authFoodPartnerMiddleware(req,res,next){

  const token=req.cookies.token;
  if(!token){
    return res.status(401).json({
      message:'please login first'
    })
  }
  try{
     const decoded=jwt.verify(token,process.env.JWT_SECRET);
     
     const foodpartner= await foodPartnerModel.findById(decoded.id);
     if(!foodpartner){
       return res.status(401).json({
         message:'Invalid food partner session'
       })
     }
     req.foodPartner=foodpartner;
     next()

  }catch (err){
    return res.status(401).json({
      message:'Invalid token'
    })
  }
}


async function authUserMiddleware(req,res,next){

  const token=req.cookies.token;
  if(!token){
    return res.status(401).json({
      message:"please login first"
    })
  }

  try{
    const decoded=jwt.verify(token,process.env.JWT_SECRET);
    const user= await userModel.findById(decoded.id);
    if(!user){
      return res.status(401).json({
        message:"Invalid token"
      })
    }
    req.user=user;

    next();
  }catch(err){
    return res.status(401).json({
      message:"Invalid token"
    })
  }
}



module.exports={
  authFoodPartnerMiddleware,
  authUserMiddleware
}