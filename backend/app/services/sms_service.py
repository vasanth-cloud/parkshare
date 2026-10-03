import re
import logging
import httpx
from app.core.config import settings

logger = logging.getLogger("parkshare.sms")

def send_mobile_sms_otp(phone_number: str, otp: str) -> tuple[bool, str]:
    """
    Dispatches a real SMS OTP to the mobile phone number.
    Integrates with Fast2SMS or Twilio if keys are provided in .env.
    Returns (success: bool, detail_message: str)
    """
    clean_phone = re.sub(r'[^0-9]', '', phone_number)
    # If starting with 91 and 12 digits, strip country code for Indian local gateways if needed
    local_10_digit = clean_phone[-10:] if len(clean_phone) >= 10 else clean_phone
    sms_body = f"Your ParkShare Host Verification OTP is {otp}. Valid for 10 minutes. Do not share with anyone."

    # Always log clearly in the backend console
    print(f"\n=======================================================")
    print(f"[MOBILE SMS OTP DISPATCH] Number: {phone_number} (Local: {local_10_digit})")
    print(f"   One-Time Password: {otp}")
    print(f"   SMS Text: {sms_body}")
    print(f"=======================================================\n")

    # Fast2SMS Integration (Common in India)
    if settings.FAST2SMS_API_KEY:
        try:
            url = "https://www.fast2sms.com/dev/bulkV2"
            headers = {
                "authorization": settings.FAST2SMS_API_KEY,
                "Content-Type": "application/json"
            }
            # Attempt 1: Try Fast2SMS Quick SMS Route 'q' for 100% custom branded text
            payload_q = {
                "route": "q",
                "message": sms_body,
                "language": "english",
                "flash": 0,
                "numbers": local_10_digit,
            }
            with httpx.Client(timeout=10.0) as client:
                resp_q = client.post(url, json=payload_q, headers=headers)
                logger.info(f"Fast2SMS Quick SMS Route Response: {resp_q.status_code} {resp_q.text}")
                try:
                    data_q = resp_q.json()
                except Exception:
                    data_q = {}

                if resp_q.status_code == 200 and data_q.get("return") is True:
                    msg = "ParkShare Custom SMS delivered successfully to mobile device"
                    logger.info(msg)
                    return True, msg

                # Attempt 2: Fallback to Fast2SMS OTP Route
                payload_otp = {
                    "route": "otp",
                    "variables_values": str(otp),
                    "numbers": local_10_digit,
                }
                resp_otp = client.post(url, json=payload_otp, headers=headers)
                logger.info(f"Fast2SMS OTP Route Response: {resp_otp.status_code} {resp_otp.text}")
                try:
                    data_otp = resp_otp.json()
                except Exception:
                    data_otp = {}

                if resp_otp.status_code == 200 and data_otp.get("return") is True:
                    msg = "Fast2SMS OTP delivered successfully to mobile device"
                    logger.info(msg)
                    return True, msg

                # Collect the most informative error message
                raw_msg = data_q.get("message") or data_otp.get("message") or resp_q.text or resp_otp.text
                if isinstance(raw_msg, list):
                    err_msg = ", ".join(raw_msg)
                else:
                    err_msg = str(raw_msg)
                logger.warning(f"Fast2SMS delivery response: {err_msg}")
                return False, f"Fast2SMS: {err_msg}"
        except Exception as e:
            logger.error(f"Fast2SMS delivery error to {phone_number}: {e}")
            return False, f"Fast2SMS network error: {str(e)}"

    # Twilio Integration
    if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_FROM_PHONE:
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
            auth = (settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            data = {
                "From": settings.TWILIO_FROM_PHONE,
                "To": phone_number if phone_number.startswith('+') else f"+91{local_10_digit}",
                "Body": sms_body
            }
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(url, data=data, auth=auth)
                logger.info(f"Twilio SMS Response: {resp.status_code}")
                if resp.status_code in [200, 201]:
                    return True, "SMS delivered successfully via Twilio"
                else:
                    return False, f"Twilio HTTP error {resp.status_code}"
        except Exception as e:
            logger.error(f"Twilio delivery error to {phone_number}: {e}")
            return False, f"Twilio network error: {str(e)}"

    logger.info(f"SMS API key not set in .env. Dispatched via ParkShare SMS Engine simulator for {phone_number}.")
    return False, "SMS Gateway not configured in .env"
