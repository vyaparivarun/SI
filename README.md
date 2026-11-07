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

## Environment variables (backend)

`MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE`. Never set `OTP_TEST_NUMBERS` in production.
