import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AppTheme, ThemeMode } from '../theme/AppTheme';

interface QuickActionDockProps {
  themeMode?: ThemeMode;
  onPressBorrowings: () => void;
  onPressTransfer: () => void;
  onPressWallets?: () => void;
  dueCount?: number;
}

export class QuickActionDock extends React.Component<QuickActionDockProps> {
  public render(): React.ReactNode {
    const { onPressBorrowings, onPressTransfer, dueCount, themeMode = 'light' } = this.props;
    const palette = AppTheme.getPalette(themeMode);

    return (
      <View style={styles.container}>
        {/* Dues & Borrowings Action */}
        <TouchableOpacity style={styles.actionItem} onPress={onPressBorrowings} activeOpacity={0.8}>
          <View
            style={[
              styles.circleButton,
              { backgroundColor: themeMode === 'dark' ? '#2563EB' : palette.primaryNavy },
            ]}
          >
            <Text style={styles.accentIcon}>🤝</Text>
            {Boolean(dueCount && dueCount > 0) && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{dueCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.actionLabel, { color: palette.textPrimary }]}>Dues</Text>
        </TouchableOpacity>

        {/* Transfer Action */}
        <TouchableOpacity style={styles.actionItem} onPress={onPressTransfer} activeOpacity={0.8}>
          <View
            style={[
              styles.circleButton,
              {
                backgroundColor: palette.cardBackground,
                borderColor: palette.borderLight,
                borderWidth: 1,
              },
            ]}
          >
            <Text style={[styles.neutralIcon, { color: palette.textPrimary }]}>⇄</Text>
          </View>
          <Text style={[styles.actionLabel, { color: palette.textPrimary }]}>Transfer</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 48,
    marginHorizontal: 30,
    marginVertical: 12,
  },
  actionItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...AppTheme.Elevation.softShadow,
  },
  accentIcon: {
    fontSize: 22,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF4D4F',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  neutralIcon: {
    fontSize: 22,
  },
  actionLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
  },
});
