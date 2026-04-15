# Invisible Credit

**AI-Powered Micro-Lending for the Philippines**

An AI-powered credit scoring platform that enables Rural and Cooperative Banks (RCBs) to assess micro-loans for borrowers with no formal credit history, using alternative data and psychometric assessment.

---

## Quick Start

### 1. Prerequisites

- Python 3.11+
- Node.js 18+ (for the React frontend)
- An GEMINI API key

### 2. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Train the credit scoring model (generates model.pkl)
python train.py

# Start the API server
uvicorn main:app --reload --port 8001
```

The API will be live at **http://localhost:8001**
Interactive docs: **http://localhost:8001/docs**

### 3. Frontend Setup

The frontend is a single-file React app (`frontend/index.jsx`). To run it:

```bash
cd frontend

# If using Vite (recommended):
npm create vite@latest . -- --template react
# Replace src/App.jsx content with index.jsx, or import it
npm install
npm run dev
```

Or use any React setup that supports JSX — the component is a default export.

---


## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness probe |
| POST | `/score` | Credit scoring via XGBoost + SHAP |
| POST | `/psychometric` | Psychometric scoring via GEMINI |
| POST | `/psychometric/fallback` | Manual score fallback |

### POST /score — Request

```json
{
  "telco_provider": "Globe",
  "monthly_topup": 300,
  "topup_frequency": 8,
  "utility_payments_on_time": 10,
  "gcash_maya_active": true,
  "monthly_send_volume": 1500,
  "livelihood_type": "vendor",
  "years_in_livelihood": 7,
  "psychometric_score": 68.5
}
```

### POST /score — Response

```json
{
  "credit_score": 71,
  "band": "Approve",
  "probability": 0.714,
  "reason_codes": [
    "Utility payments on time +22 pts",
    "Psychometric score +14 pts",
    "Years in livelihood +8 pts"
  ],
  "model_version": "v1.0.0-hackathon"
}
```

### POST /psychometric — Request

```json
{
  "answers": [
    "I would repay in 30 days from my market earnings...",
    "During lean months I cut food budget and walk instead of taking jeepney...",
    "I always set aside 10% before spending anything...",
    "I would explain my situation and ask them to wait until I settle my bills...",
    "I want to expand my stall and hire one helper in 18 months..."
  ],
  "borrower_name": "Elena Reyes"
}
```

---

## Scoring Bands

| Band | Score Range | Action |
|------|------------|--------|
| Approve | 70–100 | Proceed with loan documentation |
| Conditional Approve | 50–69 | Additional verification / reduced amount |
| Decline | 0–49 | Provide written reason codes (BSP Circular 1105) |

---

## Demo Script (3 minutes)

1. **Hook** — Tell Elena's story. She borrows ₱5,000 every morning.
2. **Problem** — 34 million Filipinos are credit-invisible.
3. **Intake form** — Enter Elena's data: market vendor, Cebu, GCash active, pays Meralco on time.
4. **Psychometric quiz** — Run the 5 questions. Show Claude interpreting her answers.
5. **Score reveal** — 71/100 — Approved. Show the 3 reason codes.
6. **Impact** — At 15% annual interest instead of 240%.

---

## Regulatory Note

SHAP-based reason codes satisfy **BSP Circular 1105** disclosure requirements, which mandate that borrowers receive an explanation when credit is declined or conditionally approved.

---

## Out of Scope (Hackathon MVP)

- USSD/SMS interface (requires telco gateway)
- Live telco API integration (requires NDAs)
- BSP regulatory sandbox
- Persistent database
- Authentication / RBAC
- Mobile-responsive design
