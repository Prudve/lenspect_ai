import * as Location from "expo-location";

export interface GeoLocationResult {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  address?: string;
  city?: string;
  region?: string;
}

export const LocationService = {
  async requestPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === "granted";
    } catch {
      return false;
    }
  },

  async getCurrentLocation(): Promise<GeoLocationResult> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      throw new Error("Location permission denied. Please enable GPS in device settings.");
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });

    const result: GeoLocationResult = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
    };

    try {
      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (address) {
        result.city = address.city || address.subregion || "";
        result.region = address.region || "";
        result.address = [address.streetNumber, address.street, address.district, address.city, address.postalCode]
          .filter(Boolean)
          .join(", ");
      }
    } catch {
      // Reverse geocode is best effort
    }

    return result;
  },
};
