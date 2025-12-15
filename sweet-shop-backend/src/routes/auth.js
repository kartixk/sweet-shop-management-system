const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { hashPassword, comparePassword, signToken } = require('../services/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already in use' });

    const hashed = await hashPassword(password);
    const user = await User.create({ email, password: hashed, name });
    
    // Create token payload
    const token = signToken({ id: user._id, email: user.email, role: user.role });
    
    res.status(201).json({ 
      user: { id: user._id, email: user.email, name: user.name, role: user.role }, 
      token 
    });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const ok = await comparePassword(password, user.password);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    const token = signToken({ id: user._id, email: user.email, role: user.role });
    
    res.json({ 
      token, 
      user: { id: user._id, email: user.email, name: user.name, role: user.role } 
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;