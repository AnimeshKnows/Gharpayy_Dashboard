# Gharpayy Dashboard

Operational CRM and property management dashboard built with Next.js App Router.

## Stack
- Next.js 16 + React 18 + TypeScript
- Tailwind CSS + Radix UI + shadcn/ui
- TanStack React Query
- MongoDB + Mongoose
- JWT cookie-based auth via Next.js API routes

## What It Covers
- Lead lifecycle and pipeline tracking
- Visits, bookings, inventory, zones, and owners
- Dashboard analytics and activity logs
- Internal auth and protected app flows

## Local Setup
1. Install dependencies:
```bash
npm install
```

2. Create `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/dashboard
JWT_SECRET=replace_with_a_strong_secret
ADMIN_USERNAME=admin@example.com
ADMIN_PASSWORD=replace_with_a_strong_password

# Google Sheets lead sync
ENABLE_GOOGLE_LEADS_SYNC=true
GOOGLE_SHEETS_LEADS_SPREADSHEET_ID=your_google_sheet_id
GOOGLE_SHEETS_LEADS_SHEET_NAME=Leads
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nreplace_with_your_private_key\\n-----END PRIVATE KEY-----\\n"
```

If you prefer, you can copy [.env.example](.env.example) and replace the placeholders with your production values.

3. Start development server:
```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Scripts
- `npm run dev` - start local dev server
- `npm run build` - create production build
- `npm run start` - run production server
- `npm run lint` - run lint checks

