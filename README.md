# Solar Intelligence

A neutral solar savings, financing and EPC marketplace for Indian commercial and industrial (C&I) businesses. Live at https://si.atoznavigator.com.

## Structure

- `frontend/` — React 19 + Tailwind (shadcn/ui), built with CRACO. The calculation engine is in `src/lib/engine.js` and `src/lib/loanMath.js`, and the reference data (states, DISCOMs, incentives, lenders) is in `src/data/`.
- `backend/` — FastAPI + MongoDB. `server.py` handles leads, EPC data and stats, `auth_routes.py` handles phone-OTP and admin login, and `solar_service.py` provides live solar data by pincode.
- `docs/PRD.md` — product notes and change history.
- `vercel.json` — deploys both services to Vercel: the frontend at `/` and the API at `/api/*`.

## Local development

```bash
# backend
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001

# frontend
cd frontend
yarn install
REACT_APP_BACKEND_URL=http://localhost:8001 yarn start
```

## Environment variables

Backend: `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `FIREBASE_PROJECT_ID`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Optional: `REQUIRE_LOGIN=true` to require login for the whole API.

Frontend: `REACT_APP_FIREBASE_API_KEY`, `REACT_APP_FIREBASE_AUTH_DOMAIN`, `REACT_APP_FIREBASE_PROJECT_ID`, `REACT_APP_FIREBASE_APP_ID`. Optional: `REACT_APP_REQUIRE_LOGIN=true` to put the login screen in front of the whole site.

## Login

Phone-OTP login uses Firebase Authentication. Firebase sends and checks the SMS, the backend verifies the Firebase ID token (`POST /api/auth/firebase`) and issues its own session token, and users are stored in MongoDB. Add test phone numbers in the Firebase console to test without sending real SMS.
