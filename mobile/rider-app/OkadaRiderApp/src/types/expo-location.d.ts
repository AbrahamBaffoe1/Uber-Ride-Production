declare module 'expo-location' {
  export interface LocationObjectCoords {
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number | null;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  }

  export interface LocationObject {
    coords: LocationObjectCoords;
    timestamp: number;
  }

  export enum Accuracy {
    Lowest = 1,
    Low = 2,
    Balanced = 3,
    High = 4,
    Highest = 5,
    BestForNavigation = 6
  }

  export type LocationPermissionResponse = {
    status: PermissionStatus;
    granted: boolean;
    expires: 'never' | number;
    canAskAgain: boolean;
  };

  export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

  export type LocationSubscription = {
    remove: () => void;
  };

  export type LocationOptions = {
    accuracy?: Accuracy;
    distanceInterval?: number;
    timeInterval?: number;
    foregroundService?: {
      notificationTitle: string;
      notificationBody: string;
      notificationColor?: string;
    };
  };

  export const EventEmitter: {
    removeSubscription: (subscription: number) => Promise<void>;
  };

  export function requestForegroundPermissionsAsync(): Promise<LocationPermissionResponse>;
  export function requestBackgroundPermissionsAsync(): Promise<LocationPermissionResponse>;
  export function getCurrentPositionAsync(options?: LocationOptions): Promise<LocationObject>;
  export function watchPositionAsync(
    options: LocationOptions,
    callback: (location: LocationObject) => void
  ): Promise<number>;
}
