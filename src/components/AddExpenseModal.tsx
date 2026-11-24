import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { AppTheme } from '../theme/AppTheme';
import { CategoryModel, WalletModel, TransactionModel, TransactionType } from '../types';

interface AddExpenseModalProps {
  visible: boolean;
  categories: CategoryModel[];
  wallets: WalletModel[];
  initialTransaction?: TransactionModel | null;
  currencySymbol?: string;
  themeMode?: 'light' | 'dark';
  onClose: () => void;
  onSave: (transaction: TransactionModel) => void;
}

interface AddExpenseModalState {
  transactionType: TransactionType;
  title: string;
  amountText: string;
  selectedCategoryId: string;
  selectedWalletId: string;
  isReceiptEnabled: boolean;
  receiptUri?: string;
  errorMessage: string;
}

export class AddExpenseModal extends React.Component<
  AddExpenseModalProps,
  AddExpenseModalState
> {
  private static getInitialStateFromProps(props: AddExpenseModalProps): AddExpenseModalState {
    if (props.initialTransaction) {
      const tx = props.initialTransaction;
      return {
        transactionType: tx.type,
        title: tx.title,
        amountText: tx.amount.toString(),
        selectedCategoryId: tx.categoryId,
        selectedWalletId: tx.walletId,
        isReceiptEnabled: Boolean(tx.receiptUri),
        receiptUri: tx.receiptUri,
        errorMessage: '',
      };
    }

    const primaryWallet = props.wallets.find((w) => w.isPrimary) || props.wallets[0];
    const defaultExpenseCat = props.categories.find(
      (c) => c.type === 'EXPENSE' || c.type === 'BOTH' || !c.type
    ) || props.categories[0];
    return {
      transactionType: 'EXPENSE',
      title: '',
      amountText: '',
      selectedCategoryId: defaultExpenseCat?.id || 'cat-food',
      selectedWalletId: primaryWallet?.id || 'w-main-1',
      isReceiptEnabled: false,
      receiptUri: undefined,
      errorMessage: '',
    };
  }

  constructor(props: AddExpenseModalProps) {
    super(props);
    this.state = AddExpenseModal.getInitialStateFromProps(props);
  }

  private handleSetTransactionType = (type: TransactionType): void => {
    const { categories } = this.props;
    const matching = categories.filter((c) =>
      type === 'INCOME'
        ? c.type === 'INCOME' || c.type === 'BOTH'
        : c.type === 'EXPENSE' || c.type === 'BOTH' || !c.type
    );
    const newCatId = matching.length > 0 ? matching[0].id : this.state.selectedCategoryId;
    this.setState({
      transactionType: type,
      selectedCategoryId: newCatId,
      errorMessage: '',
    });
  };

  public componentDidMount(): void {
    if (this.props.initialTransaction) {
      this.setState(AddExpenseModal.getInitialStateFromProps(this.props));
    }
  }

  public componentDidUpdate(prevProps: AddExpenseModalProps): void {
    const becameVisible = !prevProps.visible && this.props.visible;
    const transactionChanged = prevProps.initialTransaction !== this.props.initialTransaction;

    if (becameVisible || transactionChanged) {
      this.setState(AddExpenseModal.getInitialStateFromProps(this.props));
    }
  }

  private handleToggleReceipt = (): void => {
    this.setState((prev) => ({
      isReceiptEnabled: !prev.isReceiptEnabled,
      receiptUri: prev.isReceiptEnabled ? undefined : prev.receiptUri,
    }));
  };

  private handleTakePhoto = async (): Promise<void> => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera Permission', 'Camera access is required to take receipt photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const sourceUri = result.assets[0].uri;
        const savedUri = await this.persistReceiptImage(sourceUri);
        this.setState({ receiptUri: savedUri, isReceiptEnabled: true });
      }
    } catch (err) {
      console.warn('Camera error:', err);
      Alert.alert('Error', 'Could not open camera.');
    }
  };

  private handlePickImage = async (): Promise<void> => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Gallery Permission', 'Storage access is required to upload receipt images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const sourceUri = result.assets[0].uri;
        const savedUri = await this.persistReceiptImage(sourceUri);
        this.setState({ receiptUri: savedUri, isReceiptEnabled: true });
      }
    } catch (err) {
      console.warn('Gallery error:', err);
      Alert.alert('Error', 'Could not open gallery.');
    }
  };

  private async persistReceiptImage(tempUri: string): Promise<string> {
    try {
      const dir = `${FileSystem.documentDirectory}receipts/`;
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
      const targetUri = `${dir}receipt_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: tempUri, to: targetUri });
      return targetUri;
    } catch (e) {
      console.warn('Failed to copy receipt to private storage, fallback to temp:', e);
      return tempUri;
    }
  }

  private handleRemoveReceipt = (): void => {
    this.setState({ receiptUri: undefined });
  };

  private handleSave = (): void => {
    const {
      transactionType,
      title,
      amountText,
      selectedCategoryId,
      selectedWalletId,
      isReceiptEnabled,
      receiptUri,
    } = this.state;
    const cleanTitle = title.replace(/[\u0000-\u001F\u007F<>]/g, '').trim();
    const amountNum = parseFloat(amountText);

    const currency = this.props.currencySymbol || '₹';
    if (!cleanTitle) {
      this.setState({ errorMessage: 'Please enter a title (e.g. Lunch, Groceries, Salary)' });
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      this.setState({ errorMessage: `Please enter a valid amount greater than ${currency}0` });
      return;
    }
    if (amountNum > 10000000) {
      this.setState({ errorMessage: 'Amount exceeds transaction safety limit' });
      return;
    }

    const selectedCategory = this.props.categories.find((c) => c.id === selectedCategoryId);
    const categoryName =
      transactionType === 'INCOME'
        ? 'Income'
        : selectedCategory
        ? selectedCategory.name
        : 'Expense';

    const existingTx = this.props.initialTransaction;
    const finalReceiptUri = isReceiptEnabled ? receiptUri : undefined;

    const newTx = new TransactionModel(
      existingTx ? existingTx.id : 'tx-' + Date.now(),
      selectedWalletId,
      selectedCategoryId,
      transactionType,
      cleanTitle,
      `${categoryName} · ${existingTx ? 'Updated · Just now' : 'Today · Just now'}`,
      Math.round(amountNum * 100) / 100,
      existingTx ? existingTx.timestamp : new Date().toISOString(),
      existingTx?.destinationWalletId,
      existingTx?.notes,
      finalReceiptUri
    );

    this.props.onSave(newTx);
    this.setState({
      title: '',
      amountText: '',
      isReceiptEnabled: false,
      receiptUri: undefined,
      errorMessage: '',
    });
    this.props.onClose();
  };

  public render(): React.ReactNode {
    const { visible, categories, wallets, initialTransaction, onClose } = this.props;
    const {
      transactionType,
      title,
      amountText,
      selectedCategoryId,
      selectedWalletId,
      isReceiptEnabled,
      receiptUri,
      errorMessage,
    } = this.state;

    const isEditMode = Boolean(initialTransaction);
    const palette = AppTheme.getPalette(this.props.themeMode);
    const visibleCategories = categories.filter((c) =>
      transactionType === 'INCOME'
        ? c.type === 'INCOME' || c.type === 'BOTH'
        : c.type === 'EXPENSE' || c.type === 'BOTH' || !c.type
    );

    return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.cardBackground }]}>
            <View style={styles.headerRow}>
              <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>
                {isEditMode
                  ? 'Edit Transaction'
                  : transactionType === 'EXPENSE'
                  ? 'Add Expense'
                  : 'Add Income'}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeButton, { backgroundColor: palette.pillBackground }]}
              >
                <Text style={[styles.closeText, { color: palette.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Transaction Type Toggle */}
              <View style={styles.typeToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.typeToggleBtn,
                    transactionType === 'EXPENSE' && styles.typeToggleExpenseActive,
                  ]}
                  onPress={() => this.handleSetTransactionType('EXPENSE')}
                >
                  <Text
                    style={[
                      styles.typeToggleText,
                      transactionType === 'EXPENSE' && styles.typeToggleTextActive,
                    ]}
                  >
                    - Expense
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeToggleBtn,
                    transactionType === 'INCOME' && styles.typeToggleIncomeActive,
                  ]}
                  onPress={() => this.handleSetTransactionType('INCOME')}
                >
                  <Text
                    style={[
                      styles.typeToggleText,
                      transactionType === 'INCOME' && styles.typeToggleTextActive,
                    ]}
                  >
                    + Income
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Amount Input */}
              <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>
                AMOUNT ({this.props.currencySymbol || '₹'})
              </Text>
              <TextInput
                style={[
                  styles.amountInput,
                  {
                    backgroundColor: palette.inputBackground,
                    color: palette.textPrimary,
                    borderColor: palette.borderLight,
                  },
                ]}
                placeholder="0"
                placeholderTextColor="#A0AAB8"
                keyboardType="numeric"
                value={amountText}
                onChangeText={(text) => this.setState({ amountText: text, errorMessage: '' })}
              />

              {/* Title Input */}
              <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>
                {transactionType === 'EXPENSE' ? 'TITLE / MERCHANT' : 'INCOME SOURCE'}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: palette.inputBackground,
                    color: palette.textPrimary,
                    borderColor: palette.borderLight,
                  },
                ]}
                placeholder={
                  transactionType === 'EXPENSE'
                    ? 'e.g. Noodles, Uber, Groceries'
                    : 'e.g. Monthly Salary, Freelance Payout'
                }
                placeholderTextColor="#A0AAB8"
                maxLength={60}
                value={title}
                onChangeText={(text) => this.setState({ title: text, errorMessage: '' })}
              />

              {/* Category Picker (Supports both Expense & Income) */}
              <View>
                <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>
                  {transactionType === 'EXPENSE' ? 'EXPENSE CATEGORY' : 'INCOME CATEGORY'}
                </Text>
                <View style={styles.chipsRow}>
                  {visibleCategories.map((cat) => {
                    const isSelected = cat.id === selectedCategoryId;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: palette.pillBackground,
                            borderColor: palette.borderLight,
                          },
                          isSelected && {
                            backgroundColor: cat.colorHex,
                            borderColor: cat.colorHex,
                          },
                        ]}
                        onPress={() => this.setState({ selectedCategoryId: cat.id })}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: palette.textPrimary },
                            isSelected && { color: '#FFFFFF', fontWeight: '700' },
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Wallet Picker */}
              <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>
                {transactionType === 'EXPENSE' ? 'PAYMENT ACCOUNT' : 'DEPOSIT TO ACCOUNT'}
              </Text>
              <View style={styles.chipsRow}>
                {wallets.map((wallet) => {
                  const isSelected = wallet.id === selectedWalletId;
                  return (
                    <TouchableOpacity
                      key={wallet.id}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: palette.pillBackground,
                          borderColor: palette.borderLight,
                        },
                        isSelected && styles.selectedWalletChip,
                      ]}
                      onPress={() => this.setState({ selectedWalletId: wallet.id })}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: palette.textPrimary },
                          isSelected && { color: '#FFFFFF', fontWeight: '700' },
                        ]}
                      >
                        {wallet.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Receipt Attachment Checkbox */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={this.handleToggleReceipt}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    isReceiptEnabled && styles.checkboxBoxActive,
                  ]}
                >
                  {isReceiptEnabled && <Text style={styles.checkmarkIcon}>✓</Text>}
                </View>
                <Text style={[styles.checkboxLabel, { color: palette.textPrimary }]}>
                  Attach Receipt / Invoice Photo
                </Text>
              </TouchableOpacity>

              {/* Receipt Photo Actions (When Checkbox Enabled) */}
              {isReceiptEnabled && (
                <View style={styles.receiptSection}>
                  <View style={styles.receiptActionButtonsRow}>
                    <TouchableOpacity
                      style={styles.receiptActionButton}
                      onPress={this.handleTakePhoto}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.receiptActionIcon}>📷</Text>
                      <Text style={styles.receiptActionText}>Take Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.receiptActionButton}
                      onPress={this.handlePickImage}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.receiptActionIcon}>📁</Text>
                      <Text style={styles.receiptActionText}>Upload Image</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Thumbnail Preview */}
                  {receiptUri ? (
                    <View style={styles.previewContainer}>
                      <Image source={{ uri: receiptUri }} style={styles.previewImage} />
                      <View style={styles.previewDetailsCol}>
                        <Text style={styles.previewTitle}>Receipt Attached</Text>
                        <Text style={styles.previewSubtitle}>Saved securely in vault</Text>
                        <TouchableOpacity
                          style={styles.removeReceiptBtn}
                          onPress={this.handleRemoveReceipt}
                        >
                          <Text style={styles.removeReceiptText}>✕ Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.noReceiptPrompt}>
                      Tap &quot;Take Photo&quot; or &quot;Upload Image&quot; to capture your receipt.
                    </Text>
                  )}
                </View>
              )}

              {/* Error Alert */}
              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  transactionType === 'INCOME' && {
                    backgroundColor: AppTheme.Colors.transportGreen,
                  },
                ]}
                onPress={this.handleSave}
                activeOpacity={0.85}
              >
                <Text style={styles.submitButtonText}>
                  {isEditMode
                    ? 'Save Changes'
                    : transactionType === 'EXPENSE'
                    ? 'Save Expense'
                    : 'Save Income'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 26, 44, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
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
    color: AppTheme.Colors.primaryNavy,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F3F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    color: AppTheme.Colors.textSecondary,
    fontWeight: 'bold',
  },
  typeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F0F3F8',
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
  },
  typeToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  typeToggleExpenseActive: {
    backgroundColor: '#FFFFFF',
    ...AppTheme.Elevation.softShadow,
  },
  typeToggleIncomeActive: {
    backgroundColor: '#FFFFFF',
    ...AppTheme.Elevation.softShadow,
  },
  typeToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppTheme.Colors.textSecondary,
  },
  typeToggleTextActive: {
    color: AppTheme.Colors.primaryNavy,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: AppTheme.Colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 10,
  },
  amountInput: {
    fontSize: 28,
    fontWeight: '800',
    color: AppTheme.Colors.primaryNavy,
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
    marginBottom: 14,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: AppTheme.Colors.primaryNavy,
    marginBottom: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F7FAFC',
  },
  selectedWalletChip: {
    backgroundColor: AppTheme.Colors.primaryNavy,
    borderColor: AppTheme.Colors.primaryNavy,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppTheme.Colors.textSecondary,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    paddingVertical: 6,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxBoxActive: {
    backgroundColor: AppTheme.Colors.primaryNavy,
    borderColor: AppTheme.Colors.primaryNavy,
  },
  checkmarkIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppTheme.Colors.primaryNavy,
  },
  receiptSection: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  receiptActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  receiptActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
  },
  receiptActionIcon: {
    fontSize: 16,
  },
  receiptActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppTheme.Colors.primaryNavy,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  previewDetailsCol: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: AppTheme.Colors.primaryNavy,
  },
  previewSubtitle: {
    fontSize: 11,
    color: AppTheme.Colors.textMuted,
    marginTop: 2,
  },
  removeReceiptBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  removeReceiptText: {
    fontSize: 12,
    color: '#FF4D4F',
    fontWeight: '700',
  },
  noReceiptPrompt: {
    fontSize: 12,
    color: AppTheme.Colors.textMuted,
    textAlign: 'center',
    marginVertical: 4,
  },
  errorText: {
    color: '#FF4D4F',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: AppTheme.Colors.primaryNavy,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    ...AppTheme.Elevation.softShadow,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
