const express= require('express');
const router= express.Router();
const authMiddleware=require('../middlewares/auth.middleware')
const foodController=require('../controllers/food.controller');
const reviewController = require('../controllers/review.controller');
const multer=require('multer');


const upload=multer({
  storage:multer.memoryStorage(),
})


router.post('/',authMiddleware.authFoodPartnerMiddleware,upload.single("video"), foodController.createFood);

router.get('/reviews/:targetType/:targetId', reviewController.getReviews);
router.post('/reviews', authMiddleware.authUserMiddleware, reviewController.saveReview);
router.get('/partner/:partnerId', foodController.getRestaurantProfile);
router.get('/',authMiddleware.authUserMiddleware,foodController.getFoodItems);

module.exports=router;