// ==========================================
// Digital Notice Board - Express Backend Server
// ==========================================

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'notices.json');

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

// ==========================================
// API ROUTES
// ==========================================

// 1. GET /api/notices - Retrieve all notices (sorted newest first)
app.get('/api/notices', (req, res) => {
  const notices = readNotices();
  // Sort notices by timestamp descending (newest first)
  notices.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(notices);
});

// 2. POST /api/notices - Create a new notice
app.post('/api/notices', (req, res) => {
  const { title, description, category, isUrgent } = req.body;

  if (!title || !description || !category) {
    return res.status(400).json({ error: 'Title, description, and category are required.' });
  }

  const notices = readNotices();
  const newNotice = {
    id: Date.now().toString(),
    title: title.trim(),
    description: description.trim(),
    category: category.trim(),
    isUrgent: Boolean(isUrgent),
    timestamp: new Date().toISOString()
  };

  notices.push(newNotice);
  writeNotices(notices);

  res.status(201).json(newNotice);
});

// 3. PUT /api/notices/:id - Update an existing notice
app.put('/api/notices/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, category, isUrgent } = req.body;

  const notices = readNotices();
  const noticeIndex = notices.findIndex((n) => n.id === id);

  if (noticeIndex === -1) {
    return res.status(404).json({ error: 'Notice not found.' });
  }

  notices[noticeIndex] = {
    ...notices[noticeIndex],
    title: title !== undefined ? title.trim() : notices[noticeIndex].title,
    description: description !== undefined ? description.trim() : notices[noticeIndex].description,
    category: category !== undefined ? category.trim() : notices[noticeIndex].category,
    isUrgent: isUrgent !== undefined ? Boolean(isUrgent) : notices[noticeIndex].isUrgent,
    updatedAt: new Date().toISOString()
  };

  writeNotices(notices);
  res.json(notices[noticeIndex]);
});

// 4. DELETE /api/notices/:id - Delete a notice
app.delete('/api/notices/:id', (req, res) => {
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
