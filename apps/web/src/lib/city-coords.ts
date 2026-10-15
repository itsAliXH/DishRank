/** Approximate city centers for map focus when placing a restaurant pin. */
const COORDS: Record<string, { lat: number; lng: number }> = {
  'city-karachi': { lat: 24.8607, lng: 67.0011 },
  'city-lahore': { lat: 31.5204, lng: 74.3587 },
  'city-islamabad': { lat: 33.6844, lng: 73.0479 },
  'city-rawalpindi': { lat: 33.5651, lng: 73.0169 },
  'city-faisalabad': { lat: 31.4504, lng: 73.135 },
  'city-multan': { lat: 30.1575, lng: 71.5249 },
  'city-peshawar': { lat: 34.0151, lng: 71.5249 },
  'city-quetta': { lat: 30.1798, lng: 66.975 },
  'city-hyd': { lat: 25.396, lng: 68.3578 },
  'city-gujranwala': { lat: 32.1877, lng: 74.1945 },
  'city-sialkot': { lat: 32.4945, lng: 74.5229 },
  'city-sargodha': { lat: 32.0836, lng: 72.6711 },
  'city-bahawalpur': { lat: 29.3956, lng: 71.6836 },
  'city-sukkur': { lat: 27.7052, lng: 68.8574 },
  'city-larkana': { lat: 27.559, lng: 68.212 },
  'city-sheikhupura': { lat: 31.7167, lng: 73.985 },
  'city-jhang': { lat: 31.2781, lng: 72.3317 },
  'city-rahimyarkhan': { lat: 28.4212, lng: 70.2989 },
  'city-gujrat': { lat: 32.5731, lng: 74.0789 },
  'city-kasur': { lat: 31.1167, lng: 74.45 },
  'city-mardan': { lat: 34.195, lng: 72.045 },
  'city-mingora': { lat: 34.7717, lng: 72.36 },
  'city-nawabshah': { lat: 26.2442, lng: 68.41 },
  'city-sahiwal': { lat: 30.6682, lng: 73.1114 },
  'city-okara': { lat: 30.8081, lng: 73.4458 },
  'city-mirpurkhas': { lat: 25.5276, lng: 69.0126 },
  'city-chiniot': { lat: 31.72, lng: 72.9789 },
  'city-kamoke': { lat: 31.9743, lng: 74.223 },
  'city-sadiqabad': { lat: 28.308, lng: 70.1307 },
  'city-burewala': { lat: 30.1667, lng: 72.65 },
  'city-jacobabad': { lat: 28.281, lng: 68.4375 },
  'city-muzaffargarh': { lat: 30.0703, lng: 71.1933 },
  'city-muridke': { lat: 31.8025, lng: 74.2556 },
  'city-jhelum': { lat: 32.9425, lng: 73.7257 },
  'city-hafizabad': { lat: 32.0709, lng: 73.688 },
  'city-kohat': { lat: 33.5889, lng: 71.4422 },
  'city-khanewal': { lat: 30.3017, lng: 71.9321 },
  'city-dera-ghazi': { lat: 30.0489, lng: 70.6455 },
  'city-kashmore': { lat: 28.4333, lng: 69.5833 },
  'city-abbottabad': { lat: 34.1463, lng: 73.2117 },
  'city-pakpattan': { lat: 30.341, lng: 73.3867 },
  'city-tandoadam': { lat: 25.7667, lng: 68.6667 },
  'city-khuzdar': { lat: 27.8, lng: 66.6167 },
  'city-swabi': { lat: 34.12, lng: 72.47 },
  'city-dera-ismail': { lat: 31.8313, lng: 70.9017 },
  'city-charsadda': { lat: 34.1483, lng: 71.7408 },
  'city-kamalia': { lat: 30.7258, lng: 72.6458 },
  'city-ghotki': { lat: 28.006, lng: 69.316 },
  'city-attock': { lat: 33.7667, lng: 72.3667 },
  'city-vehari': { lat: 30.0452, lng: 72.3489 },
  'city-wah': { lat: 33.7715, lng: 72.7511 },
  'city-gwadar': { lat: 25.1216, lng: 62.3254 },
  'city-turbat': { lat: 26.0043, lng: 63.0435 },
  'city-chaman': { lat: 30.921, lng: 66.4597 },
  'city-gilgit': { lat: 35.9208, lng: 74.3144 },
  'city-skardu': { lat: 35.2971, lng: 75.6335 },
  'city-muzaffarabad': { lat: 34.3704, lng: 73.4702 },
  'city-mirpur': { lat: 33.1478, lng: 73.751 },
  'city-kotli': { lat: 33.5184, lng: 73.899 },
  'city-taxila': { lat: 33.7463, lng: 72.8397 },
  'city-hassanabdal': { lat: 33.8195, lng: 72.689 },
  'city-mansehra': { lat: 34.3302, lng: 73.1968 },
  'city-battagram': { lat: 34.6774, lng: 73.0233 },
  'city-nowshera': { lat: 34.0158, lng: 71.9814 },
  'city-bannu': { lat: 32.9861, lng: 70.6042 },
  'city-swat': { lat: 34.75, lng: 72.35 },
  'city-karak': { lat: 33.1104, lng: 71.0935 },
  'city-hangu': { lat: 33.531, lng: 71.06 },
  'city-zhob': { lat: 31.3417, lng: 69.4486 },
  'city-sibi': { lat: 29.543, lng: 67.8773 },
  'city-hub': { lat: 25.067, lng: 66.91 },
  'city-thatta': { lat: 24.7474, lng: 67.9237 },
  'city-badin': { lat: 24.655, lng: 68.837 },
  'city-dadu': { lat: 26.7303, lng: 67.779 },
  'city-shikarpur': { lat: 27.9556, lng: 68.6382 },
  'city-khairpur': { lat: 27.5295, lng: 68.7617 },
  'city-umiarkot': { lat: 25.3614, lng: 69.7361 },
  'city-tchichawatni': { lat: 30.53, lng: 72.7 },
  'city-gojra': { lat: 31.1493, lng: 72.6866 },
  'city-mandibahuddin': { lat: 32.5872, lng: 73.4912 },
  'city-narowal': { lat: 32.101, lng: 74.873 },
  'city-toba': { lat: 30.9743, lng: 72.4827 },
  'city-bahawalnagar': { lat: 29.9984, lng: 73.2527 },
  'city-lodhran': { lat: 29.54, lng: 71.63 },
  'city-bhakkar': { lat: 31.625, lng: 71.0667 },
  'city-mianwali': { lat: 32.5839, lng: 71.537 },
  'city-chakwal': { lat: 32.9328, lng: 72.8531 },
  'city-talagang': { lat: 32.9277, lng: 72.4158 },
};

const BY_NAME: Record<string, { lat: number; lng: number }> = Object.fromEntries(
  Object.entries(COORDS).map(([id, coords]) => {
    const slug = id.replace(/^city-/, '').replace(/-/g, ' ');
    return [slug, coords];
  }),
);

// Prefer readable names from the seed migration over slug guesses.
Object.assign(BY_NAME, {
  karachi: COORDS['city-karachi'],
  lahore: COORDS['city-lahore'],
  islamabad: COORDS['city-islamabad'],
  rawalpindi: COORDS['city-rawalpindi'],
  faisalabad: COORDS['city-faisalabad'],
  multan: COORDS['city-multan'],
  peshawar: COORDS['city-peshawar'],
  quetta: COORDS['city-quetta'],
  hyderabad: COORDS['city-hyd'],
  'rahim yar khan': COORDS['city-rahimyarkhan'],
  'mirpur khas': COORDS['city-mirpurkhas'],
  'dera ghazi khan': COORDS['city-dera-ghazi'],
  'dera ismail khan': COORDS['city-dera-ismail'],
  'wah cantonment': COORDS['city-wah'],
  'tando adam': COORDS['city-tandoadam'],
  'saidu sharif': COORDS['city-swat'],
  'hassan abdal': COORDS['city-hassanabdal'],
  'mandi bahauddin': COORDS['city-mandibahuddin'],
  'toba tek singh': COORDS['city-toba'],
  chichawatni: COORDS['city-tchichawatni'],
  umerkot: COORDS['city-umiarkot'],
});

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function hasCoordsForCity(cityId: string): boolean {
  return Boolean(COORDS[cityId]);
}

export function coordsForCity(
  cityId: string,
  cityName?: string | null,
): { lat: number; lng: number } {
  if (COORDS[cityId]) return COORDS[cityId];
  if (cityName) {
    const byName = BY_NAME[normalizeName(cityName)];
    if (byName) return byName;
  }
  const slug = cityId.replace(/^city-/, '').replace(/-/g, ' ');
  if (BY_NAME[slug]) return BY_NAME[slug];
  return COORDS['city-karachi'];
}
