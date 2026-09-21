# Blank Dashboard

A clean Next.js dashboard focused on authentication and user management.

## Features

- Protected dashboard routes
- Login/logout with JWT cookies
- Required 2FA setup and verification
- User list, create, edit, delete, suspend, role management, and 2FA reset
- Responsive dashboard sidebar
- MySQL/MariaDB tables for `users` and `user_trusted_devices`

## Requirements

- Node.js 20+
- MySQL or MariaDB
- npm

## Environment

Create `.env.local` in the project root:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=dashboard_template
JWT_SECRET=change-this-secret
```

Create the database before running migrations:

```sql
CREATE DATABASE dashboard_template;
```

## Setup

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

The seed command creates the default admin account:

```text
Email: admin@example.com
Password: password
```

Change the default password and `JWT_SECRET` before using this in production.

## Routes

- `/dashboard`
- `/dashboard/login`
- `/dashboard/users`
