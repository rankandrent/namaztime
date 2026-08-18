export interface Country {
  code: string; // ISO2, e.g. "PK"
  iso3: string;
  geonameId: number;
  name: string;
  slug: string;
  capital: string;
  continent: string;
  population: number;
  areaSqKm: number;
  /** Official/major languages from GeoNames, e.g. ["ur", "en"]. */
  languages: string[];
  /** ISO2 codes of bordering countries — a lateral internal-linking surface. */
  neighbours: string[];
  hasAdmin1: boolean;
}

export interface Admin1 {
  id: string; // "{countryCode}.{admin1Code}" e.g. "PK.04"
  countryCode: string;
  admin1Code: string;
  geonameId: number;
  name: string;
  slug: string;
}

/** What kind of populated place this is, derived from GeoNames featureCode. */
export type CityRank =
  | "national-capital" // PPLC
  | "admin1-capital" // PPLA
  | "admin2-capital" // PPLA2
  | "city"; // everything else

export interface City {
  geonameId: number;
  name: string;
  slug: string;
  countryCode: string;
  admin1Id: string | null; // matches Admin1.id, or null if the city has no matched state
  lat: number;
  lon: number;
  timezone: string;
  population: number;
  /** Metres above sea level, or null when GeoNames has neither value. */
  elevation: number | null;
  /**
   * "gps" = surveyed elevation column (accurate, only ~4.5k cities);
   * "dem" = SRTM digital elevation model (~90m resolution, ~34k cities) —
   * prose must hedge with "approximately" for this source.
   */
  elevationSource: "gps" | "dem" | null;
  featureCode: string; // raw GeoNames code, e.g. "PPLC"
  rank: CityRank;
  isTop: boolean; // capital / most-populous / global top-N — drives generateStaticParams
}
