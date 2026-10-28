const fs = require('fs');
let s = fs.readFileSync('backend/app/services/rentals_service.py', 'utf8');

const t1 = `            data = json.load(f)\r\n            return [RentalVehicleSchema(**item) for item in data]`;
const r1 = `            data = json.load(f)\r\n            fleet_items = []\r\n            for item in data:\r\n                if "doorDeliveryAvailable" not in item:\r\n                    item["doorDeliveryAvailable"] = "Hub Pickup Only" not in (item.get("features") or [])\r\n                fleet_items.append(RentalVehicleSchema(**item))\r\n            return fleet_items`;

const t2 = `            city=data.city,\r\n            hubAddress=data.hubAddress,\r\n            status="ACTIVE",`;
const r2 = `            city=data.city,\r\n            hubAddress=data.hubAddress,\r\n            doorDeliveryAvailable=data.doorDeliveryAvailable,\r\n            status="ACTIVE",`;

if (s.includes(t1) && s.includes(t2)) {
  s = s.replace(t1, r1).replace(t2, r2);
  fs.writeFileSync('backend/app/services/rentals_service.py', s, 'utf8');
  console.log('SUCCESS: patched rentals_service.py');
} else {
  console.error('MATCH ERROR');
}

