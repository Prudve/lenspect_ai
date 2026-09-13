import { NavigatorScreenParams } from "@react-navigation/native";

export type MainTabParamList = {
  Dashboard: undefined;
  Scan: { existingPhotos?: string[] } | undefined;
  History: undefined;
  Queue: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  InspectionPreview: {
    photoUri?: string;
    photoUris?: string[];
    latitude: number;
    longitude: number;
    address?: string;
    networkTimestamp?: string;
    timestampSource?: "network" | "device";
  };
  InspectionDetail: {
    inspectionId: string;
  };
};
