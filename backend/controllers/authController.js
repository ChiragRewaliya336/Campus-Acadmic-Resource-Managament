const bcrypt = require('bcrypt');
const db = require('../db/connection');

const register = async (req, res) => {
  const { name, email, password, role = 'student' } = req.body;

  console.log('Register request received:', { email, role, hasName: !!name, hasPassword: !!password });

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  try {
    // Check if user already exists
    const [existing] = await db.promise().query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const [result] = await db.promise().query(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, password_hash, role]
    );

    console.log('Register success:', { userId: result.insertId, email });
    res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  console.log('Login request received:', { email, hasPassword: !!password });

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Find user
    const [users] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    // Check password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      console.warn('Login failed: invalid password', { email });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Return user info (exclude password)
    const { password_hash, ...userInfo } = user;
    console.log('Login success:', { userId: userInfo.id, email: userInfo.email, role: userInfo.role });
    res.json({ message: 'Login successful', user: userInfo });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { register, login };
