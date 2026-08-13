// ==========================================
// Campus Pulse - Digital Notice Board Logic
// ==========================================

// Global Application State
let notices = [];
let selectedCategory = 'ALL';
let searchQuery = '';
let isAdminMode = false;
let editingNoticeId = null;

const ADMIN_PASSCODE = 'admin123';

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

// Password Modal Elements
const passwordModal = document.getElementById('passwordModal');
const passwordForm = document.getElementById('passwordForm');
const adminPasswordInput = document.getElementById('adminPasswordInput');
const closePasswordModalBtn = document.getElementById('closePasswordModalBtn');
const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');

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
      // Disable Admin Mode
      setAdminMode(false);
    } else {
      // Open Passcode Modal
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

// Handle Form Submission (Create or Update)
async function handleSaveNotice(e) {
  e.preventDefault();

  const title = noticeTitleInput.value.trim();
  const category = noticeCategorySelect.value;
  const isUrgent = noticeUrgentCheck.checked;
  const description = noticeDescInput.value.trim();
  const id = noticeId.value;

  if (!title || !description || !category) return;

  const payload = { title, category, isUrgent, description };

  try {
    let response;
    if (id) {
      // Update existing notice
      response = await fetch(`/api/notices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      // Create new notice
      response = await fetch('/api/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (!response.ok) throw new Error('Failed to save notice');

    closeNoticeModal();
    await fetchNotices();
  } catch (error) {
    alert('Error saving notice: ' + error.message);
  }
}

// Delete a Notice
async function deleteNotice(id) {
  if (!confirm('Are you sure you want to delete this notice?')) return;

  try {
    const response = await fetch(`/api/notices/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete notice');

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
// UI Rendering Logic
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

  // Render Grid Cards
  noticeGrid.innerHTML = filtered
    .map((notice) => {
      const formattedDate = formatDate(notice.timestamp);
      const isUrgentClass = notice.isUrgent ? 'urgent-card' : '';

      return `
        <article class="notice-card ${isUrgentClass}">
          <div class="notice-header">
            <div class="badge-group">
              <span class="badge badge-${notice.category}">${getCategoryIcon(notice.category)} ${notice.category}</span>
              ${notice.isUrgent ? '<span class="badge badge-Urgent">🚨 URGENT</span>' : ''}
            </div>
            <span class="timestamp">${formattedDate}</span>
          </div>

          <h3 class="notice-title">${escapeHtml(notice.title)}</h3>
          <p class="notice-body">${escapeHtml(notice.description)}</p>

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
// Admin Mode & Modal Handlers
// ==========================================

function openPasswordModal() {
  adminPasswordInput.value = '';
  passwordModal.classList.remove('hidden');
  adminPasswordInput.focus();
}

function closePasswordModal() {
  passwordModal.classList.add('hidden');
}

function handlePasswordSubmit(e) {
  e.preventDefault();
  const inputPass = adminPasswordInput.value;

  if (inputPass === ADMIN_PASSCODE) {
    setAdminMode(true);
    closePasswordModal();
  } else {
    alert('Incorrect passcode! Default passcode is: admin123');
  }
}

function setAdminMode(enabled) {
  isAdminMode = enabled;
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
  if (notice) {
    modalTitle.textContent = 'Edit Announcement';
    noticeId.value = notice.id;
    noticeTitleInput.value = notice.title;
    noticeCategorySelect.value = notice.category;
    noticeUrgentCheck.checked = Boolean(notice.isUrgent);
    noticeDescInput.value = notice.description;
  } else {
    modalTitle.textContent = 'Post New Announcement';
    noticeId.value = '';
  }
  noticeModal.classList.remove('hidden');
  noticeTitleInput.focus();
}

function closeNoticeModal() {
  noticeModal.classList.add('hidden');
}

// ==========================================
// Helper Utility Functions
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
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
