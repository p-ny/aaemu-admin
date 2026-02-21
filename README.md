<p align="center">
  <img src="https://img.shields.io/badge/AAEmu-Admin%20Panel-blueviolet?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0xMiAyTDIgNnY2YzAgNS41NSAzLjg0IDEwLjc0IDEwIDEyIDYuMTYtMS4yNiAxMC02LjQ1IDEwLTEyVjZMMTIgMnoiLz48L3N2Zz4=" alt="AAEmu Admin Panel"/>
  <br/>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" alt="React 18"/>
  <img src="https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express" alt="Express 5"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker" alt="Docker"/>
  <img src="https://img.shields.io/badge/License-GPL--3.0-blue?style=flat-square" alt="GPL-3.0 License"/>
</p>

# AAEmu Admin Panel aka api-manager

A web-based administration panel for managing [AAEmu](https://github.com/AAEmu/AAEmu) game servers. Built with a modern React + Express stack, it provides a unified interface for server monitoring, player management, cash shop editing, mail delivery, and more — all behind a secure admin login.

Designed to run alongside your AAEmu game server, either as a Docker container on the same network or as a standalone Node.js application.

---

## Features

| Feature | Description |
|---------|-------------|
| **Multi-Server Management** | Connect and manage multiple AAEmu game servers from one panel. Each server has its own API and MySQL configuration. |
| **Real-Time Dashboard** | Live server status, online player counts, player history charts (72h), and recent command activity feed. |
| **Command Console** | Execute any AAEmu server command with a full searchable execution history. |
| **Character Browser** | Browse online characters, search by name or account ID, view detailed character info. |
| **Player Management** | Teleport, kick, give items and some more. |
| **Expedition Browser** | View guilds/expeditions with member counts and online status. |
| **Auction House** | Browse and search auction house listings across servers. |
| **Mail System** | Send mail to individual characters, expeditions, families, online players, or everyone. Supports item attachments and gold. |
| **Cash Shop Editor (ICS)** | Full CRUD editor for SKU definitions, shop items, and menu/category hierarchy — writes directly to the game MySQL database. |
| **Item Data Browser** | Upload and browse `compact.sqlite3` game data files. Search items by name/ID with icon previews. |
| **User Management** | Create additional admin accounts and change passwords. |
| **Dark Cyberpunk UI** | Purpose-built dark theme with a cyberpunk aesthetic. |

---

```mermaid
flowchart TD
    Panel["AAEmu Admin Panel"]

    React["React SPA (Vite)
    - TailwindCSS
    - shadcn/ui
    - wouter"]

    API["Express API (port 5000)
    - Auth (bcrypt + sessions)
    - AAEmu Web API proxy
    - MySQL client (ICS)
    - SQLite reader (items)"]

    PostgreSQL["PostgreSQL (admin data)
    - users
    - servers
    - sessions
    - cmd history
    - snapshots"]

    Game["AAEmu Game Server (Web API)
    - /api/status
    - /api/characters
    - /api/commands/*
    - /api/mail/*
    - /api/auction/*"]

    MySQL["AAEmu MySQL DB (ICS cash shop)
    - ics_skus
    - ics_shop_items
    - ics_menu"]

    Panel <--> React
    Panel <--> API
    React <--> API
    API --> PostgreSQL
    API --> Game
    API --> MySQL
```

**PostgreSQL** stores the admin panel's own data: user accounts, server configurations, command history, player count snapshots, and sessions.

**MySQL** connections are made on-demand to your AAEmu game server's database for reading and writing cash shop (ICS) data.

**SQLite** is used read-only to browse item data from `compact.sqlite3` files uploaded through the panel.

---

## Quick Start

### Prerequisites

- **Node.js 20+** and **npm** (for bare metal)
- **Docker Engine 20.10+** and **Docker Compose v2+** (for Docker)
- An **AAEmu game server** running with its Web API enabled
- **PostgreSQL 14+** (bare metal only — Docker includes its own)

---

## Deployment

### Option A: Docker (Recommended)

The easiest method. Works great with Portainer or any Docker host. The admin panel automatically joins the `aaemu_default` Docker network so it can reach your game server containers by service name.

#### 1. Clone the repository

```bash
git clone https://github.com/p-ny/aaemu-admin/aaemu-admin.git
cd aaemu-admin
```

#### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# PostgreSQL (created automatically by Docker)
POSTGRES_USER=aaemu
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=aaemu_admin

# Application
APP_PORT=5000
SESSION_SECRET=generate-a-long-random-string
DEFAULT_ADMIN_PASSWORD=your-admin-password
NODE_ENV=production
```

> **Security:** Always change `POSTGRES_PASSWORD`, `SESSION_SECRET`, and `DEFAULT_ADMIN_PASSWORD` before deploying.

#### 3. Create the Docker network

If your AAEmu game server containers are already running, this network likely exists. Run this to be safe:

```bash
docker network create aaemu_default 2>/dev/null || true
```

#### 4. Build and start

```bash
docker compose up -d --build
```

The admin panel will be available at `http://your-server-ip:5000`.

#### 5. Log in

Use the default credentials:
- **Username:** `admin`
- **Password:** whatever you set in `DEFAULT_ADMIN_PASSWORD`

#### Updating

```bash
git pull
docker compose up -d --build
```

#### Docker Network Details

The `docker-compose.yml` connects to an external `aaemu_default` network. This lets the admin panel reach your AAEmu containers by service name:

| Service | Default Hostname | Purpose |
|---------|-----------------|---------|
| Game Server | `game` | AAEmu Web API (e.g., `http://game:1280`) |
| MySQL | `db` | ICS cash shop data |
| Login Server | `login` | Login server (if needed) |

The admin panel's own PostgreSQL is named `admin-db` to avoid conflicts with AAEmu's `db` service.

---

### Option B: Bare Metal (without Docker)

For running directly on your host machine without containers.

#### 1. Install dependencies

**Ubuntu/Debian:**
```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Build tools (needed for better-sqlite3)
sudo apt-get install -y python3 make g++
```

**Arch Linux:**
```bash
sudo pacman -S nodejs npm postgresql python make gcc
```

**macOS:**
```bash
brew install node@20 postgresql@16
```

#### 2. Set up PostgreSQL

```bash
sudo -u postgres psql -c "CREATE USER aaemu WITH PASSWORD 'your-password';"
sudo -u postgres psql -c "CREATE DATABASE aaemu_admin OWNER aaemu;"
```

#### 3. Clone and install

```bash
git clone https://github.com/p-ny/aaemu-admin/aaemu-admin.git
cd aaemu-admin
npm install
```

#### 4. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql://aaemu:your-password@localhost:5432/aaemu_admin
SESSION_SECRET=generate-a-long-random-string
DEFAULT_ADMIN_PASSWORD=your-admin-password
NODE_ENV=production
```

#### 5. Build and start

```bash
npm run build
npm run start
```

The admin panel will be available at `http://your-server-ip:5000`.

#### Running as a service (systemd)

Create `/etc/systemd/system/aaemu-admin.service`:

```ini
[Unit]
Description=AAEmu Admin Panel
After=network.target postgresql.service

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/aaemu-admin
EnvironmentFile=/path/to/aaemu-admin/.env
ExecStart=/usr/bin/node dist/index.cjs
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable aaemu-admin
sudo systemctl start aaemu-admin
```

#### Development mode

For local development with hot-reload:

```bash
npm run dev
```

This starts both the Express backend and Vite dev server with HMR on port 5000.

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string (auto-set in Docker) |
| `SESSION_SECRET` | — | Secret for signing session cookies (use a random string) |
| `DEFAULT_ADMIN_PASSWORD` | `changeme123` | Password for the initial `admin` user |
| `NODE_ENV` | `development` | Set to `production` for production builds |
| `APP_PORT` | `5000` | Host port mapping (Docker only) |
| `POSTGRES_USER` | `aaemu` | PostgreSQL username (Docker only) |
| `POSTGRES_PASSWORD` | `changeme` | PostgreSQL password (Docker only) |
| `POSTGRES_DB` | `aaemu_admin` | PostgreSQL database name (Docker only) |

### Adding a Game Server

1. Log in to the admin panel
2. Navigate to **Servers** in the sidebar
3. Click **Add Server**
4. Fill in:
   - **Name** — a friendly name for this server
   - **IP Address** — the AAEmu Web API host (e.g., `game` for Docker, or `192.168.1.100` for bare metal)
   - **Port** — the Web API port (default: `1234`)
   - **MySQL** — optionally configure MySQL credentials for cash shop editing
5. Click **Test Connection** to verify, then **Save**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, shadcn/ui, Radix UI, wouter |
| Backend | Express 5, TypeScript, tsx |
| Admin Database | PostgreSQL 16 with Drizzle ORM |
| Game Database | mysql2 (remote connections for ICS data) |
| Item Data | better-sqlite3 (compact.sqlite3 reader) |
| Auth | bcryptjs (12 rounds) + express-session + connect-pg-simple |
| State | TanStack React Query |
| Icons | Lucide React |

---

## Project Structure

```
├── client/                     React frontend
│   └── src/
│       ├── components/         UI components (layout, sidebar, shadcn/ui)
│       ├── hooks/              Custom hooks (useAuth, useAAEmu)
│       ├── lib/                Utilities
│       └── pages/              Page components
│           ├── dashboard.tsx    Server status + activity feed + player chart
│           ├── console.tsx     Command execution + history
│           ├── characters.tsx  Character browser + player management
│           ├── expeditions.tsx Guild/expedition viewer
│           ├── auction.tsx     Auction house browser
│           ├── mail.tsx        Mail send/receive system
│           ├── cashshop.tsx    ICS SKU + shop item + menu editor
│           ├── items.tsx       compact.sqlite3 item browser
│           ├── servers.tsx     Server CRUD management
│           ├── settings.tsx    User management + password
│           └── history.tsx     Command execution log
├── server/                     Express backend
│   ├── index.ts                Entry point (port 5000)
│   ├── routes.ts               All API route handlers
│   ├── auth.ts                 bcrypt auth + default admin creation
│   ├── storage.ts              Database access layer (Drizzle)
│   ├── db.ts                   PostgreSQL pool + table initialization
│   ├── aaemu-client.ts         AAEmu Web API HTTP client
│   ├── mysql-client.ts         MySQL client for ICS cash shop CRUD
│   ├── sqlite-client.ts        SQLite reader for compact.sqlite3
│   ├── vite.ts                 Vite dev server middleware
│   └── static.ts               Production static file serving
├── shared/                     Shared between client + server
│   ├── schema.ts               Drizzle schema + Zod validation
│   └── routes.ts               API route path definitions
├── Dockerfile                  Multi-stage production build
├── docker-compose.yml          Full stack with PostgreSQL
├── .env.example                Environment template
└── package.json                Dependencies + scripts
```

---

## Database Schema

The admin panel creates the following tables automatically on first startup:

| Table | Purpose |
|-------|---------|
| `users` | Admin accounts (username, bcrypt password hash, role) |
| `servers` | Game server configs (name, IP, port, MySQL credentials) |
| `command_history` | Audit log of all executed commands per server |
| `player_snapshots` | Player count history (polled every 5 min, 72h retention) |
| `session` | Express session store (managed by connect-pg-simple) |

---

## AAEmu Web API Integration

The admin panel proxies requests to the AAEmu Web API. The following endpoints are used:

| Panel Feature | AAEmu API Endpoint |
|---------------|-------------------|
| Server Status | `GET /api/status` |
| Online Characters | `GET /api/characters` |
| Character Search | `GET /api/characters/search?name=...` |
| Execute Command | `POST /api/commands/{commandName}` |
| Expeditions | `GET /api/expeditions` |
| Auction House | `GET /api/auction` |
| Send Mail | `POST /api/mail/send` |
| Read Mail | `POST /api/mail/list` |

Make sure your AAEmu game server has the Web API enabled and accessible from the admin panel host.

---

## Troubleshooting

### Cannot connect to server
- Verify the game server IP and Web API port are correct in the server settings
- Ensure the AAEmu Web API is enabled in your game server configuration
- Check firewall rules — the admin panel needs to reach the game server's API port
- **Docker:** Make sure both containers share the `aaemu_default` network

### MySQL not configured / Cash Shop not working
- Go to **Servers** → edit your server → fill in MySQL credentials
- Click **Test MySQL** to verify the connection
- The MySQL host should be `db` if your game DB runs in Docker on `aaemu_default`, or the actual IP for bare metal

### better-sqlite3 build failed
- Install build tools: `apt-get install python3 make g++`
- Delete `node_modules` and run `npm install` again

### Player actions not working
- Make sure the character is online when executing actions like kick, mute, or jail
- Check the activity feed on the dashboard for error messages
- Verify the game server's Web API supports the command being used

### Database errors on startup
- Tables are created automatically on first startup
- Verify `DATABASE_URL` is correct and PostgreSQL is running
- For Docker: check that the `admin-db` container is healthy with `docker compose ps`

### Cannot access the panel after Docker deployment
- Check that port 5000 is not blocked by your firewall
- Verify the container is running: `docker compose ps`
- Check logs: `docker compose logs app`

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Push Drizzle schema changes to database |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a pull request

---

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0).

You may redistribute and/or modify this software under the terms of the GPL-3.0.
See the [LICENSE](LICENSE) file for the full license text.

---

<p align="center">
  Built for the <a href="https://github.com/AAEmu/AAEmu">AAEmu</a> community
</p>
