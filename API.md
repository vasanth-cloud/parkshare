# ParkShare API Specification

Base Endpoint: `/api/v1`

## 1. Authentication (`/auth`)
* `POST /auth/register`: Create Parker or Host account.
* `POST /auth/login`: Authenticate and obtain JWT access token.
* `GET /auth/me`: Get current user details.
* `POST /auth/become-host`: Upgrade account to Space Host.

## 2. Vehicles (`/vehicles`)
* `GET /vehicles`: List saved user vehicles.
* `POST /vehicles`: Add new vehicle with plate number normalization.

## 3. Listings (`/listings`)
* `GET /listings/search`: Public search with city, area, vehicle type filters (Returns approximate coordinates).
* `POST /listings`: Create new parking space listing.
* `GET /listings/my-listings`: List host's listings.
* `GET /listings/{id}`: Detailed listing view.
* `POST /listings/{id}/toggle-status`: Toggle ACTIVE / PAUSED status.

## 4. Bookings (`/bookings`)
* `POST /bookings/calculate-price`: Calculate live duration & fee breakdown.
* `POST /bookings`: Create reservation (Protected against concurrent double-booking).
* `GET /bookings/my-bookings`: Parker booking history.
* `GET /bookings/{id}`: View booking (Reveals exact address if confirmed).

## 5. Parking Sessions (`/parking-sessions`)
* `POST /parking-sessions/check-in`: Check-in via QR token or 4-digit PIN code.
* `POST /parking-sessions/check-out/{booking_id}`: Check-out with overtime calculation.

## 6. Payments (`/payments`)
* `POST /payments/create-order`: Generate Razorpay order ID.
* `POST /payments/verify`: Verify payment signature and mark booking CONFIRMED.

## 7. Admin (`/admin`)
* `GET /admin/stats`: Platform overview metrics.
* `GET /admin/listings/pending`: Moderation queue.
* `POST /admin/listings/{id}/approve`: Approve or reject listing.
