import { NextRequest, NextResponse } from 'next/server';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const PHOTON = 'https://photon.komoot.io/api/';
const UA = 'DishRank/1.0 (https://dishrank.app; support@dishrank.app)';

export type GeocodeHit = {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
  source?: 'nominatim' | 'photon';
};

type NominatimHit = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
    type?: string;
    osm_value?: string;
  };
};

function roundKey(lat: number, lon: number) {
  return `${lat.toFixed(5)},${lon.toFixed(5)}`;
}

function photonLabel(p: PhotonFeature['properties']): string {
  if (!p) return 'Unknown place';
  const line1 = [p.name, p.housenumber && p.street ? `${p.housenumber} ${p.street}` : p.street]
    .filter(Boolean)
    .join(' · ');
  const line2 = [p.district, p.city, p.state, p.country].filter(Boolean).join(', ');
  return [line1 || p.osm_value || p.type, line2].filter(Boolean).join(' — ');
}

async function searchNominatim(params: URLSearchParams): Promise<GeocodeHit[]> {
  const res = await fetch(`${NOMINATIM}?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': UA,
    },
    signal: AbortSignal.timeout(4500),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = (await res.json()) as NominatimHit[];
  if (!Array.isArray(data)) return [];
  return data.map((h) => ({
    place_id: `n-${h.place_id}`,
    display_name: h.display_name,
    lat: h.lat,
    lon: h.lon,
    source: 'nominatim' as const,
  }));
}

async function searchPhoton(params: {
  q: string;
  lat?: number;
  lng?: number;
}): Promise<GeocodeHit[]> {
  const sp = new URLSearchParams({
    q: params.q,
    limit: '8',
    lang: 'en',
  });
  // Bias toward Pakistan / selected city without hard-bounding (restaurants often missing from OSM).
  if (params.lat != null && params.lng != null) {
    sp.set('lat', String(params.lat));
    sp.set('lon', String(params.lng));
  }

  const res = await fetch(`${PHOTON}?${sp.toString()}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': UA,
    },
    signal: AbortSignal.timeout(4500),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const data = (await res.json()) as { features?: PhotonFeature[] };
  const features = Array.isArray(data.features) ? data.features : [];

  return features
    .map((f, i) => {
      const [lon, lat] = f.geometry?.coordinates || [];
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      // Prefer Pakistan results when country is known
      const country = (f.properties?.country || '').toLowerCase();
      if (country && !country.includes('pakistan') && country !== 'pk') return null;
      return {
        place_id: `p-${f.properties?.osm_id ?? i}-${roundKey(lat, lon)}`,
        display_name: photonLabel(f.properties),
        lat: String(lat),
        lon: String(lon),
        source: 'photon' as const,
      } satisfies GeocodeHit;
    })
    .filter((h): h is GeocodeHit => !!h);
}

function mergeHits(primary: GeocodeHit[], secondary: GeocodeHit[], limit = 10): GeocodeHit[] {
  const seen = new Set<string>();
  const out: GeocodeHit[] = [];
  for (const hit of [...primary, ...secondary]) {
    const key = roundKey(Number(hit.lat), Number(hit.lon));
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
    if (out.length >= limit) break;
  }
  return out;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const city = req.nextUrl.searchParams.get('city')?.trim();
  const latRaw = req.nextUrl.searchParams.get('lat');
  const lngRaw = req.nextUrl.searchParams.get('lng');
  const lat = latRaw != null ? Number(latRaw) : undefined;
  const lng = lngRaw != null ? Number(lngRaw) : undefined;
  const hasCenter = Number.isFinite(lat) && Number.isFinite(lng);

  const nominatimParams = new URLSearchParams({
    q,
    format: 'json',
    addressdetails: '1',
    limit: '8',
    countrycodes: 'pk',
  });

  if (hasCenter) {
    const d = 0.35;
    nominatimParams.set('viewbox', `${lng! - d},${lat! + d},${lng! + d},${lat! - d}`);
    nominatimParams.set('bounded', '0');
  }

  const photonQ = city && !q.toLowerCase().includes(city.toLowerCase()) ? `${q}, ${city}` : q;

  try {
    const [nominatimHits, photonHits] = await Promise.all([
      searchNominatim(nominatimParams).catch(() => [] as GeocodeHit[]),
      searchPhoton({
        q: photonQ,
        lat: hasCenter ? lat : undefined,
        lng: hasCenter ? lng : undefined,
      }).catch(() => [] as GeocodeHit[]),
    ]);

    let hits = mergeHits(photonHits, nominatimHits);

    // Fallback: stronger city-qualified Nominatim query if still empty
    if (hits.length === 0 && city && !q.toLowerCase().includes(city.toLowerCase())) {
      const withCity = new URLSearchParams(nominatimParams);
      withCity.set('q', `${q}, ${city}, Pakistan`);
      const retry = await searchNominatim(withCity).catch(() => [] as GeocodeHit[]);
      hits = mergeHits(retry, []);
    }

    return NextResponse.json(hits);
  } catch {
    return NextResponse.json({ error: 'Place search failed' }, { status: 502 });
  }
}
