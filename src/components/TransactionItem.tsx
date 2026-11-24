import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AppTheme, ThemeMode } from '../theme/AppTheme';
import { TransactionModel } from '../types';

interface TransactionItemProps {
  transaction: TransactionModel;
  currencySymbol?: string;
  themeMode?: ThemeMode;
  onPress?: (tx: TransactionModel) => void;
}

export class TransactionItem extends React.Component<TransactionItemProps> {
  private getCategoryVisuals(): { bgColor: string; icon: string } {
    const { categoryId, type } = this.props.transaction;
    if (type === 'TRANSFER') {
      return { bgColor: AppTheme.Colors.vehicleBlue, icon: '⇄' };
    }
    if (type === 'INCOME') {
      return { bgColor: AppTheme.Colors.transportGreen, icon: '💰' };
    }
    switch (categoryId) {
      case 'cat-food':
        return { bgColor: AppTheme.Colors.foodOrange, icon: '🍜' };
      case 'cat-transport':
        return { bgColor: AppTheme.Colors.transportGreen, icon: '🚗' };
      case 'cat-shopping':
        return { bgColor: AppTheme.Colors.shoppingYellow, icon: '🛍️' };
      case 'cat-health':
        return { bgColor: AppTheme.Colors.healthRed, icon: '❤️' };
      case 'cat-community':
        return { bgColor: AppTheme.Colors.islamicGreen, icon: '🌙' };
      default:
        return { bgColor: AppTheme.Colors.vehicleBlue, icon: '💳' };
    }
  }

  public render(): React.ReactNode {
    const { transaction, currencySymbol = '₹', themeMode = 'light', onPress } = this.props;
    const { bgColor, icon } = this.getCategoryVisuals();
    const palette = AppTheme.getPalette(themeMode);

    let amountPrefix = '- ';
    let amountColor = palette.textPrimary;
    if (transaction.type === 'INCOME') {
      amountPrefix = '+ ';
      amountColor = palette.transportGreen;
    } else if (transaction.type === 'TRANSFER') {
      amountPrefix = '⇄ ';
      amountColor = palette.vehicleBlue;
    }

    return (
      <TouchableOpacity
        style={[styles.container, { backgroundColor: palette.cardBackground, borderColor: palette.borderLight }]}
        onPress={() => onPress && onPress(transaction)}
        activeOpacity={0.8}
      >
        <View style={styles.leftContent}>
          {/* Category Icon Badge */}
          <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
            <Text style={styles.categoryEmoji}>{icon}</Text>
          </View>

          {/* Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: palette.textPrimary }]} numberOfLines={1}>
                {transaction.title}
              </Text>
              {Boolean(transaction.receiptUri) && (
                <View
                  style={[
                    styles.receiptBadge,
                    {
                      backgroundColor:
                        themeMode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#EBF3FF',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.receiptBadgeText,
                      { color: themeMode === 'dark' ? '#60A5FA' : '#2B82F6' },
                    ]}
                  >
                    🧾 Receipt
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]} numberOfLines={1}>
              {transaction.subtitle}
            </Text>
          </View>
        </View>

        {/* Amount */}
        <Text style={[styles.amount, { color: amountColor }]}>
          {amountPrefix}{currencySymbol}{transaction.amount.toLocaleString('en-IN')}
        </Text>
      </TouchableOpacity>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    ...AppTheme.Elevation.softShadow,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  categoryEmoji: {
    fontSize: 22,
  },
  detailsContainer: {
    flex: 1,
    marginRight: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  receiptBadge: {
    marginLeft: 6,
    backgroundColor: '#EBF3FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  receiptBadgeText: {
    fontSize: 10,
    color: '#2B82F6',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
  },
});
