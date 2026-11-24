import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AppTheme, ThemeMode } from '../theme/AppTheme';

export type BottomTabKey = 'HOME' | 'ANALYTICS' | 'BUDGETS' | 'PROFILE';

interface CustomBottomNavProps {
  activeTab: BottomTabKey;
  themeMode?: ThemeMode;
  onSelectTab: (tab: BottomTabKey) => void;
  onPressAdd: () => void;
}

export class CustomBottomNav extends React.Component<CustomBottomNavProps> {
  public render(): React.ReactNode {
    const { activeTab, themeMode = 'light', onSelectTab, onPressAdd } = this.props;
    const palette = AppTheme.getPalette(themeMode);

    return (
      <View style={styles.floatingWrapper}>
        <View
          style={[
            styles.barContainer,
            {
              backgroundColor: palette.cardBackgroundElevated,
              borderColor: palette.borderLight,
            },
          ]}
        >
          {/* Home Tab */}
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => onSelectTab('HOME')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabIcon, activeTab === 'HOME' && styles.activeIcon]}>🏠</Text>
            <Text
              style={[
                styles.tabLabel,
                { color: palette.textMuted },
                activeTab === 'HOME' && { color: palette.textPrimary, fontWeight: '700' },
              ]}
            >
              Home
            </Text>
          </TouchableOpacity>

          {/* Analytics Tab */}
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => onSelectTab('ANALYTICS')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabIcon, activeTab === 'ANALYTICS' && styles.activeIcon]}>📊</Text>
            <Text
              style={[
                styles.tabLabel,
                { color: palette.textMuted },
                activeTab === 'ANALYTICS' && { color: palette.textPrimary, fontWeight: '700' },
              ]}
            >
              Analytics
            </Text>
          </TouchableOpacity>

          {/* Center Elevated Action Button (+) */}
          <View style={styles.centerFabAnchor}>
            <TouchableOpacity
              style={[
                styles.centerFab,
                {
                  backgroundColor: themeMode === 'dark' ? '#2563EB' : palette.primaryNavy,
                  borderColor: palette.cardBackgroundElevated,
                },
              ]}
              onPress={onPressAdd}
              activeOpacity={0.85}
            >
              <Text style={styles.centerFabPlus}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Budgets Tab */}
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => onSelectTab('BUDGETS')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabIcon, activeTab === 'BUDGETS' && styles.activeIcon]}>⏱️</Text>
            <Text
              style={[
                styles.tabLabel,
                { color: palette.textMuted },
                activeTab === 'BUDGETS' && { color: palette.textPrimary, fontWeight: '700' },
              ]}
            >
              Budgets
            </Text>
          </TouchableOpacity>

          {/* Profile Tab */}
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => onSelectTab('PROFILE')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabIcon, activeTab === 'PROFILE' && styles.activeIcon]}>👤</Text>
            <Text
              style={[
                styles.tabLabel,
                { color: palette.textMuted },
                activeTab === 'PROFILE' && { color: palette.textPrimary, fontWeight: '700' },
              ]}
            >
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  barContainer: {
    flexDirection: 'row',
    width: '100%',
    height: 68,
    borderRadius: 34,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    ...AppTheme.Elevation.floatingBarShadow,
    borderWidth: 1,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabIcon: {
    fontSize: 18,
    opacity: 0.45,
  },
  activeIcon: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  centerFabAnchor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
  centerFab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    ...AppTheme.Elevation.floatingBarShadow,
    borderWidth: 4,
  },
  centerFabPlus: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '400',
    marginTop: -2,
  },
});
