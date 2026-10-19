# Car Spa & Detailing Frontend Module

Welcome to the **Car Spa & Detailing Module**! This modular directory is designated for developing the doorstep & in-bay car washing, detailing, and steam cleaning platform.

## Directory Structure
```
car-spa/
├── services/
│   └── spaApi.ts         # API communication methods (GET /packages, POST /book)
├── types/
│   └── index.ts          # TypeScript interfaces (SpaPackage, SpaBookingRequest)
├── pages/
│   └── CarSpaPage.tsx    # Main consumer spa booking page
└── README.md             # This guide
```

## Quickstart for Developers
1. **Packages & Types**: Add detailing packages and vehicle categories in `types/index.ts`.
2. **API Layer**: Connect your backend endpoints in `services/spaApi.ts`.
3. **UI Page**: Build out user journeys inside `CarSpaPage.tsx`.
4. **Backend Router**: Corresponding FastAPI endpoints live in `backend/app/routers/car_spa.py`.
