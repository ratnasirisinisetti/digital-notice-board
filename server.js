// ==========================================
// Digital Notice Board - Express Backend Server
// Security & Validation Enhanced
// ==========================================

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'notices.json');

// Admin Passkey & Security State
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'admin123';
const activeTokens = new Set();

let failedAttempts = 0;
let lockoutUntil = 0;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30000; // 30 seconds

// Valid categories allowed
const VALID_CATEGORIES = ['Exam', 'Event', 'General', 'Urgent'];

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to read notices from JSON file
function readNotices() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error reading notices file:', error);
    return [];
  }
}

// Helper function to write notices to JSON file
function writeNotices(notices) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(notices, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing notices file:', error);
  }
}

// Sanitization Helper: Escapes HTML tags to prevent XSS attacks
function sanitizeString(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Middleware: Require Admin Authentication for mutating routes
function requireAdminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  const passcodeHeader = req.headers['x-admin-passcode'];

  if ((token && activeTokens.has(token)) || passcodeHeader === ADMIN_PASSCODE) {
    return next();
  }

  return res.status(403).json({ error: 'Unauthorized: Admin authentication required to perform this action.' });
}

// ==========================================
// API ROUTES
// ==========================================

// 1. POST /api/admin/verify - Verify admin passcode with rate-limiting / lockout
app.post('/api/admin/verify', (req, res) => {
  const now = Date.now();

  // Check if lockout period is currently active
  if (now < lockoutUntil) {
    const remainingSeconds = Math.ceil((lockoutUntil - now) / 1000);
    return res.status(429).json({
      error: `Too many failed attempts. Locked out for ${remainingSeconds} second(s). Please wait before trying again.`
    });
  }

  const { passcode } = req.body;

  if (!passcode) {
    return res.status(400).json({ error: 'Passcode is required.' });
  }

  if (passcode === ADMIN_PASSCODE) {
    // Reset lockout counters on success
    failedAttempts = 0;
    lockoutUntil = 0;

    // Generate secure admin token
    const token = crypto.randomBytes(24).toString('hex');
    activeTokens.add(token);

    return res.json({ success: true, token, message: 'Admin authenticated successfully.' });
  }

  // Handle failed attempt
  failedAttempts += 1;

  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    lockoutUntil = now + LOCKOUT_DURATION_MS;
    failedAttempts = 0;
    return res.status(429).json({
      error: `Too many failed passkey attempts. Admin login locked for 30 seconds.`
    });
  }

  const remaining = MAX_FAILED_ATTEMPTS - failedAttempts;
  return res.status(401).json({
    error: `Incorrect admin passcode. ${remaining} attempt(s) remaining before lockout.`
  });
});

// 2. GET /api/notices - Retrieve all notices (Public, sorted newest first)
app.get('/api/notices', (req, res) => {
  const notices = readNotices();
  // Sort notices by timestamp descending (newest first)
  notices.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(notices);
});

// 3. POST /api/notices - Create a new notice (Admin only)
app.post('/api/notices', requireAdminAuth, (req, res) => {
  let { title, description, category, isUrgent } = req.body;

  // Trim and validate input
  title = typeof title === 'string' ? title.trim() : '';
  description = typeof description === 'string' ? description.trim() : '';
  category = typeof category === 'string' ? category.trim() : '';

  if (!title) {
    return res.status(400).json({ error: 'Title cannot be empty or whitespace only.' });
  }

  if (!description) {
    return res.status(400).json({ error: 'Description cannot be empty or whitespace only.' });
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` });
  }

  // Sanitize text fields against XSS
  const safeTitle = sanitizeString(title);
  const safeDescription = sanitizeString(description);

  const notices = readNotices();
  const newNotice = {
    id: Date.now().toString(),
    title: safeTitle,
    description: safeDescription,
    category: category,
    isUrgent: Boolean(isUrgent),
    timestamp: new Date().toISOString()
  };

  notices.push(newNotice);
  writeNotices(notices);

  res.status(201).json(newNotice);
});

// 4. PUT /api/notices/:id - Update an existing notice (Admin only)
app.put('/api/notices/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  let { title, description, category, isUrgent } = req.body;

  const notices = readNotices();
  const noticeIndex = notices.findIndex((n) => n.id === id);

  if (noticeIndex === -1) {
    return res.status(404).json({ error: 'Notice not found.' });
  }

  // Validate fields if provided
  if (title !== undefined) {
    title = typeof title === 'string' ? title.trim() : '';
    if (!title) {
      return res.status(400).json({ error: 'Title cannot be empty or whitespace only.' });
    }
  }

  if (description !== undefined) {
    description = typeof description === 'string' ? description.trim() : '';
    if (!description) {
      return res.status(400).json({ error: 'Description cannot be empty or whitespace only.' });
    }
  }

  if (category !== undefined) {
    category = typeof category === 'string' ? category.trim() : '';
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }
  }

  notices[noticeIndex] = {
    ...notices[noticeIndex],
    title: title !== undefined ? sanitizeString(title) : notices[noticeIndex].title,
    description: description !== undefined ? sanitizeString(description) : notices[noticeIndex].description,
    category: category !== undefined ? category : notices[noticeIndex].category,
    isUrgent: isUrgent !== undefined ? Boolean(isUrgent) : notices[noticeIndex].isUrgent,
    updatedAt: new Date().toISOString()
  };

  writeNotices(notices);
  res.json(notices[noticeIndex]);
});

// 5. DELETE /api/notices/:id - Delete a notice (Admin only)
app.delete('/api/notices/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  let notices = readNotices();

  const initialLength = notices.length;
  notices = notices.filter((n) => n.id !== id);

  if (notices.length === initialLength) {
    return res.status(404).json({ error: 'Notice not found.' });
  }

  writeNotices(notices);
  res.json({ message: 'Notice deleted successfully', id });
});

// Start Server
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(` Digital Notice Board backend running on port ${PORT}`);
  console.log(` Access UI at: http://localhost:${PORT}`);
  console.log(`===================================================`);
});
