import "server-only";

const PLACES_BASE = "https://places.googleapis.com/v1";

export function isGooglePlacesConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim());
}

function apiKey(): string | null {
  const value = process.env.GOOGLE_PLACES_API_KEY?.trim();
  return value || null;
}

export interface AddressSuggestion {
  placeId: string;
  label: string;
  mainText: string;
  secondaryText: string;
}

interface AutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    };
  }>;
}

interface PlaceDetailsResponse {
  formattedAddress?: string;
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];
  }>;
}

export interface StructuredAddress {
  addressLine1: string;
  postalCode: string;
  city: string;
  countryCode: string;
  formattedAddress: string;
}

export async function autocompleteDutchAddress(
  input: string,
  sessionToken: string,
): Promise<AddressSuggestion[]> {
  const key = apiKey();
  if (!key) return [];

  const response = await fetch(`${PLACES_BASE}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text",
    },
    body: JSON.stringify({
      input,
      languageCode: "nl",
      regionCode: "nl",
      includedRegionCodes: ["nl"],
      sessionToken,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Google Places autocomplete failed: ${response.status}`);
  }

  const data = (await response.json()) as AutocompleteResponse;

  return (data.suggestions ?? [])
    .map((item) => item.placePrediction)
    .filter((prediction): prediction is NonNullable<typeof prediction> =>
      Boolean(prediction?.placeId && prediction?.text?.text),
    )
    .slice(0, 5)
    .map((prediction) => ({
      placeId: prediction.placeId!,
      label: prediction.text?.text ?? "",
      mainText:
        prediction.structuredFormat?.mainText?.text ??
        prediction.text?.text ??
        "",
      secondaryText:
        prediction.structuredFormat?.secondaryText?.text ?? "",
    }));
}

function componentValue(
  components: NonNullable<PlaceDetailsResponse["addressComponents"]>,
  types: string[],
  preferShort = false,
): string {
  const component = components.find((item) =>
    (item.types ?? []).some((type) => types.includes(type)),
  );
  if (!component) return "";
  return preferShort
    ? component.shortText || component.longText || ""
    : component.longText || component.shortText || "";
}

export async function getDutchAddressDetails(
  placeId: string,
  sessionToken: string,
): Promise<StructuredAddress | null> {
  const key = apiKey();
  if (!key) return null;

  const url = new URL(
    `${PLACES_BASE}/places/${encodeURIComponent(placeId)}`,
  );
  url.searchParams.set("languageCode", "nl");
  url.searchParams.set("regionCode", "nl");
  url.searchParams.set("sessionToken", sessionToken);

  const response = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "formattedAddress,addressComponents",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Google Places details failed: ${response.status}`);
  }

  const data = (await response.json()) as PlaceDetailsResponse;
  const components = data.addressComponents ?? [];

  const route = componentValue(components, ["route"]);
  const streetNumber = componentValue(components, ["street_number"]);
  const postalCode = componentValue(components, ["postal_code"]);
  const city = componentValue(components, [
    "locality",
    "postal_town",
    "administrative_area_level_2",
  ]);
  const countryCode = componentValue(components, ["country"], true) || "NL";

  const addressLine1 = [route, streetNumber].filter(Boolean).join(" ").trim();

  return {
    addressLine1: addressLine1 || data.formattedAddress || "",
    postalCode,
    city,
    countryCode: countryCode.toUpperCase(),
    formattedAddress: data.formattedAddress || addressLine1,
  };
}
