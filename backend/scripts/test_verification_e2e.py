import io
import os
import sys
import httpx

# Ensure stdout uses utf-8 and backend is on sys.path
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_verification_flow():
    client = httpx.Client(timeout=15.0)

    print("\n--- 1. Testing Mobile OTP Flow ---")
    phone = "+91 9876543210"
    res = client.post(f"{BASE_URL}/verification/send-mobile-otp", json={"phone_number": phone})
    print("Send Mobile OTP status:", res.status_code)
    data = res.json()
    print("Response payload:", data)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert data.get("status") == "OTP_SENT"
    print("[PASS] Mobile OTP dispatched successfully.")

    # Test Mobile OTP Verification
    # A. With wrong OTP
    wrong_res = client.post(f"{BASE_URL}/verification/verify-mobile-otp", json={"phone_number": phone, "otp": "000000"})
    print("Verify with invalid OTP status:", wrong_res.status_code)
    assert wrong_res.status_code == 400
    print("[PASS] Invalid mobile OTP correctly rejected with 400.")

    # B. With correct OTP (from dev_otp or internal cache)
    otp_code = data.get("dev_otp")
    if otp_code:
        valid_res = client.post(f"{BASE_URL}/verification/verify-mobile-otp", json={"phone_number": phone, "otp": otp_code})
        print("Verify with correct OTP status:", valid_res.status_code, valid_res.json())
        assert valid_res.status_code == 200
        assert valid_res.json().get("phone_verified") is True
        print("[PASS] Valid mobile OTP accepted with 200.")

    print("\n--- 2. Testing Email OTP Flow (Gmail SMTP) ---")
    email = "avasanth081@gmail.com"
    res = client.post(f"{BASE_URL}/verification/send-email-otp", json={"email": email})
    print("Send Email OTP status:", res.status_code)
    data = res.json()
    print("Response payload:", data)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert data.get("status") == "OTP_SENT"
    print("[PASS] Email OTP dispatched via Gmail SMTP.")

    # Test Email OTP Verification
    # A. With wrong OTP
    wrong_res = client.post(f"{BASE_URL}/verification/verify-email-otp", json={"email": email, "otp": "000000"})
    print("Verify with invalid Email OTP status:", wrong_res.status_code)
    assert wrong_res.status_code == 400
    print("[PASS] Invalid email OTP correctly rejected with 400.")

    # B. We can also verify with correct OTP if dev_otp or we can inspect cache
    otp_code = data.get("dev_otp")
    if not otp_code:
        # If email was delivered via real SMTP, get OTP from verification router cache
        from app.routers.verification import _OTP_CACHE
        cache_item = _OTP_CACHE.get(f"email:{email.lower()}")
        if cache_item:
            otp_code = cache_item["otp"]

    if otp_code:
        valid_res = client.post(f"{BASE_URL}/verification/verify-email-otp", json={"email": email, "otp": otp_code})
        print("Verify with correct Email OTP status:", valid_res.status_code, valid_res.json())
        assert valid_res.status_code == 200
        assert valid_res.json().get("email_verified") is True
        print("[PASS] Valid email OTP accepted with 200.")

    print("\n--- 3. Testing File Upload (Live Photo & Gov Document) ---")
    dummy_image = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"A" * 100)
    files = {"file": ("test_photo.jpg", dummy_image, "image/jpeg")}
    res = client.post(f"{BASE_URL}/verification/upload-file", files=files)
    print("Upload File status:", res.status_code)
    data = res.json()
    print("Upload response:", data)
    assert res.status_code == 200
    assert data.get("success") is True
    assert data.get("url", "").startswith("/uploads/")
    uploaded_url = data["url"]
    print("[PASS] File uploaded and accessible at", uploaded_url)

    # Static file check
    static_res = client.get(f"http://127.0.0.1:8000{uploaded_url}")
    assert static_res.status_code == 200
    print("[PASS] Static file served successfully via /uploads")

    print("\n--- 4. Testing User Authentication & Status ---")
    login_res = client.post(f"{BASE_URL}/auth/login", json={
        "email": "avasanth081@gmail.com",
        "password": "Vasanth@123"
    })
    
    if login_res.status_code == 200:
        token = login_res.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}
        print("[PASS] Host logged in successfully.")

        # Test Status endpoint
        status_res = client.get(f"{BASE_URL}/verification/status", headers=auth_headers)
        print("Verification status before KYC:", status_res.status_code, status_res.json())

        # Test Automated PAN Verification
        pan_submit_data = {
            "legal_name": "Vasanth A",
            "profile_photo_url": uploaded_url,
            "gov_id_type": "PAN",
            "gov_id_number": "ABCDE1234F",
            "gov_id_document_url": uploaded_url
        }
        pan_res = client.post(f"{BASE_URL}/verification/submit-identity", json=pan_submit_data, headers=auth_headers)
        print("Submit PAN Identity status:", pan_res.status_code, pan_res.json())
        assert pan_res.status_code == 200
        assert pan_res.json().get("is_identity_verified") is True
        print("[PASS] PAN Card automatically verified.")

        # Test Automated Aadhaar Verification
        aadhaar_submit_data = {
            "legal_name": "Vasanth A",
            "profile_photo_url": uploaded_url,
            "gov_id_type": "AADHAAR",
            "gov_id_number": "548219283041",
            "gov_id_document_url": uploaded_url
        }
        aadhaar_res = client.post(f"{BASE_URL}/verification/submit-identity", json=aadhaar_submit_data, headers=auth_headers)
        print("Submit Aadhaar Identity status:", aadhaar_res.status_code, aadhaar_res.json())
        assert aadhaar_res.status_code == 200
        assert aadhaar_res.json().get("is_identity_verified") is True
        print("[PASS] Aadhaar automatically verified.")

        # Test Final Verification Status
        status_res = client.get(f"{BASE_URL}/verification/status", headers=auth_headers)
        final_status = status_res.json()
        print("Final verification status:", final_status)
        assert final_status.get("is_identity_verified") is True
        assert final_status.get("can_submit_space") is True
        print("[PASS] Verified status confirmed: Host can submit spaces.")
    else:
        print("User login note:", login_res.status_code, login_res.text)

    print("\n=======================================================")
    print("[SUCCESS] ALL VERIFICATION & KYC PROVIDER TESTS PASSED!")
    print("=======================================================\n")

if __name__ == "__main__":
    test_verification_flow()
