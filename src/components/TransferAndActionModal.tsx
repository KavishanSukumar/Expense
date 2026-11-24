import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { AppTheme } from '../theme/AppTheme';
import {
  WalletModel,
  CategoryModel,
  TransactionModel,
  WalletType,
  ThirdPartyDetailsModel,
} from '../types';

export type QuickModalMode = 'TRANSFER' | 'SETTLE' | 'WALLETS' | null;

interface TransferAndActionModalProps {
  visible: boolean;
  mode: QuickModalMode;
  sourceWallet?: WalletModel | null;
  wallets: WalletModel[];
  categories: CategoryModel[];
  currencySymbol?: string;
  themeMode?: 'light' | 'dark';
  onClose: () => void;
  onExecuteTransaction: (tx: TransactionModel) => Promise<void>;
  onSettleCreditCard: (cardId: string, sourceWalletId: string, amount: number) => Promise<void>;
  onSelectPrimaryWallet: (walletId: string) => Promise<void>;
  onAddWallet: (wallet: WalletModel) => Promise<void>;
  onDeleteWallet?: (walletId: string) => Promise<void>;
}

interface TransferAndActionModalState {
  transferType: 'INTERNAL' | 'THIRD_PARTY';
  sourceWalletId: string;
  destWalletId: string;
  transferAmountText: string;
  transferNote: string;
  recipientName: string;
  upiOrAccount: string;
  ifscCode: string;
  settleSourceWalletId: string;
  settleAmountText: string;
  newWalletName: string;
  newWalletBalanceText: string;
  newWalletCreditLimitText: string;
  newWalletType: WalletType;
  newWalletNetwork: 'VISA' | 'MASTERCARD';
  newWalletColorHex: string;
  errorMessage: string;
  successMessage: string;
}

export class TransferAndActionModal extends React.Component<
  TransferAndActionModalProps,
  TransferAndActionModalState
> {
  constructor(props: TransferAndActionModalProps) {
    super(props);
    const primary = props.sourceWallet || props.wallets[0];
    const secondary = props.wallets.find((w) => w.id !== primary?.id) || props.wallets[1];

    this.state = {
      transferType: 'INTERNAL',
      sourceWalletId: primary?.id || 'w-main-1',
      destWalletId: secondary?.id || 'w-sub-2',
      transferAmountText: '',
      transferNote: '',
      recipientName: '',
      upiOrAccount: '',
      ifscCode: '',
      settleSourceWalletId:
        props.wallets.find((w) => w.type !== 'CREDIT_CARD')?.id || props.wallets[0]?.id || '',
      settleAmountText: '',
      newWalletName: '',
      newWalletBalanceText: '',
      newWalletCreditLimitText: '',
      newWalletType: 'SAVINGS_ACCOUNT',
      newWalletNetwork: 'VISA',
      newWalletColorHex: '#1E293B',
      errorMessage: '',
      successMessage: '',
    };
  }

  public componentDidUpdate(prevProps: TransferAndActionModalProps): void {
    if (
      (prevProps.visible !== this.props.visible && this.props.visible) ||
      prevProps.sourceWallet !== this.props.sourceWallet ||
      prevProps.wallets !== this.props.wallets
    ) {
      const primary = this.props.sourceWallet || this.props.wallets[0];
      const secondary =
        this.props.wallets.find((w) => w.id !== primary?.id) || this.props.wallets[1];
      const defaultSettleSource =
        this.props.wallets.find((w) => w.type !== 'CREDIT_CARD')?.id ||
        this.props.wallets[0]?.id ||
        '';

      let defaultSettleAmount = '';
      if (primary && primary.type === 'CREDIT_CARD') {
        const limit = primary.creditLimit || primary.balance;
        const due = Math.max(0, limit - primary.balance);
        if (due > 0) defaultSettleAmount = due.toString();
      }

      this.setState({
        sourceWalletId: primary ? primary.id : 'w-main-1',
        destWalletId: secondary ? secondary.id : primary ? primary.id : 'w-sub-2',
        settleSourceWalletId: defaultSettleSource,
        settleAmountText: defaultSettleAmount,
        errorMessage: '',
        successMessage: '',
      });
    }
  }

  private sanitizeInput(raw: string): string {
    return raw.replace(/[\u0000-\u001F\u007F<>]/g, '').trim();
  }

  private handleExecuteTransfer = async (): Promise<void> => {
    const {
      transferType,
      sourceWalletId,
      destWalletId,
      transferAmountText,
      transferNote,
      recipientName,
      upiOrAccount,
      ifscCode,
    } = this.state;
    const { wallets } = this.props;
    const currency = this.props.currencySymbol || '₹';

    const amountNum = parseFloat(transferAmountText);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      this.setState({ errorMessage: `Enter a valid transfer amount greater than ${currency}0.` });
      return;
    }
    if (amountNum > 10000000) {
      this.setState({ errorMessage: 'Transfer amount exceeds safety limit.' });
      return;
    }

    const sourceWallet = wallets.find((w) => w.id === sourceWalletId);
    if (!sourceWallet) {
      this.setState({ errorMessage: 'Source account could not be found.' });
      return;
    }

    if (amountNum > sourceWallet.balance) {
      this.setState({
        errorMessage: `Insufficient funds in ${sourceWallet.name} (Available: ${currency}${sourceWallet.balance.toLocaleString('en-IN')}).`,
      });
      return;
    }

    const cleanNote = this.sanitizeInput(transferNote);

    if (transferType === 'INTERNAL') {
      if (sourceWalletId === destWalletId) {
        this.setState({ errorMessage: 'Source and destination accounts must be different.' });
        return;
      }
      const destWallet = wallets.find((w) => w.id === destWalletId);
      if (!destWallet) {
        this.setState({ errorMessage: 'Destination account could not be found.' });
        return;
      }

      const tx = new TransactionModel(
        'tx-trf-' + Date.now(),
        sourceWallet.id,
        'cat-transport',
        'TRANSFER',
        cleanNote || `Transfer to ${destWallet.name}`,
        `${sourceWallet.name} ➔ ${destWallet.name} · Just now`,
        Math.round(amountNum * 100) / 100,
        new Date().toISOString(),
        destWallet.id,
        cleanNote
      );

      try {
        await this.props.onExecuteTransaction(tx);
        this.setState({
          transferAmountText: '',
          transferNote: '',
          successMessage: `Successfully transferred ${currency}${amountNum.toLocaleString('en-IN')} to ${destWallet.name}.`,
          errorMessage: '',
        });
        setTimeout(() => this.props.onClose(), 800);
      } catch (err: unknown) {
        const error = err as Error;
        this.setState({ errorMessage: error.message || 'Transfer failed.' });
      }
    } else {
      // Third-party transfer
      const cleanName = this.sanitizeInput(recipientName);
      const cleanAccount = this.sanitizeInput(upiOrAccount);
      const cleanIfsc = this.sanitizeInput(ifscCode);

      if (!cleanName) {
        this.setState({ errorMessage: 'Please enter recipient name.' });
        return;
      }
      if (!cleanAccount) {
        this.setState({ errorMessage: 'Please enter recipient UPI ID or Account Number.' });
        return;
      }

      const thirdPartyDetails = new ThirdPartyDetailsModel(cleanName, cleanAccount, cleanIfsc);
      const tx = new TransactionModel(
        'tx-trf3p-' + Date.now(),
        sourceWallet.id,
        'cat-shopping',
        'TRANSFER',
        `Sent to ${cleanName}`,
        `${sourceWallet.name} ➔ ${cleanName} (${cleanAccount})`,
        Math.round(amountNum * 100) / 100,
        new Date().toISOString(),
        undefined,
        cleanNote || `Third-party transfer to ${cleanName}`,
        undefined,
        thirdPartyDetails
      );

      try {
        await this.props.onExecuteTransaction(tx);
        this.setState({
          transferAmountText: '',
          transferNote: '',
          recipientName: '',
          upiOrAccount: '',
          ifscCode: '',
          successMessage: `Successfully sent ${currency}${amountNum.toLocaleString('en-IN')} to ${cleanName}.`,
          errorMessage: '',
        });
        setTimeout(() => this.props.onClose(), 800);
      } catch (err: unknown) {
        const error = err as Error;
        this.setState({ errorMessage: error.message || 'Transfer failed.' });
      }
    }
  };

  private handleExecuteSettlement = async (): Promise<void> => {
    const { sourceWallet } = this.props;
    const { settleSourceWalletId, settleAmountText } = this.state;

    if (!sourceWallet || sourceWallet.type !== 'CREDIT_CARD') {
      this.setState({ errorMessage: 'Active card is not a credit card.' });
      return;
    }

    const currency = this.props.currencySymbol || '₹';
    const amountNum = parseFloat(settleAmountText);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      this.setState({ errorMessage: `Enter a valid settlement amount greater than ${currency}0.` });
      return;
    }

    try {
      await this.props.onSettleCreditCard(sourceWallet.id, settleSourceWalletId, amountNum);
      this.setState({
        settleAmountText: '',
        successMessage: `Credit card bill of ${currency}${amountNum.toLocaleString('en-IN')} settled successfully!`,
        errorMessage: '',
      });
      setTimeout(() => this.props.onClose(), 900);
    } catch (err: unknown) {
      const error = err as Error;
      this.setState({ errorMessage: error.message || 'Settlement failed.' });
    }
  };

  private handleCreateWallet = async (): Promise<void> => {
    const {
      newWalletName,
      newWalletBalanceText,
      newWalletCreditLimitText,
      newWalletType,
      newWalletNetwork,
      newWalletColorHex,
    } = this.state;

    const cleanName = this.sanitizeInput(newWalletName);
    const balanceNum = parseFloat(newWalletBalanceText);

    if (!cleanName) {
      this.setState({ errorMessage: 'Please enter account/card name.' });
      return;
    }
    if (!Number.isFinite(balanceNum) || balanceNum < 0) {
      this.setState({ errorMessage: 'Please enter a valid initial balance.' });
      return;
    }

    let creditLimitNum: number | undefined;
    if (newWalletType === 'CREDIT_CARD') {
      creditLimitNum = parseFloat(newWalletCreditLimitText);
      if (!Number.isFinite(creditLimitNum) || creditLimitNum <= 0) {
        this.setState({ errorMessage: 'Please enter a valid total credit limit.' });
        return;
      }
      if (balanceNum > creditLimitNum) {
        this.setState({ errorMessage: 'Available limit cannot exceed total credit limit.' });
        return;
      }
    }

    const newWallet = new WalletModel(
      'w-user-' + Date.now(),
      cleanName,
      newWalletType,
      balanceNum,
      '•••• •••• •••• ••••',
      newWalletNetwork,
      false,
      creditLimitNum,
      newWalletColorHex
    );

    try {
      await this.props.onAddWallet(newWallet);
      this.setState({
        newWalletName: '',
        newWalletBalanceText: '',
        newWalletCreditLimitText: '',
        successMessage: `Added "${cleanName}" successfully.`,
        errorMessage: '',
      });
    } catch (err: unknown) {
      const error = err as Error;
      this.setState({ errorMessage: error.message || 'Could not add wallet.' });
    }
  };

  private handleDeleteWalletItem = (walletId: string): void => {
    if (!this.props.onDeleteWallet) return;
    Alert.alert(
      'Delete Card',
      'Are you sure you want to delete this card? All card records will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (this.props.onDeleteWallet) {
              await this.props.onDeleteWallet(walletId);
            }
          },
        },
      ]
    );
  };

  public render(): React.ReactNode {
    const { visible, mode, sourceWallet, wallets, onClose, onSelectPrimaryWallet } = this.props;
    const {
      transferType,
      sourceWalletId,
      destWalletId,
      transferAmountText,
      transferNote,
      recipientName,
      upiOrAccount,
      ifscCode,
      settleSourceWalletId,
      settleAmountText,
      newWalletName,
      newWalletBalanceText,
      newWalletCreditLimitText,
      newWalletType,
      newWalletNetwork,
      newWalletColorHex,
      errorMessage,
      successMessage,
    } = this.state;

    const activeCard = sourceWallet || wallets.find((w) => w.id === sourceWalletId) || wallets[0];
    const isCreditCard = activeCard?.type === 'CREDIT_CARD';
    const totalLimit = activeCard?.creditLimit || (isCreditCard ? 50000 : 0);
    const availableLimit = activeCard?.balance || 0;
    const currentDue = isCreditCard ? Math.max(0, totalLimit - availableLimit) : 0;

    const palette = AppTheme.getPalette(this.props.themeMode);

    return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.cardBackground }]}>
            {/* Header */}
            <View style={styles.headerRow}>
              <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>
                {mode === 'TRANSFER'
                  ? 'Transfer Money'
                  : mode === 'SETTLE'
                  ? 'Credit Card Settlement'
                  : 'Manage Cards & Accounts'}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeButton, { backgroundColor: palette.pillBackground }]}
              >
                <Text style={[styles.closeText, { color: palette.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Error or Success notification */}
            {errorMessage ? <Text style={styles.errorBanner}>{errorMessage}</Text> : null}
            {successMessage ? <Text style={styles.successBanner}>{successMessage}</Text> : null}

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* ===================== MODE: TRANSFER ===================== */}
              {mode === 'TRANSFER' && (
                <View>
                  {/* From Account Preview */}
                  <View style={styles.cardPreviewBadge}>
                    <Text style={styles.cardPreviewLabel}>TRANSFERRING FROM</Text>
                    <View style={styles.cardPreviewRow}>
                      <Text style={styles.cardPreviewName}>{activeCard?.name}</Text>
                      <Text style={styles.cardPreviewBalance}>
                        Available: {this.props.currencySymbol || '₹'}{activeCard?.balance.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>

                  {/* Transfer Destination Toggle: Internal vs Third Party */}
                  <View style={styles.typeToggleRow}>
                    <TouchableOpacity
                      style={[
                        styles.typeToggleBtn,
                        transferType === 'INTERNAL' && styles.typeToggleActive,
                      ]}
                      onPress={() => this.setState({ transferType: 'INTERNAL', errorMessage: '' })}
                    >
                      <Text
                        style={[
                          styles.typeToggleText,
                          transferType === 'INTERNAL' && styles.typeToggleTextActive,
                        ]}
                      >
                        To My Card / Account
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.typeToggleBtn,
                        transferType === 'THIRD_PARTY' && styles.typeToggleActive,
                      ]}
                      onPress={() =>
                        this.setState({ transferType: 'THIRD_PARTY', errorMessage: '' })
                      }
                    >
                      <Text
                        style={[
                          styles.typeToggleText,
                          transferType === 'THIRD_PARTY' && styles.typeToggleTextActive,
                        ]}
                      >
                        To Third Party
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* If Internal: Pick from added wallets */}
                  {transferType === 'INTERNAL' ? (
                    <View>
                      <Text style={styles.inputLabel}>TRANSFER TO ACCOUNT</Text>
                      <View style={styles.chipsRow}>
                        {wallets
                          .filter((w) => w.id !== activeCard?.id)
                          .map((wallet) => {
                            const isSelected = wallet.id === destWalletId;
                            return (
                              <TouchableOpacity
                                key={wallet.id}
                                style={[styles.chip, isSelected && styles.selectedChip]}
                                onPress={() => this.setState({ destWalletId: wallet.id })}
                              >
                                <Text
                                  style={[
                                    styles.chipText,
                                    isSelected && { color: '#FFFFFF', fontWeight: '700' },
                                  ]}
                                >
                                  {wallet.name} ({this.props.currencySymbol || '₹'}{wallet.balance.toLocaleString('en-IN')})
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                      </View>
                    </View>
                  ) : (
                    /* If Third Party: Enter Beneficiary Info */
                    <View>
                      <Text style={styles.inputLabel}>BENEFICIARY NAME</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. Ramesh Kumar, Landlord, Store"
                        placeholderTextColor="#A0AAB8"
                        maxLength={50}
                        value={recipientName}
                        onChangeText={(text) =>
                          this.setState({ recipientName: text, errorMessage: '' })
                        }
                      />

                      <Text style={styles.inputLabel}>UPI ID OR ACCOUNT NUMBER</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. user@oksbi, 9876543210@paytm, or Acc No"
                        placeholderTextColor="#A0AAB8"
                        maxLength={50}
                        value={upiOrAccount}
                        onChangeText={(text) =>
                          this.setState({ upiOrAccount: text, errorMessage: '' })
                        }
                      />

                      <Text style={styles.inputLabel}>IFSC CODE (OPTIONAL)</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. SBIN0001234 (For Bank Transfer)"
                        placeholderTextColor="#A0AAB8"
                        autoCapitalize="characters"
                        maxLength={15}
                        value={ifscCode}
                        onChangeText={(text) =>
                          this.setState({ ifscCode: text, errorMessage: '' })
                        }
                      />
                    </View>
                  )}

                  {/* Transfer Amount Input */}
                  <Text style={styles.inputLabel}>AMOUNT ({this.props.currencySymbol || '₹'})</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0"
                    placeholderTextColor="#A0AAB8"
                    keyboardType="numeric"
                    value={transferAmountText}
                    onChangeText={(text) =>
                      this.setState({ transferAmountText: text, errorMessage: '' })
                    }
                  />

                  {/* Note */}
                  <Text style={styles.inputLabel}>NOTE (OPTIONAL)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Rent, Repayment, Dinner split"
                    placeholderTextColor="#A0AAB8"
                    maxLength={60}
                    value={transferNote}
                    onChangeText={(text) =>
                      this.setState({ transferNote: text, errorMessage: '' })
                    }
                  />

                  {/* Submit Transfer Button */}
                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={this.handleExecuteTransfer}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.submitBtnText}>Confirm Transfer</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ===================== MODE: SETTLE CREDIT CARD ===================== */}
              {mode === 'SETTLE' && (
                <View>
                  {/* Credit Card Dues Overview */}
                  <View style={styles.settleSummaryCard}>
                    <Text style={styles.settleCardName}>{activeCard?.name}</Text>
                    <View style={styles.settleRow}>
                      <Text style={styles.settleLabel}>Total Credit Limit:</Text>
                      <Text style={styles.settleVal}>{this.props.currencySymbol || '₹'}{totalLimit.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.settleRow}>
                      <Text style={styles.settleLabel}>Available Limit:</Text>
                      <Text style={styles.settleVal}>
                        {this.props.currencySymbol || '₹'}{availableLimit.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <View style={[styles.settleRow, styles.dueHighlightRow]}>
                      <Text style={styles.dueHighlightLabel}>Current Outstanding Due:</Text>
                      <Text style={styles.dueHighlightVal}>
                        {this.props.currencySymbol || '₹'}{currentDue.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>

                  {/* Pay From Account Selection */}
                  <Text style={styles.inputLabel}>PAY FROM BANK ACCOUNT / WALLET</Text>
                  <View style={styles.chipsRow}>
                    {wallets
                      .filter((w) => w.type !== 'CREDIT_CARD')
                      .map((wallet) => {
                        const isSelected = wallet.id === settleSourceWalletId;
                        return (
                          <TouchableOpacity
                            key={wallet.id}
                            style={[styles.chip, isSelected && styles.selectedChip]}
                            onPress={() => this.setState({ settleSourceWalletId: wallet.id })}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                isSelected && { color: '#FFFFFF', fontWeight: '700' },
                              ]}
                            >
                              {wallet.name} ({this.props.currencySymbol || '₹'}{wallet.balance.toLocaleString('en-IN')})
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                  </View>

                  {/* Settlement Amount */}
                  <View style={styles.amountLabelRow}>
                    <Text style={styles.inputLabel}>SETTLEMENT AMOUNT ({this.props.currencySymbol || '₹'})</Text>
                    {currentDue > 0 && (
                      <TouchableOpacity
                        onPress={() => this.setState({ settleAmountText: currentDue.toString() })}
                      >
                        <Text style={styles.payFullBtnText}>Pay Full ({this.props.currencySymbol || '₹'}{currentDue})</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0"
                    placeholderTextColor="#A0AAB8"
                    keyboardType="numeric"
                    value={settleAmountText}
                    onChangeText={(text) =>
                      this.setState({ settleAmountText: text, errorMessage: '' })
                    }
                  />

                  {/* Submit Settlement */}
                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: AppTheme.Colors.transportGreen }]}
                    onPress={this.handleExecuteSettlement}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.submitBtnText}>Pay & Settle Credit Card</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ===================== MODE: WALLETS ===================== */}
              {mode === 'WALLETS' && (
                <View>
                  <Text style={styles.inputLabel}>YOUR ADDED ACCOUNTS & CARDS</Text>
                  {wallets.map((wallet) => (
                    <View key={wallet.id} style={styles.walletListItem}>
                      <View style={styles.walletInfoCol}>
                        <View style={styles.walletTitleRow}>
                          <Text style={styles.walletItemName}>{wallet.name}</Text>
                          {wallet.isPrimary && (
                            <View style={styles.primaryBadge}>
                              <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.walletItemDetails}>
                          {wallet.type.replace('_', ' ')} • Available: {this.props.currencySymbol || '₹'}
                          {wallet.balance.toLocaleString('en-IN')}
                          {wallet.creditLimit ? ` / Limit: ${this.props.currencySymbol || '₹'}${wallet.creditLimit}` : ''}
                        </Text>
                      </View>

                      <View style={styles.walletActionsCol}>
                        {!wallet.isPrimary && (
                          <TouchableOpacity
                            style={styles.setPrimaryBtn}
                            onPress={() => onSelectPrimaryWallet(wallet.id)}
                          >
                            <Text style={styles.setPrimaryText}>Set Active</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.deleteWalletBtn}
                          onPress={() => this.handleDeleteWalletItem(wallet.id)}
                        >
                          <Text style={styles.deleteWalletIcon}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  <View style={styles.divider} />

                  <Text style={styles.sectionSubHeading}>Add New Card or Account</Text>

                  <Text style={styles.inputLabel}>ACCOUNT / CARD NAME</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. HDFC Regalia, SBI Current"
                    placeholderTextColor="#A0AAB8"
                    maxLength={40}
                    value={newWalletName}
                    onChangeText={(text) =>
                      this.setState({ newWalletName: text, errorMessage: '' })
                    }
                  />

                  <Text style={styles.inputLabel}>ACCOUNT TYPE</Text>
                  <View style={styles.chipsRow}>
                    {(
                      [
                        'SAVINGS_ACCOUNT',
                        'CREDIT_CARD',
                        'CASH_ACCOUNT',
                        'DIGITAL_WALLET',
                      ] as WalletType[]
                    ).map((type) => {
                      const isSelected = newWalletType === type;
                      return (
                        <TouchableOpacity
                          key={type}
                          style={[styles.chip, isSelected && styles.selectedChip]}
                          onPress={() => this.setState({ newWalletType: type })}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              isSelected && { color: '#FFFFFF', fontWeight: '700' },
                            ]}
                          >
                            {type.replace('_', ' ')}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* If Credit Card: Credit Limit Input */}
                  {newWalletType === 'CREDIT_CARD' && (
                    <View>
                      <Text style={styles.inputLabel}>TOTAL CREDIT LIMIT ({this.props.currencySymbol || '₹'})</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. 100000"
                        placeholderTextColor="#A0AAB8"
                        keyboardType="numeric"
                        value={newWalletCreditLimitText}
                        onChangeText={(text) =>
                          this.setState({ newWalletCreditLimitText: text, errorMessage: '' })
                        }
                      />
                    </View>
                  )}

                  <Text style={styles.inputLabel}>
                    {newWalletType === 'CREDIT_CARD'
                      ? `AVAILABLE CREDIT BALANCE (${this.props.currencySymbol || '₹'})`
                      : `INITIAL BALANCE (${this.props.currencySymbol || '₹'})`}
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0"
                    placeholderTextColor="#A0AAB8"
                    keyboardType="numeric"
                    value={newWalletBalanceText}
                    onChangeText={(text) =>
                      this.setState({ newWalletBalanceText: text, errorMessage: '' })
                    }
                  />

                  <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>CARD THEME COLOR</Text>
                  <View style={styles.colorPickerRow}>
                    {[
                      '#1E293B',
                      '#312E81',
                      '#064E3B',
                      '#881337',
                      '#4C1D95',
                      '#78350F',
                      '#18181B',
                      '#134E4A',
                      '#1E3A8A',
                      '#701A75',
                    ].map((color) => {
                      const isSelected = newWalletColorHex === color;
                      return (
                        <TouchableOpacity
                          key={color}
                          style={[
                            styles.colorCircle,
                            { backgroundColor: color },
                            isSelected && styles.colorCircleSelected,
                          ]}
                          onPress={() => this.setState({ newWalletColorHex: color })}
                          activeOpacity={0.8}
                        >
                          {isSelected && <Text style={styles.colorCheckmark}>✓</Text>}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>CARD NETWORK</Text>
                  <View style={styles.chipsRow}>
                    {(['VISA', 'MASTERCARD'] as const).map((net) => {
                      const isSelected = newWalletNetwork === net;
                      return (
                        <TouchableOpacity
                          key={net}
                          style={[
                            styles.chip,
                            { backgroundColor: palette.pillBackground, borderColor: palette.borderLight },
                            isSelected && styles.selectedChip,
                          ]}
                          onPress={() => this.setState({ newWalletNetwork: net })}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              { color: palette.textPrimary },
                              isSelected && { color: '#FFFFFF', fontWeight: '700' },
                            ]}
                          >
                            {net}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={this.handleCreateWallet}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.submitBtnText}>Add Card to Vault</Text>
                  </TouchableOpacity>
                </View>
              )}
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
  cardPreviewBadge: {
    backgroundColor: '#F0F4F9',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  cardPreviewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: AppTheme.Colors.textMuted,
    letterSpacing: 0.6,
  },
  cardPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  cardPreviewName: {
    fontSize: 16,
    fontWeight: '700',
    color: AppTheme.Colors.primaryNavy,
  },
  cardPreviewBalance: {
    fontSize: 13,
    fontWeight: '600',
    color: AppTheme.Colors.vehicleBlue,
  },
  typeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F0F3F8',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  typeToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  typeToggleActive: {
    backgroundColor: '#FFFFFF',
    ...AppTheme.Elevation.softShadow,
  },
  typeToggleText: {
    fontSize: 13,
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
  amountLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  payFullBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: AppTheme.Colors.vehicleBlue,
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
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F7FAFC',
  },
  selectedChip: {
    backgroundColor: AppTheme.Colors.primaryNavy,
    borderColor: AppTheme.Colors.primaryNavy,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: AppTheme.Colors.textSecondary,
  },
  settleSummaryCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  settleCardName: {
    fontSize: 18,
    fontWeight: '800',
    color: AppTheme.Colors.primaryNavy,
    marginBottom: 10,
  },
  settleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  settleLabel: {
    fontSize: 13,
    color: AppTheme.Colors.textSecondary,
  },
  settleVal: {
    fontSize: 14,
    fontWeight: '600',
    color: AppTheme.Colors.primaryNavy,
  },
  dueHighlightRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  dueHighlightLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF5757',
  },
  dueHighlightVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FF5757',
  },
  walletListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  walletInfoCol: {
    flex: 1,
  },
  walletTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: AppTheme.Colors.primaryNavy,
  },
  primaryBadge: {
    backgroundColor: 'rgba(42, 199, 105, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2AC769',
  },
  walletItemDetails: {
    fontSize: 12,
    color: AppTheme.Colors.textSecondary,
    marginTop: 3,
  },
  walletActionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setPrimaryBtn: {
    backgroundColor: '#EBF3FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  setPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: AppTheme.Colors.vehicleBlue,
  },
  deleteWalletBtn: {
    padding: 6,
  },
  deleteWalletIcon: {
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 18,
  },
  sectionSubHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: AppTheme.Colors.primaryNavy,
    marginBottom: 10,
  },
  errorBanner: {
    backgroundColor: '#FFF2F0',
    color: '#FF4D4F',
    padding: 10,
    borderRadius: 10,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  successBanner: {
    backgroundColor: '#F6FFED',
    color: '#52C41A',
    padding: 10,
    borderRadius: 10,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: AppTheme.Colors.primaryNavy,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 20,
    ...AppTheme.Elevation.softShadow,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  colorPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 6,
    overflow: 'visible',
  },
  colorCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorCircleSelected: {
    borderColor: '#3B82F6',
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
    zIndex: 10,
    elevation: 3,
  },
  colorCheckmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
