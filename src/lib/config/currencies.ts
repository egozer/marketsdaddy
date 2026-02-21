import countryProfilesJson from "@/data/countries.json";
import type { CountryCurrencyProfile } from "@/types/fx";

export const COUNTRY_PROFILES = countryProfilesJson as CountryCurrencyProfile[];

export const USD_PROFILE = COUNTRY_PROFILES.find((profile) => profile.currency === "usd");

if (!USD_PROFILE) {
  throw new Error("USD profile is required in countries dataset.");
}

export const TRACKED_CURRENCIES = COUNTRY_PROFILES.filter(
  (profile) => profile.currency !== "usd"
).map((profile) => profile.currency);

export const TRACKED_PROFILES = COUNTRY_PROFILES.filter((profile) => profile.currency !== "usd");

export const TRACKED_SET = new Set(TRACKED_CURRENCIES);
