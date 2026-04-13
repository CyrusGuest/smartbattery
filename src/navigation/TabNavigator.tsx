import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen, HistoryScreen, AnalyticsScreen, ScheduleScreen, SettingsScreen } from '../screens';
import { COLORS } from '../constants/theme';

const Tab = createBottomTabNavigator();

export const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#080910',
          borderTopColor: '#1A1D2E',
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 10,
          height: 64,
        },
        tabBarActiveTintColor: COLORS.cyan,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.5,
          marginTop: 0,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          switch (route.name) {
            case 'Home':      iconName = focused ? 'home'       : 'home-outline';       break;
            case 'History':   iconName = focused ? 'time'       : 'time-outline';       break;
            case 'Analytics': iconName = focused ? 'bar-chart'  : 'bar-chart-outline';  break;
            case 'Schedule':  iconName = focused ? 'calendar'   : 'calendar-outline';   break;
            case 'Settings':  iconName = focused ? 'settings'   : 'settings-outline';   break;
          }
          return <Ionicons name={iconName} size={20} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"      component={HomeScreen} />
      <Tab.Screen name="History"   component={HistoryScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Schedule"  component={ScheduleScreen} />
      <Tab.Screen name="Settings"  component={SettingsScreen} />
    </Tab.Navigator>
  );
};
