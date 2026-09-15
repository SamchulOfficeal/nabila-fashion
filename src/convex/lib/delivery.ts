/**
 * Bangladesh delivery zones + currency configuration.
 * Kept on the server so delivery charges can never be tampered with from the client.
 */

export const BD_DIVISIONS: {
  division: string;
  divisionBn: string;
  charge: number;
  lat: number;
  lng: number;
  districts: string[];
}[] = [
  {
    division: "Dhaka",
    divisionBn: "ঢাকা",
    charge: 60,
    lat: 23.8103,
    lng: 90.4125,
    districts: [
      "Dhaka",
      "Gazipur",
      "Narayanganj",
      "Tangail",
      "Kishoreganj",
      "Manikganj",
      "Munshiganj",
      "Narsingdi",
      "Faridpur",
      "Madaripur",
      "Gopalganj",
      "Rajbari",
      "Shariatpur",
    ],
  },
  {
    division: "Chattogram",
    divisionBn: "চট্টগ্রাম",
    charge: 110,
    lat: 22.3569,
    lng: 91.7832,
    districts: [
      "Chattogram",
      "Cox's Bazar",
      "Cumilla",
      "Feni",
      "Noakhali",
      "Brahmanbaria",
      "Chandpur",
      "Lakshmipur",
      "Rangamati",
      "Bandarban",
      "Khagrachhari",
    ],
  },
  {
    division: "Sylhet",
    divisionBn: "সিলেট",
    charge: 120,
    lat: 24.8949,
    lng: 91.8687,
    districts: [
      "Sylhet",
      "Moulvibazar",
      "Habiganj",
      "Sunamganj",
    ],
  },
  {
    division: "Khulna",
    divisionBn: "খুলনা",
    charge: 130,
    lat: 22.8456,
    lng: 89.5403,
    districts: [
      "Khulna",
      "Jashore",
      "Kushtia",
      "Satkhira",
      "Bagerhat",
      "Jhenaidah",
      "Magura",
      "Narail",
      "Chuadanga",
      "Meherpur",
    ],
  },
  {
    division: "Rajshahi",
    divisionBn: "রাজশাহী",
    charge: 130,
    lat: 24.3745,
    lng: 88.6042,
    districts: [
      "Rajshahi",
      "Bogura",
      "Pabna",
      "Sirajganj",
      "Natore",
      "Joypurhat",
      "Naogaon",
      "Nawabganj",
      "Chapainawabganj",
    ],
  },
  {
    division: "Barishal",
    divisionBn: "বরিশাল",
    charge: 140,
    lat: 22.701,
    lng: 90.3535,
    districts: [
      "Barishal",
      "Patuakhali",
      "Bhola",
      "Pirojpur",
      "Barguna",
      "Jhalokati",
    ],
  },
  {
    division: "Rangpur",
    divisionBn: "রংপুর",
    charge: 140,
    lat: 25.7439,
    lng: 89.2752,
    districts: [
      "Rangpur",
      "Dinajpur",
      "Kurigram",
      "Gaibandha",
      "Lalmonirhat",
      "Nilphamari",
      "Panchagarh",
      "Thakurgaon",
    ],
  },
  {
    division: "Mymensingh",
    divisionBn: "ময়মনসিংহ",
    charge: 120,
    lat: 24.7471,
    lng: 90.4203,
    districts: [
      "Mymensingh",
      "Jamalpur",
      "Netrokona",
      "Sherpur",
    ],
  },
];

export const FREE_DELIVERY_THRESHOLD = 4000;
export const DEFAULT_USD_RATE = 120;

/** Delivery charge in BDT for a division, with free shipping above the threshold. */
export function deliveryChargeFor(division: string, subtotal: number): number {
  if (subtotal >= FREE_DELIVERY_THRESHOLD) return 0;
  const zone = BD_DIVISIONS.find((entry) => entry.division === division);
  return zone ? zone.charge : 150;
}

export function divisionNames(): string[] {
  return BD_DIVISIONS.map((entry) => entry.division);
}

/** Nearest delivery division for a set of coordinates (used by location detection). */
export function nearestDivision(lat: number, lng: number): string {
  let best = BD_DIVISIONS[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const zone of BD_DIVISIONS) {
    const distance = (zone.lat - lat) ** 2 + (zone.lng - lng) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = zone;
    }
  }
  return best.division;
}

/** Districts for a division, used to drive the district select. */
export function districtsFor(division: string): string[] {
  return BD_DIVISIONS.find((entry) => entry.division === division)?.districts ?? [];
}
