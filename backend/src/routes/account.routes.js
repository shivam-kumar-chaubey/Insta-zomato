const express = require('express');
const multer = require('multer');
const authMiddleware = require('../middlewares/auth.middleware');
const accountController = require('../controllers/account.controller');

const router = express.Router();
const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return callback(new Error('Profile photo must be a JPG, PNG, or WebP image.'));
    }
    return callback(null, true);
  },
});

router.use(authMiddleware.authUserMiddleware);

router.get('/', accountController.getAccount);
router.patch('/profile', accountController.updateProfile);
router.patch('/profile/photo', (req, res, next) => {
  uploadAvatar.single('photo')(req, res, (error) => {
    if (error) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ message: error.message });
    }
    return next();
  });
}, accountController.updateProfilePhoto);

router.post('/addresses', accountController.addAddress);
router.patch('/addresses/:addressId', accountController.updateAddress);
router.delete('/addresses/:addressId', accountController.deleteAddress);
router.patch('/addresses/:addressId/default', accountController.setDefaultAddress);

router.post('/saved/:foodId', accountController.addSavedFood);
router.delete('/saved/:foodId', accountController.removeSavedFood);

router.post('/payment-methods', accountController.addPaymentMethod);
router.delete('/payment-methods/:methodId', accountController.deletePaymentMethod);
router.patch('/payment-methods/:methodId/default', accountController.setDefaultPaymentMethod);

router.get('/orders', accountController.getOrders);
router.post('/orders', accountController.createOrder);
router.post('/orders/online/create', accountController.createOnlineOrder);
router.post('/orders/online/verify', accountController.verifyOnlineOrder);
router.post('/orders/online/cancel', accountController.cancelOnlineOrder);
router.get('/orders/:orderId', accountController.getOrder);

module.exports = router;
