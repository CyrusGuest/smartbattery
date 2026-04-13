import './global.css';
import { NavigationContainer } from '@react-navigation/native';
import { BLEProvider, SettingsProvider, ScheduleProvider } from './src/context';
import { TabNavigator } from './src/navigation/TabNavigator';

export default function App() {
  return (
    <NavigationContainer>
      <SettingsProvider>
        <ScheduleProvider>
          <BLEProvider>
            <TabNavigator />
          </BLEProvider>
        </ScheduleProvider>
      </SettingsProvider>
    </NavigationContainer>
  );
}
