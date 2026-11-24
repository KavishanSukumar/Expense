import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { AppTheme, ThemeMode } from '../theme/AppTheme';
import { DonutGaugeChart } from '../components/DonutGaugeChart';
import { BudgetModel } from '../types';
import { FileStoreService, CategoryBreakdownItem } from '../services/FileStoreService';

interface BudgetsInsightsScreenProps {
  themeMode?: ThemeMode;
  currencySymbol?: string;
  onNavigateHome: () => void;
  onOpenAddExpense: () => void;
}

interface BudgetsInsightsScreenState {
  budget: BudgetModel;
  availableMonths: string[];
  currentMonthIndex: number;
  categoryBreakdown: CategoryBreakdownItem[];
  showFilterBar: boolean;
  selectedCategoryId: string;
  isEditBudgetModalOpen: boolean;
  budgetInputText: string;
  budgetError: string;
  currencySymbol: string;
}

export class BudgetsInsightsScreen extends React.Component<
  BudgetsInsightsScreenProps,
  BudgetsInsightsScreenState
> {
  private fileStore = FileStoreService.getInstance();

  constructor(props: BudgetsInsightsScreenProps) {
    super(props);
    const initialMonth = FileStoreService.getCurrentMonthKey();
    this.state = {
      budget: new BudgetModel('b-curr', initialMonth, 25000, 0),
      availableMonths: [initialMonth],
      currentMonthIndex: 0,
      categoryBreakdown: [],
      showFilterBar: false,
      selectedCategoryId: 'ALL',
      isEditBudgetModalOpen: false,
      budgetInputText: '25000',
      budgetError: '',
      currencySymbol: '₹',
    };
  }

  public componentDidMount(): void {
    const initialMonth = FileStoreService.getCurrentMonthKey();
    this.loadBudgetData(initialMonth);
  }

  private getCurrentMonthKey(): string {
    const { availableMonths, currentMonthIndex } = this.state;
    return availableMonths[currentMonthIndex] || FileStoreService.getCurrentMonthKey();
  }

  public async loadBudgetData(targetMonthKey?: string): Promise<void> {
    const availableMonths = await this.fileStore.getAvailableMonths();
    const desiredMonth =
      targetMonthKey || this.getCurrentMonthKey() || FileStoreService.getCurrentMonthKey();
    let safeIndex = availableMonths.indexOf(desiredMonth);
    if (safeIndex === -1) {
      const fallbackCurrent = FileStoreService.getCurrentMonthKey();
      safeIndex = availableMonths.indexOf(fallbackCurrent);
      if (safeIndex === -1) {
        safeIndex = Math.min(this.state.currentMonthIndex, Math.max(0, availableMonths.length - 1));
      }
    }
    const monthKey = availableMonths[safeIndex] || FileStoreService.getCurrentMonthKey();
    const budget = await this.fileStore.getBudget(monthKey);
    const categoryBreakdown = await this.fileStore.getCategoryBreakdown(monthKey);
    const userProfile = await this.fileStore.getUserProfile();
    this.setState({
      availableMonths,
      currentMonthIndex: safeIndex,
      budget,
      categoryBreakdown,
      budgetInputText: budget.totalBudget.toString(),
      currencySymbol: userProfile.currencySymbol || '₹',
    });
  }

  private handleChangeMonth = (direction: -1 | 1): void => {
    const { availableMonths, currentMonthIndex } = this.state;
    const nextIdx = currentMonthIndex + direction;
    if (nextIdx < 0 || nextIdx >= availableMonths.length) {
      return;
    }
    const nextMonth = availableMonths[nextIdx];
    this.setState({ currentMonthIndex: nextIdx, selectedCategoryId: 'ALL' }, () => {
      this.loadBudgetData(nextMonth);
    });
  };

  private handleOpenEditBudget = (): void => {
    this.setState({
      isEditBudgetModalOpen: true,
      budgetInputText: this.state.budget.totalBudget.toString(),
      budgetError: '',
    });
  };

  private handleSaveBudgetLimit = async (): Promise<void> => {
    const num = parseFloat(this.state.budgetInputText);
    if (!Number.isFinite(num) || num <= 0 || num > 100000000) {
      this.setState({
        budgetError: 'Please enter a valid monthly budget greater than ₹0.',
      });
      return;
    }
    const monthKey = this.getCurrentMonthKey();
    await this.fileStore.updateBudget(monthKey, num);
    this.setState({ isEditBudgetModalOpen: false, budgetError: '' });
    await this.loadBudgetData();
  };

  private handleInspectCategory = (categoryId: string): void => {
    const found = this.state.categoryBreakdown.find(
      (item) => item.category.id === categoryId
    );
    if (!found) {
      Alert.alert('Category Breakdown', 'No spending recorded in this category yet.');
      return;
    }

    const budgetShare =
      this.state.budget.totalBudget > 0
        ? Math.round((found.amount / this.state.budget.totalBudget) * 100)
        : 0;

    const currency = this.props.currencySymbol || this.state.currencySymbol || '₹';
    Alert.alert(
      `${found.category.name}`,
      `Spent in ${this.getCurrentMonthKey()}: ${currency}${found.amount.toLocaleString('en-IN')}\n` +
        `Share of Total Spend: ${found.percentage}%\n` +
        `Share of Monthly Budget: ${budgetShare}%\n` +
        `Transactions: ${found.transactionCount}`
    );
  };

  public render(): React.ReactNode {
    const {
      budget,
      currentMonthIndex,
      categoryBreakdown,
      showFilterBar,
      selectedCategoryId,
      isEditBudgetModalOpen,
      budgetInputText,
      budgetError,
    } = this.state;

    const currentMonth = this.getCurrentMonthKey();
    const canGoPrev = currentMonthIndex > 0;
    const canGoNext = currentMonthIndex < this.state.availableMonths.length - 1;

    const filteredBreakdown =
      selectedCategoryId === 'ALL'
        ? categoryBreakdown
        : categoryBreakdown.filter((item) => item.category.id === selectedCategoryId);

    const displayedSpent =
      selectedCategoryId === 'ALL'
        ? budget.spentAmount
        : filteredBreakdown.reduce((sum, item) => sum + item.amount, 0);

    const displayedPercentage =
      budget.totalBudget > 0
        ? Math.min(100, Math.round((displayedSpent / budget.totalBudget) * 100))
        : 0;

    const currentTheme = this.props.themeMode || AppTheme.currentMode;
    const palette = AppTheme.getPalette(currentTheme);
    const currency = this.props.currencySymbol || this.state.currencySymbol || '₹';

    return (
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header Row: Title, Subtitle, and Top-Right Action Buttons */}
          <View style={styles.headerRow}>
            <View style={styles.titleColumn}>
              <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Budgets & Insights</Text>
              <Text style={[styles.headerSubtitle, { color: palette.textSecondary }]}>Track limits, burn rate & forecasts</Text>
            </View>

            <View style={styles.topActionsRow}>
              {/* Slider Filter Button */}
              <TouchableOpacity
                style={[
                  styles.circleActionButton,
                  { backgroundColor: palette.cardBackground, borderColor: palette.borderLight },
                  showFilterBar && styles.circleActionButtonActive,
                ]}
                onPress={() =>
                  this.setState((prev) => ({
                    showFilterBar: !prev.showFilterBar,
                    selectedCategoryId: prev.showFilterBar ? 'ALL' : prev.selectedCategoryId,
                  }))
                }
                activeOpacity={0.7}
              >
                <Text style={styles.actionIcon}>🎚️</Text>
              </TouchableOpacity>

              {/* Edit Pencil Button */}
              <TouchableOpacity
                style={[styles.circleActionButton, { backgroundColor: palette.cardBackground, borderColor: palette.borderLight }]}
                onPress={this.handleOpenEditBudget}
                activeOpacity={0.7}
              >
                <Text style={styles.actionIcon}>✎</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Month Navigation Pill: < October 2026 > */}
          <View style={styles.monthPillWrapper}>
            <View style={[styles.monthPill, { backgroundColor: palette.pillBackground, borderColor: palette.borderLight }]}>
              <TouchableOpacity
                onPress={() => this.handleChangeMonth(-1)}
                disabled={!canGoPrev}
                activeOpacity={0.6}
                hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
              >
                <Text style={[styles.monthArrow, !canGoPrev && styles.monthArrowDisabled]}>
                  ‹
                </Text>
              </TouchableOpacity>
              <Text style={[styles.monthText, { color: palette.textPrimary }]}>{currentMonth}</Text>
              <TouchableOpacity
                onPress={() => this.handleChangeMonth(1)}
                disabled={!canGoNext}
                activeOpacity={0.6}
                hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
              >
                <Text style={[styles.monthArrow, !canGoNext && styles.monthArrowDisabled]}>
                  ›
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Optional Category Filter Bar */}
          {showFilterBar && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsRow}
            >
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { backgroundColor: palette.cardBackground, borderColor: palette.borderLight },
                  selectedCategoryId === 'ALL' && [styles.filterChipActive, { backgroundColor: palette.primaryNavy }],
                ]}
                onPress={() => this.setState({ selectedCategoryId: 'ALL' })}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: palette.textSecondary },
                    selectedCategoryId === 'ALL' && styles.filterChipTextActive,
                  ]}
                >
                  All Categories
                </Text>
              </TouchableOpacity>
              {categoryBreakdown.map((item) => {
                const active = selectedCategoryId === item.category.id;
                return (
                  <TouchableOpacity
                    key={item.category.id}
                    style={[
                      styles.filterChip,
                      { backgroundColor: palette.cardBackground, borderColor: palette.borderLight },
                      active && {
                        backgroundColor: item.category.colorHex,
                        borderColor: item.category.colorHex,
                      },
                    ]}
                    onPress={() => this.setState({ selectedCategoryId: item.category.id })}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: palette.textSecondary },
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {item.category.name} ({currency}{item.amount})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Main Card: Donut Gauge and Budget Overview */}
          <View style={[styles.mainCard, { backgroundColor: palette.cardBackground, borderColor: palette.borderLight }]}>
            <DonutGaugeChart
              spentPercentage={displayedPercentage}
              totalSpent={displayedSpent}
              totalBudget={budget.totalBudget}
              categoryBreakdown={filteredBreakdown}
              currencySymbol={currency}
              themeMode={currentTheme}
              onEditBudget={this.handleOpenEditBudget}
              onInspectCategory={this.handleInspectCategory}
            />
          </View>

          {/* Split Metric Cards: Spent vs Remaining */}
          <View style={styles.metricCardsRow}>
            {/* Left Card: Spent */}
            <View style={[styles.metricCard, styles.leftMetricCard, { backgroundColor: palette.cardBackground, borderColor: palette.borderLight }]}>
              <View style={styles.metricHeaderRow}>
                <View
                  style={[
                    styles.indicatorDot,
                    { backgroundColor: palette.primaryNavy },
                  ]}
                />
                <Text style={[styles.metricLabel, { color: palette.textSecondary }]}>Spent</Text>
              </View>
              <Text style={[styles.metricAmount, { color: palette.textPrimary }]}>
                {currency}{displayedSpent.toLocaleString('en-IN')}
              </Text>
            </View>

            {/* Right Card: Remaining */}
            <View style={[styles.metricCard, styles.rightMetricCard, { backgroundColor: palette.cardBackground, borderColor: palette.borderLight }]}>
              <View style={styles.metricHeaderRow}>
                <View
                  style={[
                    styles.indicatorDot,
                    { backgroundColor: palette.transportGreen },
                  ]}
                />
                <Text style={[styles.metricLabel, { color: palette.textSecondary }]}>Remaining</Text>
              </View>
              <Text style={[styles.metricAmount, { color: palette.textPrimary }]}>
                {currency}
                {Math.max(0, budget.totalBudget - displayedSpent).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Cross-Platform Edit Budget Limit Modal */}
        <Modal
          visible={isEditBudgetModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => this.setState({ isEditBudgetModalOpen: false })}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: palette.cardBackground }]}>
              <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Edit Budget Limit</Text>
              <Text style={[styles.modalSub, { color: palette.textSecondary }]}>
                Set your target monthly spending limit for {currentMonth} ({currency}):
              </Text>

              <TextInput
                style={[styles.budgetInput, { backgroundColor: palette.inputBackground, color: palette.textPrimary, borderColor: palette.borderLight }]}
                keyboardType="numeric"
                value={budgetInputText}
                onChangeText={(text) =>
                  this.setState({ budgetInputText: text, budgetError: '' })
                }
                placeholder="25000"
                placeholderTextColor={palette.textMuted}
              />

              {budgetError ? <Text style={styles.errorText}>{budgetError}</Text> : null}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: palette.pillBackground }]}
                  onPress={() => this.setState({ isEditBudgetModalOpen: false })}
                >
                  <Text style={[styles.cancelBtnText, { color: palette.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: currentTheme === 'dark' ? '#2563EB' : palette.primaryNavy }]}
                  onPress={this.handleSaveBudgetLimit}
                >
                  <Text style={styles.saveBtnText}>Save Budget</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    paddingTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 12,
    marginBottom: 6,
  },
  titleColumn: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: AppTheme.Colors.primaryNavy,
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: AppTheme.Colors.textSecondary,
    fontWeight: '400',
    marginTop: 3,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circleActionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    ...AppTheme.Elevation.softShadow,
    borderWidth: 1,
    borderColor: '#EEF2F8',
  },
  circleActionButtonActive: {
    borderColor: AppTheme.Colors.primaryNavy,
    backgroundColor: '#E8EFF9',
  },
  actionIcon: {
    fontSize: 14,
    color: AppTheme.Colors.primaryNavy,
  },
  monthPillWrapper: {
    alignItems: 'center',
    marginVertical: 16,
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 24,
    width: 240,
    ...AppTheme.Elevation.softShadow,
    borderWidth: 1,
    borderColor: '#EEF2F8',
  },
  monthArrow: {
    fontSize: 20,
    color: AppTheme.Colors.primaryNavy,
    fontWeight: '600',
    paddingHorizontal: 8,
  },
  monthArrowDisabled: {
    opacity: 0.25,
  },
  monthText: {
    fontSize: 14,
    fontWeight: '700',
    color: AppTheme.Colors.primaryNavy,
  },
  filterPillsRow: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: AppTheme.Colors.primaryNavy,
    borderColor: AppTheme.Colors.primaryNavy,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: AppTheme.Colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 28,
    padding: 16,
    ...AppTheme.Elevation.cardShadow,
    borderWidth: 1,
    borderColor: '#EEF2F8',
  },
  metricCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 16,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    flex: 1,
    borderRadius: 20,
    padding: 18,
    ...AppTheme.Elevation.softShadow,
    borderWidth: 1,
    borderColor: '#EEF2F8',
  },
  leftMetricCard: {
    marginRight: 8,
  },
  rightMetricCard: {
    marginLeft: 8,
  },
  metricHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  metricLabel: {
    fontSize: 13,
    color: AppTheme.Colors.textSecondary,
    fontWeight: '500',
  },
  metricAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: AppTheme.Colors.primaryNavy,
    letterSpacing: -0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 26, 44, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    ...AppTheme.Elevation.floatingBarShadow,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: AppTheme.Colors.primaryNavy,
  },
  modalSub: {
    fontSize: 13,
    color: AppTheme.Colors.textSecondary,
    marginTop: 4,
    marginBottom: 14,
  },
  budgetInput: {
    fontSize: 26,
    fontWeight: '800',
    color: AppTheme.Colors.primaryNavy,
    borderBottomWidth: 2,
    borderBottomColor: AppTheme.Colors.borderLight,
    paddingVertical: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#FF4D4F',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F0F3F8',
    marginRight: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppTheme.Colors.textSecondary,
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: AppTheme.Colors.primaryNavy,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
