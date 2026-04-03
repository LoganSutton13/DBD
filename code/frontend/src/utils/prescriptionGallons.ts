import area from '@turf/area';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import type { PrescriptionConfig, PrescriptionFeature, PrescriptionGeoJSON, SprayLevel } from '../types/prescription';

const SQ_M_PER_ACRE = 4046.8564224;

function rateForSprayLevel(spray: SprayLevel, config: PrescriptionConfig | null | undefined): number | undefined {
  if (!config) return undefined;
  if (spray === 'none') return config.spray_rate_gpa_none;
  if (spray === 'low') return config.spray_rate_gpa_low;
  if (spray === 'high') return config.spray_rate_gpa_high;
  return undefined;
}

/**
 * Total spray volume (gallons) = sum over clusters of (acres × gal/ac).
 * Uses `properties.spray_rate_gpa` when set; otherwise falls back to config thresholds for the feature's spray level.
 */
export function computePrescriptionTotalGallons(
  geojson: PrescriptionGeoJSON,
  getSprayLevel: (f: PrescriptionFeature) => SprayLevel,
  config?: PrescriptionConfig | null
): number {
  let total = 0;
  for (const f of geojson.features) {
    const geom = f.geometry;
    if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue;
    const sqm = area({ type: 'Feature', properties: {}, geometry: geom } as Feature<Polygon | MultiPolygon>);
    const acres = sqm / SQ_M_PER_ACRE;
    const spray = getSprayLevel(f);
    let rate = f.properties?.spray_rate_gpa;
    if (rate == null || Number.isNaN(rate)) {
      const r = rateForSprayLevel(spray, config);
      if (r == null || Number.isNaN(r)) continue;
      rate = r;
    }
    total += acres * rate;
  }
  return total;
}
