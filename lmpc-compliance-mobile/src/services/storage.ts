import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { User } from "../types/auth";
import { OfflineInspectionItem } from "../types/queue";

const ACCESS_TOKEN_KEY = "lmpc_access_token";
const REFRESH_TOKEN_KEY = "lmpc_refresh_token";
const USER_KEY = "lmpc_user_profile";
const API_BASE_URL_KEY = "lmpc_custom_api_url";
const OFFLINE_QUEUE_KEY = "lmpc_offline_queue";

// Automatically detect host machine's LAN IP from Expo Go connection
const getHostIp = (): string => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    return hostUri.split(":")[0];
  }
  return "172.20.202.104";
};

const devHostIp = getHostIp();

// Default backend URL — points to Express API on port 3000
export const DEFAULT_API_BASE_URL = `http://${devHostIp}:3000/api/v1`;

async function setSecureItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch {
    await AsyncStorage.setItem(key, value);
  }
}

async function getSecureItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return await AsyncStorage.getItem(key);
    }
    const val = await SecureStore.getItemAsync(key);
    return val ?? (await AsyncStorage.getItem(key));
  } catch {
    return await AsyncStorage.getItem(key);
  }
}

async function deleteSecureItem(key: string): Promise<void> {
  try {
    if (Platform.OS !== "web") {
      await SecureStore.deleteItemAsync(key);
    }
  } catch {
    // ignore
  }
  await AsyncStorage.removeItem(key);
}

export const StorageService = {
  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    await setSecureItem(ACCESS_TOKEN_KEY, accessToken);
    await setSecureItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  async getAccessToken(): Promise<string | null> {
    return getSecureItem(ACCESS_TOKEN_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    return getSecureItem(REFRESH_TOKEN_KEY);
  },

  async clearTokens(): Promise<void> {
    await deleteSecureItem(ACCESS_TOKEN_KEY);
    await deleteSecureItem(REFRESH_TOKEN_KEY);
  },

  async saveUser(user: User): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  async getUser(): Promise<User | null> {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async clearUser(): Promise<void> {
    await AsyncStorage.removeItem(USER_KEY);
  },

  async getCustomApiUrl(): Promise<string> {
    const custom = await AsyncStorage.getItem(API_BASE_URL_KEY);
    return custom || DEFAULT_API_BASE_URL;
  },

  async setCustomApiUrl(url: string): Promise<void> {
    await AsyncStorage.setItem(API_BASE_URL_KEY, url.trim().replace(/\/+$/, ""));
  },

  // Offline queue storage
  async getOfflineQueue(): Promise<OfflineInspectionItem[]> {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  async saveOfflineQueue(queue: OfflineInspectionItem[]): Promise<void> {
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  },
};
