import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { AppTheme, ThemeMode } from '../theme/AppTheme';
import { StackedWalletCard } from '../components/StackedWalletCard';
import { QuickActionDock } from '../components/QuickActionDock';
import { TransactionItem } from '../components/TransactionItem';
import { SwipeableRow } from '../components/SwipeableRow';
import {
  TransferAndActionModal,
  QuickModalMode,
} from '../components/TransferAndActionModal';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { BorrowingsModal } from '../components/BorrowingsModal';
import { TransactionDetailsModal } from '../components/TransactionDetailsModal';
import {
  WalletModel,
  TransactionModel,
  CategoryModel,
  BorrowingModel,
  UserProfileModel,
} from '../types';
import { FileStoreService } from '../services/FileStoreService';
import { SecurityService } from '../security/SecurityService';
import { FinancialQuotesService } from '../services/FinancialQuotesService';

interface HomeScreenProps {
  themeMode?: ThemeMode;
  currencySymbol?: string;
  onNavigateToBudgets: () => void;
  onNavigateToAnalytics: () => void;
  onNavigateToProfile?: () => void;
  onOpenAddExpense: () => void;
  onWalletsChanged?: () => void;
}

interface HomeScreenState {
  wallets: WalletModel[];
  categories: CategoryModel[];
  transactions: TransactionModel[];
  borrowings: BorrowingModel[];
  userProfile: UserProfileModel;
  totalBalance: number;
  totalCreditDue: number;
  isPrivacyMode: boolean;
  refreshing: boolean;
  quickModalMode: QuickModalMode;
  selectedCardForAction: WalletModel | null;
  isBorrowingsModalOpen: boolean;
  editingTransaction: TransactionModel | null;
  viewingTransaction: TransactionModel | null;
  unreadNotifications: number;
  dailyQuote: string;
}

export class HomeScreen extends React.Component<HomeScreenProps, HomeScreenState> {
  private fileStore = FileStoreService.getInstance();

  constructor(props: HomeScreenProps) {
    super(props);
    this.state = {
      wallets: [],
      categories: [],
      transactions: [],
      borrowings: [],
      userProfile: new UserProfileModel(),
      totalBalance: 0,
      totalCreditDue: 0,
      isPrivacyMode: true,
      refreshing: false,
      quickModalMode: null,
      selectedCardForAction: null,
      isBorrowingsModalOpen: false,
      editingTransaction: null,
      viewingTransaction: null,
      unreadNotifications: 0,
      dailyQuote: FinancialQuotesService.getRandomQuote(),
    };
  }

  public componentDidMount(): void {
    this.loadDashboardData();
  }

  public async loadDashboardData(): Promise<void> {
    const wallets = await this.fileStore.getWallets();
    const categories = await this.fileStore.getCategories();
    const transactions = await this.fileStore.getTransactions();
    const borrowings = await this.fileStore.getBorrowings();
    const userProfile = await this.fileStore.getUserProfile();
    const totalBalance = await this.fileStore.getTotalBalance();
    const totalCreditDue = await this.fileStore.getTotalCreditDue();

    const upcomingDuesCount = borrowings.filter(
      (b) => !b.isSettled && new Date(b.estimatedPaymentDate).getTime() - Date.now() < 7 * 86400000
    ).length;

    this.setState({
      wallets,
      categories,
      transactions,
      borrowings,
      userProfile,
      totalBalance,
      totalCreditDue,
      unreadNotifications: upcomingDuesCount,
      refreshing: false,
    });
  }

  private handleRefresh = (): void => {
    this.setState(
      { refreshing: true, dailyQuote: FinancialQuotesService.getRandomQuote() },
      () => this.loadDashboardData()
    );
  };

  private togglePrivacyMode = async (): Promise<void> => {
    if (this.state.isPrivacyMode) {
      const authenticated = await SecurityService.authenticateBiometric();
      if (!authenticated) {
        Alert.alert(
          'Security Lock',
          'Biometric or device PIN required to reveal balances.'
        );
        return;
      }
    }
    this.setState((prev) => ({ isPrivacyMode: !prev.isPrivacyMode }));
  };

  private handleSwapPrimaryWallet = async (walletId: string): Promise<void> => {
    await this.fileStore.setPrimaryWallet(walletId);
    await this.loadDashboardData();
    if (this.props.onWalletsChanged) {
      this.props.onWalletsChanged();
    }
  };

  private handleAddWallet = async (wallet: WalletModel): Promise<void> => {
    await this.fileStore.addWallet(wallet);
    await this.loadDashboardData();
    if (this.props.onWalletsChanged) {
      this.props.onWalletsChanged();
    }
  };

  private handleDeleteWallet = async (walletId: string): Promise<void> => {
    await this.fileStore.deleteWallet(walletId);
    await this.loadDashboardData();
    if (this.props.onWalletsChanged) {
      this.props.onWalletsChanged();
    }
  };

  private handleExecuteQuickTransaction = async (tx: TransactionModel): Promise<void> => {
    await this.fileStore.addTransaction(tx);
    await this.loadDashboardData();
    if (this.props.onWalletsChanged) {
      this.props.onWalletsChanged();
    }
  };

  private handleSettleCreditCard = async (
    cardId: string,
    sourceWalletId: string,
    amount: number
  ): Promise<void> => {
    await this.fileStore.settleCreditCard(cardId, sourceWalletId, amount);
    await this.loadDashboardData();
    if (this.props.onWalletsChanged) {
      this.props.onWalletsChanged();
    }
  };

  private handleCardLongPress = (wallet: WalletModel): void => {
    const currency = this.props.currencySymbol || this.state.userProfile.currencySymbol || '₹';
    if (wallet.type === 'CREDIT_CARD') {
      Alert.alert(
        wallet.name,
        `Credit Limit: ${currency}${((wallet.creditLimit || wallet.balance) || 0).toLocaleString('en-IN')}\nAvailable: ${currency}${(wallet.balance || 0).toLocaleString('en-IN')}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: '⇄ Transfer Funds',
            onPress: () =>
              this.setState({ selectedCardForAction: wallet, quickModalMode: 'TRANSFER' }),
          },
          {
            text: '💳 Settle / Pay Bill',
            onPress: () =>
              this.setState({ selectedCardForAction: wallet, quickModalMode: 'SETTLE' }),
          },
        ]
      );
    } else {
      this.setState({ selectedCardForAction: wallet, quickModalMode: 'TRANSFER' });
    }
  };

  private handleDeleteTransaction = async (txId: string): Promise<void> => {
    await this.fileStore.deleteTransaction(txId);
    await this.loadDashboardData();
    if (this.props.onWalletsChanged) {
      this.props.onWalletsChanged();
    }
  };

  private handleEditTransaction = (tx: TransactionModel): void => {
    this.setState({ editingTransaction: tx });
  };

  private handleSaveEditedTransaction = async (updatedTx: TransactionModel): Promise<void> => {
    await this.fileStore.updateTransaction(updatedTx);
    this.setState({ editingTransaction: null });
    await this.loadDashboardData();
    if (this.props.onWalletsChanged) {
      this.props.onWalletsChanged();
    }
  };

  private handleNotificationPress = async (): Promise<void> => {
    const { borrowings, userProfile } = this.state;
    const currency = this.props.currencySymbol || userProfile.currencySymbol || '₹';
    const pendingDues = borrowings.filter((b) => !b.isSettled);
    this.setState({ unreadNotifications: 0 });

    let dueDetails = 'No upcoming dues.';
    if (pendingDues.length > 0) {
      dueDetails = pendingDues
        .slice(0, 3)
        .map(
          (b) =>
            `• ${b.personName}: ${currency}${(b.amount || 0).toLocaleString('en-IN')} (${b.type === 'BORROWED' ? 'To Return' : 'To Receive'}) due ${b.estimatedPaymentDate.split('T')[0]}`
        )
        .join('\n');
    }

    Alert.alert(
      'Notifications & Reminders',
      `${dueDetails}\n\nTap "Dues" on dashboard to manage all payment schedules.`,
      [
        { text: 'Close', style: 'cancel' },
        { text: 'View Dues', onPress: () => this.setState({ isBorrowingsModalOpen: true }) },
      ]
    );
  };

  public render(): React.ReactNode {
    const {
      wallets,
      categories,
      transactions,
      borrowings,
      userProfile,
      totalBalance,
      totalCreditDue,
      isPrivacyMode,
      refreshing,
      quickModalMode,
      selectedCardForAction,
      isBorrowingsModalOpen,
      editingTransaction,
      viewingTransaction,
      unreadNotifications,
    } = this.state;

    const currentTheme = this.props.themeMode || userProfile.themeMode || AppTheme.currentMode;
    const palette = AppTheme.getPalette(currentTheme);
    const currency = this.props.currencySymbol || userProfile.currencySymbol || '₹';
    const pendingDuesCount = borrowings.filter((b) => !b.isSettled).length;

    return (
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={this.handleRefresh}
              tintColor={palette.primaryNavy}
            />
          }
        >
          {/* User Greeting Header (Dynamic Profile Details) */}
          <View style={styles.greetingHeader}>
            <View>
              <Text style={[styles.greetingSubtitle, { color: palette.textSecondary }]}>Good evening,</Text>
              <Text style={[styles.greetingTitle, { color: palette.textPrimary }]}>{userProfile.name || 'Sahil'} 👋</Text>
            </View>

            <View style={styles.headerRightControls}>
              {/* Notification Bell */}
              <TouchableOpacity
                style={[styles.bellButton, { backgroundColor: palette.cardBackground, borderColor: palette.borderLight }]}
                onPress={this.handleNotificationPress}
                activeOpacity={0.8}
              >
                <Text style={styles.bellIcon}>🔔</Text>
                {unreadNotifications > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.badgeNumber}>{unreadNotifications}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* User Avatar */}
              <TouchableOpacity
                style={[styles.avatarCircle, { backgroundColor: palette.cardBackground, borderColor: palette.borderLight }]}
                onPress={this.props.onNavigateToProfile}
                activeOpacity={0.8}
              >
                <Text style={styles.avatarEmoji}>{userProfile.avatarEmoji || '🧔🏽'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Daily Financial Quote (Centered, Small, Italic, Inside Quotation, High Contrast) */}
          <View style={styles.quoteContainer}>
            <Text
              style={[
                styles.quoteText,
                { color: currentTheme === 'dark' ? '#94A3B8' : '#475569' },
              ]}
            >
              {this.state.dailyQuote}
            </Text>
          </View>

          {/* Dual Stat Balance Section: Available vs Credit to Pay */}
          <View style={styles.dualBalanceContainer}>
            {/* Left Card: Total Available Balance */}
            <View
              style={[
                styles.balanceStatCard,
                {
                  backgroundColor: palette.cardBackground,
                  borderColor: palette.borderLight,
                },
              ]}
            >
              <View style={styles.statCardHeader}>
                <Text style={[styles.statCardLabel, { color: palette.textSecondary }]}>
                  Available Balance
                </Text>
                <TouchableOpacity
                  onPress={this.togglePrivacyMode}
                  style={[styles.miniEyeBtn, { backgroundColor: palette.pillBackground }]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.miniEyeIcon}>{isPrivacyMode ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
              <Text
                style={[
                  styles.statCardAmount,
                  { color: currentTheme === 'dark' ? '#38BDF8' : palette.primaryNavy },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {SecurityService.formatMaskedAmount(totalBalance, isPrivacyMode, currency)}
              </Text>
              <Text style={[styles.statCardFootnote, { color: palette.transportGreen }]}>
                Liquid & Savings
              </Text>
            </View>

            {/* Right Card: Total Credit to be Paid */}
            <TouchableOpacity
              style={[
                styles.balanceStatCard,
                {
                  backgroundColor: palette.cardBackground,
                  borderColor: palette.borderLight,
                },
              ]}
              onPress={() => this.setState({ isBorrowingsModalOpen: true })}
              activeOpacity={0.8}
            >
              <View style={styles.statCardHeader}>
                <Text style={[styles.statCardLabel, { color: palette.textSecondary }]}>
                  Credit to Pay
                </Text>
                <View
                  style={[
                    styles.dueDotBadge,
                    { backgroundColor: totalCreditDue > 0 ? '#FF4D4F' : '#52C41A' },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.statCardAmount,
                  { color: totalCreditDue > 0 ? '#FF5757' : palette.textPrimary },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {SecurityService.formatMaskedAmount(totalCreditDue, isPrivacyMode, currency)}
              </Text>
              <Text style={[styles.statCardFootnote, { color: palette.textMuted }]}>
                Cards & Borrowings
              </Text>
            </TouchableOpacity>
          </View>

          {/* Clean Quick Action Dock (Dues, Transfer, Cards) */}
          <QuickActionDock
            themeMode={currentTheme}
            onPressBorrowings={() => this.setState({ isBorrowingsModalOpen: true })}
            onPressTransfer={() =>
              this.setState({
                selectedCardForAction: wallets[0] || null,
                quickModalMode: 'TRANSFER',
              })
            }
            onPressWallets={() => this.setState({ quickModalMode: 'WALLETS' })}
            dueCount={pendingDuesCount}
          />

          {/* Stacked Cards Carousel (Decoupled from mutation, smooth pagination) */}
          <StackedWalletCard
            wallets={wallets}
            isPrivacyMode={isPrivacyMode}
            currencySymbol={currency}
            themeMode={currentTheme}
            onTogglePrivacy={this.togglePrivacyMode}
            onManageWallets={() => this.setState({ quickModalMode: 'WALLETS' })}
            onLongPressCard={this.handleCardLongPress}
          />

          {/* Latest Transactions Section */}
          <View style={styles.transactionsHeaderRow}>
            <View>
              <Text style={[styles.sectionHeading, { color: palette.textPrimary }]}>Latest Transactions</Text>
              <Text style={[styles.swipeHintSubtitle, { color: palette.textSecondary }]}>
                Swipe right to delete • Swipe left to edit
              </Text>
            </View>
            <TouchableOpacity
              onPress={this.props.onNavigateToAnalytics}
              activeOpacity={0.7}
            >
              <Text style={[styles.seeAllText, { color: palette.vehicleBlue }]}>See all</Text>
            </TouchableOpacity>
          </View>

          {/* Transactions List with Swipe Actions (Delete on Right, Edit on Left) */}
          <View style={styles.transactionsList}>
            {transactions.slice(0, 8).map((tx) => (
              <SwipeableRow
                key={tx.id}
                onDelete={() => this.handleDeleteTransaction(tx.id)}
                onEdit={() => this.handleEditTransaction(tx)}
                deleteConfirmTitle="Delete Transaction"
                deleteConfirmMessage={`Are you sure you want to remove "${tx.title}" of ${currency}${tx.amount.toLocaleString('en-IN')}?`}
              >
                <TransactionItem
                  transaction={tx}
                  currencySymbol={currency}
                  themeMode={currentTheme}
                  onPress={(item) => this.setState({ viewingTransaction: item })}
                />
              </SwipeableRow>
            ))}
          </View>
        </ScrollView>

        {/* Transfer & Card Settlement Modal */}
        <TransferAndActionModal
          visible={quickModalMode !== null}
          mode={quickModalMode}
          sourceWallet={selectedCardForAction}
          wallets={wallets}
          categories={categories}
          currencySymbol={currency}
          themeMode={currentTheme}
          onClose={() =>
            this.setState({ quickModalMode: null, selectedCardForAction: null })
          }
          onExecuteTransaction={this.handleExecuteQuickTransaction}
          onSettleCreditCard={this.handleSettleCreditCard}
          onSelectPrimaryWallet={this.handleSwapPrimaryWallet}
          onAddWallet={this.handleAddWallet}
          onDeleteWallet={this.handleDeleteWallet}
        />

        {/* Borrowings & Dues Tracker Modal */}
        <BorrowingsModal
          visible={isBorrowingsModalOpen}
          borrowings={borrowings}
          currencySymbol={currency}
          themeMode={currentTheme}
          onClose={() => this.setState({ isBorrowingsModalOpen: false })}
          onAddBorrowing={async (item) => {
            await this.fileStore.addBorrowing(item);
            await this.loadDashboardData();
          }}
          onUpdateBorrowing={async (item) => {
            await this.fileStore.updateBorrowing(item);
            await this.loadDashboardData();
          }}
          onDeleteBorrowing={async (id) => {
            await this.fileStore.deleteBorrowing(id);
            await this.loadDashboardData();
          }}
          onSettleBorrowing={async (id) => {
            await this.fileStore.settleBorrowing(id);
            await this.loadDashboardData();
          }}
        />

        {/* View Transaction Details Modal (Triggered on Tap) */}
        <TransactionDetailsModal
          visible={viewingTransaction !== null}
          transaction={viewingTransaction}
          categories={categories}
          wallets={wallets}
          currencySymbol={currency}
          themeMode={currentTheme}
          onClose={() => this.setState({ viewingTransaction: null })}
          onEdit={(tx) => this.setState({ editingTransaction: tx, viewingTransaction: null })}
        />

        {/* Edit Transaction Modal (Triggered on Swipe Left) */}
        {editingTransaction && (
          <AddExpenseModal
            key={`edit-tx-${editingTransaction.id}`}
            visible={Boolean(editingTransaction)}
            categories={categories}
            wallets={wallets}
            currencySymbol={currency}
            themeMode={currentTheme}
            initialTransaction={editingTransaction}
            onClose={() => this.setState({ editingTransaction: null })}
            onSave={this.handleSaveEditedTransaction}
          />
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.Colors.background,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  greetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 12,
    marginBottom: 8,
  },
  quoteContainer: {
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quoteText: {
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: AppTheme.Colors.textSecondary,
    fontWeight: '500',
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: AppTheme.Colors.primaryNavy,
    marginTop: 2,
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    position: 'relative',
    ...AppTheme.Elevation.softShadow,
  },
  bellIcon: {
    fontSize: 18,
  },
  notificationBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#FF4D4F',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeNumber: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F4F9',
    alignItems: 'center',
    justifyContent: 'center',
    ...AppTheme.Elevation.softShadow,
  },
  avatarEmoji: {
    fontSize: 22,
  },
  dualBalanceContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginVertical: 10,
  },
  balanceStatCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    ...AppTheme.Elevation.softShadow,
    justifyContent: 'space-between',
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statCardLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  miniEyeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniEyeIcon: {
    fontSize: 12,
  },
  dueDotBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statCardAmount: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  statCardFootnote: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  transactionsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 22,
    marginTop: 18,
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: AppTheme.Colors.primaryNavy,
  },
  swipeHintSubtitle: {
    fontSize: 11,
    color: AppTheme.Colors.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppTheme.Colors.vehicleBlue,
  },
  transactionsList: {
    marginTop: 4,
  },
});
