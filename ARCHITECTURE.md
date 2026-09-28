# ParkShare System Architecture Document

## Overview
ParkShare is a multi-tenant peer-to-peer parking space marketplace designed to run without hardware or sensor dependencies.

## System Topology
```
[React + TS Frontend] ──> [FastAPI REST Gateway] ──> [PostgreSQL Database]
                                │
                        [Razorpay Payment]
```

## Key Architectural Patterns

1. **Clean Service Layer Abstraction**:
   - `auth_service.py`: Authentication, vehicle registration, and user management.
   - `listing_service.py`: Geospatial discovery, privacy shield masking, and host management.
   - `booking_service.py`: Overlap double-booking row locking (`with_for_update`) and dynamic pricing calculations.
   - `payment_service.py`: Server-side signature verification & commission calculations.
   - `session_service.py`: QR token & PIN code check-in / check-out state transitions.

2. **Privacy Boundary Shield**:
   - Unconfirmed search queries anonymize exact GPS coordinates (~200m offset) and return neighborhood area names.
   - Full exact address and host navigation notes are delivered exclusively when a booking is confirmed.

3. **Concurrency Locking Strategy**:
   - Transactional isolation with SQL time-window checks:
     `WHERE listing_id = :id AND status IN ('CONFIRMED', 'ACTIVE', 'PENDING_PAYMENT') AND start_time < :end_time AND end_time > :start_time`
