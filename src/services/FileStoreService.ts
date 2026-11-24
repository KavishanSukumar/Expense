import * as FileSystem from 'expo-file-system/legacy';
import {
  WalletModel,
  CategoryModel,
  CategoryType,
  TransactionModel,
  BudgetModel,
  DriveSyncMetadata,
  BorrowingModel,
  UserProfileModel,
  ThirdPartyDetailsModel,
} from '../types';
import { SecurityService } from '../security/SecurityService';

export interface CategoryBreakdownItem {
  category: CategoryModel;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export class FileStoreService {
  private static instance: FileStoreService;
  private readonly LOCAL_CACHE_FILENAME = 'expense_vault_cache.enc';

  private wallets: Map<string, WalletModel> = new Map();
  private categories: Map<string, CategoryModel> = new Map();
  private transactions: Map<string, TransactionModel> = new Map();
  private budgets: Map<string, BudgetModel> = new Map();
  private borrowings: Map<string, BorrowingModel> = new Map();
  private userProfile: UserProfileModel = new UserProfileModel();
  private syncState: DriveSyncMetadata = new DriveSyncMetadata();
  private isLoaded: boolean = false;

  public static readonly AVAILABLE_MONTHS: string[] = [
    'August 2026',
    'September 2026',
    'October 2026',
    'November 2026',
  ];

  public static getCurrentMonthKey(): string {
    const now = new Date();
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  }

  private constructor() {
    this.seedDefaultData();
  }

  public static getInstance(): FileStoreService {
    if (!FileStoreService.instance) {
      FileStoreService.instance = new FileStoreService();
    }
    return FileStoreService.instance;
  }

  public static getMonthKeyFromTimestamp(isoTimestamp: string): string {
    const parsed = new Date(isoTimestamp);
    if (isNaN(parsed.getTime())) {
      return 'October 2026';
    }
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return `${monthNames[parsed.getMonth()]} ${parsed.getFullYear()}`;
  }

  public static getDaysInMonth(monthKey: string): number {
    if (!monthKey || typeof monthKey !== 'string') {
      return 30;
    }
    const parts = monthKey.trim().split(' ');
    if (parts.length >= 2) {
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      const monthIndex = monthNames.indexOf(parts[0]);
      const year = parseInt(parts[1], 10);
      if (monthIndex !== -1 && !isNaN(year) && year >= 1900 && year < 3000) {
        return new Date(year, monthIndex + 1, 0).getDate();
      }
    }
    return 30;
  }

  private seedDefaultData(): void {
    // Wallets
    const mainWallet = new WalletModel(
      'w-main-1',
      'Main wallet',
      'CASH_ACCOUNT',
      84520,
      '•••• •••• •••• ••••',
      'MASTERCARD',
      true,
      undefined,
      '#1E293B'
    );
    const secondaryWallet = new WalletModel(
      'w-sub-2',
      'HDFC Savings',
      'SAVINGS_ACCOUNT',
      42300,
      '•••• •••• •••• ••••',
      'VISA',
      false,
      undefined,
      '#1E3A8A'
    );
    const creditWallet = new WalletModel(
      'w-card-3',
      'ICICI Coral Card',
      'CREDIT_CARD',
      31600,
      '•••• •••• •••• ••••',
      'VISA',
      false,
      50000,
      '#4C1D95'
    );
    this.wallets.set(mainWallet.id, mainWallet);
    this.wallets.set(secondaryWallet.id, secondaryWallet);
    this.wallets.set(creditWallet.id, creditWallet);

    // Categories - Expense
    const catFood = new CategoryModel('cat-food', 'Food & Drinks', 'coffee', '#FF8A00', true, 'EXPENSE');
    const catTransport = new CategoryModel('cat-transport', 'Transport', 'car', '#2AC769', true, 'EXPENSE');
    const catShopping = new CategoryModel('cat-shopping', 'Shopping', 'shopping-cart', '#FFAE19', true, 'EXPENSE');
    const catHealth = new CategoryModel('cat-health', 'Health & Care', 'heart', '#FF5757', true, 'EXPENSE');
    const catCommunity = new CategoryModel('cat-community', 'Community & Faith', 'moon', '#10B981', true, 'EXPENSE');
    const catBills = new CategoryModel('cat-bills', 'Bills & Utilities', 'zap', '#3B82F6', true, 'EXPENSE');
    const catExpOther = new CategoryModel('cat-exp-other', 'Other', 'more-horizontal', '#64748B', true, 'EXPENSE');

    // Categories - Income
    const catIncSalary = new CategoryModel('cat-inc-salary', 'Salary', 'briefcase', '#10B981', true, 'INCOME');
    const catIncFreelance = new CategoryModel('cat-inc-freelance', 'Freelance / Side Gig', 'laptop', '#3B82F6', true, 'INCOME');
    const catIncInvest = new CategoryModel('cat-inc-invest', 'Investments', 'trending-up', '#8B5CF6', true, 'INCOME');
    const catIncRental = new CategoryModel('cat-inc-rental', 'Rental Income', 'home', '#F59E0B', true, 'INCOME');
    const catIncGifts = new CategoryModel('cat-inc-gifts', 'Gifts & Grants', 'gift', '#EC4899', true, 'INCOME');
    const catIncOther = new CategoryModel('cat-inc-other', 'Other', 'more-horizontal', '#64748B', true, 'INCOME');

    this.categories.set(catFood.id, catFood);
    this.categories.set(catTransport.id, catTransport);
    this.categories.set(catShopping.id, catShopping);
    this.categories.set(catHealth.id, catHealth);
    this.categories.set(catCommunity.id, catCommunity);
    this.categories.set(catBills.id, catBills);
    this.categories.set(catExpOther.id, catExpOther);

    this.categories.set(catIncSalary.id, catIncSalary);
    this.categories.set(catIncFreelance.id, catIncFreelance);
    this.categories.set(catIncInvest.id, catIncInvest);
    this.categories.set(catIncRental.id, catIncRental);
    this.categories.set(catIncGifts.id, catIncGifts);
    this.categories.set(catIncOther.id, catIncOther);

    // Initial Sample Transactions
    const tx1 = new TransactionModel(
      'tx-1',
      'w-main-1',
      'cat-food',
      'EXPENSE',
      'Noodles',
      'Food & Drinks · Today · 10:09 PM',
      150,
      '2026-10-23T22:09:00.000Z'
    );

    const tx2 = new TransactionModel(
      'tx-2',
      'w-main-1',
      'cat-transport',
      'EXPENSE',
      'Uber',
      'Transport · Today · 08:43 PM',
      220,
      '2026-10-23T20:43:00.000Z'
    );

    const tx3 = new TransactionModel(
      'tx-3',
      'w-main-1',
      'cat-shopping',
      'EXPENSE',
      'Groceries & Snacks',
      'Shopping · Yesterday · 04:15 PM',
      940,
      '2026-10-22T16:15:00.000Z'
    );

    const tx4 = new TransactionModel(
      'tx-4',
      'w-main-1',
      'cat-health',
      'EXPENSE',
      'Pharmacy',
      'Health & Care · 2 days ago',
      1100,
      '2026-10-21T14:30:00.000Z'
    );

    this.transactions.set(tx1.id, tx1);
    this.transactions.set(tx2.id, tx2);
    this.transactions.set(tx3.id, tx3);
    this.transactions.set(tx4.id, tx4);

    // Budgets
    const octBudget = new BudgetModel('b-oct-2026', 'October 2026', 25000, 2410);
    this.budgets.set(octBudget.monthKey, octBudget);

    // Sample Borrowing / Dues
    const b1 = new BorrowingModel(
      'b-1',
      'Rahul Sharma',
      2500,
      'BORROWED',
      '2026-11-28T00:00:00.000Z',
      'For dinner split at bistro'
    );
    const b2 = new BorrowingModel(
      'b-2',
      'Anita Desai',
      5000,
      'LENT',
      '2026-11-30T00:00:00.000Z',
      'Payment advance for concert tickets'
    );
    this.borrowings.set(b1.id, b1);
    this.borrowings.set(b2.id, b2);
  }

  public async clearDummySeedData(): Promise<void> {
    await this.loadFromLocalCache();
    this.transactions.clear();
    this.borrowings.clear();
    // Reset budgets to 0 spent
    this.budgets.forEach((budget) => {
      budget.spentAmount = 0;
    });
    await this.saveToLocalCache();
  }

  public async loadFromLocalCache(): Promise<void> {
    if (this.isLoaded) return;
    try {
      const fileUri = `${FileSystem.documentDirectory}${this.LOCAL_CACHE_FILENAME}`;
      const fileInfo = await FileSystem.getInfoAsync(fileUri);

      if (fileInfo.exists) {
        const encryptedContent = await FileSystem.readAsStringAsync(fileUri);
        const decryptedJson = await SecurityService.decryptZeroKnowledgePayload(encryptedContent);
        await this.importDocumentJson(decryptedJson, false);
      }
      this.isLoaded = true;
    } catch (error) {
      console.warn('Local cache read error, using in-memory state:', error);
      this.isLoaded = true;
    }
  }

  public async saveToLocalCache(): Promise<void> {
    try {
      const rawJson = await this.exportDocumentJson();
      const encryptedContent = await SecurityService.encryptZeroKnowledgePayload(rawJson);
      const fileUri = `${FileSystem.documentDirectory}${this.LOCAL_CACHE_FILENAME}`;
      await FileSystem.writeAsStringAsync(fileUri, encryptedContent);
    } catch (error) {
      console.warn('Local cache write error:', error);
    }
  }

  // --- Profile API ---
  public async getUserProfile(): Promise<UserProfileModel> {
    await this.loadFromLocalCache();
    return this.userProfile;
  }

  public async updateUserProfile(profile: Partial<UserProfileModel>): Promise<UserProfileModel> {
    await this.loadFromLocalCache();
    if (profile.name) {
      this.userProfile.name = profile.name.replace(/[\u0000-\u001F\u007F<>]/g, '').trim();
    }
    if (profile.email !== undefined) {
      this.userProfile.email = profile.email.replace(/[\u0000-\u001F\u007F<>]/g, '').trim();
    }
    if (profile.avatarEmoji) {
      this.userProfile.avatarEmoji = profile.avatarEmoji;
    }
    if (profile.currencySymbol !== undefined) {
      const cleanSymbol = profile.currencySymbol.replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, 5);
      this.userProfile.currencySymbol = cleanSymbol || '₹';
    }
    if (profile.themeMode !== undefined) {
      this.userProfile.themeMode = profile.themeMode === 'dark' ? 'dark' : 'light';
    }
    this.userProfile.updatedAt = new Date().toISOString();
    await this.saveToLocalCache();
    return this.userProfile;
  }

  // --- Wallets API ---
  public async getWallets(): Promise<WalletModel[]> {
    await this.loadFromLocalCache();
    return Array.from(this.wallets.values());
  }

  public async setPrimaryWallet(walletId: string): Promise<WalletModel[]> {
    await this.loadFromLocalCache();
    if (!this.wallets.has(walletId)) {
      return this.getWallets();
    }

    this.wallets.forEach((wallet) => {
      wallet.isPrimary = wallet.id === walletId;
      wallet.updatedAt = new Date().toISOString();
    });

    await this.saveToLocalCache();
    return this.getWallets();
  }

  public async addWallet(wallet: WalletModel): Promise<WalletModel[]> {
    await this.loadFromLocalCache();
    if (wallet.isPrimary) {
      this.wallets.forEach((w) => {
        w.isPrimary = false;
      });
    }
    this.wallets.set(wallet.id, wallet);
    await this.saveToLocalCache();
    return this.getWallets();
  }

  public async updateWallet(wallet: WalletModel): Promise<WalletModel[]> {
    await this.loadFromLocalCache();
    this.wallets.set(wallet.id, wallet);
    await this.saveToLocalCache();
    return this.getWallets();
  }

  public async deleteWallet(walletId: string): Promise<WalletModel[]> {
    await this.loadFromLocalCache();
    this.wallets.delete(walletId);
    // If deleted wallet was primary, assign first remaining as primary
    const remaining = Array.from(this.wallets.values());
    if (remaining.length > 0 && !remaining.some((w) => w.isPrimary)) {
      remaining[0].isPrimary = true;
      this.wallets.set(remaining[0].id, remaining[0]);
    }
    await this.saveToLocalCache();
    return this.getWallets();
  }

  public async getTotalBalance(): Promise<number> {
    await this.loadFromLocalCache();
    let total = 0;
    this.wallets.forEach((w) => {
      // Do not count credit card available limit as liquid cash in total balance
      if (w.type !== 'CREDIT_CARD') {
        total += w.balance;
      }
    });
    return total;
  }

  public async getTotalCreditDue(): Promise<number> {
    await this.loadFromLocalCache();
    let totalDue = 0;
    // 1. Credit card dues (creditLimit - available credit balance)
    this.wallets.forEach((w) => {
      if (w.type === 'CREDIT_CARD') {
        const limit = w.creditLimit || w.balance;
        const due = Math.max(0, limit - w.balance);
        totalDue += due;
      }
    });
    // 2. Unsettled borrowed borrowings (money user owes/has to repay)
    this.borrowings.forEach((b) => {
      if (b.type === 'BORROWED' && !b.isSettled) {
        totalDue += b.amount;
      }
    });
    return totalDue;
  }

  public async getAvailableMonths(): Promise<string[]> {
    await this.loadFromLocalCache();
    const monthSet = new Set<string>();

    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    // Current month always available
    const currentMonthKey = FileStoreService.getCurrentMonthKey();
    monthSet.add(currentMonthKey);

    // Months from all transactions
    this.transactions.forEach((tx) => {
      const parsed = new Date(tx.timestamp);
      if (!isNaN(parsed.getTime())) {
        monthSet.add(`${monthNames[parsed.getMonth()]} ${parsed.getFullYear()}`);
      }
    });

    // Months from all recorded budgets
    this.budgets.forEach((b) => {
      if (b.monthKey) {
        monthSet.add(b.monthKey);
      }
    });

    // Historical baseline months (exclude future months)
    const now = new Date();
    const currentMonthTimestamp = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    FileStoreService.AVAILABLE_MONTHS.forEach((m) => {
      const parts = m.split(' ');
      const yr = parseInt(parts[1] || '2026', 10);
      const mIdx = monthNames.indexOf(parts[0]);
      if (mIdx !== -1) {
        const mTime = new Date(yr, mIdx, 1).getTime();
        if (mTime <= currentMonthTimestamp) {
          monthSet.add(m);
        }
      }
    });

    // Sort descending chronologically
    return Array.from(monthSet).sort((a, b) => {
      const partsA = a.split(' ');
      const partsB = b.split(' ');
      const yearA = parseInt(partsA[1] || '2026', 10);
      const yearB = parseInt(partsB[1] || '2026', 10);
      const monthIdxA = monthNames.indexOf(partsA[0]);
      const monthIdxB = monthNames.indexOf(partsB[0]);
      const dateA = new Date(yearA, monthIdxA, 1).getTime();
      const dateB = new Date(yearB, monthIdxB, 1).getTime();
      return dateB - dateA;
    });
  }

  // --- Transactions API ---
  public async getTransactions(): Promise<TransactionModel[]> {
    await this.loadFromLocalCache();
    return Array.from(this.transactions.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public async getTransactionsByMonth(
    monthKey: string = 'October 2026',
    categoryId?: string
  ): Promise<TransactionModel[]> {
    const all = await this.getTransactions();
    return all.filter((tx) => {
      const txMonth = FileStoreService.getMonthKeyFromTimestamp(tx.timestamp);
      const matchesMonth = txMonth === monthKey;
      const matchesCategory = !categoryId || categoryId === 'ALL' || tx.categoryId === categoryId;
      return matchesMonth && matchesCategory;
    });
  }

  public async addTransaction(tx: TransactionModel, targetMonthKey: string = 'October 2026'): Promise<void> {
    await this.loadFromLocalCache();

    if (!Number.isFinite(tx.amount) || tx.amount <= 0 || tx.amount > 10000000) {
      throw new Error('Invalid transaction amount.');
    }

    const sourceWallet = this.wallets.get(tx.walletId);
    if (!sourceWallet) {
      throw new Error('Selected payment account does not exist.');
    }

    if (tx.type === 'EXPENSE') {
      sourceWallet.balance = Math.max(0, sourceWallet.balance - tx.amount);
      sourceWallet.updatedAt = new Date().toISOString();
      this.wallets.set(sourceWallet.id, sourceWallet);

      const monthKey = FileStoreService.getMonthKeyFromTimestamp(tx.timestamp) || targetMonthKey;
      const budget = await this.getBudget(monthKey);
      budget.spentAmount += tx.amount;
      this.budgets.set(monthKey, budget);
    } else if (tx.type === 'INCOME') {
      sourceWallet.balance += tx.amount;
      sourceWallet.updatedAt = new Date().toISOString();
      this.wallets.set(sourceWallet.id, sourceWallet);
    } else if (tx.type === 'TRANSFER') {
      if (tx.destinationWalletId) {
        if (tx.destinationWalletId === tx.walletId) {
          throw new Error('Please select a distinct destination account for transfer.');
        }
        const destWallet = this.wallets.get(tx.destinationWalletId);
        if (!destWallet) {
          throw new Error('Destination account does not exist.');
        }
        if (tx.amount > sourceWallet.balance) {
          throw new Error('Insufficient funds in source account for this transfer.');
        }

        sourceWallet.balance -= tx.amount;
        sourceWallet.updatedAt = new Date().toISOString();
        destWallet.balance += tx.amount;
        destWallet.updatedAt = new Date().toISOString();

        this.wallets.set(sourceWallet.id, sourceWallet);
        this.wallets.set(destWallet.id, destWallet);
      } else if (tx.thirdPartyDetails) {
        // Third-party external transfer
        if (tx.amount > sourceWallet.balance) {
          throw new Error('Insufficient funds in account for third-party transfer.');
        }
        sourceWallet.balance -= tx.amount;
        sourceWallet.updatedAt = new Date().toISOString();
        this.wallets.set(sourceWallet.id, sourceWallet);
      }
    }

    this.transactions.set(tx.id, tx);
    await this.saveToLocalCache();
  }

  public async updateTransaction(updatedTx: TransactionModel): Promise<void> {
    await this.loadFromLocalCache();
    const oldTx = this.transactions.get(updatedTx.id);
    if (!oldTx) {
      return this.addTransaction(updatedTx);
    }

    // Clean up old receipt file only if it was replaced or removed
    if (oldTx.receiptUri && oldTx.receiptUri !== updatedTx.receiptUri) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(oldTx.receiptUri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(oldTx.receiptUri, { idempotent: true });
        }
      } catch (err) {
        console.warn('Receipt cleanup warning during edit:', err);
      }
    }

    // Revert old transaction balances without deleting retained receipt
    await this.deleteTransaction(oldTx.id, false);
    // Apply new transaction
    await this.addTransaction(updatedTx);
  }

  public async deleteTransaction(txId: string, deleteReceiptFile: boolean = true): Promise<void> {
    await this.loadFromLocalCache();
    const tx = this.transactions.get(txId);
    if (!tx) return;

    const sourceWallet = this.wallets.get(tx.walletId);
    if (tx.type === 'EXPENSE') {
      if (sourceWallet) {
        sourceWallet.balance += tx.amount;
        this.wallets.set(sourceWallet.id, sourceWallet);
      }
      const monthKey = FileStoreService.getMonthKeyFromTimestamp(tx.timestamp);
      const budget = this.budgets.get(monthKey);
      if (budget) {
        budget.spentAmount = Math.max(0, budget.spentAmount - tx.amount);
        this.budgets.set(monthKey, budget);
      }
    } else if (tx.type === 'INCOME') {
      if (sourceWallet) {
        sourceWallet.balance = Math.max(0, sourceWallet.balance - tx.amount);
        this.wallets.set(sourceWallet.id, sourceWallet);
      }
    } else if (tx.type === 'TRANSFER') {
      if (sourceWallet) {
        sourceWallet.balance += tx.amount;
        this.wallets.set(sourceWallet.id, sourceWallet);
      }
      if (tx.destinationWalletId) {
        const destWallet = this.wallets.get(tx.destinationWalletId);
        if (destWallet) {
          destWallet.balance = Math.max(0, destWallet.balance - tx.amount);
          this.wallets.set(destWallet.id, destWallet);
        }
      }
    }

    // If receipt image is present and deletion requested, cleanup local document file
    if (deleteReceiptFile && tx.receiptUri) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(tx.receiptUri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(tx.receiptUri, { idempotent: true });
        }
      } catch (err) {
        console.warn('Receipt file deletion warning:', err);
      }
    }

    this.transactions.delete(txId);
    await this.saveToLocalCache();
  }

  // --- Credit Card Settlement API ---
  public async settleCreditCard(
    creditCardId: string,
    sourceWalletId: string,
    settlementAmount: number
  ): Promise<void> {
    await this.loadFromLocalCache();

    if (!Number.isFinite(settlementAmount) || settlementAmount <= 0) {
      throw new Error('Settlement amount must be greater than ₹0.');
    }

    const creditCard = this.wallets.get(creditCardId);
    if (!creditCard || creditCard.type !== 'CREDIT_CARD') {
      throw new Error('Target credit card could not be found.');
    }

    const sourceWallet = this.wallets.get(sourceWalletId);
    if (!sourceWallet) {
      throw new Error('Funding source account not found.');
    }

    if (settlementAmount > sourceWallet.balance) {
      throw new Error(
        `Insufficient balance in ${sourceWallet.name} (Available: ₹${sourceWallet.balance.toLocaleString('en-IN')}).`
      );
    }

    const creditLimit = creditCard.creditLimit || creditCard.balance;
    const currentDue = Math.max(0, creditLimit - creditCard.balance);
    if (settlementAmount > currentDue && currentDue > 0) {
      throw new Error(`Settlement amount exceeds current card due of ₹${currentDue.toLocaleString('en-IN')}.`);
    }

    // Deduct from source payment account
    sourceWallet.balance -= settlementAmount;
    sourceWallet.updatedAt = new Date().toISOString();
    this.wallets.set(sourceWallet.id, sourceWallet);

    // Increase available credit limit on card
    creditCard.balance = Math.min(creditLimit, creditCard.balance + settlementAmount);
    creditCard.updatedAt = new Date().toISOString();
    this.wallets.set(creditCard.id, creditCard);

    // Record settlement transfer transaction
    const tx = new TransactionModel(
      'tx-settle-' + Date.now(),
      sourceWallet.id,
      'cat-shopping',
      'TRANSFER',
      `Card Settlement: ${creditCard.name}`,
      `${sourceWallet.name} ➔ ${creditCard.name} · Paid Bill`,
      settlementAmount,
      new Date().toISOString(),
      creditCard.id,
      `Credit card bill settlement of ₹${settlementAmount.toLocaleString('en-IN')}`
    );
    this.transactions.set(tx.id, tx);

    await this.saveToLocalCache();
  }

  // --- Borrowings & Lendings API ---
  public async getBorrowings(): Promise<BorrowingModel[]> {
    await this.loadFromLocalCache();
    return Array.from(this.borrowings.values()).sort(
      (a, b) =>
        new Date(a.estimatedPaymentDate).getTime() - new Date(b.estimatedPaymentDate).getTime()
    );
  }

  public async addBorrowing(borrowing: BorrowingModel): Promise<void> {
    await this.loadFromLocalCache();
    if (!Number.isFinite(borrowing.amount) || borrowing.amount <= 0) {
      throw new Error('Borrowing amount must be greater than ₹0.');
    }
    this.borrowings.set(borrowing.id, borrowing);
    await this.saveToLocalCache();
  }

  public async updateBorrowing(borrowing: BorrowingModel): Promise<void> {
    await this.loadFromLocalCache();
    this.borrowings.set(borrowing.id, borrowing);
    await this.saveToLocalCache();
  }

  public async deleteBorrowing(id: string): Promise<void> {
    await this.loadFromLocalCache();
    this.borrowings.delete(id);
    await this.saveToLocalCache();
  }

  public async settleBorrowing(id: string): Promise<void> {
    await this.loadFromLocalCache();
    const item = this.borrowings.get(id);
    if (item) {
      item.isSettled = !item.isSettled;
      item.settledDate = item.isSettled ? new Date().toISOString() : undefined;
      this.borrowings.set(item.id, item);
      await this.saveToLocalCache();
    }
  }

  // --- Budgets & Category Analytics API ---
  public async getBudget(monthKey: string = 'October 2026'): Promise<BudgetModel> {
    await this.loadFromLocalCache();
    let budget = this.budgets.get(monthKey);

    const monthTxs = await this.getTransactionsByMonth(monthKey);
    const calculatedSpent = monthTxs
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    if (!budget) {
      budget = new BudgetModel(`b-${monthKey.toLowerCase().replace(/\s+/g, '-')}`, monthKey, 25000, calculatedSpent);
      this.budgets.set(monthKey, budget);
    } else {
      budget = new BudgetModel(budget.id, budget.monthKey, budget.totalBudget, calculatedSpent);
      this.budgets.set(monthKey, budget);
    }
    return budget;
  }

  public async updateBudget(monthKey: string, newTotal: number): Promise<BudgetModel> {
    await this.loadFromLocalCache();
    if (!Number.isFinite(newTotal) || newTotal <= 0 || newTotal > 100000000) {
      throw new Error('Invalid budget limit.');
    }
    const budget = await this.getBudget(monthKey);
    const updated = new BudgetModel(budget.id, monthKey, Math.round(newTotal), budget.spentAmount);
    this.budgets.set(monthKey, updated);
    await this.saveToLocalCache();
    return updated;
  }

  public async getCategoryBreakdown(monthKey: string = 'October 2026'): Promise<CategoryBreakdownItem[]> {
    await this.loadFromLocalCache();
    const categories = await this.getCategories('EXPENSE');
    const monthExpenses = (await this.getTransactionsByMonth(monthKey)).filter(
      (tx) => tx.type === 'EXPENSE'
    );
    const totalSpent = monthExpenses.reduce((sum, tx) => sum + tx.amount, 0);

    return categories.map((cat) => {
      const catTxs = monthExpenses.filter((tx) => tx.categoryId === cat.id);
      const amount = catTxs.reduce((sum, tx) => sum + tx.amount, 0);
      const percentage = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
      return {
        category: cat,
        amount,
        percentage,
        transactionCount: catTxs.length,
      };
    });
  }

  public async getIncomeCategoryBreakdown(monthKey: string = 'October 2026'): Promise<CategoryBreakdownItem[]> {
    await this.loadFromLocalCache();
    const categories = await this.getCategories('INCOME');
    const monthIncomes = (await this.getTransactionsByMonth(monthKey)).filter(
      (tx) => tx.type === 'INCOME'
    );
    const totalIncome = monthIncomes.reduce((sum, tx) => sum + tx.amount, 0);

    return categories.map((cat) => {
      const catTxs = monthIncomes.filter((tx) => tx.categoryId === cat.id);
      const amount = catTxs.reduce((sum, tx) => sum + tx.amount, 0);
      const percentage = totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0;
      return {
        category: cat,
        amount,
        percentage,
        transactionCount: catTxs.length,
      };
    });
  }

  public async getCategories(type?: CategoryType): Promise<CategoryModel[]> {
    await this.loadFromLocalCache();
    // Ensure default 'Other' exists for both expense and income
    if (!this.categories.has('cat-exp-other')) {
      const expOther = new CategoryModel('cat-exp-other', 'Other', 'more-horizontal', '#64748B', true, 'EXPENSE');
      this.categories.set(expOther.id, expOther);
    }
    if (!this.categories.has('cat-inc-other')) {
      const incOther = new CategoryModel('cat-inc-other', 'Other', 'more-horizontal', '#64748B', true, 'INCOME');
      this.categories.set(incOther.id, incOther);
    }

    const all = Array.from(this.categories.values());
    if (!type) {
      return all;
    }
    return all.filter((c) => c.type === type || c.type === 'BOTH' || (!c.type && type === 'EXPENSE'));
  }

  public async addCategory(cat: CategoryModel): Promise<CategoryModel[]> {
    await this.loadFromLocalCache();
    const cleanName = cat.name.replace(/[\u0000-\u001F\u007F<>]/g, '').trim();
    if (!cleanName) {
      throw new Error('Category name cannot be empty.');
    }
    const cleanCat = new CategoryModel(
      cat.id || `cat-${Date.now()}`,
      cleanName,
      cat.iconName || 'tag',
      cat.colorHex || '#3B82F6',
      false,
      cat.type || 'EXPENSE'
    );
    this.categories.set(cleanCat.id, cleanCat);
    await this.saveToLocalCache();
    return this.getCategories(cat.type);
  }

  public async updateCategory(cat: CategoryModel): Promise<CategoryModel[]> {
    await this.loadFromLocalCache();
    const cleanName = cat.name.replace(/[\u0000-\u001F\u007F<>]/g, '').trim();
    if (!cleanName) {
      throw new Error('Category name cannot be empty.');
    }
    const existing = this.categories.get(cat.id);
    const isDefault = existing ? existing.isDefault : false;
    const updated = new CategoryModel(
      cat.id,
      cleanName,
      cat.iconName || existing?.iconName || 'tag',
      cat.colorHex || existing?.colorHex || '#3B82F6',
      isDefault,
      cat.type || existing?.type || 'EXPENSE'
    );
    this.categories.set(updated.id, updated);
    await this.saveToLocalCache();
    return this.getCategories(cat.type);
  }

  public async deleteCategory(catId: string): Promise<CategoryModel[]> {
    await this.loadFromLocalCache();
    const existing = this.categories.get(catId);
    if (!existing) return this.getCategories();

    if (existing.isDefault || catId === 'cat-exp-other' || catId === 'cat-inc-other') {
      throw new Error('Default system categories cannot be deleted.');
    }

    this.categories.delete(catId);
    await this.saveToLocalCache();
    return this.getCategories(existing.type);
  }

  // --- Pure JSON Document Serialization (Zero Database) ---
  public async exportDocumentJson(): Promise<string> {
    const document = {
      version: 2,
      userProfile: this.userProfile,
      wallets: Array.from(this.wallets.values()),
      categories: Array.from(this.categories.values()),
      transactions: Array.from(this.transactions.values()),
      budgets: Array.from(this.budgets.values()),
      borrowings: Array.from(this.borrowings.values()),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(document, null, 2);
  }

  public async importDocumentJson(jsonString: string, persistAfterImport: boolean = true): Promise<void> {
    const data = JSON.parse(jsonString);

    if (data.userProfile && typeof data.userProfile === 'object') {
      this.userProfile = new UserProfileModel(
        String(data.userProfile.name || 'Sahil'),
        data.userProfile.email ? String(data.userProfile.email) : undefined,
        String(data.userProfile.avatarEmoji || '🧔🏽'),
        String(data.userProfile.currencySymbol || '₹'),
        data.userProfile.themeMode === 'dark' ? 'dark' : 'light',
        data.userProfile.updatedAt || new Date().toISOString()
      );
    }

    if (data.wallets && Array.isArray(data.wallets)) {
      this.wallets.clear();
      data.wallets.forEach((w: any) => {
        const cardNet = w.cardNetwork === 'RUPAY' ? 'VISA' : w.cardNetwork;
        const instance = new WalletModel(
          String(w.id),
          String(w.name),
          w.type,
          Number(w.balance) || 0,
          w.cardNumberMasked,
          cardNet,
          Boolean(w.isPrimary),
          w.creditLimit !== undefined ? Number(w.creditLimit) : undefined,
          w.colorHex ? String(w.colorHex) : undefined,
          w.createdAt,
          w.updatedAt
        );
        this.wallets.set(instance.id, instance);
      });
    }

    if (data.categories && Array.isArray(data.categories)) {
      this.categories.clear();
      data.categories.forEach((c: any) => {
        const instance = new CategoryModel(
          String(c.id),
          String(c.name),
          String(c.iconName),
          String(c.colorHex),
          Boolean(c.isDefault),
          c.type ? (c.type as CategoryType) : 'EXPENSE'
        );
        this.categories.set(instance.id, instance);
      });
    }

    if (data.transactions && Array.isArray(data.transactions)) {
      this.transactions.clear();
      data.transactions.forEach((t: TransactionModel) => {
        let thirdParty: ThirdPartyDetailsModel | undefined;
        if (t.thirdPartyDetails) {
          thirdParty = new ThirdPartyDetailsModel(
            String(t.thirdPartyDetails.recipientName),
            String(t.thirdPartyDetails.upiOrAccount),
            t.thirdPartyDetails.ifsc ? String(t.thirdPartyDetails.ifsc) : undefined
          );
        }
        const instance = new TransactionModel(
          String(t.id),
          String(t.walletId),
          String(t.categoryId),
          t.type,
          String(t.title),
          String(t.subtitle),
          Number(t.amount) || 0,
          t.timestamp,
          t.destinationWalletId,
          t.notes,
          t.receiptUri,
          thirdParty
        );
        this.transactions.set(instance.id, instance);
      });
    }

    if (data.budgets && Array.isArray(data.budgets)) {
      this.budgets.clear();
      data.budgets.forEach((b: BudgetModel) => {
        const instance = new BudgetModel(
          String(b.id),
          String(b.monthKey),
          Number(b.totalBudget) || 25000,
          Number(b.spentAmount) || 0
        );
        this.budgets.set(instance.monthKey, instance);
      });
    }

    if (data.borrowings && Array.isArray(data.borrowings)) {
      this.borrowings.clear();
      data.borrowings.forEach((b: BorrowingModel) => {
        const instance = new BorrowingModel(
          String(b.id),
          String(b.personName),
          Number(b.amount) || 0,
          b.type,
          String(b.estimatedPaymentDate),
          b.notes,
          Boolean(b.isSettled),
          b.settledDate,
          b.createdAt,
          b.notificationEnabled !== undefined ? Boolean(b.notificationEnabled) : true
        );
        this.borrowings.set(instance.id, instance);
      });
    }

    if (persistAfterImport) {
      await this.saveToLocalCache();
    }
  }

  // --- Sync State ---
  public getSyncState(): DriveSyncMetadata {
    return this.syncState;
  }

  public updateSyncState(state: Partial<DriveSyncMetadata>): void {
    Object.assign(this.syncState, state);
  }
}
