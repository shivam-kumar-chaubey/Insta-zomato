const crypto = require('crypto');
const mongoose = require('mongoose');
const foodPartnerModel = require('../models/foodpartner.model');
const orderModel = require('../models/order.model');
const routeService = require('../services/razorpayRoute.service');

const businessTypes = new Set([
  'individual',
  'proprietorship',
  'partnership',
  'private_limited',
  'public_limited',
  'llp',
  'ngo',
  'trust',
  'society',
  'other',
  'not_yet_registered',
  'educational_institutes',
]);

function payoutAccountView(partner) {
  return {
    onboardingStatus: partner.routeOnboardingStatus || 'Not Started',
    productStatus: partner.routeProductStatus || '',
    connected: Boolean(partner.routeLinkedAccountId),
    bankLast4: partner.routeBankLast4 || '',
  };
}

function formatPhone(phone) {
  const value = String(phone || '').trim();
  if (value.startsWith('+')) return value;
  const digits = value.replace(/\D/g, '');
  return digits.length === 10 ? `+91${digits}` : `+${digits}`;
}

function validAccountInput(body) {
  const legalBusinessName = typeof body.legalBusinessName === 'string'
    ? body.legalBusinessName.trim()
    : '';
  const businessType = typeof body.businessType === 'string' ? body.businessType : '';
  const pan = typeof body.pan === 'string' ? body.pan.trim().toUpperCase() : '';
  const accountNumber = typeof body.accountNumber === 'string' ? body.accountNumber.trim() : '';
  const beneficiaryName = typeof body.beneficiaryName === 'string'
    ? body.beneficiaryName.trim()
    : '';
  const ifsc = typeof body.ifsc === 'string' ? body.ifsc.trim().toUpperCase() : '';
  const gst = typeof body.gst === 'string' ? body.gst.trim().toUpperCase() : '';

  if (legalBusinessName.length < 4 || legalBusinessName.length > 200) {
    return { error: 'Enter the legal name shown on the PAN card (4–200 characters).' };
  }
  if (!businessTypes.has(businessType)) {
    return { error: 'Choose a valid business type.' };
  }
  if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) {
    return { error: 'Enter a valid 10-character PAN.' };
  }
  if (!/^\d{9,18}$/.test(accountNumber)) {
    return { error: 'Enter a valid bank account number (9–18 digits).' };
  }
  if (!beneficiaryName || beneficiaryName.length > 100) {
    return { error: 'Enter the bank account holder name (up to 100 characters).' };
  }
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
    return { error: 'Enter a valid 11-character IFSC code.' };
  }
  if (gst && !/^[0-9]{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(gst)) {
    return { error: 'Enter a valid GSTIN or leave it blank.' };
  }
  if (body.tncAccepted !== true) {
    return { error: 'Accept the Razorpay terms before continuing.' };
  }
  return {
    value: {
      legalBusinessName,
      businessType,
      pan,
      accountNumber,
      beneficiaryName,
      ifsc,
      gst,
    },
  };
}

async function getPayoutAccount(req, res) {
  try {
    const partner = await foodPartnerModel.findById(req.foodPartner._id)
      .select('+routeLinkedAccountId +routeProductId');
    if (!partner) return res.status(404).json({ message: 'Food partner account not found.' });
    return res.status(200).json({ payoutAccount: payoutAccountView(partner) });
  } catch (error) {
    console.error('Payout account status error:', error);
    return res.status(500).json({ message: 'Could not load payout account status.' });
  }
}

async function createPayoutAccount(req, res) {
  const validation = validAccountInput(req.body || {});
  if (validation.error) return res.status(400).json({ message: validation.error });

  const partnerId = req.foodPartner._id;
  try {
    const partner = await foodPartnerModel.findOneAndUpdate(
      {
        _id: partnerId,
        routeLinkedAccountId: { $in: [null, ''] },
        routeOnboardingStatus: { $in: ['Not Started', null] },
      },
      { $set: { routeOnboardingStatus: 'Creating' } },
      { new: true },
    ).select('+routeLinkedAccountId +routeProductId');

    if (!partner) {
      const current = await foodPartnerModel.findById(partnerId)
        .select('+routeLinkedAccountId +routeProductId');
      if (!current) return res.status(404).json({ message: 'Food partner account not found.' });
      return res.status(409).json({
        message: current.routeLinkedAccountId
          ? 'A payout account is already connected. Contact support to change bank details.'
          : 'Payout account setup is already in progress or needs review.',
        payoutAccount: payoutAccountView(current),
      });
    }

    const { value } = validation;
    const payload = {
      type: 'route',
      tnc_accepted: true,
      reference_id: `foodpartner_${partner._id}`,
      legal_business_name: value.legalBusinessName,
      customer_facing_business_name: partner.businessName,
      business_type: value.businessType,
      email: partner.email,
      phone: formatPhone(partner.phone),
      legal_info: {
        pan: value.pan,
        ...(value.gst ? { gst: value.gst } : {}),
      },
      settlement_accounts: [{
        method: 'bank_account',
        bank_account: {
          account_number: value.accountNumber,
          beneficiary_name: value.beneficiaryName,
          code_type: 'ifsc',
          code: value.ifsc,
          currency: 'INR',
          is_default: true,
        },
      }],
    };

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      await foodPartnerModel.updateOne(
        { _id: partnerId, routeOnboardingStatus: 'Creating' },
        { $set: { routeOnboardingStatus: 'Not Started' } },
      );
      return res.status(503).json({ message: 'Razorpay Route credentials are not configured.' });
    }

    let response;
    let result;
    try {
      response = await fetch('https://api.razorpay.com/v2/accounts', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });
      const responseText = await response.text();
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        result = {};
      }
    } catch (error) {
      console.error('Razorpay Route account request needs reconciliation:', error.message);
      await foodPartnerModel.updateOne(
        { _id: partnerId, routeOnboardingStatus: 'Creating' },
        { $set: { routeOnboardingStatus: 'Needs Review' } },
      );
      return res.status(502).json({
        message: 'Razorpay did not confirm the setup request. Contact support before retrying.',
      });
    }

    if (!response.ok) {
      const onboardingStatus = response.status >= 500 ? 'Needs Review' : 'Not Started';
      await foodPartnerModel.updateOne(
        { _id: partnerId, routeOnboardingStatus: 'Creating' },
        { $set: { routeOnboardingStatus: onboardingStatus } },
      );
      if (response.status === 401 || response.status === 403) {
        return res.status(503).json({
          message: 'Razorpay credentials are invalid or do not have Route permissions.',
        });
      }
      return res.status(response.status >= 500 ? 502 : 400).json({
        message: response.status >= 500
          ? 'Razorpay could not confirm account setup. Contact support before retrying.'
          : 'Razorpay rejected these details. Check the PAN, business type, and bank details.',
      });
    }

    const routeProduct = result.product_config || {};
    if (!result.id) {
      await foodPartnerModel.updateOne(
        { _id: partnerId, routeOnboardingStatus: 'Creating' },
        { $set: { routeOnboardingStatus: 'Needs Review' } },
      );
      return res.status(502).json({
        message: 'Razorpay returned an incomplete setup result. Contact support before retrying.',
      });
    }
    const accountCreatedAt = Number(result.created_at);
    const savedPartner = await foodPartnerModel.findOneAndUpdate(
      { _id: partnerId, routeOnboardingStatus: 'Creating' },
      {
        $set: {
          routeLinkedAccountId: result.id,
          routeProductId: routeProduct.id || '',
          routeProductStatus: routeProduct.activation_status || '',
          routeAccountCreatedAt: Number.isFinite(accountCreatedAt) && accountCreatedAt > 0
            ? new Date(accountCreatedAt * 1000)
            : new Date(),
          routeOnboardingStatus: 'Created',
          routeBankLast4: value.accountNumber.slice(-4),
        },
      },
      { new: true },
    ).select('+routeLinkedAccountId +routeProductId');

    if (!savedPartner) {
      await foodPartnerModel.updateOne(
        { _id: partnerId, routeOnboardingStatus: 'Creating' },
        { $set: { routeOnboardingStatus: 'Needs Review' } },
      );
      return res.status(502).json({
        message: 'Razorpay returned an incomplete setup result. Contact support before retrying.',
      });
    }

    if (savedPartner.routeProductStatus === 'activated') {
      try {
        await routeService.processPartnerPendingTransfers(partnerId);
      } catch (error) {
        console.error('Could not process eligible partner payouts after onboarding:', error);
      }
    }
    return res.status(201).json({
      message: 'Payout account submitted to Razorpay.',
      payoutAccount: payoutAccountView(savedPartner),
    });
  } catch (error) {
    console.error('Payout account setup error:', error);
    return res.status(500).json({ message: 'Could not set up the payout account.' });
  }
}

async function processPendingPayouts(req, res) {
  try {
    await routeService.processPartnerPendingTransfers(req.foodPartner._id);
    return res.status(200).json({ message: 'Eligible payouts have been checked.' });
  } catch (error) {
    console.error('Partner pending payout processing error:', error);
    return res.status(500).json({ message: 'Could not process eligible payouts.' });
  }
}

async function handleRouteWebhook(req, res) {
  const secret = process.env.RAZORPAY_ROUTE_WEBHOOK_SECRET;
  const signature = req.get('x-razorpay-signature');
  if (!secret) return res.status(503).send('Webhook secret is not configured.');
  if (!Buffer.isBuffer(req.body) || typeof signature !== 'string') {
    return res.status(400).send('Invalid webhook request.');
  }

  const expectedSignature = crypto.createHmac('sha256', secret).update(req.body).digest();
  let receivedSignature;
  try {
    receivedSignature = Buffer.from(signature, 'hex');
  } catch {
    return res.status(400).send('Invalid webhook signature.');
  }
  if (
    receivedSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(receivedSignature, expectedSignature)
  ) {
    return res.status(400).send('Invalid webhook signature.');
  }

  try {
    const event = JSON.parse(req.body.toString('utf8'));
    const transfer = event.payload?.transfer?.entity;
    const product = event.payload?.merchant_product?.entity;

    if (['transfer.processed', 'transfer.failed'].includes(event.event) && transfer?.id) {
      const orderQuery = mongoose.isValidObjectId(transfer.notes?.order_id)
        ? { _id: transfer.notes.order_id }
        : { routeTransferId: transfer.id };
      const result = await orderModel.updateOne(
        { ...orderQuery, paymentStatus: 'Paid' },
        {
          $set: {
            routeTransferId: transfer.id,
            payoutStatus: event.event === 'transfer.processed' ? 'Processed' : 'Failed',
          },
        },
      );
      if (!result.matchedCount) return res.status(500).send('Transfer order not found.');
    } else if (event.event?.startsWith('product.route.') && product?.id) {
      const productStatus = {
        'product.route.activated': 'activated',
        'product.route.under_review': 'under_review',
        'product.route.needs_clarification': 'needs_clarification',
      }[event.event];
      if (productStatus) {
        const partner = await foodPartnerModel.findOneAndUpdate(
          { routeProductId: product.id },
          { $set: { routeProductStatus: productStatus } },
          { new: true },
        );
        if (partner && productStatus === 'activated') {
          await routeService.processPartnerPendingTransfers(partner._id);
        }
      }
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Razorpay Route webhook processing error:', error);
    return res.status(500).send('Webhook processing failed.');
  }
}

module.exports = {
  getPayoutAccount,
  createPayoutAccount,
  processPendingPayouts,
  handleRouteWebhook,
};
