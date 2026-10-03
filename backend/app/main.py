from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine, run_migrations
from app.routers import auth, vehicles, listings, bookings, sessions, payments, reviews, admin, disputes, verification

# Create Database tables & run column migrations on startup
Base.metadata.create_all(bind=engine)
run_migrations()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="ParkShare - Peer-to-Peer Parking Space Marketplace API",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded KYC and profile photo files
from fastapi.staticfiles import StaticFiles
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(vehicles.router, prefix=settings.API_V1_STR)
app.include_router(listings.router, prefix=settings.API_V1_STR)
app.include_router(bookings.router, prefix=settings.API_V1_STR)
app.include_router(sessions.router, prefix=settings.API_V1_STR)
app.include_router(payments.router, prefix=settings.API_V1_STR)
app.include_router(reviews.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(disputes.router, prefix=settings.API_V1_STR)
app.include_router(verification.router, prefix=settings.API_V1_STR)


@app.api_route("/", methods=["GET", "HEAD"])
def root():
    return {
        "status": "online",
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs"
    }

@app.api_route("/health", methods=["GET", "HEAD"])
def health_check():
    return {"status": "healthy"}

@app.get("/privacy", response_class=HTMLResponse)
def privacy_policy():
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>ParkShare - Privacy Policy</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; }
            h1, h2 { color: #0d9488; }
            .box { background: #f0fdfa; padding: 20px; border-radius: 80px; border-left: 5px solid #0d9488; }
        </style>
    </head>
    <body>
        <h1>ParkShare Privacy Policy</h1>
        <p><strong>Effective Date:</strong> October 2026</p>
        <p>ParkShare ("we", "our", or "us") provides a peer-to-peer parking space platform connecting vehicle drivers with parking space hosts.</p>
        
        <h2>1. Information We Collect</h2>
        <ul>
            <li><strong>Personal Information:</strong> Name, email address, and phone number for account creation and authentication.</li>
            <li><strong>Location Data:</strong> Approximate and precise location while using the app to show nearby parking spaces.</li>
            <li><strong>Photos / Media:</strong> Vehicle and parking space photos captured via device camera for space verification and odometer confirmation.</li>
            <li><strong>Payment Information:</strong> Financial transactions are processed securely via PCI-DSS compliant third-party payment gateways (Razorpay). We do not store raw card numbers.</li>
        </ul>

        <h2>2. Data Security & Encryption</h2>
        <p>All user information is transmitted securely using industry-standard TLS/HTTPS encryption in transit.</p>

        <h2>3. Data Retention & Deletion</h2>
        <p>Users may request deletion of their account and associated personal data at any time by visiting our <a href="/delete-account">Account Deletion Page</a> or contacting us at <strong>support@parkshare.app</strong>.</p>
    </body>
    </html>
    """

@app.get("/delete-account", response_class=HTMLResponse)
def delete_account_request():
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>ParkShare - Account & Data Deletion Request</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; }
            h1, h2 { color: #e11d48; }
            .card { background: #fff1f2; padding: 25px; border-radius: 12px; border-left: 5px solid #e11d48; margin-top: 20px; }
            a { color: #0d9488; font-weight: bold; }
        </style>
    </head>
    <body>
        <h1>ParkShare Account & Data Deletion Request</h1>
        <p>At ParkShare, we respect your right to control your personal data.</p>
        
        <div class="card">
            <h2>How to Request Account & Data Deletion:</h2>
            <ol>
                <li>Send an email to <a href="mailto:support@parkshare.app">support@parkshare.app</a> from your registered ParkShare email address.</li>
                <li>Use the subject line: <strong>"Account Deletion Request - [Your Registered Email]"</strong>.</li>
                <li>Upon receiving your verified request, we will permanently remove your account, profile details, and vehicle records within 30 days.</li>
            </ol>
            <p><strong>Note:</strong> Active reservations must be completed or cancelled before your account can be deleted.</p>
        </div>
    </body>
    </html>
    """
