export type WalletType = 'CASH_ACCOUNT' | 'SAVINGS_ACCOUNT' | 'CREDIT_CARD' | 'DIGITAL_WALLET';
export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';
export type BorrowingType = 'BORROWED' | 'LENT';
export type CategoryType = 'EXPENSE' | 'INCOME' | 'BOTH';

export class ThirdPartyDetailsModel {
  public recipientName: string;
  public upiOrAccount: string;
  public ifsc?: string;

  constructor(recipientName: string, upiOrAccount: string, ifsc?: string) {
    this.recipientName = recipientName;
    this.upiOrAccount = upiOrAccount;
    this.ifsc = ifsc;
  }
}

export class WalletModel {
  public id: string;
  public name: string;
  public type: WalletType;
  public balance: number;
  public cardNumberMasked?: string;
  public cardNetwork?: 'VISA' | 'MASTERCARD';
  public isPrimary: boolean;
  public creditLimit?: number;
  public colorHex?: string;
  public createdAt: string;
  public updatedAt: string;

  constructor(
    id: string,
    name: string,
    type: WalletType,
    balance: number,
    cardNumberMasked?: string,
    cardNetwork?: 'VISA' | 'MASTERCARD',
    isPrimary: boolean = false,
    creditLimit?: number,
    colorHex?: string,
    createdAt: string = new Date().toISOString(),
    updatedAt: string = new Date().toISOString()
  ) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.balance = balance;
    this.cardNumberMasked = cardNumberMasked;
    this.cardNetwork = cardNetwork;
    this.isPrimary = isPrimary;
    this.creditLimit = creditLimit;
    this.colorHex = colorHex;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

export class CategoryModel {
  public id: string;
  public name: string;
  public iconName: string;
  public colorHex: string;
  public isDefault: boolean;
  public type: CategoryType;

  constructor(
    id: string,
    name: string,
    iconName: string,
    colorHex: string,
    isDefault: boolean = false,
    type: CategoryType = 'EXPENSE'
  ) {
    this.id = id;
    this.name = name;
    this.iconName = iconName;
    this.colorHex = colorHex;
    this.isDefault = isDefault;
    this.type = type;
  }
}

export class TransactionModel {
  public id: string;
  public walletId: string;
  public categoryId: string;
  public type: TransactionType;
  public title: string;
  public subtitle: string;
  public amount: number;
  public timestamp: string;
  public destinationWalletId?: string;
  public notes?: string;
  public receiptUri?: string;
  public thirdPartyDetails?: ThirdPartyDetailsModel;

  constructor(
    id: string,
    walletId: string,
    categoryId: string,
    type: TransactionType,
    title: string,
    subtitle: string,
    amount: number,
    timestamp: string = new Date().toISOString(),
    destinationWalletId?: string,
    notes?: string,
    receiptUri?: string,
    thirdPartyDetails?: ThirdPartyDetailsModel
  ) {
    this.id = id;
    this.walletId = walletId;
    this.categoryId = categoryId;
    this.type = type;
    this.title = title;
    this.subtitle = subtitle;
    this.amount = amount;
    this.timestamp = timestamp;
    this.destinationWalletId = destinationWalletId;
    this.notes = notes;
    this.receiptUri = receiptUri;
    this.thirdPartyDetails = thirdPartyDetails;
  }
}

export class BudgetModel {
  public id: string;
  public monthKey: string;
  public totalBudget: number;
  public spentAmount: number;

  constructor(
    id: string,
    monthKey: string,
    totalBudget: number,
    spentAmount: number = 0
  ) {
    this.id = id;
    this.monthKey = monthKey;
    this.totalBudget = totalBudget;
    this.spentAmount = spentAmount;
  }

  public get remainingAmount(): number {
    return Math.max(0, this.totalBudget - this.spentAmount);
  }

  public get spentPercentage(): number {
    if (this.totalBudget <= 0) return 0;
    return Math.min(100, Math.round((this.spentAmount / this.totalBudget) * 100));
  }
}

export class BorrowingModel {
  public id: string;
  public personName: string;
  public amount: number;
  public type: BorrowingType;
  public estimatedPaymentDate: string;
  public notes?: string;
  public isSettled: boolean;
  public settledDate?: string;
  public createdAt: string;
  public notificationEnabled: boolean;

  constructor(
    id: string,
    personName: string,
    amount: number,
    type: BorrowingType,
    estimatedPaymentDate: string,
    notes?: string,
    isSettled: boolean = false,
    settledDate?: string,
    createdAt: string = new Date().toISOString(),
    notificationEnabled: boolean = true
  ) {
    this.id = id;
    this.personName = personName;
    this.amount = amount;
    this.type = type;
    this.estimatedPaymentDate = estimatedPaymentDate;
    this.notes = notes;
    this.isSettled = isSettled;
    this.settledDate = settledDate;
    this.createdAt = createdAt;
    this.notificationEnabled = notificationEnabled;
  }
}

export class UserProfileModel {
  public name: string;
  public email?: string;
  public avatarEmoji: string;
  public currencySymbol: string;
  public themeMode: 'light' | 'dark';
  public updatedAt: string;

  constructor(
    name: string = 'Sahil',
    email?: string,
    avatarEmoji: string = '🧔🏽',
    currencySymbol: string = '₹',
    themeMode: 'light' | 'dark' = 'light',
    updatedAt: string = new Date().toISOString()
  ) {
    this.name = name;
    this.email = email;
    this.avatarEmoji = avatarEmoji;
    this.currencySymbol = currencySymbol;
    this.themeMode = themeMode;
    this.updatedAt = updatedAt;
  }
}

export class DriveSyncMetadata {
  public lastSyncedTimestamp?: string;
  public driveFileId?: string;
  public isAuthenticated: boolean;
  public userEmail?: string;
  public lastSyncStatus?: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR';

  constructor(
    isAuthenticated: boolean = false,
    lastSyncedTimestamp?: string,
    driveFileId?: string,
    userEmail?: string,
    lastSyncStatus: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR' = 'IDLE'
  ) {
    this.isAuthenticated = isAuthenticated;
    this.lastSyncedTimestamp = lastSyncedTimestamp;
    this.driveFileId = driveFileId;
    this.userEmail = userEmail;
    this.lastSyncStatus = lastSyncStatus;
  }
}
