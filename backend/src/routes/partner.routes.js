const express = require('express');
const multer = require('multer');
const authMiddleware = require('../middlewares/auth.middleware');
const partnerController = require('../controllers/partner.controller');
const payoutController = require('../controllers/payout.controller');

const router = express.Router();
const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(file.mimetype)) {
      return callback(new Error('Upload an MP4, WebM, or MOV video.'));
    }
    return callback(null, true);
  },
});
const uploadStoreImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return callback(new Error('Upload a JPG, PNG, or WebP image.'));
    }
    return callback(null, true);
  },
});

router.use(authMiddleware.authFoodPartnerMiddleware);

router.get('/dashboard', partnerController.getDashboard);
router.patch('/profile', partnerController.updateProfile);
router.patch('/profile/images', (req, res, next) => {
  uploadStoreImages.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'backgroundImage', maxCount: 1 },
  ])(req, res, (error) => {
    if (error) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ message: error.message });
    }
    return next();
  });
}, partnerController.updateProfileImages);
router.get('/foods', partnerController.getFoodItems);
router.post('/foods', (req, res, next) => {
  uploadVideo.single('video')(req, res, (error) => {
    if (error) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ message: error.message });
    }
    return next();
  });
}, partnerController.createFood);
router.patch('/foods/:foodId', partnerController.updateFoodItem);
router.delete('/foods/:foodId', partnerController.deleteFoodItem);

router.get('/orders', partnerController.getOrders);
router.get('/orders/:orderId', partnerController.getOrder);
router.patch('/orders/:orderId/status', partnerController.updateOrderStatus);
router.get('/analytics', partnerController.getAnalytics);
router.get('/earnings', partnerController.getEarnings);
router.get('/payout-account', payoutController.getPayoutAccount);
router.post('/payout-account', payoutController.createPayoutAccount);
router.post('/payout-account/process-pending', payoutController.processPendingPayouts);
router.post('/logout', partnerController.logout);

module.exports = router;
