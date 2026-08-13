# 📢 Campus Pulse — Digital Notice Board

A modern, beginner-friendly full-stack web application built for college campuses. It replaces traditional physical notice boards with an interactive, real-time digital announcement platform accessible to students and faculty alike.

---

## 🛑 Problem Statement

College announcements are traditionally pinned to physical notice boards located around campus buildings. This creates several key issues:
- **Limited Reach**: Students miss critical updates regarding exam schedules, events, or urgent notices if they do not physically pass by notice boards.
- **Outdated Information**: Paper notices often remain posted long after deadlines have passed, cluttering notice boards with stale information.
- **No Search or Filtering**: Finding a specific announcement requires reading through dozens of paper flyers manually.

---

## ✨ Solution & Key Features

**Campus Pulse** provides a centralized, instant digital board where announcements are posted and updated in real-time.

### 🎓 Student / Public View
- **Newest-First Feed**: Notices are sorted chronologically so urgent and recent announcements appear first.
- **Category Filters**: Easily filter notices by category (*All Notices, 📑 Exam, 🎉 Event, 📌 General, 🚨 Urgent*).
- **Instant Search**: Real-time keyword search across notice titles and descriptions.

### 🔐 Admin Mode (Passcode Secured)
- **Toggle Admin Mode**: Secure mode switch unlocked via passcode (`admin123`).
- **Post Announcement**: Create new notices with Title, Category, Description, and Urgent flag.
- **Edit & Delete**: Edit existing notices or remove expired ones instantly.

---

## 🛠️ Tech Stack

- **Backend**: Node.js + Express.js (RESTful API server)
- **Database**: Local JSON persistence (`notices.json`) — zero complex database setup required
- **Frontend**: HTML5, Vanilla CSS3 (Modern Glassmorphism Dark Theme), JavaScript (`fetch` API)

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js (v14+ recommended) installed on your system.

### Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ratnasirisinisetti/digital-notice-board.git
   cd digital-notice-board
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Open in browser**:
   Navigate to **`http://localhost:3000`** in your web browser.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/notices` | Fetch all notices (sorted newest first) |
| `POST` | `/api/notices` | Create a new notice |
| `PUT` | `/api/notices/:id` | Update an existing notice |
| `DELETE` | `/api/notices/:id` | Delete a notice |

---

## 🔑 Default Credentials

- **Admin Passcode**: `admin123`
