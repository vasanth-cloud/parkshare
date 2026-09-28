# ParkShare Database Schema (PostgreSQL)

Engine: PostgreSQL + SQLAlchemy 2.0 + Alembic Migrations

## Core Tables
1. **`users`**: User credentials, contact info, status flags.
2. **`user_roles`**: RBAC roles (`PARKER`, `HOST`, `ADMIN`).
3. **`host_profiles`**: Host business info, UPI ID, total earnings.
4. **`vehicles`**: Saved vehicle details with normalized registration numbers (`TN38AB1234`).
5. **`parking_listings`**: Space metadata, approximate lat/long, exact address, booking mode, status.
6. **`parking_listing_images`**: S3 image URLs and display order.
7. **`parking_availabilities`**: Weekly availability schedule rules.
8. **`pricing_rules`**: Hourly, daily, monthly pricing and minimum duration.
9. **`bookings`**: Time window, 4-digit PIN verification code, QR token, status, fee breakdown.
10. **`parking_sessions`**: Check-in/out timestamps, verification method (`QR_CODE` or `VERIFICATION_CODE`), overtime fees.
11. **`payments` & `refunds` & `host_payouts`**: Payment provider transactions, host gross earnings, platform commission tracking.
