const express= require('express');
const cookieParser=require('cookie-parser');
const authRoutes=require('./routes/auth.routes');
const foodRoutes=require('./routes/food.routes');
const accountRoutes=require('./routes/account.routes');
const partnerRoutes=require('./routes/partner.routes');
const payoutController=require('./controllers/payout.controller');
const cors=require('cors');

const app= express();

app.use(cors({
  origin:'http://localhost:5173',
  credentials:true
}))
app.post(
  '/api/webhooks/razorpay/route',
  express.raw({ type: 'application/json' }),
  payoutController.handleRouteWebhook,
);
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth',authRoutes);
app.use('/api/food',foodRoutes)
app.use('/api/account',accountRoutes)
app.use('/api/partner',partnerRoutes)



app.get('/',(req,res)=>{
  res.send("hello starter")
})

app.get('/about',(req, res)=>{
  res.send("hello about")
})

module.exports=app;
