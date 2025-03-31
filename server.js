require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(express.static('.'));

// In-memory storage for demo (use database in production)
const otpStore = {};

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate random 6-digit OTP
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

// Send OTP endpoint
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const otp = generateOTP();
  otpStore[email] = { otp, expires: Date.now() + 300000 }; // 5 minutes expiry

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your MWALIMU ONLINE Verification Code',
      text: `Your verification code is: ${otp}\nThis code expires in 5 minutes.`,
      html: `<div>
        <h2>MWALIMU ONLINE Verification</h2>
        <p>Your verification code is:</p>
        <h3>${otp}</h3>
        <p>This code expires in 5 minutes.</p>
      </div>`
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// User storage for demo (use database in production)
const users = {};

// Registration endpoint
app.post('/api/register', async (req, res) => {
  const { name, phone, email, password } = req.body;

  // Basic validation
  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'Name, phone and password are required' });
  }

  // Check if user already exists
  if (users[phone]) {
    return res.status(400).json({ error: 'User already exists' });
  }

  // Generate OTP
  const otp = generateOTP();
  otpStore[phone] = { otp, expires: Date.now() + 300000 }; // 5 minutes expiry

  try {
    // In production, send SMS instead of email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email || process.env.ADMIN_EMAIL, // Fallback if no email provided
      subject: 'MWALIMU ONLINE - Phone Verification',
      text: `Your verification code is: ${otp}`,
      html: `<div>
        <h2>MWALIMU ONLINE Verification</h2>
        <p>Your verification code is:</p>
        <h3>${otp}</h3>
        <p>This code expires in 5 minutes.</p>
      </div>`
    });

    res.json({ success: true, phone });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// Verify OTP and complete registration
app.post('/api/verify-registration', (req, res) => {
  const { phone, otp, name, password } = req.body;

  if (!phone || !otp || !name || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const storedOtp = otpStore[phone];

  if (!storedOtp || storedOtp.expires < Date.now()) {
    return res.status(400).json({ error: 'OTP expired or invalid' });
  }

  if (storedOtp.otp === otp) {
    delete otpStore[phone];
    // In production, hash password before storing
    users[phone] = { name, phone, password };
    return res.json({ 
      success: true, 
      token: 'sample-auth-token',
      user: { name, phone }
    });
  }

  res.status(400).json({ error: 'Invalid OTP' });
});

// M-Pesa Payment Endpoint
app.post('/api/initiate-payment', async (req, res) => {
  const { phone, amount, reference } = req.body;

  if (!phone || !amount) {
    return res.status(400).json({ error: 'Phone and amount are required' });
  }

  try {
    // In production, this would call Safaricom's M-Pesa API
    // For demo, we'll simulate a payment request
    console.log(`Initiating payment of KES ${amount} to 0740452793 from ${phone}`);
    
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate random transaction code for demo
    const transactionCode = 'MPE' + Math.floor(100000 + Math.random() * 900000);
    
    res.json({
      success: true,
      message: 'Payment initiated successfully',
      transactionCode,
      businessNumber: '0740452793',
      amount
    });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

// Admin credentials (in production, use database and hashed passwords)
const adminCredentials = {
  email: 'admin@mwalimuonline.com',
  password: 'securePassword123' // In production, this should be hashed
};

// Admin login endpoint
app.post('/api/admin-login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (email === adminCredentials.email && password === adminCredentials.password) {
    return res.json({
      success: true,
      token: 'admin-auth-token', // In production, use JWT
      user: {
        email,
        role: 'admin'
      }
    });
  }

  res.status(401).json({ error: 'Invalid credentials' });
});

// Admin-only middleware
const adminAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // In production, verify JWT token here
  if (authHeader === 'Bearer admin-auth-token') {
    return next();
  }
  res.status(403).json({ error: 'Admin access required' });
};

// Protected admin endpoint example
app.get('/api/admin/stats', adminAuth, (req, res) => {
  res.json({
    totalStudents: 1248,
    activeClasses: 42,
    monthlyRevenue: 1864000
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`M-Pesa Pochi la Biashara: 0740452793`);
  console.log(`Admin portal: http://mwalimuonlineapp:${PORT}/admin-login.html`);
});
