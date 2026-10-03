# ParkShare — Peer-to-Peer Parking Space Marketplace

**ParkShare** ("Airbnb for Parking Spaces") is a production-grade peer-to-peer parking marketplace connecting space hosts (homeowners, apartments, offices, private lot owners) with drivers looking for parking spaces.

The platform requires **zero expensive hardware or AI sensors**. It relies on secure QR pass tokens, 4-digit PIN verification codes, location privacy shielding, dynamic schedule pricing, and server-side payment verification.

---

## Key Features

1. **Space Host Listing Engine**:
   - Host space creation wizard (driveways, garages, apartment bays, commercial lots).
   - Dynamic schedule configuration (Mon-Fri 9 AM-6 PM vs. Weekends vs. 24/7).
   - Instant booking vs. Host approval mode.
   - Host payout earnings tracker.

2. **Driver / Parker Discovery**:
   - Real-time search with List View & Interactive Map View.
   - Vehicle type filters (Car, SUV, Bike, Scooter, Van).
   - Dynamic price breakdown calculation (parking fee, 10% platform commission, 5% tax).

3. **Privacy & Security Shield**:
   - Public search endpoints display **approximate location coordinates** and neighborhood area names only.
   - Exact building addresses and host navigation access notes are revealed **strictly after payment confirmation**.

4. **Double-Booking Protection**:
   - PostgreSQL row locking (`SELECT FOR UPDATE`) and time-window overlap validation `(start_time < requested_end AND end_time > requested_start)`.

5. **Dual Check-in Options**:
   - Entrance QR code scanning + 4-digit PIN code verification.

6. **Payment Provider Integration**:
   - Server-verified Razorpay integration + developer Mock Mode.

7. **Admin Moderation & Control Center**:
   - System stats, pending listing approvals queue, platform commission analytics.

---

## Local Development Setup

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ / 20+
- PostgreSQL database running on `localhost:5432`

### 2. Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate

# Install Dependencies
pip install -r requirements.txt
pip install psycopg2-binary

# Create .env file with your PostgreSQL database URL
# DATABASE_URL="postgresql+psycopg2://postgres:YourPassword@localhost:5432/parkshare"

# Run Seed Data script to create tables and seed test accounts
python scripts/seed_data.py

# Start Backend API server (http://localhost:8000/docs)
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# App runs at http://localhost:3000
```

---

## Admin Credentials

| Role | Email | Password | Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `avasanth081@gmail.com` | `Vasanth@123` | Listing approvals queue, System stats, Revenue analytics |

---

## Run Unit & Integration Tests
```bash
cd backend
$env:PYTHONPATH="."
.\venv\Scripts\pytest.exe tests/test_backend.py
```

---

## Docker Containerization
```bash
docker-compose up --build
```
