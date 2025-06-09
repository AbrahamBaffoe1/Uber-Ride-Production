declare module 'expo-battery' {
  export interface BatteryState {
    batteryLevel: number;
    batteryState: number;
    lowPowerMode: boolean;
  }

  export const BATTERY_STATE: {
    UNKNOWN: 0;
    UNPLUGGED: 1;
    CHARGING: 2;
    FULL: 3;
  };

  export function getBatteryLevelAsync(): Promise<number>;
  export function getBatteryStateAsync(): Promise<number>;
  export function isLowPowerModeEnabledAsync(): Promise<boolean>;
  
  export function addBatteryLevelListener(
    listener: (state: { batteryLevel: number }) => void
  ): { remove: () => void };
  
  export function addBatteryStateListener(
    listener: (state: { batteryState: number }) => void
  ): { remove: () => void };
  
  export function addLowPowerModeListener(
    listener: (state: { lowPowerMode: boolean }) => void
  ): { remove: () => void };
}
