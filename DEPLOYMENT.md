# Deployment

Frontend: Vercel. Backend: Render Node web service. Database: MongoDB Atlas.

## Before publishing

The repository currently tracks frontend/backend `.env` files and dependency folders. The updated `.gitignore` prevents new additions but does not untrack existing files. Remove these from Git tracking before pushing; keep local files. Rotate any credentials previously pushed to GitHub, because untracking does not remove history.

## Backend

Create a MongoDB Atlas cluster and database user. Obtain a connection URI with database name `school_logistics`. Existing local data must be migrated separately if needed.

Create a Render Node web service from the GitHub repository:

- Root directory: `school-logistics-system/backend`
- Build command: `npm ci`
- Start command: `npm start`
- Configure the variables listed in `school-logistics-system/backend/.env.example` in Render, using real values.
- Add the Render service's outbound IP ranges to Atlas Network Access.

Gmail SMTP uses port 587, which Render free web services block. Choose a suitable paid plan yourself or configure an email provider with a supported alternative. Do not use Mailtrap's sandbox for real user email delivery.

Open the backend root URL and confirm it returns `School Logistics API is running`.

## Frontend

Import the same repository into Vercel:

- Root directory: `school-logistics-system/frontend`
- Framework: Vite
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL=https://YOUR-ACTUAL-BACKEND.onrender.com/api`

Deploy after setting the environment variable; changing it requires redeployment.

## Verify

Test registration and email verification, login, database reads and writes, and refreshing a dashboard route. Use accounts that exist in the Atlas database.

References: https://vercel.com/docs/frameworks/frontend/vite, https://render.com/docs/deploy-node-express-app, https://render.com/docs/free, https://www.mongodb.com/docs/atlas/connect-to-database-deployment/
