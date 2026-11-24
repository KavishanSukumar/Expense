import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { AppTheme, ThemeMode } from '../theme/AppTheme';
import { FileStoreService, CategoryBreakdownItem } from '../services/FileStoreService';
import { TransactionModel, BudgetModel, WalletModel, CategoryModel } from '../types';
import { TransactionItem } from '../components/TransactionItem';
import { SwipeableRow } from '../components/SwipeableRow';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { TransactionDetailsModal } from '../components/TransactionDetailsModal';

interface AnalyticsScreenProps {
  themeMode?: ThemeMode;
  currencySymbol?: string;
  onNavigateHome: () => void;
  onTransactionsChanged?: () => void;
}

interface AnalyticsScreenState {
  availableMonths: string[];
  monthIndex: number;
  currentMonth: string;
  analyticsMode: 'EXPENSE' | 'INCOME';
  totalIncomeEarned: number;
  budget: BudgetModel;
  categoryBreakdown: CategoryBreakdownItem[];
  transactions: TransactionModel[];
  wallets: WalletModel[];
  categories: CategoryModel[];
  selectedCategoryId: string;
  editingTransaction: TransactionModel | null;
  viewingTransaction: TransactionModel | null;
  currencySymbol: string;
}

export class AnalyticsScreen extends React.Component<
  AnalyticsScreenProps,
  AnalyticsScreenState
> {
  private fileStore = FileStoreService.getInstance();

  constructor(props: AnalyticsScreenProps) {
    super(props);
    const initialMonth = FileStoreService.getCurrentMonthKey();
    this.state = {
      availableMonths: [initialMonth],
      monthIndex: 0,
      currentMonth: initialMonth,
      analyticsMode: 'EXPENSE',
      totalIncomeEarned: 0,
      budget: new BudgetModel('b-curr', initialMonth, 25000, 0),
      categoryBreakdown: [],
      transactions: [],
      wallets: [],
      categories: [],
      selectedCategoryId: 'ALL',
      editingTransaction: null,
      viewingTransaction: null,
      currencySymbol: '₹',
    };
  }

  public async componentDidMount(): Promise<void> {
    const currentMonthKey = FileStoreService.getCurrentMonthKey();
    await this.loadAnalyticsData(currentMonthKey);
  }

  public resetToCurrentMonth = async (): Promise<void> => {
    const currentMonthKey = FileStoreService.getCurrentMonthKey();
    this.setState({ selectedCategoryId: 'ALL' });
    await this.loadAnalyticsData(currentMonthKey);
  };

  public async loadAnalyticsData(targetMonthKey?: string): Promise<void> {
    const availableMonths = await this.fileStore.getAvailableMonths();
    const desiredMonth =
      targetMonthKey || this.state.currentMonth || FileStoreService.getCurrentMonthKey();
    let safeIndex = availableMonths.indexOf(desiredMonth);
    if (safeIndex === -1) {
      const fallbackCurrent = FileStoreService.getCurrentMonthKey();
      safeIndex = availableMonths.indexOf(fallbackCurrent);
      if (safeIndex === -1) {
        safeIndex = Math.min(this.state.monthIndex, Math.max(0, availableMonths.length - 1));
      }
    }
    const currentMonth = availableMonths[safeIndex] || FileStoreService.getCurrentMonthKey();

    const budget = await this.fileStore.getBudget(currentMonth);
    const categoryBreakdown =
      this.state.analyticsMode === 'INCOME'
        ? await this.fileStore.getIncomeCategoryBreakdown(currentMonth)
        : await this.fileStore.getCategoryBreakdown(currentMonth);

    const monthTransactions = await this.fileStore.getTransactionsByMonth(currentMonth);
    const modeTransactions = monthTransactions.filter((tx) => tx.type === this.state.analyticsMode);
    const totalIncomeEarned = monthTransactions
      .filter((tx) => tx.type === 'INCOME')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const filteredTx =
      this.state.selectedCategoryId === 'ALL'
        ? modeTransactions
        : modeTransactions.filter((tx) => tx.categoryId === this.state.selectedCategoryId);

    const wallets = await this.fileStore.getWallets();
    const categories = await this.fileStore.getCategories();
    const userProfile = await this.fileStore.getUserProfile();

    this.setState({
      availableMonths,
      monthIndex: safeIndex,
      currentMonth,
      totalIncomeEarned,
      budget,
      categoryBreakdown,
      transactions: filteredTx,
      wallets,
      categories,
      currencySymbol: userProfile.currencySymbol || '₹',
    });
  }

  private handleChangeMonth = (direction: number): void => {
    const { monthIndex, availableMonths } = this.state;
    const nextIdx = monthIndex + direction;
    if (nextIdx < 0 || nextIdx >= availableMonths.length) return;
    const nextMonth = availableMonths[nextIdx];
    this.setState({ monthIndex: nextIdx, currentMonth: nextMonth, selectedCategoryId: 'ALL' }, () => {
      this.loadAnalyticsData(nextMonth);
    });
  };

  private handleChangeAnalyticsMode = (mode: 'EXPENSE' | 'INCOME'): void => {
    this.setState({ analyticsMode: mode, selectedCategoryId: 'ALL' }, () => {
      this.loadAnalyticsData();
    });
  };

  private handleSelectCategoryFilter = (catId: string): void => {
    this.setState({ selectedCategoryId: catId }, () => {
      this.loadAnalyticsData();
    });
  };

  private handleDeleteTransaction = async (txId: string): Promise<void> => {
    await this.fileStore.deleteTransaction(txId);
    await this.loadAnalyticsData();
    if (this.props.onTransactionsChanged) {
      this.props.onTransactionsChanged();
    }
  };

  private handleSaveEditedTransaction = async (tx: TransactionModel): Promise<void> => {
    await this.fileStore.updateTransaction(tx);
    this.setState({ editingTransaction: null });
    await this.loadAnalyticsData();
    if (this.props.onTransactionsChanged) {
      this.props.onTransactionsChanged();
    }
  };

  private handleInspectTransaction = (tx: TransactionModel): void => {
    this.setState({ viewingTransaction: tx });
  };

  public render(): React.ReactNode {
    const {
      availableMonths,
      monthIndex,
      currentMonth,
      analyticsMode,
      totalIncomeEarned,
      budget,
      categoryBreakdown,
      transactions,
      wallets,
      categories,
      selectedCategoryId,
      editingTransaction,
      viewingTransaction,
    } = this.state;

    const currentTheme = this.props.themeMode || AppTheme.currentMode;
    const palette = AppTheme.getPalette(currentTheme);
    const currency = this.props.currencySymbol || this.state.currencySymbol || '₹';

    const daysInMonth = FileStoreService.getDaysInMonth(currentMonth);
    const dailyBurnRate = (budget.spentAmount / daysInMonth).toFixed(2);
    const dailyTargetLimit = (budget.totalBudget / daysInMonth).toFixed(2);
    const isWithinLimit = budget.spentAmount <= budget.totalBudget;

    return (
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Financial Analytics</Text>
            <Text style={[styles.headerSubtitle, { color: palette.textSecondary }]}>
              Ledger insights & category breakdowns
            </Text>
          </View>

          {/* Dynamic Month Selector Bar */}
          <View style={[styles.monthNavRow, { backgroundColor: palette.cardBackground, borderColor: palette.borderLight }]}>
            <TouchableOpacity
              onPress={() => this.handleChangeMonth(1)}
              style={[styles.monthArrowBtn, { backgroundColor: palette.pillBackground }]}
              disabled={monthIndex >= availableMonths.length - 1}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.monthArrowText,
                  { color: monthIndex >= availableMonths.length - 1 ? palette.textMuted : palette.textPrimary },
                ]}
              >
                ‹
              </Text>
            </TouchableOpacity>

            <View style={styles.monthCenterCol}>
              <Text style={[styles.monthTitleText, { color: palette.textPrimary }]}>
                {currentMonth}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => this.handleChangeMonth(-1)}
              style={[styles.monthArrowBtn, { backgroundColor: palette.pillBackground }]}
              disabled={monthIndex <= 0}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.monthArrowText,
                  { color: monthIndex <= 0 ? palette.textMuted : palette.textPrimary },
                ]}
              >
                ›
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mode Switcher: Expenses vs Income */}
          <View style={[styles.modeToggleRow, { backgroundColor: palette.cardBackground, borderColor: palette.borderLight }]}>
            <TouchableOpacity
              style={[
                styles.modeToggleBtn,
                analyticsMode === 'EXPENSE' && [styles.modeToggleActiveExpense, { backgroundColor: '#FF4D4F' }],
              ]}
              onPress={() => this.handleChangeAnalyticsMode('EXPENSE')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.modeToggleText,
                  analyticsMode === 'EXPENSE'
                    ? { color: '#FFFFFF', fontWeight: '700' }
                    : { color: palette.textSecondary },
                ]}
              >
                - Expenses
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeToggleBtn,
                analyticsMode === 'INCOME' && [styles.modeToggleActiveIncome, { backgroundColor: '#52C41A' }],
              ]}
              onPress={() => this.handleChangeAnalyticsMode('INCOME')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.modeToggleText,
                  analyticsMode === 'INCOME'
                    ? { color: '#FFFFFF', fontWeight: '700' }
                    : { color: palette.textSecondary },
                ]}
              >
                + Income
              </Text>
            </TouchableOpacity>
          </View>

          {/* Highlights Card */}
          <View style={[styles.highlightCard, { backgroundColor: currentTheme === 'dark' ? '#131F33' : '#162238' }]}>
            <Text style={styles.highlightLabel}>
              {analyticsMode === 'EXPENSE' ? `Total Expenses (${currentMonth})` : `Total Income Received (${currentMonth})`}
            </Text>
            <Text style={styles.highlightAmount}>
              {currency} {analyticsMode === 'EXPENSE' ? budget.spentAmount.toLocaleString('en-IN') : totalIncomeEarned.toLocaleString('en-IN')}
            </Text>
            <Text
              style={[
                styles.highlightSub,
                analyticsMode === 'EXPENSE' && !isWithinLimit && { color: AppTheme.Colors.healthRed },
              ]}
            >
              {analyticsMode === 'EXPENSE'
                ? `Daily burn rate: ${currency} ${dailyBurnRate} / day (${isWithinLimit ? 'Well below' : 'Exceeds'} ${currency} ${dailyTargetLimit} target)`
                : `Active across ${categoryBreakdown.filter((c) => c.amount > 0).length} income categories`}
            </Text>
          </View>

          {/* Category Breakdown Bars */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeader, { color: palette.textMuted }]}>
              {analyticsMode === 'EXPENSE' ? 'SPENDING BY CATEGORY (TAP TO FILTER)' : 'INCOME BY CATEGORY (TAP TO FILTER)'}
            </Text>
            {selectedCategoryId !== 'ALL' && (
              <TouchableOpacity onPress={() => this.handleSelectCategoryFilter('ALL')}>
                <Text style={[styles.clearFilterText, { color: palette.vehicleBlue }]}>Reset filter</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.categoryCard, { backgroundColor: palette.cardBackground, borderColor: palette.borderLight }]}>
            {categoryBreakdown.length === 0 ? (
              <Text style={[styles.emptyText, { color: palette.textSecondary, padding: 16 }]}>
                No categories available.
              </Text>
            ) : (
              categoryBreakdown.map((item) => {
                const isSelected = selectedCategoryId === item.category.id;
                return (
                  <TouchableOpacity
                    key={item.category.id}
                    style={[styles.catRow, isSelected && [styles.catRowActive, { backgroundColor: palette.pillBackground }]]}
                    onPress={() => this.handleSelectCategoryFilter(item.category.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.catHeader}>
                      <Text style={[styles.catName, { color: palette.textPrimary }]}>{item.category.name}</Text>
                      <Text style={[styles.catPercent, { color: palette.textSecondary }]}>
                        {currency} {item.amount.toLocaleString('en-IN')} ({item.percentage}%)
                      </Text>
                    </View>
                    <View style={[styles.barTrack, { backgroundColor: palette.borderLight }]}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${Math.min(100, item.percentage)}%`,
                            backgroundColor: item.category.colorHex,
                          },
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Filtered Transactions List */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeader, { color: palette.textMuted }]}>
              {selectedCategoryId === 'ALL'
                ? `${analyticsMode === 'EXPENSE' ? 'EXPENSE' : 'INCOME'} TRANSACTIONS (${transactions.length})`
                : `FILTERED TRANSACTIONS (${transactions.length})`}
            </Text>
          </View>

          <View style={styles.txListContainer}>
            {transactions.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: palette.cardBackground, borderColor: palette.borderLight }]}>
                <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
                  No {analyticsMode.toLowerCase()} transactions recorded in {currentMonth}.
                </Text>
              </View>
            ) : (
              transactions.map((tx) => (
                <SwipeableRow
                  key={tx.id}
                  onDelete={() => this.handleDeleteTransaction(tx.id)}
                  onEdit={() => this.setState({ editingTransaction: tx })}
                  deleteConfirmTitle="Delete Transaction"
                  deleteConfirmMessage={`Are you sure you want to remove "${tx.title}" of ${currency}${tx.amount.toLocaleString('en-IN')}?`}
                >
                  <TransactionItem
                    transaction={tx}
                    currencySymbol={currency}
                    themeMode={currentTheme}
                    onPress={this.handleInspectTransaction}
                  />
                </SwipeableRow>
              ))
            )}
          </View>
        </ScrollView>

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

        {/* Edit Expense Modal (Triggered on Swipe Left) */}
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
  },
  scrollContent: {
    paddingBottom: 120,
    paddingTop: 16,
  },
  headerRow: {
    marginBottom: 20,
    paddingHorizontal: 22,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  highlightCard: {
    borderRadius: 22,
    padding: 22,
    marginHorizontal: 22,
    ...AppTheme.Elevation.cardShadow,
    marginBottom: 24,
  },
  highlightLabel: {
    fontSize: 13,
    color: '#A0B2CD',
    fontWeight: '500',
  },
  highlightAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: 8,
  },
  highlightSub: {
    fontSize: 12,
    color: '#2AC769',
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryCard: {
    marginHorizontal: 22,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    ...AppTheme.Elevation.softShadow,
    marginBottom: 24,
  },
  catRow: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 6,
  },
  catRowActive: {
    borderRadius: 12,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  catName: {
    fontSize: 14,
    fontWeight: '600',
  },
  catPercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  txListContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyContainer: {
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 22,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    ...AppTheme.Elevation.softShadow,
  },
  monthArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthArrowText: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: -2,
  },
  monthCenterCol: {
    alignItems: 'center',
  },
  monthTitleText: {
    fontSize: 16,
    fontWeight: '700',
  },
  monthSubText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  modeToggleRow: {
    flexDirection: 'row',
    marginHorizontal: 22,
    marginBottom: 16,
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    ...AppTheme.Elevation.softShadow,
  },
  modeToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  modeToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modeToggleActiveExpense: {
    ...AppTheme.Elevation.softShadow,
  },
  modeToggleActiveIncome: {
    ...AppTheme.Elevation.softShadow,
  },
});
