import re
import json
import logging
from typing import List, Dict, Optional, Any
import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.listing import ParkingListing, ListingStatusEnum
from app.services.listing_service import ListingService
from app.schemas.listing import ListingOut

logger = logging.getLogger("parkshare.chatbot")

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

class ChatbotService:
    @staticmethod
    async def chat(
        db: Session,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        current_user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Process user message with Gemini 2.5 Flash, grounded in live ParkShare parking listings.
        """
        # 1. Fetch active listings from database
        active_listings = db.query(ParkingListing).filter(
            ParkingListing.status == ListingStatusEnum.ACTIVE
        ).all()

        listings_summary = []
        for idx, l in enumerate(active_listings):
            letter = chr(65 + (idx % 26))
            hourly = l.pricing_rule.hourly_price if l.pricing_rule else 40.0
            daily = l.pricing_rule.daily_price if l.pricing_rule else 250.0
            listings_summary.append({
                "id": l.id,
                "title": f"Parking {letter}",
                "area": l.area,
                "city": l.city,
                "approximate_distance": f"~{100 + (idx * 50)} m away",
                "hourly_rate_inr": hourly,
                "daily_rate_inr": daily,
                "is_covered": l.is_covered,
                "has_ev_charging": l.has_ev_charging,
                "has_cctv": l.has_cctv,
                "has_24_7_access": l.has_24_7_access,
                "total_spaces": l.total_spaces,
                "rating": l.average_rating
            })

        system_instruction = (
            "You are ParkBot, the smart, friendly AI parking concierge for the ParkCo application.\n"
            "ParkCo connects drivers with secure, verified parking spaces hosted by homeowners, commercial centers, and IT hubs.\n\n"
            "CURRENT LIVE PARKING DATABASE IN PARKCO:\n"
            f"{json.dumps(listings_summary, indent=2)}\n\n"
            "STRICT PRIVACY & ANTI-CIRCUMVENTION RULES (CRITICAL):\n"
            "- NEVER disclose real building names, society names, host names, exact street addresses, flat/plot numbers, or exact coordinates before a booking is confirmed.\n"
            "- ALWAYS refer to parking spots ONLY as 'Parking A — ~150 m away', 'Parking B — ~300 m away', 'Parking C — ~500 m away', showing ONLY their distance in meters, amenities, and hourly/daily rates. DO NOT use or reveal actual place names.\n"
            "- Explain that turn-by-turn GPS navigation and the host's exact address will be unlocked automatically after booking payment is completed.\n\n"
            "INSTRUCTIONS:\n"
            "1. When a user asks for parking in an area (for example, 'I am going to Whitefield and need parking space there', 'BTM Layout', 'Indiranagar', etc.):\n"
            "   - Search the live catalog above for matching spots in or near that area.\n"
            "   - Present the spots clearly and engagingly, showing ONLY their approximate distance in meters (e.g., '• Parking A — ~150 m away', '• Parking B — ~300 m away'), rates (Hourly ₹ and Daily ₹), and key amenities like EV charging, covered roof, 24/7 security. Do NOT mention real building or venue names.\n"
            "   - At the VERY END of your response, always include a special tag with the matching spot IDs in this exact format:\n"
            "     [RECOMMENDED_IDS: id1, id2, ...]\n"
            "     Example: [RECOMMENDED_IDS: 30, 31, 32]\n"
            "2. If no parking is currently listed for that exact area, politely let them know, recommend the closest available area from the database (e.g., Whitefield or BTM Layout), and suggest checking back soon.\n"
            "3. Answer questions about how ParkCo works: Instant booking, secure payment via Razorpay, QR check-in, key handover odometer verification, and host earnings.\n"
            "4. Keep your responses warm, helpful, easy to read, and formatted with clean bullet points and emojis."
        )

        # Build contents for Gemini API
        contents = []
        if history:
            for turn in history[-6:]:  # Keep recent context
                role = "user" if turn.get("role") == "user" else "model"
                contents.append({
                    "role": role,
                    "parts": [{"text": turn.get("content", "")}]
                })

        # Append current user message
        contents.append({
            "role": "user",
            "parts": [{"text": message}]
        })

        payload = {
            "system_instruction": {
                "parts": [{"text": system_instruction}]
            },
            "contents": contents,
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 1000
            }
        }

        raw_reply = ""
        recommended_ids = []

        try:
            api_key = settings.GEMINI_API_KEY
            url = f"{GEMINI_API_URL}?key={api_key}"
            async with httpx.AsyncClient(timeout=25.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts:
                            raw_reply = parts[0].get("text", "")
                else:
                    logger.warning(f"Gemini API returned status {res.status_code}: {res.text}")
        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")

        # If Gemini succeeded, parse recommended IDs
        if raw_reply:
            match = re.search(r"\[RECOMMENDED_IDS:\s*([\d\s,]+)\]", raw_reply, re.IGNORECASE)
            if match:
                id_str = match.group(1)
                for part in id_str.split(","):
                    try:
                        clean_id = int(part.strip())
                        if clean_id not in recommended_ids:
                            recommended_ids.append(clean_id)
                    except ValueError:
                        pass
                # Remove the tag from user display
                clean_reply = re.sub(r"\[RECOMMENDED_IDS:\s*[\d\s,]+\]", "", raw_reply).strip()
            else:
                clean_reply = raw_reply.strip()
        else:
            # Resilient Intelligent Fallback (e.g. if offline or quota limit)
            clean_reply, recommended_ids = ChatbotService._fallback_matcher(message, listings_summary)

        # Fetch detailed objects for recommended listings
        recommended_listings = []
        for lid in recommended_ids:
            try:
                detail = ListingService.get_listing_by_id(db, lid, current_user_id=current_user_id)
                if detail:
                    recommended_listings.append(detail)
            except Exception:
                pass

        # Generate contextual quick follow-up suggestions
        suggestions = ChatbotService._generate_suggestions(message, recommended_listings)

        return {
            "reply": clean_reply,
            "recommended_listings": recommended_listings,
            "suggestions": suggestions
        }

    @staticmethod
    def _fallback_matcher(message: str, listings_summary: List[dict]):
        msg_lower = message.lower()
        matched = []
        for item in listings_summary:
            if item["area"].lower() in msg_lower or item["city"].lower() in msg_lower:
                matched.append(item)
            elif "ev" in msg_lower and item["has_ev_charging"]:
                matched.append(item)
            elif "covered" in msg_lower and item["is_covered"]:
                matched.append(item)

        if "whitefield" in msg_lower or "white feild" in msg_lower:
            matched = [item for item in listings_summary if item["area"].lower() == "whitefield"]

        if matched:
            matched_ids = [m["id"] for m in matched]
            reply_lines = [
                f"Great news! We found **{len(matched)} available parking spot(s)** matching your request:\n"
            ]
            for m in matched:
                amenities = []
                if m["is_covered"]:
                    amenities.append("Covered")
                if m["has_ev_charging"]:
                    amenities.append("EV Charging")
                if m["has_cctv"]:
                    amenities.append("CCTV Security")
                amenity_str = " • ".join(amenities) if amenities else "Open Parking"

                dist_m = 150 + ((m['id'] * 73) % 4) * 100
                reply_lines.append(
                    f"• **{m['title']}** — ~{dist_m} m away ({m['area']})\n"
                    f"₹{int(m['hourly_rate_inr'])}/hr | ₹{int(m['daily_rate_inr'])}/day\n"
                    f"  Features: {amenity_str}\n"
                )
            reply_lines.append("*Exact address and turn-by-turn GPS navigation unlock after payment confirmation.*")
            return "\n".join(reply_lines), matched_ids

        return (
            "Hello! I'm **ParkBot**, your ParkCo assistant. \n\n"
            "I can help you find parking spots near any destination like **Whitefield**, **BTM Layout**, or anywhere across the city.\n"
            "Try asking: *'I am going to Whitefield and need parking space'* or *'Show me EV charging parking'*!",
            []
        )

    @staticmethod
    def _generate_suggestions(message: str, recommended_listings: list) -> List[str]:
        msg_lower = message.lower()
        if "whitefield" in msg_lower or "white feild" in msg_lower:
            return [
                "Show spots with EV charging",
                "How does instant booking work?",
                "Parking in BTM Layout",
                "What are the cancellation rules?"
            ]
        if "ev" in msg_lower:
            return [
                "Parking in Whitefield",
                "Show covered parking spots",
                "How to navigate to parking?"
            ]
        return [
            "I need parking in Whitefield",
            "Show spots with EV charging",
            "Parking near BTM Layout",
            "How does key handover work?"
        ]
