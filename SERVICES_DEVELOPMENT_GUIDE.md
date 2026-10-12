# 🚗 ParkShare Services Development Guide

Welcome! This guide is designed for collaborators developing the **Acting Drivers Platform** and **Car Spa & Detailing Platform** within the ParkShare ecosystem.

---

## 🏗️ Architecture Overview

The platform is structured into modular services:
1. **🅿️ Parking System** *(Complete)*: Map radar, driveway booking, spot verification, host payouts.
2. **🧑‍✈️ Acting Drivers Platform** *(Ready for your implementation)*: On-demand certified chauffeurs.
3. **✨ Car Spa & Detailing Platform** *(Ready for your implementation)*: Doorstep & in-bay eco car wash/detailing.

---

## 📁 Where Your Code Lives

### 1. Frontend (`customer-web`)

All service code is neatly organized under `customer-web/src/modules/`:

```
customer-web/src/modules/
├── acting-drivers/
│   ├── types/index.ts            # TypeScript interfaces (DriverProfile, DriverBookingRequest)
│   ├── services/driverApi.ts     # API client connecting to backend (/api/v1/drivers)
│   ├── pages/ActingDriversPage.tsx # Main consumer booking page
│   └── README.md                 # Module documentation
│
└── car-spa/
    ├── types/index.ts            # TypeScript interfaces (SpaPackage, SpaBookingRequest)
    ├── services/spaApi.ts        # API client connecting to backend (/api/v1/car-spa)
    ├── pages/CarSpaPage.tsx      # Main consumer spa appointment page
    └── README.md                 # Module documentation
```

- **Routes**:
  - `/` -> Clean native services menu grid
  - `/parking` -> Dedicated full-screen parking radar map
  - `/services/drivers` -> Acting Drivers booking page
  - `/services/car-spa` -> Car Spa Detailing booking page

---

### 2. Backend (`backend`)

All backend APIs are modularized into dedicated routers, services, and schemas:

```
backend/app/
├── routers/
│   ├── drivers.py       # Endpoints: GET /api/v1/drivers/available, POST /api/v1/drivers/book
│   └── car_spa.py       # Endpoints: GET /api/v1/car-spa/packages, POST /api/v1/car-spa/book
│
├── schemas/
│   ├── driver.py        # Pydantic schemas (DriverProfileSchema, DriverBookingCreate, etc.)
│   └── car_spa.py       # Pydantic schemas (SpaPackageSchema, SpaBookingCreate, etc.)
│
└── services/
    ├── driver_service.py # Business logic (fare calculator, driver allocation, OTP generation)
    └── car_spa_service.py # Business logic (package pricing, vehicle surplus, slot reservation)
```

---

## 🚀 How to Run Locally

### Start Backend API:
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```
- Interactive Swagger API Docs: **http://localhost:8000/docs**

### Start Customer Web App:
```bash
cd customer-web
npm run dev
```
- App runs at: **http://localhost:5173** (mobile & desktop)

---

## 🛠️ Step-by-Step: Adding New Features

### Adding a Driver Feature (e.g., Driver Live Location or Rating):
1. **Schema**: Add fields in `backend/app/schemas/driver.py`.
2. **Logic**: Update queries in `backend/app/services/driver_service.py`.
3. **Endpoint**: Expose route in `backend/app/routers/drivers.py`.
4. **Frontend**: Update `customer-web/src/modules/acting-drivers/types/index.ts` and fetch via `driverApi.ts`.

### Adding a Car Spa Feature (e.g., Custom Add-on Services):
1. **Schema**: Add fields in `backend/app/schemas/car_spa.py`.
2. **Logic**: Update package list or calculations in `backend/app/services/car_spa_service.py`.
3. **Endpoint**: Expose route in `backend/app/routers/car_spa.py`.
4. **Frontend**: Update `customer-web/src/modules/car-spa/types/index.ts` and fetch via `spaApi.ts`.
