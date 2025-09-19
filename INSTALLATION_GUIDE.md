# VEA 2025 Portal – cPanel Installation Guide

This guide walks you through deploying the VEA 2025 Portal on a shared hosting plan that provides cPanel with Node.js and SSH support. Follow each section in order. Every command assumes that your cPanel username is `cpaneluser` and that the site will live at `portal2.victoryeducationalacademy.com.ng`. Replace these values with your actual details while you work.

---

## 1. Before you begin

| Requirement | Notes |
| --- | --- |
| **cPanel account** | Must include the *Setup Node.js App* feature (sometimes called Application Manager) and SSH access. |
| **Domain or subdomain** | Point the DNS record for `portal2.victoryeducationalacademy.com.ng` to the hosting server. |
| **Local copy of the project** | Download the contents of this repository and compress them into a `.zip`, or be ready to clone the repo from Git. |
| **Database credentials** | Decide on the MySQL database name, username, and a strong password. |
| **Paystack keys & JWT secret** | Obtain production Paystack keys and generate a 32+ character JWT secret. |
| **Node.js 18+** | The portal targets Next.js 14 and requires Node.js 18 or newer. |

> 💡 **Tip:** Keep a notepad with the database name, username, password, and any environment variables you create. You will need them several times.

---

## 2. Create the application folders

1. Sign in to cPanel and open **File Manager**.
2. Inside `public_html`, create a folder named `portal2` (or the directory that matches your subdomain’s document root).
3. Upload the zipped project (or prepare to clone it into this directory over SSH).

---

## 3. Provision the MySQL database

1. In cPanel search for **MySQL® Databases** and open it.
2. Under **Create New Database**, enter `vea_portal_2025` and click **Create Database**. Note the full database name – cPanel prefixes it with your account name (for example `cpaneluser_vea_portal_2025`).
3. Scroll to **MySQL Users** → **Add New User**. Create `vea_admin` with a strong password. The full username will be `cpaneluser_vea_admin`.
4. In **Add User to Database**, pair `cpaneluser_vea_admin` with `cpaneluser_vea_portal_2025`, click **Add**, and grant **ALL PRIVILEGES**.

You can verify the credentials later from **phpMyAdmin** by logging in with the same database user.

---

## 4. Prepare environment variables

The portal expects a `.env.local` file at the application root. You can upload it with the rest of the project or create it directly on the server.

```env
DATABASE_URL="mysql://cpaneluser_vea_admin:YOUR_DB_PASSWORD@localhost:3306/cpaneluser_vea_portal_2025"
JWT_SECRET="your-32-character-or-longer-secret"
NEXT_PUBLIC_APP_URL="https://portal2.victoryeducationalacademy.com.ng"
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="pk_live_your_paystack_public_key"
PAYSTACK_SECRET_KEY="sk_live_your_paystack_secret_key"
NEXT_TELEMETRY_DISABLED="1"
```

* Replace `YOUR_DB_PASSWORD` with the password you set in step 3.
* Add any other service credentials (SMTP, analytics, etc.) that your instance requires following the same `NAME="value"` pattern.

If you prefer to manage secrets through cPanel’s **Setup Node.js App** interface, you may skip uploading `.env.local` and instead add each variable in the application manager later. The application reads from either source.

---

## 5. Upload the project to the server

### Option A – File Manager (no SSH)
1. Compress the project on your local machine (excluding `node_modules`).
2. In **File Manager**, open `public_html/portal2` and upload the archive.
3. Use the **Extract** action to unpack the archive contents so that files such as `package.json`, `server.js`, and the `app/` directory sit directly inside `public_html/portal2`.
4. Upload `.env.local` into the same directory (use **Settings → Show Hidden Files** if you do not see it).

### Option B – SSH / Git (recommended for updates)
1. Connect through SSH: `ssh cpaneluser@your-server-hostname`.
2. Navigate to the target folder: `cd ~/public_html/portal2`.
3. Clone the repository or upload files with `scp`. Example: `git clone https://github.com/your-org/vea-2025-portal.git .`
4. Create the `.env.local` file with `nano .env.local` and paste the variables from section 4.

---

## 6. Install dependencies and build the app

1. From SSH or the cPanel Terminal, run the following commands in `~/public_html/portal2`:
   ```bash
   cd ~/public_html/portal2
   npm install
   npm run build
   ```
   *If you encounter permission errors, prepend commands with `NODE_ENV=production` or rerun with `npm install --legacy-peer-deps`.*
2. Confirm that `.next/`, `node_modules/`, and other build artifacts were created inside the directory.

> ⚠️ Avoid running `npm install` from your local machine and uploading `node_modules`. Always install on the server so native bindings compile correctly for the host environment.

---

## 7. Configure the Node.js application in cPanel

1. Open **Setup Node.js App** (or **Application Manager**) in cPanel.
2. Click **Create Application** and supply the following values:
   | Field | Value |
   | --- | --- |
   | **Application Mode** | Production |
   | **Node.js Version** | 18.x or 20.x (whichever is available and ≥18) |
   | **Application Root** | `portal2` |
   | **Application URL** | `https://portal2.victoryeducationalacademy.com.ng` (pick the subdomain you created) |
   | **Application Startup File** | `server.js` |
3. After creation, use the **Actions** panel to run `npm install` (if you did not already run it in step 6) and set environment variables if you chose not to use `.env.local`.
4. Set the **PORT** environment variable to `3000` if the interface does not auto-fill it. The included `server.js` binds to `process.env.PORT || 3000`.
5. Click **Restart Application**. The status indicator should turn green. The manager will proxy traffic from your chosen URL to the Node.js service running on the internal port.

---

## 8. Initialise the database schema

1. Launch **phpMyAdmin** from cPanel and select the database `cpaneluser_vea_portal_2025`.
2. Open the **Import** tab.
3. Choose the file `scripts/database-schema.sql` from this repository and upload it. (If you uploaded via SSH, the file already exists in the project directory; download it to your computer first or copy its contents into phpMyAdmin’s SQL window.)
4. Execute the import. This creates all required tables and inserts a default Super Admin user with email `admin@victoryeducationalacademy.com.ng`.
5. If you prefer to use different default accounts, edit the SQL script before importing or run your own `INSERT` statements afterward.

---

## 9. Point the domain and enable HTTPS

1. In cPanel open **Subdomains** and ensure `portal2` points to `public_html/portal2`.
2. Visit **SSL/TLS Status** (or **Let’s Encrypt™ SSL**) and issue a certificate for the subdomain.
3. Back in **Domains**, enable the “Force HTTPS Redirect” toggle for `portal2.victoryeducationalacademy.com.ng`.

Once DNS propagates, browsing to `https://portal2.victoryeducationalacademy.com.ng` should load the portal served from the Node.js application.

---

## 10. Validate the installation

1. Navigate to the site URL in a browser. The login page should appear.
2. Sign in with the seeded Super Admin account:
   - **Email:** `admin@victoryeducationalacademy.com.ng`
   - **Password:** `admin123`
3. Confirm that dashboards, report cards, and payments pages load without console errors.
4. Trigger a Paystack test payment (if you are still on test keys) to verify webhook callbacks and status updates.

---

## 11. Operating the application

| Task | How to perform it |
| --- | --- |
| **View logs** | From SSH: `cd ~/public_html/portal2 && tail -f ~/.cpanel/logs/nodejs/nodejs-portal2.log` or use the **Application Manager → Logs** button. |
| **Restart the service** | Click **Restart Application** in the Node.js App interface or run `touch tmp/restart.txt` from SSH. |
| **Update code** | Pull new commits via Git or upload a fresh archive, then rerun `npm install` (if dependencies changed) and `npm run build`, followed by an application restart. |
| **Change environment variables** | Edit `.env.local` and restart, or modify variables in the Node.js App interface and click **Restart Application**. |
| **Database backups** | Schedule backups through cPanel’s **Backup Wizard** or export the database via phpMyAdmin regularly. |

---

## 12. Troubleshooting checklist

| Symptom | Fix |
| --- | --- |
| *502 Bad Gateway or blank page* | Ensure the Node.js app is running in **Setup Node.js App** and that the startup file is `server.js`. Restart the app. |
| *Database connection errors* | Recheck `DATABASE_URL`, confirm the user has privileges, and verify the database name includes the cPanel prefix. |
| *Build fails with memory errors* | Rerun with `NODE_OPTIONS="--max-old-space-size=4096" npm run build`. |
| *Missing styles or assets* | Confirm the `public/` folder and `.next/static/` directory exist and were uploaded correctly. |
| *Paystack requests rejected* | Make sure the correct live/test keys are set and that the webhook URL configured in Paystack points to your domain. |
| *Cannot write to disk* | From SSH run `chmod 755 -R ~/public_html/portal2` and ensure files are owned by your cPanel user. |

If problems persist, consult the raw Node.js logs in `/home/cpaneluser/.cpanel/logs/nodejs/` or contact your hosting provider to confirm Node.js is enabled on the account.

---

## 13. Next steps after deployment

1. Change the default Super Admin password immediately.
2. Configure school branding (logos, email templates, SMS/SMTP settings).
3. Create real staff, parent, and student accounts.
4. Set up classes, subjects, fee structures, and approval workflows.
5. Schedule routine backups for both the database and any uploaded documents.
6. Monitor dependency updates and security advisories, applying patches during maintenance windows.

With these steps completed, the VEA 2025 Portal will be fully operational on your cPanel hosting environment.
