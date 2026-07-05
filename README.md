# Fashion Source BD Backend

Express + MongoDB + Cloudinary backend for the CMS/admin dashboard.

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in MongoDB and Cloudinary values.
3. Install dependencies:

```bash
npm install
```

4. Seed the database:

```bash
npm run db:init
```

5. Start backend:

```bash
npm run dev
```

## API Base

`http://localhost:5000/api`

## MongoDB Info Needed

Send the full `MONGODB_URI` connection string from MongoDB Atlas.
