// ==========================================
// Campus Pulse - Digital Notice Board Logic
// Security & Validation Enhanced
// ==========================================

// Global Application State
let notices = [];
let selectedCategory = 'ALL';
let searchQuery = '';
let isAdminMode = false;
let adminToken = null;

// DOM Elements
const noticeGrid = document.getElementById('noticeGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const filterChips = document.getElementById('filterChips');
const resultsCount = document.getElementById('resultsCount');

// Admin Elements
const toggleAdminBtn = document.getElementById('toggleAdminBtn');
const adminBtnText = document.getElementById('adminBtnText');
const adminBtnIcon = document.getElementById('adminBtnIcon');
const modeBadge = document.getElementById('modeBadge');
const modeText = document.getElementById('modeText');
const addNoticeBtn = document.getElementById('addNoticeBtn');

// Notice Modal Elements
const noticeModal = document.getElementById('noticeModal');
const modalTitle = document.getElementById('modalTitle');
const noticeForm = document.getElementById('noticeForm');
const noticeId = document.getElementById('noticeId');
const noticeTitleInput = document.getElementById('noticeTitleInput');
const noticeCategorySelect = document.getElementById('noticeCategorySelect');
const noticeUrgentCheck = document.getElementById('noticeUrgentCheck');
const noticeDescInput = document.getElementById('noticeDescInput');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const modalErrorAlert = document.getElementById('modalErrorAlert');

// Password Modal Elements
const passwordModal = document.getElementById('passwordModal');
const passwordForm = document.getElementById('passwordForm');
const adminPasswordInput = document.getElementById('adminPasswordInput');
const closePasswordModalBtn = document.getElementById('closePasswordModalBtn');
const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
const passwordErrorAlert = document.getElementById('passwordErrorAlert');
const verifyPasswordBtn = document.getElementById('verifyPasswordBtn');

// ==========================================
// Initialization & Event Listeners
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  fetchNotices();
  setupEventListeners();
});

function setupEventListeners() {
  // Category Filter Chips
  filterChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;

    document.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');

    selectedCategory = chip.dataset.category;
    renderNotices();
  });

  // Live Search Input
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    clearSearchBtn.classList.toggle('hidden', searchQuery.length === 0);
    renderNotices();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    renderNotices();
  });

  // Admin Mode Toggle
  toggleAdminBtn.addEventListener('click', () => {
    if (isAdminMode) {
      setAdminMode(false);
    } else {
      openPasswordModal();
    }
  });

  // Add Notice Button
  addNoticeBtn.addEventListener('click', () => {
    openNoticeModal();
  });

  // Notice Form Submit
  noticeForm.addEventListener('submit', handleSaveNotice);

  // Notice Modal Close Actions
  closeModalBtn.addEventListener('click', closeNoticeModal);
  cancelModalBtn.addEventListener('click', closeNoticeModal);

  // Password Form Submit
  passwordForm.addEventListener('submit', handlePasswordSubmit);
  closePasswordModalBtn.addEventListener('click', closePasswordModal);
  cancelPasswordBtn.addEventListener('click', closePasswordModal);
}

// ==========================================
// API Interaction Functions
// ==========================================

// Fetch notices from Express API
async function fetchNotices() {
  try {
    const response = await fetch('/api/notices');
    if (!response.ok) throw new Error('Failed to fetch notices');
    notices = await response.json();
    renderNotices();
  } catch (error) {
    console.error('Error loading notices:', error);
    noticeGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Unable to load notices</h3>
        <p>Please make sure the backend server is running on port 3000.</p>
      </div>
    `;
  }
}

// Handle Admin Passcode Verification (Server-Side Check & Lockout)
async function handlePasswordSubmit(e) {
  e.preventDefault();
  const inputPass = adminPasswordInput.value.trim();

  if (!inputPass) {
    showPasswordError('Please enter the admin passcode.');
    return;
  }

  hidePasswordError();
  verifyPasswordBtn.disabled = true;
  verifyPasswordBtn.textContent = 'Verifying...';

  try {
    const response = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: inputPass })
    });

    const data = await response.json();

    if (!response.ok) {
      showPasswordError(data.error || 'Authentication failed.');
      return;
    }

    // Success! Store server admin token
    adminToken = data.token;
    setAdminMode(true);
    closePasswordModal();
  } catch (error) {
    showPasswordError('Server connection error. Please try again.');
  } finally {
    verifyPasswordBtn.disabled = false;
    verifyPasswordBtn.textContent = 'Verify & Unlock';
  }
}

// Handle Form Submission (Create or Update with Validation)
async function handleSaveNotice(e) {
  e.preventDefault();
  hideModalError();

  const title = noticeTitleInput.value.trim();
  const category = noticeCategorySelect.value;
  const isUrgent = noticeUrgentCheck.checked;
  const description = noticeDescInput.value.trim();
  const id = noticeId.value;

  // Client-Side Input Validation
  if (!title) {
    showModalError('Title cannot be empty or contain only whitespace.');
    noticeTitleInput.focus();
    return;
  }

  if (!description) {
    showModalError('Description cannot be empty or contain only whitespace.');
    noticeDescInput.focus();
    return;
  }

  const payload = { title, category, isUrgent, description };
  const headers = {
    'Content-Type': 'application/json',
    'x-admin-token': adminToken || ''
  };

  try {
    let response;
    if (id) {
      // Update existing notice
      response = await fetch(`/api/notices/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });
    } else {
      // Create new notice
      response = await fetch('/api/notices', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
    }

    const data = await response.json();

    if (!response.ok) {
      showModalError(data.error || 'Failed to save notice.');
      return;
    }

    closeNoticeModal();
    await fetchNotices();
  } catch (error) {
    showModalError('Error saving notice: ' + error.message);
  }
}

// Delete a Notice (Server Authorized)
async function deleteNotice(id) {
  if (!confirm('Are you sure you want to delete this notice?')) return;

  try {
    const response = await fetch(`/api/notices/${id}`, {
      method: 'DELETE',
      headers: {
        'x-admin-token': adminToken || ''
      }
    });

    const data = await response.json();

    if (!response.ok) {
      alert('Delete failed: ' + (data.error || 'Unauthorized'));
      return;
    }

    await fetchNotices();
  } catch (error) {
    alert('Error deleting notice: ' + error.message);
  }
}

// Edit a Notice (Populates modal)
function editNotice(id) {
  const notice = notices.find((n) => n.id === id);
  if (!notice) return;

  openNoticeModal(notice);
}

// ==========================================
// UI Rendering Logic & Sanitization
// ==========================================

function renderNotices() {
  // Filter by Category and Search Query
  const filtered = notices.filter((notice) => {
    const matchesCategory =
      selectedCategory === 'ALL' ||
      (selectedCategory === 'Urgent' ? notice.isUrgent : notice.category === selectedCategory);

    const matchesSearch =
      notice.title.toLowerCase().includes(searchQuery) ||
      notice.description.toLowerCase().includes(searchQuery);

    return matchesCategory && matchesSearch;
  });

  // Update Status Text
  resultsCount.textContent = `Showing ${filtered.length} of ${notices.length} notice${notices.length === 1 ? '' : 's'}`;

  // Toggle Empty State
  if (filtered.length === 0) {
    noticeGrid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  // Render Grid Cards with XSS-safe escaping
  noticeGrid.innerHTML = filtered
    .map((notice) => {
      const formattedDate = formatDate(notice.timestamp);
      const isUrgentClass = notice.isUrgent ? 'urgent-card' : '';
      const safeTitle = escapeHtml(notice.title);
      const safeDescription = escapeHtml(notice.description);

      return `
        <article class="notice-card ${isUrgentClass}">
          <div class="notice-header">
            <div class="badge-group">
              <span class="badge badge-${notice.category}">${getCategoryIcon(notice.category)} ${notice.category}</span>
              ${notice.isUrgent ? '<span class="badge badge-Urgent">🚨 URGENT</span>' : ''}
            </div>
            <span class="timestamp">${formattedDate}</span>
          </div>

          <h3 class="notice-title">${safeTitle}</h3>
          <p class="notice-body">${safeDescription}</p>

          <div class="notice-footer">
            <span class="timestamp">Posted by Campus Admin</span>
            ${
              isAdminMode
                ? `
              <div class="admin-actions">
                <button class="btn btn-edit-sm" onclick="editNotice('${notice.id}')">✏️ Edit</button>
                <button class="btn btn-danger-sm" onclick="deleteNotice('${notice.id}')">🗑️ Delete</button>
              </div>
            `
                : ''
            }
          </div>
        </article>
      `;
    })
    .join('');
}

// ==========================================
// Admin Mode & Modal Helpers
// ==========================================

function openPasswordModal() {
  adminPasswordInput.value = '';
  hidePasswordError();
  passwordModal.classList.remove('hidden');
  adminPasswordInput.focus();
}

function closePasswordModal() {
  passwordModal.classList.add('hidden');
  hidePasswordError();
}

function setAdminMode(enabled) {
  isAdminMode = enabled;
  if (!enabled) adminToken = null;

  if (enabled) {
    modeBadge.classList.add('admin-active');
    modeText.textContent = 'Admin Mode Active';
    adminBtnIcon.textContent = '🔓';
    adminBtnText.textContent = 'Exit Admin';
    addNoticeBtn.classList.remove('hidden');
  } else {
    modeBadge.classList.remove('admin-active');
    modeText.textContent = 'Student View';
    adminBtnIcon.textContent = '🔐';
    adminBtnText.textContent = 'Admin Mode';
    addNoticeBtn.classList.add('hidden');
  }
  renderNotices();
}

function openNoticeModal(notice = null) {
  noticeForm.reset();
  hideModalError();

  if (notice) {
    modalTitle.textContent = 'Edit Announcement';
    noticeId.value = notice.id;
    noticeTitleInput.value = unescapeHtml(notice.title);
    noticeCategorySelect.value = notice.category;
    noticeUrgentCheck.checked = Boolean(notice.isUrgent);
    noticeDescInput.value = unescapeHtml(notice.description);
  } else {
    modalTitle.textContent = 'Post New Announcement';
    noticeId.value = '';
  }

  noticeModal.classList.remove('hidden');
  noticeTitleInput.focus();
}

function closeNoticeModal() {
  noticeModal.classList.add('hidden');
  hideModalError();
}

function showModalError(msg) {
  modalErrorAlert.textContent = msg;
  modalErrorAlert.classList.remove('hidden');
}

function hideModalError() {
  modalErrorAlert.textContent = '';
  modalErrorAlert.classList.add('hidden');
}

function showPasswordError(msg) {
  passwordErrorAlert.textContent = msg;
  passwordErrorAlert.classList.remove('hidden');
}

function hidePasswordError() {
  passwordErrorAlert.textContent = '';
  passwordErrorAlert.classList.add('hidden');
}

// ==========================================
// Helper Utility Functions (XSS Protection)
// ==========================================

function getCategoryIcon(category) {
  switch (category) {
    case 'Exam': return '📑';
    case 'Event': return '🎉';
    case 'General': return '📌';
    case 'Urgent': return '🚨';
    default: return '📢';
  }
}

function formatDate(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return isoString;
  }
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function unescapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&');
}
