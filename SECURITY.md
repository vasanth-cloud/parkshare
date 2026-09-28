# ParkShare Security Policy & Controls

## Security Implementation Summary

1. **Authentication & Password Safety**:
   - Passwords hashed using bcrypt via Passlib.
   - JWT Access tokens with HS256 algorithm and configurable expiration.

2. **Location Privacy Shield**:
   - Addresses for residential driveways and private spots are masked during public search.
   - Exact building numbers and host access instructions are revealed **strictly after payment verification**.

3. **Server-Side Payment Verification**:
   - Razorpay HMAC-SHA256 signature verification performed on backend API controllers.
   - Client-reported payment status is never trusted.

4. **Double-Booking Protection**:
   - Database row-locking (`SELECT FOR UPDATE`) prevents concurrent double bookings.

5. **Role-Based Access Control (RBAC)**:
   - Route dependencies enforce `PARKER`, `HOST`, and `ADMIN` privilege boundaries.
