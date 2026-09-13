import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useOffline } from "../context/OfflineContext";
import { HomeScreen } from "../screens/HomeScreen";
import { InspectionDetailScreen } from "../screens/InspectionDetailScreen";
import { InspectionPreviewScreen } from "../screens/InspectionPreviewScreen";
import { InspectionsListScreen } from "../screens/InspectionsListScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { OfflineQueueScreen } from "../screens/OfflineQueueScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ScanCaptureScreen } from "../screens/ScanCaptureScreen";
import { MainTabParamList, RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabsNavigator = () => {
  const { queue } = useOffline();
  const pendingCount = queue.filter((q) => q.status !== "SYNCING").length;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0F172A",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E2E8F0",
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={HomeScreen}
        options={{
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={InspectionsListScreen}
        options={{
          tabBarLabel: "Records",
          tabBarIcon: ({ color, size }) => <Ionicons name="folder-open-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanCaptureScreen}
        options={{
          tabBarLabel: "Scan",
          tabBarIcon: ({ color }) => (
            <View style={styles.elevatedScanButton}>
              <Ionicons name="scan" size={24} color="#FFFFFF" />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Queue"
        component={OfflineQueueScreen}
        options={{
          tabBarLabel: "Queue",
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: "#DC2626", fontSize: 10 },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cloud-offline-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Officer",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabsNavigator} />
            <Stack.Screen
              name="InspectionPreview"
              component={InspectionPreviewScreen}
              options={{ animation: "slide_from_bottom" }}
            />
            <Stack.Screen
              name="InspectionDetail"
              component={InspectionDetailScreen}
              options={{ animation: "slide_from_right" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  centerLoading: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  elevatedScanButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1E3A8A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    shadowColor: "#1E3A8A",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
});
