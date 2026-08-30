# JobNotifier Web Dashboard

A modern Next.js 16 (React 19, Tailwind CSS) web application for JobNotifier featuring live tech & AI internship search, country filtering (Canada, USA, International), Kanban application lifecycle tracking, Supabase Auth user management, and Vercel Web Analytics.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

### 3. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing & Diagnostics Commands

### 🧪 1. Run Frontend Test Suite
Runs unit and integration tests for title normalization, company deduplication, tracking URL cleaning, country isolation (Canada vs USA), and Kanban pipeline transitions:
```bash
npm test
```

### 🏥 2. Run Live Supabase Health Check
Validates your environment variables, tests Supabase connectivity, and checks table read/write access for `jobs`, `users`, and `applications`:
```bash
npm run health
```

### 🏗️ 3. Production Build Test
Verifies that all TypeScript types, Tailwind styles, and Next.js App Router pages compile cleanly for deployment:
```bash
npm run build
```

### 🛡️ 4. Security Audit
Checks for dependency vulnerabilities and applies safe non-breaking patches:
```bash
npm audit fix
```

---

## Deployment to Vercel

1. Push your changes to GitHub.
2. In the [Vercel Dashboard](https://vercel.com/new), import your repository and set the **Root Directory** to `web`.
3. Add the following Environment Variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**.
5. In your Vercel Project dashboard, open the **Analytics** tab and click **Enable Web Analytics** to track live visitor traffic and page views.

