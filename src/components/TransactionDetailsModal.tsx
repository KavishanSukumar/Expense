import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { AppTheme, ThemeMode } from '../theme/AppTheme';
import { TransactionModel, CategoryModel, WalletModel } from '../types';

interface TransactionDetailsModalProps {
  visible: boolean;
  transaction: TransactionModel | null;
  categories: CategoryModel[];
  wallets: WalletModel[];
  currencySymbol?: string;
  themeMode?: ThemeMode;
  onClose: () => void;
  onEdit?: (tx: TransactionModel) => void;
}

export class TransactionDetailsModal extends React.Component<TransactionDetailsModalProps> {
  private getCategoryDetails(): { name: string; color: string; icon: string } {
    const { transaction, categories } = this.props;
    if (!transaction) {
      return { name: 'Expense', color: '#2B82F6', icon: '💳' };
    }

    if (transaction.type === 'TRANSFER') {
      return { name: 'Transfer', color: AppTheme.Colors.vehicleBlue, icon: '⇄' };
    }
    if (transaction.type === 'INCOME') {
      return { name: 'Income', color: AppTheme.Colors.transportGreen, icon: '💰' };
    }

    const found = categories.find((c) => c.id === transaction.categoryId);
    if (found) {
      return {
        name: found.name,
        color: found.colorHex,
        icon: this.getCategoryEmoji(found.id),
      };
    }

    return { name: 'General', color: '#2B82F6', icon: '💳' };
  }

  private getCategoryEmoji(categoryId: string): string {
    switch (categoryId) {
      case 'cat-food':
        return '🍜';
      case 'cat-transport':
        return '🚗';
      case 'cat-shopping':
        return '🛍️';
      case 'cat-health':
        return '❤️';
      case 'cat-community':
        return '🌙';
      default:
        return '💳';
    }
  }

  public render(): React.ReactNode {
    const {
      visible,
      transaction,
      wallets,
      currencySymbol = '₹',
      themeMode = 'light',
      onClose,
      onEdit,
    } = this.props;

    if (!transaction) {
      return null;
    }

    const palette = AppTheme.getPalette(themeMode);
    const { name: categoryName, color: categoryColor, icon: categoryIcon } =
      this.getCategoryDetails();

    const wallet = wallets.find((w) => w.id === transaction.walletId);
    const destWallet = transaction.destinationWalletId
      ? wallets.find((w) => w.id === transaction.destinationWalletId)
      : null;

    let amountPrefix = '- ';
    let amountColor = palette.textPrimary;
    if (transaction.type === 'INCOME') {
      amountPrefix = '+ ';
      amountColor = palette.transportGreen;
    } else if (transaction.type === 'TRANSFER') {
      amountPrefix = '⇄ ';
      amountColor = palette.vehicleBlue;
    }

    const dateFormatted = new Date(transaction.timestamp).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: palette.cardBackgroundElevated,
                borderColor: palette.borderLight,
                borderWidth: 1,
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.headerRow}>
              <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>
                Transaction Details
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeButton, { backgroundColor: palette.pillBackground }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.closeText, { color: palette.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
              {/* Category Icon Badge & Type Header */}
              <View style={styles.heroSection}>
                <View style={[styles.categoryIconCircle, { backgroundColor: categoryColor }]}>
                  <Text style={styles.categoryEmoji}>{categoryIcon}</Text>
                </View>

                <View style={[styles.typeBadge, { backgroundColor: palette.pillBackground }]}>
                  <Text style={[styles.typeBadgeText, { color: palette.textSecondary }]}>
                    {transaction.type} • {categoryName.toUpperCase()}
                  </Text>
                </View>

                {/* Amount Display */}
                <Text style={[styles.amountDisplay, { color: amountColor }]}>
                  {amountPrefix}
                  {currencySymbol} {transaction.amount.toLocaleString('en-IN')}
                </Text>

                <Text style={[styles.txTitle, { color: palette.textPrimary }]}>
                  {transaction.title}
                </Text>
              </View>

              {/* Transaction Metadata Card */}
              <View
                style={[
                  styles.detailsCard,
                  { backgroundColor: palette.cardBackground, borderColor: palette.borderLight },
                ]}
              >
                {/* Account / Wallet */}
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: palette.textSecondary }]}>
                    Account / Card
                  </Text>
                  <Text style={[styles.infoValue, { color: palette.textPrimary }]}>
                    {wallet ? `${wallet.name} (${wallet.type.replace('_', ' ')})` : 'Default Account'}
                  </Text>
                </View>

                {/* Destination Wallet for Transfers */}
                {transaction.type === 'TRANSFER' && destWallet && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: palette.textSecondary }]}>
                      Transferred To
                    </Text>
                    <Text style={[styles.infoValue, { color: palette.textPrimary }]}>
                      {destWallet.name}
                    </Text>
                  </View>
                )}

                {/* Date & Time */}
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: palette.textSecondary }]}>
                    Date & Time
                  </Text>
                  <Text style={[styles.infoValue, { color: palette.textPrimary }]}>
                    {dateFormatted}
                  </Text>
                </View>

                {/* Subtitle / Description */}
                {Boolean(transaction.subtitle) && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: palette.textSecondary }]}>
                      Description
                    </Text>
                    <Text style={[styles.infoValue, { color: palette.textPrimary }]}>
                      {transaction.subtitle}
                    </Text>
                  </View>
                )}

                {/* Notes if any */}
                {Boolean(transaction.notes) && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: palette.textSecondary }]}>
                      Notes
                    </Text>
                    <Text style={[styles.infoValue, { color: palette.textPrimary }]}>
                      {transaction.notes}
                    </Text>
                  </View>
                )}

                {/* Transaction ID */}
                <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                  <Text style={[styles.infoLabel, { color: palette.textSecondary }]}>
                    Transaction ID
                  </Text>
                  <Text style={[styles.infoValueMuted, { color: palette.textMuted }]}>
                    {transaction.id}
                  </Text>
                </View>
              </View>

              {/* Receipt Preview (if attached) */}
              {Boolean(transaction.receiptUri) && (
                <View
                  style={[
                    styles.receiptCard,
                    { backgroundColor: palette.cardBackground, borderColor: palette.borderLight },
                  ]}
                >
                  <Text style={[styles.receiptSectionTitle, { color: palette.textPrimary }]}>
                    🧾 Attached Receipt
                  </Text>
                  <Image
                    source={{ uri: transaction.receiptUri }}
                    style={styles.receiptImage}
                    resizeMode="cover"
                  />
                  <Text style={[styles.receiptHint, { color: palette.textMuted }]}>
                    Stored encrypted in hardware vault
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Bottom Action Buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: palette.pillBackground }]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={[styles.closeBtnText, { color: palette.textPrimary }]}>Close</Text>
              </TouchableOpacity>

              {Boolean(onEdit) && (
                <TouchableOpacity
                  style={[styles.editBtn, { backgroundColor: palette.primaryNavy }]}
                  onPress={() => {
                    onClose();
                    onEdit && onEdit(transaction);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.editBtnText}>✏️ Edit Expense</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 26, 44, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '90%',
    ...AppTheme.Elevation.floatingBarShadow,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollArea: {
    maxHeight: 520,
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  categoryIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryEmoji: {
    fontSize: 28,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  amountDisplay: {
    fontSize: 32,
    fontWeight: '800',
    marginVertical: 4,
  },
  txTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  detailsCard: {
    borderRadius: 18,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    ...AppTheme.Elevation.softShadow,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    maxWidth: '60%',
    textAlign: 'right',
  },
  infoValueMuted: {
    fontSize: 11,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  receiptCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    ...AppTheme.Elevation.softShadow,
  },
  receiptSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  receiptImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  receiptHint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    marginBottom: 10,
  },
  closeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  editBtn: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  editBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
