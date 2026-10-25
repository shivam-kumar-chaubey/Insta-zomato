const userModel = require('../models/user.model');
const foodpartnerModel = require('../models/foodpartner.model');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// ========================================
// USER REGISTER
// ========================================

async function registerUser(req, res) {
  try {
    const { fullname, email, password } = req.body;

    if (!fullname || !email || !password) {
      return res.status(400).json({
        message: 'Please fill all required fields',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const isUserAlreadyExist = await userModel.findOne({
      email: normalizedEmail,
    });

    if (isUserAlreadyExist) {
      return res.status(400).json({
        message: 'User already exists',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      fullname: fullname.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    const token = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });

    return res.status(201).json({
      message: 'User created successfully',
      user: {
        _id: user._id,
        fullname: user.fullname,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('User registration error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: 'User email already exists',
      });
    }

    return res.status(500).json({
      message: 'User registration failed',
    });
  }
}

// ========================================
// USER LOGIN
// ========================================

async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    const user = await userModel.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid email or password',
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(400).json({
        message: 'Invalid email or password',
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });

    return res.status(200).json({
      message: 'User login successful',
      user: {
        _id: user._id,
        fullname: user.fullname,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('User login error:', error);

    return res.status(500).json({
      message: 'Login failed. Please try again.',
    });
  }
}

// ========================================
// USER LOGOUT
// ========================================

function logoutUser(req, res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
  });

  return res.status(200).json({
    message: 'User logout successful',
  });
}

// ========================================
// FOOD PARTNER REGISTER
// ========================================

async function registerFoodPartner(req, res) {
  try {
    const {
      businessName,
      email,
      password,
      contactName,
      phone,
      address,
    } = req.body;

    // Validate required fields
    if (
      !businessName ||
      !email ||
      !password ||
      !contactName ||
      !phone ||
      !address
    ) {
      return res.status(400).json({
        message: 'Please fill all required fields',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedBusinessName = businessName.trim();

    const existingPartner = await foodpartnerModel.findOne({
      $or: [
        { email: normalizedEmail },
        { businessName: normalizedBusinessName },
      ],
    }).select('email businessName').lean();

    if (existingPartner?.email === normalizedEmail) {
      return res.status(400).json({
        message: 'Food partner with this email already exists',
      });
    }

    if (existingPartner?.businessName === normalizedBusinessName) {
      return res.status(400).json({
        message: 'A food partner with this business name already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create food partner
    const foodPartner = await foodpartnerModel.create({
      businessName: normalizedBusinessName,
      contactName: contactName.trim(),
      phone: phone.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      address: address.trim(),
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        id: foodPartner._id,
      },
      process.env.JWT_SECRET
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });

    return res.status(201).json({
      message: 'Food partner registered successfully',
      user: {
        _id: foodPartner._id,
        businessName: foodPartner.businessName,
        contactName: foodPartner.contactName,
        email: foodPartner.email,
        phone: foodPartner.phone,
        address: foodPartner.address,
      },
    });
  } catch (error) {
    console.error('Food partner registration error:', error);

    if (error.code === 11000) {
      const duplicateFields = Object.keys(error.keyPattern || error.keyValue || {});
      const indexName = error.message?.match(/index:\s+([^\s]+)/)?.[1];
      const duplicateField =
        duplicateFields[0] ||
        indexName?.replace(/_[+-]?\d+$/, '');

      if (duplicateField === 'email') {
        return res.status(409).json({
          message: 'Food partner with this email already exists',
        });
      }

      if (duplicateField === 'businessName') {
        return res.status(409).json({
          message: 'A food partner with this business name already exists',
        });
      }

      return res.status(409).json({
        message: duplicateField
          ? `Registration conflicts with an existing value in the "${duplicateField}" unique index.`
          : 'Registration conflicts with a database unique index. Check the backend log for the index name.',
      });
    }

    return res.status(500).json({
      message: 'Food partner registration failed',
    });
  }
}

// ========================================
// FOOD PARTNER LOGIN
// ========================================

async function loginFoodPartner(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    const foodPartner = await foodpartnerModel.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!foodPartner) {
      return res.status(400).json({
        message: 'Invalid email or password',
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      foodPartner.password
    );

    if (!isPasswordValid) {
      return res.status(400).json({
        message: 'Invalid email or password',
      });
    }

    const token = jwt.sign(
      {
        id: foodPartner._id,
      },
      process.env.JWT_SECRET
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });

    return res.status(200).json({
      message: 'Food partner login successful',
      user: {
        _id: foodPartner._id,
        businessName: foodPartner.businessName,
        contactName: foodPartner.contactName,
        email: foodPartner.email,
      },
    });
  } catch (error) {
    console.error('Food partner login error:', error);

    return res.status(500).json({
      message: 'Food partner login failed',
    });
  }
}

// ========================================
// FOOD PARTNER LOGOUT
// ========================================

function logoutFoodPartner(req, res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
  });

  return res.status(200).json({
    message: 'Food partner logout successful',
  });
}

// ========================================
// EXPORT ALL FUNCTIONS
// ========================================

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  registerFoodPartner,
  loginFoodPartner,
  logoutFoodPartner,
};