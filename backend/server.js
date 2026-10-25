const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const app=require('./src/app');
const connectDB=require('./src/db/db');

connectDB()
  .then(() => {
    app.listen(3000, () => {
      console.log('server is running on port 3000');
      console.log(
        `Razorpay keys: ${
          process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
            ? 'configured'
            : 'missing (online payments unavailable)'
        }`,
      );
    });
  })
  .catch((error) => {
    console.error('Database startup failed:', error);
    process.exitCode = 1;
  });