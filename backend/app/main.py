from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine, run_migrations
from app.routers import auth, vehicles, listings, bookings, sessions, payments, reviews, admin, disputes, verification, chatbot, drivers, car_spa

# Create Database tables & run column migrations on startup
Base.metadata.create_all(bind=engine)
run_migrations()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="ParkCo - Peer-to-Peer Parking Space Marketplace API",
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
app.include_router(chatbot.router, prefix=settings.API_V1_STR)
app.include_router(drivers.router, prefix=settings.API_V1_STR)
app.include_router(car_spa.router, prefix=settings.API_V1_STR)


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
@app.get("/privacy-customer", response_class=HTMLResponse)
def privacy_policy():
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Privacy Policy - ParkCo | Thagadur Career Services (OPC) Private Limited</title>
        <style>
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 860px; margin: 30px auto; padding: 0 20px; color: #1f2937; background: #f9fafb; }
            .container { background: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e5e7eb; }
            h1 { color: #0f766e; font-size: 28px; margin-bottom: 8px; }
            h2 { color: #0d9488; font-size: 20px; margin-top: 32px; border-bottom: 2px solid #f0fdfa; padding-bottom: 8px; }
            .badge { display: inline-block; background: #ccfbf1; color: #0f766e; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
            .entity-card { background: #f0fdfa; border-left: 5px solid #0d9488; padding: 18px 24px; border-radius: 8px; margin: 20px 0; }
            .entity-card p { margin: 6px 0; font-size: 14px; }
            ul, ol { padding-left: 24px; }
            li { margin-bottom: 8px; }
            a { color: #0d9488; font-weight: 600; text-decoration: none; }
            a:hover { text-decoration: underline; }
            .footer-contact { background: #f3f4f6; padding: 20px; border-radius: 12px; margin-top: 40px; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div>
                <span class="badge">Google Play User Data Policy Compliant</span>
                <span style="display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 16px; margin-left: 8px;">Customer / Driver Edition</span>
            </div>

            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 18px; margin-bottom: 24px; font-size: 14px; display: flex; justify-content: space-between; align-items: center;">
                <span>Viewing policy for <strong>ParkCo</strong> (Customer app)</span>
                <a href="/privacy-partner" style="color: #0d9488; font-weight: 600; text-decoration: none;">Switch to ParkCo Partner (Host app) &rarr;</a>
            </div>

            <h1>Privacy Policy for ParkCo</h1>
            <p><strong>Effective Date:</strong> October 14, 2026 | <strong>Last Updated:</strong> October 15, 2026</p>

            <div class="entity-card">
                <p><strong>Developer & Legal Entity:</strong> Thagadur Career Services (OPC) Private Limited</p>
                <p><strong>Google Play Developer Account ID:</strong> 7005572115092270780</p>
                <p><strong>Applications Covered:</strong></p>
                <ul style="margin: 4px 0 0 0; padding-left: 20px;">
                    <li><strong>ParkCo</strong> (Application ID / Package: <code>com.parkshare.customer</code>)</li>
                    <li><strong>ParkCo Partner</strong> (Application ID / Package: <code>com.parkshare.host</code>)</li>
                </ul>
            </div>

            <p>This Privacy Policy governs the manner in which <strong>Thagadur Career Services (OPC) Private Limited</strong> ("Company", "we", "our", or "us") collects, uses, maintains, and discloses information collected from users ("User", "you") of our mobile applications <strong>ParkCo</strong> (package: <code>com.parkshare.customer</code>) and <strong>ParkCo Partner</strong> (package: <code>com.parkshare.host</code>), distributed via the Google Play Store.</p>

            <h2>1. Developer and Company Identification</h2>
            <p>The applications <strong>ParkCo</strong> and <strong>ParkCo Partner</strong> are developed, owned, published, and maintained exclusively by:</p>
            <ul>
                <li><strong>Legal Entity Name:</strong> Thagadur Career Services (OPC) Private Limited</li>
                <li><strong>Registration:</strong> Private Limited Company incorporated in India</li>
                <li><strong>Developer Name on Google Play:</strong> Thagadur Career Services (OPC) Private Limited</li>
                <li><strong>Contact Email:</strong> <a href="mailto:support@parkshare.app">support@parkshare.app</a></li>
            </ul>

            <h2>2. Information We Collect and How We Use It</h2>
            <p>We collect and process the following categories of data strictly to provide parking discovery, reservation, and space hosting services:</p>
            <ul>
                <li><strong>Personal Identifiers:</strong> Name, email address, and phone number provided during account registration to authenticate users, facilitate booking confirmations, and issue digital parking gate passes.</li>
                <li><strong>Precise and Approximate Location Data:</strong> When permitted by the user, we access device GPS location in the foreground to locate nearby available parking spots, compute driving distance, and display navigation routes to selected parking facilities. Location data is never sold or used for background advertising tracking.</li>
                <li><strong>Photos and Device Camera:</strong> Camera access is requested solely when a user takes a photo of their parking spot, vehicle, or odometer to verify space quality or complete booking check-in/check-out. We do not access your general photo library without your explicit selection.</li>
                <li><strong>Financial and Payment Data:</strong> All payments for parking spaces and services are securely tokenized and processed through PCI-DSS Level 1 compliant payment gateways (such as Razorpay). We never collect, process, or store raw credit/debit card numbers or CVVs on our servers.</li>
                <li><strong>Device Information:</strong> Device model, operating system version, and unique crash identifiers to diagnose technical errors and ensure application stability.</li>
            </ul>

            <h2>3. Data Sharing and Third-Party Disclosures</h2>
            <p>We do not sell, trade, or rent users' personal identification information to third parties. We disclose data solely to trusted third-party providers who assist us in operating our platform under strict confidentiality agreements:</p>
            <ul>
                <li><strong>Payment Processors:</strong> Razorpay (PCI-DSS compliant) for processing financial transactions.</li>
                <li><strong>Mapping Services:</strong> Google Maps Platform for displaying map tiles and calculating directions.</li>
                <li><strong>Cloud Infrastructure:</strong> Secure cloud servers with TLS/HTTPS encrypted endpoints.</li>
            </ul>

            <h2>4. Data Retention and Security</h2>
            <p>All sensitive information exchanged between the app and our backend servers is transmitted over encrypted TLS/HTTPS connections. We maintain industry-standard physical, electronic, and procedural safeguards to protect your personal data from unauthorized access, alteration, or disclosure.</p>

            <h2>5. Account and Data Deletion Rights</h2>
            <p>In full compliance with Google Play's User Data and Account Deletion policies, you have the right to request the permanent deletion of your account and all associated personal data at any time.</p>
            <p>You can request account deletion directly through our dedicated web portal: <br>
            👉 <a href="/delete-account" style="font-size: 16px;"><strong>Click here to visit our Account & Data Deletion Page (/delete-account)</strong></a></p>
            <p>Alternatively, you may email us directly at <a href="mailto:support@parkshare.app">support@parkshare.app</a> with the subject line <em>"Account Deletion Request - ParkCo"</em>. Requests are verified and completed within 7 to 30 days.</p>

            <h2>6. Children's Privacy</h2>
            <p>Our applications are not directed to children under the age of 13, and we do not knowingly collect personal information from children.</p>

            <div class="footer-contact">
                <h3 style="margin-top:0; color: #111827;">Contact & Grievance Officer</h3>
                <p>If you have any questions about this Privacy Policy, the practices of our apps, or your dealings with <strong>Thagadur Career Services (OPC) Private Limited</strong>, please contact us at:</p>
                <p><strong>Thagadur Career Services (OPC) Private Limited</strong><br>
                Developer Account: 7005572115092270780<br>
                Email: <a href="mailto:support@parkshare.app">support@parkshare.app</a><br>
                Country: India</p>
            </div>
        </div>
    </body>
    </html>
    """

@app.get("/privacy-partner", response_class=HTMLResponse)
def privacy_policy_partner():
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Privacy Policy - ParkCo Partner | Thagadur Career Services (OPC) Private Limited</title>
        <style>
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 860px; margin: 30px auto; padding: 0 20px; color: #1f2937; background: #f9fafb; }
            .container { background: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e5e7eb; }
            h1 { color: #0f766e; font-size: 28px; margin-bottom: 8px; }
            h2 { color: #0d9488; font-size: 20px; margin-top: 32px; border-bottom: 2px solid #f0fdfa; padding-bottom: 8px; }
            .badge { display: inline-block; background: #ccfbf1; color: #0f766e; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
            .partner-badge { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 16px; margin-left: 8px; }
            .entity-card { background: #f0fdfa; border-left: 5px solid #0d9488; padding: 18px 24px; border-radius: 8px; margin: 20px 0; }
            .entity-card p { margin: 6px 0; font-size: 14px; }
            .nav-callout { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 18px; margin-bottom: 24px; font-size: 14px; display: flex; justify-content: space-between; align-items: center; }
            ul, ol { padding-left: 24px; }
            li { margin-bottom: 8px; }
            a { color: #0d9488; font-weight: 600; text-decoration: none; }
            a:hover { text-decoration: underline; }
            .footer-contact { background: #f3f4f6; padding: 20px; border-radius: 12px; margin-top: 40px; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div>
                <span class="badge">Google Play User Data Policy Compliant</span>
                <span class="partner-badge">Partner / Space Host Edition</span>
            </div>
            
            <div class="nav-callout">
                <span>Viewing policy for <strong>ParkCo Partner</strong> (Host app)</span>
                <a href="/privacy">Switch to ParkCo (Customer app) &rarr;</a>
            </div>

            <h1>Privacy Policy for ParkCo Partner</h1>
            <p><strong>Effective Date:</strong> October 14, 2026 | <strong>Last Updated:</strong> October 15, 2026</p>

            <div class="entity-card">
                <p><strong>Application Title on Google Play:</strong> ParkCo Partner</p>
                <p><strong>Application Package Name / ID:</strong> <code>com.parkshare.host</code></p>
                <p><strong>Developer & Legal Entity Name:</strong> Thagadur Career Services (OPC) Private Limited</p>
                <p><strong>Google Play Developer Account ID:</strong> 7005572115092270780</p>
                <p><strong>Target Platform:</strong> Android (Google Play Store)</p>
                <p><strong>Service Type:</strong> Parking Space Hosting, Management, Gate Check-In & Host Payouts</p>
            </div>

            <p>This Privacy Policy governs the manner in which <strong>Thagadur Career Services (OPC) Private Limited</strong> ("Company", "we", "our", or "us") collects, uses, maintains, and protects personal and business information collected from parking spot owners, facility operators, and space captains ("Host", "Partner", "User", "you") of our mobile application <strong>ParkCo Partner</strong> (package: <code>com.parkshare.host</code>), distributed exclusively through the Google Play Store.</p>

            <h2>1. Developer and Legal Entity Identification</h2>
            <p>The application <strong>ParkCo Partner</strong> is developed, owned, published, and maintained exclusively by:</p>
            <ul>
                <li><strong>Legal Entity Name:</strong> Thagadur Career Services (OPC) Private Limited</li>
                <li><strong>Entity Type:</strong> One Person Company (OPC) Private Limited incorporated under the Companies Act in India</li>
                <li><strong>Developer Name on Google Play Console:</strong> Thagadur Career Services (OPC) Private Limited</li>
                <li><strong>Developer Account ID:</strong> 7005572115092270780</li>
                <li><strong>Support & Privacy Inquiries:</strong> <a href="mailto:support@parkshare.app">support@parkshare.app</a></li>
            </ul>

            <h2>2. Information Collected from Partners and How It Is Used</h2>
            <p>The <strong>ParkCo Partner</strong> application collects and processes only the information necessary to enable hosts to list parking inventory, coordinate vehicle check-in/check-out, and receive earnings:</p>
            <ul>
                <li><strong>Host Identification & Contact Details:</strong> Name, phone number, and email address provided during registration. Used to authenticate host sessions, verify property management rights, and transmit booking confirmations and gate-pass PIN verifications.</li>
                <li><strong>Precise Parking Facility Location:</strong> When adding or modifying a parking space listing, the app requests device location permissions (foreground only) to pinpoint the exact GPS coordinates (latitude and longitude) of the parking bay or driveway entrance so drivers can accurately navigate to the spot. GPS location is never collected in the background or shared for ad-tracking.</li>
                <li><strong>Parking Facility Images (Camera & Storage):</strong> Camera and photo access is requested when a host captures pictures of their parking spot, entrance barriers, security signage, or EV charging ports. These photos are displayed to drivers on the customer app to identify the parking area. We do not inspect or upload personal photos outside of the images selected by the host.</li>
                <li><strong>Banking and Financial Details for Payouts:</strong> To receive automated earnings settlements for completed parking reservations, hosts submit bank account details (account number, IFSC code, or UPI VPA). All financial data is tokenized and transmitted directly to PCI-DSS Level 1 compliant payout processors (such as Razorpay Route). We do not store unencrypted financial credentials on our general application servers.</li>
                <li><strong>Device and Performance Telemetry:</strong> Device hardware model, Android OS version, and crash diagnostic logs to maintain application reliability, prevent fraud, and guarantee operational uptime.</li>
            </ul>

            <h2>3. Data Sharing and Third-Party Processors</h2>
            <p>We do not sell, rent, or lease host personal or financial data to data brokers or advertising networks. We disclose information solely to the following trusted third parties strictly under confidentiality agreements:</p>
            <ul>
                <li><strong>Payment & Settlement Gateway:</strong> Razorpay (PCI-DSS Level 1 compliant) for disbursing host parking payouts.</li>
                <li><strong>Mapping Services:</strong> Google Maps Platform for displaying map views and rendering property locations.</li>
                <li><strong>Cloud Infrastructure:</strong> Cloud hosting facilities with modern TLS/HTTPS encrypted transport.</li>
            </ul>

            <h2>4. Data Security and Storage</h2>
            <p>All communication between the <strong>ParkCo Partner</strong> application and our backend endpoints is encrypted in transit using industry-standard Transport Layer Security (TLS 1.2/1.3). We enforce strict role-based access control to prevent unauthorized modification or exposure of host listings or financial settlement data.</p>

            <h2>5. Host Account and Data Deletion Rights</h2>
            <p>In full adherence to Google Play's User Data and Account Deletion policies, hosts may permanently delete their account and associated property listings at any time.</p>
            <p>You can initiate account and data deletion directly through our web portal: <br>
            👉 <a href="/delete-account" style="font-size: 16px;"><strong>Click here to visit the Account & Data Deletion Portal (/delete-account)</strong></a></p>
            <p>Alternatively, you may email us directly at <a href="mailto:support@parkshare.app">support@parkshare.app</a> with the subject line <em>"Account Deletion Request - ParkCo Partner"</em>. Verified account deletion requests are processed and confirmed within 7 to 30 days.</p>

            <h2>6. Children's Privacy</h2>
            <p>The <strong>ParkCo Partner</strong> application is intended exclusively for property managers, parking owners, and individuals aged 18 and above who possess legal authority to host parking facilities. It is not intended for or directed toward children under 13.</p>

            <div class="footer-contact">
                <h3 style="margin-top:0; color: #111827;">Contact & Grievance Officer</h3>
                <p>For inquiries regarding this Privacy Policy or data privacy rights for <strong>ParkCo Partner</strong>, please contact our designated grievance team:</p>
                <p><strong>Thagadur Career Services (OPC) Private Limited</strong><br>
                Application: ParkCo Partner (<code>com.parkshare.host</code>)<br>
                Developer Account ID: 7005572115092270780<br>
                Email: <a href="mailto:support@parkshare.app">support@parkshare.app</a><br>
                Jurisdiction: India</p>
            </div>
        </div>
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Deletion - ParkCo | Thagadur Career Services (OPC) Private Limited</title>
        <style>
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 30px auto; padding: 0 20px; color: #1f2937; background: #fff5f5; }
            .card { background: #ffffff; padding: 36px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #fee2e2; }
            h1 { color: #dc2626; font-size: 26px; margin-bottom: 8px; }
            .badge { display: inline-block; background: #fee2e2; color: #dc2626; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
            .entity-info { background: #fef2f2; border-left: 5px solid #ef4444; padding: 14px 20px; border-radius: 8px; margin: 16px 0; font-size: 14px; }
            .entity-info p { margin: 4px 0; }
            .form-box { background: #f9fafb; padding: 24px; border-radius: 12px; border: 1px solid #e5e7eb; margin: 24px 0; }
            label { display: block; font-weight: 600; margin-bottom: 6px; font-size: 14px; color: #374151; }
            input, select, textarea { width: 100%; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; margin-bottom: 16px; font-size: 15px; }
            button { background: #dc2626; color: #ffffff; padding: 12px 24px; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
            button:hover { background: #b91c1c; }
            .data-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
            .data-table th, .data-table td { border: 1px solid #e5e7eb; padding: 10px 14px; text-align: left; }
            .data-table th { background: #f3f4f6; }
            a { color: #0d9488; font-weight: 600; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="card">
            <span class="badge">Google Play Account Deletion Requirement</span>
            <h1>Account & Data Deletion Request</h1>
            <p>This account deletion portal applies to users of the mobile application <strong>ParkCo</strong> (<code>com.parkshare.customer</code>) and <strong>ParkCo Partner</strong> (<code>com.parkshare.host</code>).</p>

            <div class="entity-info">
                <p><strong>Entity / Developer:</strong> Thagadur Career Services (OPC) Private Limited</p>
                <p><strong>Google Play Developer Account ID:</strong> 7005572115092270780</p>
                <p><strong>App Name:</strong> ParkCo (com.parkshare.customer) &amp; ParkCo Partner (com.parkshare.host)</p>
            </div>

            <p>At <strong>Thagadur Career Services (OPC) Private Limited</strong>, we respect your right to control your personal data. In compliance with Google Play's User Data &amp; Account Deletion policies, you can request the permanent deletion of your account and all associated personal records using the form below or via direct email.</p>

            <div class="form-box">
                <h3 style="margin-top:0; color:#111827;">Submit Deletion Request Online</h3>
                <form id="delForm" onsubmit="event.preventDefault(); document.getElementById('successMsg').style.display='block'; document.getElementById('delForm').style.display='none';">
                    <label for="email">Registered Email Address *</label>
                    <input type="email" id="email" required placeholder="Enter the email associated with your ParkCo account">

                    <label for="phone">Registered Mobile Phone Number *</label>
                    <input type="tel" id="phone" required placeholder="e.g. +91 9876543210">

                    <label for="app">Application</label>
                    <select id="app">
                        <option value="customer">ParkCo - Customer App (com.parkshare.customer)</option>
                        <option value="host">ParkCo Partner - Host App (com.parkshare.host)</option>
                        <option value="both">Both Accounts</option>
                    </select>

                    <label for="reason">Reason for deletion (Optional)</label>
                    <textarea id="reason" rows="2" placeholder="Let us know why you are leaving..."></textarea>

                    <button type="submit">Submit Account Deletion Request</button>
                </form>
                <div id="successMsg" style="display:none; background:#ecfdf5; border-left:4px solid #10b981; padding:16px; border-radius:8px; color:#065f46;">
                    <h4 style="margin:0 0 6px 0;">Request Submitted Successfully</h4>
                    <p style="margin:0;">Your account deletion request has been recorded. Our team will verify your credentials and permanently remove your account data within 7–14 business days. A confirmation email will be sent to your registered address.</p>
                </div>
            </div>

            <h2>What Data Will Be Deleted:</h2>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Data Category</th>
                        <th>Action Taken</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Profile &amp; Credentials</strong></td>
                        <td>Permanently deleted (Name, email, phone number, password hash).</td>
                    </tr>
                    <tr>
                        <td><strong>Vehicle Records</strong></td>
                        <td>Permanently deleted (License plate, vehicle make, model).</td>
                    </tr>
                    <tr>
                        <td><strong>Location &amp; Activity</strong></td>
                        <td>Search history, GPS logs, and device tokens purged.</td>
                    </tr>
                    <tr>
                        <td><strong>Financial / Invoices</strong></td>
                        <td>Past completed payment receipts and transaction IDs are retained strictly for statutory accounting and tax compliance (as required by Indian financial law for up to 180 days) before automatic purge. Raw card numbers are never stored.</td>
                    </tr>
                </tbody>
            </table>

            <h2>Alternative Email Method:</h2>
            <p>You may also submit your deletion request directly by emailing our data protection officer at <a href="mailto:support@parkshare.app">support@parkshare.app</a> with the subject line: <strong>"Account Deletion Request - ParkCo - [Your Email]"</strong>.</p>

            <p style="font-size:13px; color:#6b7280; margin-top:30px;">
                Operated by <strong>Thagadur Career Services (OPC) Private Limited</strong> | Developer Account: 7005572115092270780 | Support: support@parkshare.app
            </p>
        </div>
    </body>
    </html>
    """
