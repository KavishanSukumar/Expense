import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { AppTheme } from '../theme/AppTheme';
import { CategoryBreakdownItem } from '../services/FileStoreService';

interface DonutGaugeProps {
  spentPercentage: number;
  totalSpent: number;
  totalBudget: number;
  categoryBreakdown?: CategoryBreakdownItem[];
  currencySymbol?: string;
  themeMode?: 'light' | 'dark';
  onEditBudget?: () => void;
  onInspectCategory?: (categoryId: string) => void;
}

export class DonutGaugeChart extends React.Component<DonutGaugeProps> {
  // Ring Geometry settings
  private readonly size = 260;
  private readonly strokeWidth = 18;
  private readonly radius = (this.size - this.strokeWidth) / 2;
  private readonly center = this.size / 2;
  private readonly circumference = 2 * Math.PI * this.radius;

  private renderDynamicSegments(): React.ReactNode {
    const { categoryBreakdown, totalSpent } = this.props;
    const strokeDash = this.circumference;

    if (!categoryBreakdown || categoryBreakdown.length === 0 || totalSpent <= 0) {
      return null;
    }

    const nonZeroItems = categoryBreakdown.filter((item) => item.amount > 0);
    if (nonZeroItems.length === 0) {
      return null;
    }

    let cumulativeRatio = 0.04;
    const usableArcFraction = 0.88;

    return nonZeroItems.map((item) => {
      const share = item.amount / totalSpent;
      const arcLength = Math.max(0.04, share * usableArcFraction) * strokeDash;
      const dashOffset = -cumulativeRatio * strokeDash;
      cumulativeRatio += share * usableArcFraction + 0.025;

      return (
        <Circle
          key={item.category.id}
          cx={this.center}
          cy={this.center}
          r={this.radius}
          stroke={item.category.colorHex}
          strokeWidth={this.strokeWidth}
          strokeDasharray={`${arcLength} ${strokeDash}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          fill="transparent"
        />
      );
    });
  }

  public render(): React.ReactNode {
    const {
      spentPercentage,
      totalSpent,
      totalBudget,
      currencySymbol = '₹',
      themeMode = 'light',
      onEditBudget,
      onInspectCategory,
    } = this.props;
    const palette = AppTheme.getPalette(themeMode);

    return (
      <View style={styles.container}>
        <View style={styles.svgContainer}>
          <Svg width={this.size} height={this.size} viewBox={`0 0 ${this.size} ${this.size}`}>
            {/* Background Track Circle */}
            <Circle
              cx={this.center}
              cy={this.center}
              r={this.radius}
              stroke={palette.borderLight}
              strokeWidth={this.strokeWidth}
              fill="transparent"
            />

            {/* Dynamic Category Segments */}
            {this.renderDynamicSegments()}
          </Svg>

          {/* Floating Category Badges pinned on circumference */}
          <TouchableOpacity
            style={[styles.badge, styles.badgeCoffee]}
            onPress={() => onInspectCategory && onInspectCategory('cat-food')}
            activeOpacity={0.8}
          >
            <Text style={styles.badgeEmoji}>☕</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.badge, styles.badgeCart]}
            onPress={() => onInspectCategory && onInspectCategory('cat-shopping')}
            activeOpacity={0.8}
          >
            <Text style={styles.badgeEmoji}>🛒</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.badge, styles.badgeCar]}
            onPress={() => onInspectCategory && onInspectCategory('cat-transport')}
            activeOpacity={0.8}
          >
            <Text style={styles.badgeEmoji}>🚗</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.badge, styles.badgeHeart]}
            onPress={() => onInspectCategory && onInspectCategory('cat-health')}
            activeOpacity={0.8}
          >
            <Text style={styles.badgeEmoji}>❤️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.badge, styles.badgeCommunity]}
            onPress={() => onInspectCategory && onInspectCategory('cat-community')}
            activeOpacity={0.8}
          >
            <Text style={styles.badgeEmoji}>🌙</Text>
          </TouchableOpacity>

          {/* Center Gauge Stats */}
          <View style={styles.centerTextContainer}>
            <Text style={[styles.percentText, { color: palette.textPrimary }]}>{spentPercentage}%</Text>
            <View style={styles.budgetSpentRow}>
              <Text style={[styles.budgetSpentText, { color: palette.textSecondary }]}>budget spent </Text>
              <View style={[styles.infoCircle, { borderColor: palette.borderLight }]}>
                <Text style={[styles.infoText, { color: palette.textMuted }]}>ⓘ</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Total Spent & Limit */}
        <View style={styles.detailsContainer}>
          <Text style={[styles.amountLarge, { color: palette.textPrimary }]}>
            {currencySymbol}{totalSpent.toLocaleString('en-IN')}
          </Text>
          <TouchableOpacity style={styles.limitRow} onPress={onEditBudget} activeOpacity={0.7}>
            <Text style={[styles.limitText, { color: palette.textSecondary }]}>
              of {currencySymbol}{totalBudget.toLocaleString('en-IN')} total budget{' '}
            </Text>
            <Text style={styles.editPencil}>✎</Text>
          </TouchableOpacity>
          <Text style={[styles.helperText, { color: palette.textMuted }]}>
            Tap any category icon on the ring to inspect
          </Text>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  svgContainer: {
    width: 260,
    height: 260,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentText: {
    fontSize: 44,
    fontWeight: '800',
    color: AppTheme.Colors.primaryNavy,
    letterSpacing: -1,
  },
  budgetSpentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  budgetSpentText: {
    fontSize: 13,
    color: AppTheme.Colors.textSecondary,
    fontWeight: '500',
  },
  infoCircle: {
    marginLeft: 2,
  },
  infoText: {
    fontSize: 13,
    color: AppTheme.Colors.textSecondary,
  },
  // Floating Category Badges
  badge: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...AppTheme.Elevation.softShadow,
  },
  badgeCoffee: {
    backgroundColor: '#FF8A00',
    right: 2,
    top: '48%',
  },
  badgeCart: {
    backgroundColor: '#FFAE19',
    left: 20,
    bottom: 42,
  },
  badgeCar: {
    backgroundColor: '#2AC769',
    left: 8,
    top: '40%',
  },
  badgeHeart: {
    backgroundColor: '#FF5757',
    left: 38,
    top: 24,
  },
  badgeCommunity: {
    backgroundColor: '#10B981',
    top: 14,
    right: '42%',
  },
  badgeEmoji: {
    fontSize: 14,
  },
  detailsContainer: {
    alignItems: 'center',
    marginTop: 18,
  },
  amountLarge: {
    fontSize: 32,
    fontWeight: '800',
    color: AppTheme.Colors.primaryNavy,
    letterSpacing: -0.5,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  limitText: {
    fontSize: 14,
    color: AppTheme.Colors.textSecondary,
    fontWeight: '500',
  },
  editPencil: {
    fontSize: 14,
    color: AppTheme.Colors.primaryNavy,
  },
  helperText: {
    fontSize: 12,
    color: AppTheme.Colors.textMuted,
    marginTop: 8,
  },
});
