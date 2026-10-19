# Acting Drivers Frontend Module

Welcome to the **Acting Drivers Module**! This modular directory is designated for developing the chauffeur & acting driver platform.

## Directory Structure
```
acting-drivers/
├── services/
│   └── driverApi.ts      # API communication methods (GET /available, POST /book)
├── types/
│   └── index.ts          # TypeScript interfaces (DriverProfile, DriverBookingRequest)
├── pages/
│   └── ActingDriversPage.tsx # Main consumer booking page
└── README.md             # This guide
```

## Quickstart for Developers
1. **Types**: Add or update driver fields in `types/index.ts`.
2. **API Layer**: Connect your backend endpoints in `services/driverApi.ts`.
3. **UI Page**: Build out user journeys inside `ActingDriversPage.tsx`.
4. **Backend Router**: Corresponding FastAPI endpoints live in `backend/app/routers/drivers.py`.
