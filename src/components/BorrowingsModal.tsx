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
import { AppTheme, ThemeMode } from '../theme/AppTheme';
import { BorrowingModel, BorrowingType } from '../types';
import { SwipeableRow } from './SwipeableRow';

interface BorrowingsModalProps {
  visible: boolean;
  borrowings: BorrowingModel[];
  currencySymbol?: string;
  themeMode?: ThemeMode;
  onClose: () => void;
  onAddBorrowing: (item: BorrowingModel) => Promise<void>;
  onUpdateBorrowing: (item: BorrowingModel) => Promise<void>;
  onDeleteBorrowing: (id: string) => Promise<void>;
  onSettleBorrowing: (id: string) => Promise<void>;
}

interface BorrowingsModalState {
  activeTab: 'ALL' | 'BORROWED' | 'LENT';
  isAdding: boolean;
  editingId?: string;
  personName: string;
  amountText: string;
  borrowingType: BorrowingType;
  estimatedDateText: string;
  notes: string;
  notificationEnabled: boolean;
  errorMessage: string;
}

export class BorrowingsModal extends React.Component<
  BorrowingsModalProps,
  BorrowingsModalState
> {
  constructor(props: BorrowingsModalProps) {
    super(props);
    const defaultDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    this.state = {
      activeTab: 'ALL',
      isAdding: false,
      editingId: undefined,
      personName: '',
      amountText: '',
      borrowingType: 'BORROWED',
      estimatedDateText: defaultDate,
      notes: '',
      notificationEnabled: true,
      errorMessage: '',
    };
  }

  private sanitizeInput(raw: string): string {
    return raw.replace(/[\u0000-\u001F\u007F<>]/g, '').trim();
  }

  private handleOpenAdd = (): void => {
    const defaultDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    this.setState({
      isAdding: true,
      editingId: undefined,
      personName: '',
      amountText: '',
      borrowingType: 'BORROWED',
      estimatedDateText: defaultDate,
      notes: '',
      notificationEnabled: true,
      errorMessage: '',
    });
  };

  private handleStartEdit = (item: BorrowingModel): void => {
    const dateFormatted = item.estimatedPaymentDate.split('T')[0];
    this.setState({
      isAdding: true,
      editingId: item.id,
      personName: item.personName,
      amountText: item.amount.toString(),
      borrowingType: item.type,
      estimatedDateText: dateFormatted,
      notes: item.notes || '',
      notificationEnabled: item.notificationEnabled,
      errorMessage: '',
    });
  };

  private handleSave = async (): Promise<void> => {
    const {
      editingId,
      personName,
      amountText,
      borrowingType,
      estimatedDateText,
      notes,
      notificationEnabled,
    } = this.state;

    const cleanName = this.sanitizeInput(personName);
    const cleanNotes = this.sanitizeInput(notes);
    const amountNum = parseFloat(amountText);

    const currency = this.props.currencySymbol || '₹';
    if (!cleanName) {
      this.setState({ errorMessage: 'Please enter a person/party name.' });
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      this.setState({ errorMessage: `Please enter a valid amount greater than ${currency}0.` });
      return;
    }

    let isoDate: string;
    try {
      const parsed = new Date(estimatedDateText);
      if (isNaN(parsed.getTime())) {
        throw new Error('Invalid date');
      }
      isoDate = parsed.toISOString();
    } catch {
      this.setState({ errorMessage: 'Please enter a valid date in YYYY-MM-DD format.' });
      return;
    }

    if (editingId) {
      const updated = new BorrowingModel(
        editingId,
        cleanName,
        Math.round(amountNum * 100) / 100,
        borrowingType,
        isoDate,
        cleanNotes || undefined,
        false,
        undefined,
        new Date().toISOString(),
        notificationEnabled
      );
      await this.props.onUpdateBorrowing(updated);
    } else {
      const newItem = new BorrowingModel(
        'due-' + Date.now(),
        cleanName,
        Math.round(amountNum * 100) / 100,
        borrowingType,
        isoDate,
        cleanNotes || undefined,
        false,
        undefined,
        new Date().toISOString(),
        notificationEnabled
      );
      await this.props.onAddBorrowing(newItem);
    }

    this.setState({
      isAdding: false,
      editingId: undefined,
      personName: '',
      amountText: '',
      notes: '',
      errorMessage: '',
    });
  };

  private handleSettleDue = (item: BorrowingModel): void => {
    const isBorrowed = item.type === 'BORROWED';
    const actionLabel = isBorrowed ? 'Mark as Paid / Returned' : 'Mark as Received / Settled';
    const currency = this.props.currencySymbol || '₹';

    Alert.alert(
      actionLabel,
      `Confirm settlement of ${currency}${item.amount.toLocaleString('en-IN')} with ${item.personName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Settle',
          onPress: async () => {
            await this.props.onSettleBorrowing(item.id);
          },
        },
      ]
    );
  };

  public render(): React.ReactNode {
    const { visible, borrowings, currencySymbol = '₹', themeMode = 'light', onClose, onDeleteBorrowing } = this.props;
    const {
      activeTab,
      isAdding,
      editingId,
      personName,
      amountText,
      borrowingType,
      estimatedDateText,
      notes,
      notificationEnabled,
      errorMessage,
    } = this.state;

    const palette = AppTheme.getPalette(themeMode);

    const filtered = borrowings.filter((b) => {
      if (activeTab === 'BORROWED') return b.type === 'BORROWED';
      if (activeTab === 'LENT') return b.type === 'LENT';
      return true;
    });

    const totalToReturn = borrowings
      .filter((b) => b.type === 'BORROWED' && !b.isSettled)
      .reduce((sum, b) => sum + b.amount, 0);

    const totalToReceive = borrowings
      .filter((b) => b.type === 'LENT' && !b.isSettled)
      .reduce((sum, b) => sum + b.amount, 0);

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
            {/* Header */}
            <View style={styles.headerRow}>
              <View>
                <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>
                  Borrowings & Dues Tracker
                </Text>
                <Text style={[styles.headerSubtitle, { color: palette.textSecondary }]}>
                  Swipe right to delete • Swipe left to edit
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeButton, { backgroundColor: palette.pillBackground }]}
              >
                <Text style={[styles.closeText, { color: palette.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Overview Summary Badges */}
            <View style={styles.summaryRow}>
              <View
                style={[
                  styles.summaryBox,
                  {
                    backgroundColor:
                      themeMode === 'dark' ? 'rgba(255, 77, 79, 0.15)' : '#FFF2F0',
                  },
                ]}
              >
                <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>
                  I Have to Return
                </Text>
                <Text style={[styles.summaryAmount, { color: '#FF4D4F' }]}>
                  {currencySymbol}{totalToReturn.toLocaleString('en-IN')}
                </Text>
              </View>
              <View
                style={[
                  styles.summaryBox,
                  {
                    backgroundColor:
                      themeMode === 'dark' ? 'rgba(82, 196, 26, 0.15)' : '#F6FFED',
                  },
                ]}
              >
                <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>
                  Owed to Me
                </Text>
                <Text style={[styles.summaryAmount, { color: '#52C41A' }]}>
                  {currencySymbol}{totalToReceive.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {isAdding ? (
              /* Add / Edit Form */
              <ScrollView showsVerticalScrollIndicator={false} style={styles.formScrollView}>
                <Text style={[styles.formHeaderTitle, { color: palette.textPrimary }]}>
                  {editingId ? 'Edit Record' : 'Add Borrowing / Lending Record'}
                </Text>

                {/* Type Selection */}
                <View style={styles.typeToggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.typeToggleBtn,
                      { backgroundColor: palette.pillBackground, borderColor: palette.borderLight },
                      borrowingType === 'BORROWED' && styles.typeToggleBorrowedActive,
                    ]}
                    onPress={() => this.setState({ borrowingType: 'BORROWED' })}
                  >
                    <Text
                      style={[
                        styles.typeToggleText,
                        { color: palette.textSecondary },
                        borrowingType === 'BORROWED' && styles.typeToggleTextActive,
                      ]}
                    >
                      I Borrowed (To Return)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeToggleBtn,
                      { backgroundColor: palette.pillBackground, borderColor: palette.borderLight },
                      borrowingType === 'LENT' && styles.typeToggleLentActive,
                    ]}
                    onPress={() => this.setState({ borrowingType: 'LENT' })}
                  >
                    <Text
                      style={[
                        styles.typeToggleText,
                        { color: palette.textSecondary },
                        borrowingType === 'LENT' && styles.typeToggleTextActive,
                      ]}
                    >
                      I Lent (To Receive)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Person Name */}
                <Text style={[styles.inputLabel, { color: palette.textMuted }]}>
                  PERSON / CONTACT NAME
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
                  placeholder="e.g. Ramesh, Rahul, Landlord, Store"
                  placeholderTextColor={palette.textMuted}
                  value={personName}
                  maxLength={50}
                  onChangeText={(text) => this.setState({ personName: text, errorMessage: '' })}
                />

                {/* Amount */}
                <Text style={[styles.inputLabel, { color: palette.textMuted }]}>
                  AMOUNT ({currencySymbol})
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
                  placeholder="0"
                  placeholderTextColor={palette.textMuted}
                  keyboardType="numeric"
                  value={amountText}
                  onChangeText={(text) => this.setState({ amountText: text, errorMessage: '' })}
                />

                {/* Estimated Payment Date */}
                <Text style={[styles.inputLabel, { color: palette.textMuted }]}>
                  ESTIMATED RETURN DATE (YYYY-MM-DD)
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
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={palette.textMuted}
                  value={estimatedDateText}
                  maxLength={10}
                  onChangeText={(text) =>
                    this.setState({ estimatedDateText: text, errorMessage: '' })
                  }
                />

                {/* Notes */}
                <Text style={[styles.inputLabel, { color: palette.textMuted }]}>
                  NOTES (OPTIONAL)
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
                  placeholder="e.g. Emergency medical, Split trip bill"
                  placeholderTextColor={palette.textMuted}
                  value={notes}
                  maxLength={70}
                  onChangeText={(text) => this.setState({ notes: text, errorMessage: '' })}
                />

                {/* Notification Checkbox */}
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() =>
                    this.setState((prev) => ({ notificationEnabled: !prev.notificationEnabled }))
                  }
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.checkboxBox,
                      { borderColor: palette.borderLight },
                      notificationEnabled && styles.checkboxBoxActive,
                    ]}
                  >
                    {notificationEnabled && <Text style={styles.checkmarkIcon}>✓</Text>}
                  </View>
                  <Text style={[styles.checkboxLabel, { color: palette.textSecondary }]}>
                    Alert & notify me before / on estimated date
                  </Text>
                </TouchableOpacity>

                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                {/* Actions */}
                <View style={styles.formButtonRow}>
                  <TouchableOpacity
                    style={[styles.cancelFormBtn, { backgroundColor: palette.pillBackground }]}
                    onPress={() => this.setState({ isAdding: false, editingId: undefined })}
                  >
                    <Text style={[styles.cancelFormText, { color: palette.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitFormBtn, { backgroundColor: palette.primaryNavy }]}
                    onPress={this.handleSave}
                  >
                    <Text style={styles.submitFormText}>
                      {editingId ? 'Update Record' : 'Save Record'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              /* Records List */
              <View style={styles.listContainer}>
                {/* Filter Tabs */}
                <View style={styles.tabsRow}>
                  {(['ALL', 'BORROWED', 'LENT'] as const).map((tab) => {
                    const isSelected = activeTab === tab;
                    return (
                      <TouchableOpacity
                        key={tab}
                        style={[
                          styles.tabBtn,
                          { backgroundColor: palette.pillBackground, borderColor: palette.borderLight },
                          isSelected && [styles.tabBtnActive, { backgroundColor: palette.primaryNavy }],
                        ]}
                        onPress={() => this.setState({ activeTab: tab })}
                      >
                        <Text
                          style={[
                            styles.tabText,
                            { color: palette.textSecondary },
                            isSelected && styles.tabTextActive,
                          ]}
                        >
                          {tab === 'ALL'
                            ? 'All'
                            : tab === 'BORROWED'
                            ? 'To Return'
                            : 'To Receive'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={[
                      styles.addRecordHeaderBtn,
                      {
                        backgroundColor:
                          themeMode === 'dark' ? '#1E293B' : '#EBF3FF',
                      },
                    ]}
                    onPress={this.handleOpenAdd}
                  >
                    <Text style={[styles.addRecordHeaderText, { color: palette.vehicleBlue }]}>
                      + Add New
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* List items with SwipeableRow */}
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={styles.recordsScroll}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  {filtered.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                      <Text style={styles.emptyStateEmoji}>🤝</Text>
                      <Text style={[styles.emptyStateTitle, { color: palette.textPrimary }]}>
                        No dues recorded
                      </Text>
                      <Text style={[styles.emptyStateSubtitle, { color: palette.textSecondary }]}>
                        Tap &quot;+ Add New&quot; above to track money borrowed or lent.
                      </Text>
                    </View>
                  ) : (
                    filtered.map((item) => {
                      const isBorrowed = item.type === 'BORROWED';
                      const dueDate = item.estimatedPaymentDate.split('T')[0];
                      const isOverdue =
                        !item.isSettled &&
                        new Date(item.estimatedPaymentDate).getTime() < Date.now();

                      return (
                        <SwipeableRow
                          key={item.id}
                          onDelete={() => onDeleteBorrowing(item.id)}
                          onEdit={() => this.handleStartEdit(item)}
                          deleteConfirmTitle="Delete Due Record"
                          deleteConfirmMessage={`Are you sure you want to remove the record for ${item.personName}?`}
                        >
                          <View
                            style={[
                              styles.dueCard,
                              { backgroundColor: palette.cardBackground, borderColor: palette.borderLight },
                              item.isSettled && [
                                styles.settledDueCard,
                                { backgroundColor: palette.pillBackground },
                              ],
                            ]}
                          >
                            <View style={styles.dueCardTopRow}>
                              <View style={styles.dueCardLeftHeader}>
                                <Text
                                  style={[
                                    styles.duePersonName,
                                    { color: palette.textPrimary },
                                    item.isSettled && styles.settledText,
                                  ]}
                                >
                                  {item.personName}
                                </Text>
                                <View
                                  style={[
                                    styles.dueTypeTag,
                                    isBorrowed
                                      ? styles.tagBorrowed
                                      : styles.tagLent,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.dueTypeTagText,
                                      isBorrowed
                                        ? { color: '#FF4D4F' }
                                        : { color: '#52C41A' },
                                    ]}
                                  >
                                    {isBorrowed ? 'I BORROWED' : 'I LENT'}
                                  </Text>
                                </View>
                              </View>

                              <Text
                                style={[
                                  styles.dueAmount,
                                  isBorrowed
                                    ? { color: '#FF4D4F' }
                                    : { color: '#52C41A' },
                                  item.isSettled && styles.settledText,
                                ]}
                              >
                                {currencySymbol}{item.amount.toLocaleString('en-IN')}
                              </Text>
                            </View>

                            {Boolean(item.notes) && (
                              <Text style={[styles.dueNotes, { color: palette.textSecondary }]}>
                                {item.notes}
                              </Text>
                            )}

                            <View style={styles.dueCardFooterRow}>
                              <View style={styles.dueDateRow}>
                                <Text
                                  style={[
                                    styles.dueDateText,
                                    { color: palette.textMuted },
                                    isOverdue && styles.overdueText,
                                  ]}
                                >
                                  {item.isSettled
                                    ? '✓ Settled'
                                    : isOverdue
                                    ? `⚠️ Overdue since ${dueDate}`
                                    : `Est. Due: ${dueDate}`}
                                </Text>
                              </View>

                              {!item.isSettled && (
                                <TouchableOpacity
                                  style={[
                                    styles.settleButton,
                                    isBorrowed
                                      ? styles.settleReturnBtn
                                      : styles.settleReceiveBtn,
                                  ]}
                                  onPress={() => this.handleSettleDue(item)}
                                >
                                  <Text style={styles.settleButtonText}>
                                    {isBorrowed ? 'Pay / Settle' : 'Mark Received'}
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        </SwipeableRow>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            )}
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
    height: '86%',
    flexDirection: 'column',
    ...AppTheme.Elevation.floatingBarShadow,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
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
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryBox: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  listContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  tabBtnActive: {
    borderColor: 'transparent',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  addRecordHeaderBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  addRecordHeaderText: {
    fontSize: 12,
    fontWeight: '700',
  },
  recordsScroll: {
    flex: 1,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyStateSubtitle: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  dueCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 10,
    ...AppTheme.Elevation.softShadow,
  },
  settledDueCard: {
    opacity: 0.65,
  },
  dueCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueCardLeftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  duePersonName: {
    fontSize: 16,
    fontWeight: '700',
  },
  settledText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  dueTypeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagBorrowed: {
    backgroundColor: 'rgba(255, 77, 79, 0.12)',
  },
  tagLent: {
    backgroundColor: 'rgba(82, 196, 26, 0.12)',
  },
  dueTypeTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  dueAmount: {
    fontSize: 17,
    fontWeight: '800',
  },
  dueNotes: {
    fontSize: 13,
    marginTop: 6,
  },
  dueCardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  overdueText: {
    color: '#FF4D4F',
    fontWeight: '700',
  },
  settleButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  settleReturnBtn: {
    backgroundColor: 'rgba(255, 77, 79, 0.12)',
  },
  settleReceiveBtn: {
    backgroundColor: 'rgba(82, 196, 26, 0.12)',
  },
  settleButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F1A2C',
  },
  formScrollView: {
    flex: 1,
  },
  formHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  typeToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  typeToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  typeToggleBorrowedActive: {
    backgroundColor: '#FF4D4F',
    borderColor: '#FF4D4F',
  },
  typeToggleLentActive: {
    backgroundColor: '#52C41A',
    borderColor: '#52C41A',
  },
  typeToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  typeToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 6,
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 14,
    marginBottom: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxBoxActive: {
    backgroundColor: '#2B82F6',
    borderColor: '#2B82F6',
  },
  checkmarkIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 13,
  },
  errorText: {
    color: '#FF4D4F',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  formButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    marginBottom: 20,
  },
  cancelFormBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelFormText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitFormBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitFormText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
