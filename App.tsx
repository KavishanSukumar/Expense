import React from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, Platform } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { BudgetsInsightsScreen } from './src/screens/BudgetsInsightsScreen';
import { AnalyticsScreen } from './src/screens/AnalyticsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { CustomBottomNav, BottomTabKey } from './src/components/CustomBottomNav';
import { AddExpenseModal } from './src/components/AddExpenseModal';
import { FileStoreService } from './src/services/FileStoreService';
import { WalletModel, CategoryModel, TransactionModel } from './src/types';
import { AppTheme, ThemeMode } from './src/theme/AppTheme';

interface AppState {
  activeTab: BottomTabKey;
  isAddModalOpen: boolean;
  wallets: WalletModel[];
  categories: CategoryModel[];
  themeMode: ThemeMode;
  currencySymbol: string;
}

export default class App extends React.Component<{}, AppState> {
  private fileStore = FileStoreService.getInstance();
  private homeScreenRef = React.createRef<HomeScreen>();
  private budgetsScreenRef = React.createRef<BudgetsInsightsScreen>();
  private analyticsScreenRef = React.createRef<AnalyticsScreen>();
  private unsubscribeTheme?: () => void;

  constructor(props: {}) {
    super(props);
    this.state = {
      activeTab: 'HOME',
      isAddModalOpen: false,
      wallets: [],
      categories: [],
      themeMode: 'light',
      currencySymbol: '₹',
    };
  }

  public async componentDidMount(): Promise<void> {
    const profile = await this.fileStore.getUserProfile();
    const mode = profile.themeMode || 'light';
    AppTheme.setMode(mode);
    this.setState({
      themeMode: mode,
      currencySymbol: profile.currencySymbol || '₹',
    });

    this.unsubscribeTheme = AppTheme.subscribe((newMode) => {
      this.setState({ themeMode: newMode });
    });

    await this.refreshGlobalMetadata();
  }

  public componentWillUnmount(): void {
    if (this.unsubscribeTheme) {
      this.unsubscribeTheme();
    }
  }

  private refreshGlobalMetadata = async (): Promise<void> => {
    const wallets = await this.fileStore.getWallets();
    const categories = await this.fileStore.getCategories();
    const profile = await this.fileStore.getUserProfile();
    const mode = profile.themeMode || AppTheme.currentMode;
    AppTheme.setMode(mode);
    this.setState({
      wallets,
      categories,
      themeMode: mode,
      currencySymbol: profile.currencySymbol || '₹',
    });
  };

  private refreshAllMountedScreens = async (): Promise<void> => {
    await this.refreshGlobalMetadata();
    try {
      if (this.homeScreenRef.current && typeof this.homeScreenRef.current.loadDashboardData === 'function') {
        await this.homeScreenRef.current.loadDashboardData();
      }
      if (this.budgetsScreenRef.current && typeof this.budgetsScreenRef.current.loadBudgetData === 'function') {
        await this.budgetsScreenRef.current.loadBudgetData();
      }
      if (this.analyticsScreenRef.current && typeof this.analyticsScreenRef.current.loadAnalyticsData === 'function') {
        await this.analyticsScreenRef.current.loadAnalyticsData();
      }
    } catch (err) {
      console.warn('Error refreshing screens:', err);
    }
  };

  private handleSelectTab = (tab: BottomTabKey): void => {
    this.setState({ activeTab: tab }, () => {
      if (tab === 'ANALYTICS' && this.analyticsScreenRef.current) {
        this.analyticsScreenRef.current.resetToCurrentMonth();
      }
    });
  };

  private handleOpenAddExpense = async (): Promise<void> => {
    await this.refreshGlobalMetadata();
    this.setState({ isAddModalOpen: true });
  };

  private handleCloseAddExpense = (): void => {
    this.setState({ isAddModalOpen: false });
  };

  private handleSaveExpense = async (tx: TransactionModel): Promise<void> => {
    await this.fileStore.addTransaction(tx);
    await this.refreshAllMountedScreens();
  };

  public render(): React.ReactNode {
    const { activeTab, isAddModalOpen, wallets, categories, themeMode, currencySymbol } = this.state;
    const palette = AppTheme.getPalette(themeMode);

    return (
      <SafeAreaView style={[styles.rootContainer, { backgroundColor: palette.background }]}>
        <StatusBar barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'} />

        <View style={styles.mainViewArea}>
          {activeTab === 'HOME' && (
            <HomeScreen
              ref={this.homeScreenRef}
              themeMode={themeMode}
              currencySymbol={currencySymbol}
              onNavigateToBudgets={() => this.handleSelectTab('BUDGETS')}
              onNavigateToAnalytics={() => this.handleSelectTab('ANALYTICS')}
              onNavigateToProfile={() => this.handleSelectTab('PROFILE')}
              onOpenAddExpense={this.handleOpenAddExpense}
              onWalletsChanged={this.refreshGlobalMetadata}
            />
          )}

          {activeTab === 'ANALYTICS' && (
            <AnalyticsScreen
              ref={this.analyticsScreenRef}
              themeMode={themeMode}
              currencySymbol={currencySymbol}
              onNavigateHome={() => this.handleSelectTab('HOME')}
              onTransactionsChanged={this.refreshAllMountedScreens}
            />
          )}

          {activeTab === 'BUDGETS' && (
            <BudgetsInsightsScreen
              ref={this.budgetsScreenRef}
              themeMode={themeMode}
              currencySymbol={currencySymbol}
              onNavigateHome={() => this.handleSelectTab('HOME')}
              onOpenAddExpense={this.handleOpenAddExpense}
            />
          )}

          {activeTab === 'PROFILE' && (
            <ProfileScreen
              themeMode={themeMode}
              onNavigateHome={() => this.handleSelectTab('HOME')}
              onProfileChanged={this.refreshAllMountedScreens}
            />
          )}
        </View>

        {/* Unified Cross-Platform Floating Bottom Bar */}
        <CustomBottomNav
          activeTab={activeTab}
          themeMode={themeMode}
          onSelectTab={this.handleSelectTab}
          onPressAdd={this.handleOpenAddExpense}
        />

        {/* Global Add Expense / Income Modal */}
        <AddExpenseModal
          visible={isAddModalOpen}
          categories={categories}
          wallets={wallets}
          currencySymbol={currencySymbol}
          themeMode={themeMode}
          onClose={this.handleCloseAddExpense}
          onSave={this.handleSaveExpense}
        />
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  mainViewArea: {
    flex: 1,
  },
});
