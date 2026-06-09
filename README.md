# Research 4 Students

<div align="center">

### The community platform for FPT University students to share knowledge, collaborate, and grow together.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-blue?logoColor=white)
![Status](https://img.shields.io/badge/Status-Active-brightgreen)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Research 4 Students is an open community platform built specifically for FPT University students. It provides a centralized space where students can upload and discover study materials, ask course-related questions, rate and review subjects, and stay connected with peers through real-time messaging — all in one place.

The platform addresses a common problem in university life: knowledge is scattered across group chats, personal drives, and informal channels. Research 4 Students brings that knowledge into a structured, searchable, and collaborative environment that benefits the entire student body.

Advisors and teachers can also participate by managing research projects, reviewing applications, and contributing to the Q&A forum — making the platform useful across all roles in the university ecosystem.

---

## Features

| Feature | Description |
|---|---|
| 👥 **Community Feed** | Post updates, share thoughts, tag topics, and like or comment on posts from peers |
| 📄 **Document Library** | Upload any file type (PDF, DOCX, ZIP, images), search by subject or type, and download with one click |
| ❓ **Q&A Forum** | Ask course questions, write answers, and mark accepted solutions to build a lasting knowledge base |
| ⭐ **Subject Reviews** | Rate and review university subjects by subject code, helping students choose courses wisely |
| 💬 **Real-time Chat** | Private one-on-one messaging powered by Socket.io with live delivery and read receipts |
| 🤖 **Discord Storage** | All uploaded files are stored via a Discord bot in a private channel; CDN URLs are cached and auto-refreshed |
| 🛡️ **Admin Panel** | Manage users, approve teacher accounts, moderate content, and monitor platform stats from a dedicated dashboard |

---

## Tech Stack

### Backend

| Technology | Purpose |
|---|---|
| Node.js | Server runtime |
| Express | HTTP framework and REST API |
| SQLite (better-sqlite3) | Embedded relational database |
| JWT + bcrypt | Authentication and password hashing |
| Socket.io | Real-time bidirectional communication |
| discord.js | File storage via Discord bot |
| Multer (memory storage) | In-memory file handling before Discord upload |
| Nginx | Reverse proxy and static file serving |
| PM2 | Process management and zero-downtime restart |

### Frontend

| Technology | Purpose |
|---|---|
| React 18 | UI component framework |
| Vite | Development server and production bundler |
| Axios | HTTP client with interceptors for token refresh |
| React Router v6 | Client-side routing |
| Socket.io-client | Real-time chat connection |

---

## Project Structure

```
research4students/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── components/      # Shared UI components (Navbar, Footer, etc.)
│   │   ├── context/         # AuthContext, LanguageContext, SocketContext
│   │   ├── views/           # Page-level components (Feed, Documents, Profile…)
│   │   └── services/        # Axios instance and API helpers
│   └── vite.config.js
├── server/                  # Express backend
│   ├── src/
│   │   ├── bot/             # Discord storage bot (uploadFile, refreshFileUrl)
│   │   ├── middleware/       # Auth, admin guards
│   │   ├── models/          # SQLite schema and migrations
│   │   ├── routes/          # REST API route handlers
│   │   └── socket/          # Socket.io event handlers
│   └── uploads/             # Legacy local file fallback (pre-Discord records)
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9
- A Discord bot token and a private storage channel ID (see [Discord Bot Setup](#environment-variables))

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/your-org/research4students.git
cd research4students
```

**2. Install server dependencies**

```bash
cd server && npm install
```

**3. Install client dependencies**

```bash
cd ../client && npm install
```

**4. Configure environment variables**

```bash
cp server/.env.example server/.env
# Open server/.env and fill in all required values
```

**5. Start the backend**

```bash
cd server && npm run dev
```

**6. Start the frontend**

```bash
cd ../client && npm run dev
```

### Running Locally

| Service | URL |
|---|---|
| Backend API | `http://localhost:5000` |
| Frontend | `http://localhost:5173` |

Vite is pre-configured to proxy all `/api` and `/socket.io` requests to `http://localhost:5000`, so no CORS configuration is needed during development.

---

## Environment Variables

Create a `.env` file in the `/server` directory with the following variables:

| Variable | Description | Example |
|---|---|---|
| `PORT` | Express server port | `5000` |
| `ACCESS_TOKEN_SECRET` | JWT access token signing secret | `your_access_secret_here` |
| `REFRESH_TOKEN_SECRET` | JWT refresh token signing secret | `your_refresh_secret_here` |
| `NODE_ENV` | Runtime environment | `production` |
| `ADMIN_USERNAME` | Admin panel username | `admin` |
| `ADMIN_PASSWORD` | Admin panel password | `changeme123` |
| `DISCORD_BOT_TOKEN` | Discord bot token from Developer Portal | `MTEx...` |
| `DISCORD_CHANNEL_ID` | ID of the private Discord storage channel | `123456789012345678` |

> **Never commit `.env` to git.** Make sure it is listed in `.gitignore`.

The Discord bot requires the following channel permissions: **View Channel**, **Send Messages**, **Attach Files**, **Read Message History**.

---

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full production setup guide covering Nginx reverse proxy configuration, PM2 process management, SSL with Let's Encrypt, and environment hardening on Ubuntu VPS.

---

## Contributing

Contributions are welcome. Fork the repository, create a feature branch, make your changes, and open a pull request against `main`.

Branch naming convention:
- `feature/your-feature-name` for new features
- `fix/your-fix-description` for bug fixes

Please keep commits focused and write clear commit messages. All pull requests require at least one review before merging.

---

## License

MIT License — Copyright © FPT University, Research 4 Students Team.
