import { StyleSheet } from 'react-native';

export type ThemeMode = 'light' | 'dark';

export interface ColorPalette {
  background: string;
  cardBackground: string;
  cardBackgroundElevated: string;
  primaryNavy: string;
  secondaryNavy: string;
  navyGradientStart: string;
  navyGradientEnd: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textLight: string;
  borderLight: string;
  pillBackground: string;
  inputBackground: string;
  notificationBadge: string;
  statusBar: 'dark-content' | 'light-content';

  foodOrange: string;
  transportGreen: string;
  shoppingYellow: string;
  healthRed: string;
  vehicleBlue: string;
  islamicGreen: string;

  chartSegment1: string;
  chartSegment2: string;
  chartSegment3: string;
  chartSegment4: string;
  chartSegment5: string;
}

export class AppTheme {
  public static readonly LightColors: ColorPalette = {
    background: '#F7F9FC',
    cardBackground: '#FFFFFF',
    cardBackgroundElevated: '#FFFFFF',
    primaryNavy: '#0F1A2C',
    secondaryNavy: '#1E2D4A',
    navyGradientStart: '#141E30',
    navyGradientEnd: '#243B55',
    textPrimary: '#0F1A2C',
    textSecondary: '#7A869A',
    textMuted: '#9AA5B8',
    textLight: '#FFFFFF',
    borderLight: '#E8EDF5',
    pillBackground: '#F0F3F8',
    inputBackground: '#F4F7FB',
    notificationBadge: '#FF4D4F',
    statusBar: 'dark-content',

    foodOrange: '#FF8A00',
    transportGreen: '#2AC769',
    shoppingYellow: '#FFAE19',
    healthRed: '#FF5757',
    vehicleBlue: '#2B82F6',
    islamicGreen: '#10B981',

    chartSegment1: '#FF9500',
    chartSegment2: '#2AC769',
    chartSegment3: '#2F80ED',
    chartSegment4: '#FF5B5B',
    chartSegment5: '#F2C94C',
  };

  public static readonly DarkColors: ColorPalette = {
    background: '#0B111E',
    cardBackground: '#131F33',
    cardBackgroundElevated: '#1A2942',
    primaryNavy: '#E2E8F0',
    secondaryNavy: '#94A3B8',
    navyGradientStart: '#0F172A',
    navyGradientEnd: '#1E293B',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textLight: '#FFFFFF',
    borderLight: '#1E2D4A',
    pillBackground: '#1A263B',
    inputBackground: '#162235',
    notificationBadge: '#FF4D4F',
    statusBar: 'light-content',

    foodOrange: '#FF8A00',
    transportGreen: '#2AC769',
    shoppingYellow: '#FFAE19',
    healthRed: '#FF5757',
    vehicleBlue: '#3B82F6',
    islamicGreen: '#10B981',

    chartSegment1: '#FF9500',
    chartSegment2: '#2AC769',
    chartSegment3: '#2F80ED',
    chartSegment4: '#FF5B5B',
    chartSegment5: '#F2C94C',
  };

  public static currentMode: ThemeMode = 'light';
  private static themeListeners: Array<(mode: ThemeMode) => void> = [];

  public static get Colors(): ColorPalette {
    return AppTheme.currentMode === 'dark' ? AppTheme.DarkColors : AppTheme.LightColors;
  }

  public static getPalette(mode?: ThemeMode): ColorPalette {
    const targetMode = mode || AppTheme.currentMode;
    return targetMode === 'dark' ? AppTheme.DarkColors : AppTheme.LightColors;
  }

  public static setMode(mode: ThemeMode): void {
    if (AppTheme.currentMode !== mode) {
      AppTheme.currentMode = mode;
      AppTheme.themeListeners.forEach((listener) => {
        try {
          listener(mode);
        } catch {
          // ignore callback failures
        }
      });
    }
  }

  public static subscribe(listener: (mode: ThemeMode) => void): () => void {
    AppTheme.themeListeners.push(listener);
    return () => {
      AppTheme.themeListeners = AppTheme.themeListeners.filter((l) => l !== listener);
    };
  }

  public static readonly Typography = {
    headerLarge: {
      fontSize: 26,
      fontWeight: '700' as const,
      letterSpacing: -0.5,
    },
    headerMedium: {
      fontSize: 20,
      fontWeight: '700' as const,
    },
    title: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    subtitle: {
      fontSize: 13,
      fontWeight: '400' as const,
    },
    caption: {
      fontSize: 11,
      fontWeight: '500' as const,
    },
    amountLarge: {
      fontSize: 28,
      fontWeight: '700' as const,
    },
    amountMedium: {
      fontSize: 16,
      fontWeight: '700' as const,
    },
  };

  public static readonly Elevation = StyleSheet.create({
    softShadow: {
      shadowColor: '#0F1A2C',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.05,
      shadowRadius: 16,
      elevation: 3,
    },
    cardShadow: {
      shadowColor: '#0F1A2C',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 5,
    },
    floatingBarShadow: {
      shadowColor: '#0F1A2C',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
    },
  });
}
