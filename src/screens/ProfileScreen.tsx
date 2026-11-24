import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { AppTheme, ThemeMode } from '../theme/AppTheme';
import { GoogleDriveSyncService } from '../services/GoogleDriveSyncService';
import { FileStoreService } from '../services/FileStoreService';
import { DriveSyncMetadata, UserProfileModel, CategoryModel, CategoryType } from '../types';

interface ProfileScreenProps {
  onNavigateHome: () => void;
  onProfileChanged?: () => void;
  themeMode?: ThemeMode;
}

interface CurrencyOption {
  symbol: string;
  code: string;
  name: string;
}

interface ProfileScreenState {
  syncState: DriveSyncMetadata;
  userProfile: UserProfileModel;
  categories: CategoryModel[];
  categoryActiveTab: 'EXPENSE' | 'INCOME';
  isAddCategoryModalOpen: boolean;
  editingCategoryId?: string;
  newCategoryName: string;
  newCategoryColor: string;
  newCategoryEmoji: string;
  categoryError: string;
  isLoading: boolean;
  isEditProfileModalOpen: boolean;
  isCurrencyModalOpen: boolean;
  editName: string;
  editEmail: string;
  editAvatar: string;
  editCurrency: string;
  customCurrency: string;
  errorMessage: string;
}

export class ProfileScreen extends React.Component<ProfileScreenProps, ProfileScreenState> {
  private driveService = GoogleDriveSyncService.getInstance();
  private fileStore = FileStoreService.getInstance();

  private static readonly AVATAR_OPTIONS = ['🧔🏽', '👩🏻', '🧑🏾', '👨🏻‍💼', '👩🏽‍💻', '🦊', '⚡', '💎'];

  public static readonly CURRENCY_OPTIONS: CurrencyOption[] = [
    { symbol: '₹', code: 'INR', name: 'Indian Rupee (₹)' },
    { symbol: 'Rs', code: 'LKR', name: 'Sri Lankan Rupee (Rs)' },
    { symbol: 'AED', code: 'AED', name: 'Dubai / UAE Dirham (AED)' },
    { symbol: '$', code: 'USD', name: 'US Dollar ($)' },
    { symbol: '€', code: 'EUR', name: 'Euro (€)' },
    { symbol: '£', code: 'GBP', name: 'British Pound (£)' },
    { symbol: '¥', code: 'JPY', name: 'Japanese Yen (¥)' },
    { symbol: 'د.إ', code: 'AED_AR', name: 'Dubai / UAE Dirham (د.إ)' },
    { symbol: 'C$', code: 'CAD', name: 'Canadian Dollar (C$)' },
    { symbol: 'A$', code: 'AUD', name: 'Australian Dollar (A$)' },
    { symbol: '₩', code: 'KRW', name: 'South Korean Won (₩)' },
    { symbol: 'CHF', code: 'CHF', name: 'Swiss Franc (CHF)' },
  ];

  public static readonly CATEGORY_COLOR_OPTIONS: string[] = [
    '#FF8A00',
    '#2AC769',
    '#FFAE19',
    '#FF5757',
    '#10B981',
    '#3B82F6',
    '#8B5CF6',
    '#EC4899',
    '#F59E0B',
    '#64748B',
  ];

  public static readonly CATEGORY_EMOJI_OPTIONS: string[] = [
    '🍜', '🚗', '🛍️', '❤️', '🌙', '⚡', '💼', '💻', '📈', '🏠',
    '🎁', '☕', '🍕', '✈️', '🎵', '🏷️', '💎', '📚', '🏋️', '🎬'
  ];

  constructor(props: ProfileScreenProps) {
    super(props);
    this.state = {
      syncState: this.fileStore.getSyncState(),
      userProfile: new UserProfileModel(),
      categories: [],
      categoryActiveTab: 'EXPENSE',
      isAddCategoryModalOpen: false,
      editingCategoryId: undefined,
      newCategoryName: '',
      newCategoryColor: '#3B82F6',
      newCategoryEmoji: '🏷️',
      categoryError: '',
      isLoading: false,
      isEditProfileModalOpen: false,
      isCurrencyModalOpen: false,
      editName: 'Sahil',
      editEmail: '',
      editAvatar: '🧔🏽',
      editCurrency: '₹',
      customCurrency: '',
      errorMessage: '',
    };
  }

  public async componentDidMount(): Promise<void> {
    await this.refreshState();
  }

  private refreshState = async (): Promise<void> => {
    const profile = await this.fileStore.getUserProfile();
    const categories = await this.fileStore.getCategories();
    this.setState({
      syncState: this.fileStore.getSyncState(),
      userProfile: profile,
      categories,
      editName: profile.name,
      editEmail: profile.email || '',
      editAvatar: profile.avatarEmoji,
      editCurrency: profile.currencySymbol || '₹',
    });
  };

  private getCategoryEmoji(cat: CategoryModel): string {
    switch (cat.id) {
      case 'cat-food': return '🍜';
      case 'cat-transport': return '🚗';
      case 'cat-shopping': return '🛍️';
      case 'cat-health': return '❤️';
      case 'cat-community': return '🌙';
      case 'cat-bills': return '⚡';
      case 'cat-inc-salary': return '💼';
      case 'cat-inc-freelance': return '💻';
      case 'cat-inc-invest': return '📈';
      case 'cat-inc-rental': return '🏠';
      case 'cat-inc-gifts': return '🎁';
      case 'cat-exp-other':
      case 'cat-inc-other':
        return '⋯';
      default:
        return cat.iconName.length <= 4 ? cat.iconName : '🏷️';
    }
  }

  private handleOpenAddCategory = (type: 'EXPENSE' | 'INCOME'): void => {
    this.setState({
      isAddCategoryModalOpen: true,
      editingCategoryId: undefined,
      categoryActiveTab: type,
      newCategoryName: '',
      newCategoryColor: '#3B82F6',
      newCategoryEmoji: type === 'INCOME' ? '💼' : '🍜',
      categoryError: '',
    });
  };

  private handleOpenEditCategory = (cat: CategoryModel): void => {
    this.setState({
      isAddCategoryModalOpen: true,
      editingCategoryId: cat.id,
      categoryActiveTab: cat.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
      newCategoryName: cat.name,
      newCategoryColor: cat.colorHex,
      newCategoryEmoji: this.getCategoryEmoji(cat),
      categoryError: '',
    });
  };

  private handleSaveCategory = async (): Promise<void> => {
    const { newCategoryName, newCategoryColor, newCategoryEmoji, categoryActiveTab, editingCategoryId } = this.state;
    const cleanName = newCategoryName.replace(/[\u0000-\u001F\u007F<>]/g, '').trim();

    if (!cleanName) {
      this.setState({ categoryError: 'Please enter a category name.' });
      return;
    }

    try {
      if (editingCategoryId) {
        const existing = this.state.categories.find((c) => c.id === editingCategoryId);
        const updated = new CategoryModel(
          editingCategoryId,
          cleanName,
          newCategoryEmoji || 'tag',
          newCategoryColor,
          existing?.isDefault || false,
          categoryActiveTab
        );
        await this.fileStore.updateCategory(updated);
      } else {
        const newCat = new CategoryModel(
          `cat-user-${Date.now()}`,
          cleanName,
          newCategoryEmoji || 'tag',
          newCategoryColor,
          false,
          categoryActiveTab
        );
        await this.fileStore.addCategory(newCat);
      }

      await this.refreshState();
      this.setState({ isAddCategoryModalOpen: false, categoryError: '' });
      if (this.props.onProfileChanged) {
        this.props.onProfileChanged();
      }
    } catch (err: unknown) {
      const error = err as Error;
      this.setState({ categoryError: error.message || 'Failed to save category.' });
    }
  };

  private handleDeleteCategory = async (cat: CategoryModel): Promise<void> => {
    if (cat.isDefault || cat.id === 'cat-exp-other' || cat.id === 'cat-inc-other') {
      Alert.alert('Protected Category', 'Default system categories cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete category "${cat.name}"? Existing transactions will retain their data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await this.fileStore.deleteCategory(cat.id);
              await this.refreshState();
              if (this.props.onProfileChanged) {
                this.props.onProfileChanged();
              }
            } catch (err: unknown) {
              const error = err as Error;
              Alert.alert('Error', error.message || 'Could not delete category.');
            }
          },
        },
      ]
    );
  };

  private handleOpenEditProfile = (): void => {
    const { userProfile } = this.state;
    this.setState({
      isEditProfileModalOpen: true,
      editName: userProfile.name,
      editEmail: userProfile.email || '',
      editAvatar: userProfile.avatarEmoji,
      editCurrency: userProfile.currencySymbol || '₹',
      errorMessage: '',
    });
  };

  private handleSaveProfile = async (): Promise<void> => {
    const { editName, editEmail, editAvatar, editCurrency } = this.state;
    const cleanName = editName.replace(/[\u0000-\u001F\u007F<>]/g, '').trim();
    const cleanEmail = editEmail.replace(/[\u0000-\u001F\u007F<>]/g, '').trim();
    const cleanCurrency = (editCurrency || '₹').replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, 5);

    if (!cleanName) {
      this.setState({ errorMessage: 'Please enter your name.' });
      return;
    }

    const updated = await this.fileStore.updateUserProfile({
      name: cleanName,
      email: cleanEmail || undefined,
      avatarEmoji: editAvatar,
      currencySymbol: cleanCurrency || '₹',
    });

    this.setState({
      userProfile: updated,
      isEditProfileModalOpen: false,
      errorMessage: '',
    });

    if (this.props.onProfileChanged) {
      this.props.onProfileChanged();
    }
  };

  private handleSetTheme = async (mode: ThemeMode): Promise<void> => {
    AppTheme.setMode(mode);
    const updated = await this.fileStore.updateUserProfile({ themeMode: mode });
    this.setState({ userProfile: updated });

    if (this.props.onProfileChanged) {
      this.props.onProfileChanged();
    }
  };

  private handleSelectCurrency = async (symbol: string): Promise<void> => {
    try {
      const cleanSymbol = symbol.replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, 5) || '₹';
      const updated = await this.fileStore.updateUserProfile({ currencySymbol: cleanSymbol });
      this.setState(
        {
          userProfile: updated,
          isCurrencyModalOpen: false,
          editCurrency: cleanSymbol,
        },
        () => {
          if (this.props.onProfileChanged) {
            this.props.onProfileChanged();
          }
          // Delay alert slightly so modal dismissal completes smoothly
          setTimeout(() => {
            Alert.alert('Currency Updated', `Default app currency is now set to ${cleanSymbol}`);
          }, 150);
        }
      );
    } catch (err) {
      console.error('Failed to update currency:', err);
      Alert.alert('Error', 'Could not update currency. Please try again.');
    }
  };

  private handleApplyCustomCurrency = async (): Promise<void> => {
    const { customCurrency } = this.state;
    const clean = customCurrency.replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, 5);
    if (!clean) {
      Alert.alert('Invalid Symbol', 'Please enter a valid currency symbol or abbreviation (up to 5 characters).');
      return;
    }
    await this.handleSelectCurrency(clean);
  };

  private handleSyncNow = async (): Promise<void> => {
    this.setState({ isLoading: true });
    const success = await this.driveService.syncToGoogleDrive();
    this.setState({ isLoading: false, syncState: this.fileStore.getSyncState() });

    if (success) {
      Alert.alert(
        'Google Drive Synced',
        'Your expense document was encrypted with AES-256 and uploaded directly to your private Google Drive appData folder.'
      );
    } else {
      Alert.alert('Sync Error', 'Could not complete Google Drive sync. Please verify connectivity.');
    }
  };

  private handleRestore = async (): Promise<void> => {
    Alert.alert(
      'Restore from Google Drive',
      'This will replace your current on-device data with the latest encrypted backup stored on Google Drive. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            this.setState({ isLoading: true });
            const success = await this.driveService.restoreFromGoogleDrive();
            this.setState({ isLoading: false, syncState: this.fileStore.getSyncState() });
            if (success) {
              await this.refreshState();
              if (this.props.onProfileChanged) {
                this.props.onProfileChanged();
              }
              Alert.alert('Vault Restored', 'Data restored successfully from Google Drive.');
            } else {
              Alert.alert('Restore Failed', 'No encrypted backup found or Google Drive authentication failed.');
            }
          },
        },
      ]
    );
  };

  private handleDisconnectDrive = async (): Promise<void> => {
    await this.driveService.disconnectGoogleDrive();
    await this.refreshState();
    Alert.alert('Google Drive Disconnected', 'Tokens have been wiped from hardware secure storage.');
  };

  public render(): React.ReactNode {
    const {
      syncState,
      userProfile,
      categories,
      categoryActiveTab,
      isAddCategoryModalOpen,
      editingCategoryId,
      newCategoryName,
      newCategoryColor,
      newCategoryEmoji,
      categoryError,
      isLoading,
      isEditProfileModalOpen,
      isCurrencyModalOpen,
      editName,
      editEmail,
      editAvatar,
      editCurrency,
      customCurrency,
      errorMessage,
    } = this.state;

    const currentTheme = this.props.themeMode || userProfile.themeMode || AppTheme.currentMode;
    const palette = AppTheme.getPalette(currentTheme);

    const activeCategoriesList = categories.filter((c) =>
      categoryActiveTab === 'INCOME'
        ? c.type === 'INCOME' || c.type === 'BOTH'
        : c.type === 'EXPENSE' || c.type === 'BOTH' || !c.type
    );

    const activeCurrencyOption = ProfileScreen.CURRENCY_OPTIONS.find(
      (c) => c.symbol === (userProfile.currencySymbol || '₹')
    );
    const activeCurrencyLabel = activeCurrencyOption
      ? activeCurrencyOption.name
      : `${userProfile.currencySymbol || '₹'} (Custom)`;

    return (
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Settings & Profile</Text>
            <Text style={[styles.headerSubtitle, { color: palette.textSecondary }]}>Encrypted On-Device Vault</Text>
          </View>

          {/* User Profile Card */}
          <View style={[styles.userCard, { backgroundColor: palette.cardBackground, borderColor: palette.borderLight }]}>
            <View style={styles.userCardLeft}>
              <View style={[styles.avatarLarge, { backgroundColor: palette.pillBackground }]}>
                <Text style={styles.avatarEmoji}>{userProfile.avatarEmoji || '🧔🏽'}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: palette.textPrimary }]}>{userProfile.name}</Text>
                <Text style={[styles.userEmail, { color: palette.textSecondary }]}>
                  {userProfile.email || syncState.userEmail || 'Local Vault (No Database)'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.editProfileBtn, { backgroundColor: palette.pillBackground }]}
              onPress={this.handleOpenEditProfile}
              activeOpacity={0.8}
            >
              <Text style={[styles.editProfileText, { color: palette.textPrimary }]}>✏️ Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Theme & Appearance Section */}
          <Text style={[styles.sectionHeader, { color: palette.textMuted }]}>APPEARANCE & THEME</Text>
          <View style={[styles.settingsGroup, { backgroundColor: palette.cardBackground, borderColor: palette.borderLight }]}>
            <View style={styles.settingItem}>
              <View style={styles.settingTextCol}>
                <Text style={[styles.settingLabel, { color: palette.textPrimary }]}>App Theme</Text>
                <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
                  Choose between matching Light and Dark themes
                </Text>
              </View>
              <View style={styles.themeSelectorRow}>
                <TouchableOpacity
                  style={[
                    styles.themeToggleBtn,
                    currentTheme === 'light' && styles.themeToggleBtnActive,
                    currentTheme === 'light' && { backgroundColor: palette.primaryNavy },
                  ]}
                  onPress={() => this.handleSetTheme('light')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.themeToggleText,
                      currentTheme === 'light'
                        ? { color: '#FFFFFF', fontWeight: '700' }
                        : { color: palette.textSecondary },
                    ]}
                  >
                    ☀️ Light
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.themeToggleBtn,
                    currentTheme === 'dark' && styles.themeToggleBtnActive,
                    currentTheme === 'dark' && { backgroundColor: '#2563EB' },
                  ]}
                  onPress={() => this.handleSetTheme('dark')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.themeToggleText,
                      currentTheme === 'dark'
                        ? { color: '#FFFFFF', fontWeight: '700' }
                        : { color: palette.textSecondary },
                    ]}
                  >
                    🌙 Dark
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Currency Configuration Section */}
          <Text style={[styles.sectionHeader, { color: palette.textMuted }]}>CURRENCY & LOCALIZATION</Text>
          <View style={[styles.settingsGroup, { backgroundColor: palette.cardBackground, borderColor: palette.borderLight }]}>
            <View style={styles.settingItem}>
              <View style={styles.settingTextCol}>
                <Text style={[styles.settingLabel, { color: palette.textPrimary }]}>Default Currency</Text>
                <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
                  {activeCurrencyLabel}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.currencyPillBtn, { backgroundColor: palette.pillBackground, borderColor: palette.borderLight }]}
                onPress={() => this.setState({ isCurrencyModalOpen: true })}
                activeOpacity={0.8}
              >
                <Text style={[styles.currencySymbolBadge, { color: palette.textPrimary }]}>
                  {userProfile.currencySymbol || '₹'}
                </Text>
                <Text style={[styles.currencyChangeBtnText, { color: palette.vehicleBlue }]}>Change ▾</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Categories Management Section */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeader, { color: palette.textMuted }]}>
              CUSTOMIZE CATEGORIES
            </Text>
            <TouchableOpacity
              onPress={() => this.handleOpenAddCategory(categoryActiveTab)}
              style={[styles.addCatMiniBtn, { backgroundColor: palette.pillBackground }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.addCatMiniText, { color: palette.vehicleBlue }]}>
                + Add {categoryActiveTab === 'EXPENSE' ? 'Expense' : 'Income'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.settingsGroup, { backgroundColor: palette.cardBackground, borderColor: palette.borderLight }]}>
            {/* Tabs: Expense Categories vs Income Categories */}
            <View style={[styles.catTabRow, { backgroundColor: palette.pillBackground }]}>
              <TouchableOpacity
                style={[
                  styles.catTabBtn,
                  categoryActiveTab === 'EXPENSE' && [styles.catTabBtnActive, { backgroundColor: palette.cardBackground }],
                ]}
                onPress={() => this.setState({ categoryActiveTab: 'EXPENSE' })}
              >
                <Text
                  style={[
                    styles.catTabText,
                    { color: categoryActiveTab === 'EXPENSE' ? palette.textPrimary : palette.textSecondary },
                    categoryActiveTab === 'EXPENSE' && { fontWeight: '700' },
                  ]}
                >
                  Expense ({categories.filter((c) => c.type === 'EXPENSE' || c.type === 'BOTH' || !c.type).length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.catTabBtn,
                  categoryActiveTab === 'INCOME' && [styles.catTabBtnActive, { backgroundColor: palette.cardBackground }],
                ]}
                onPress={() => this.setState({ categoryActiveTab: 'INCOME' })}
              >
                <Text
                  style={[
                    styles.catTabText,
                    { color: categoryActiveTab === 'INCOME' ? palette.textPrimary : palette.textSecondary },
                    categoryActiveTab === 'INCOME' && { fontWeight: '700' },
                  ]}
                >
                  Income ({categories.filter((c) => c.type === 'INCOME' || c.type === 'BOTH').length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* List of Categories */}
            {activeCategoriesList.map((cat, idx) => {
              const isDefaultProtected = cat.isDefault || cat.id === 'cat-exp-other' || cat.id === 'cat-inc-other';
              const isLast = idx === activeCategoriesList.length - 1;
              return (
                <View
                  key={cat.id}
                  style={[
                    styles.catItemRow,
                    !isLast && { borderBottomColor: palette.borderLight, borderBottomWidth: 1 },
                  ]}
                >
                  <View style={styles.catLeftInfo}>
                    <View style={[styles.catColorCircle, { backgroundColor: cat.colorHex }]}>
                      <Text style={styles.catEmojiText}>{this.getCategoryEmoji(cat)}</Text>
                    </View>
                    <View>
                      <Text style={[styles.catItemName, { color: palette.textPrimary }]}>{cat.name}</Text>
                      {cat.name.toLowerCase() === 'other' ? (
                        <Text style={[styles.catDefaultTag, { color: palette.textMuted }]}>Default Fallback</Text>
                      ) : isDefaultProtected ? (
                        <Text style={[styles.catDefaultTag, { color: palette.textMuted }]}>Standard</Text>
                      ) : (
                        <Text style={[styles.catCustomTag, { color: palette.transportGreen }]}>Custom</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.catActionsRow}>
                    <TouchableOpacity
                      onPress={() => this.handleOpenEditCategory(cat)}
                      style={[styles.catActionIconBtn, { backgroundColor: palette.pillBackground }]}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.catActionIcon}>✎</Text>
                    </TouchableOpacity>
                    {!isDefaultProtected && (
                      <TouchableOpacity
                        onPress={() => this.handleDeleteCategory(cat)}
                        style={[styles.catActionIconBtn, { backgroundColor: palette.pillBackground }]}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.catActionIcon}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Google Drive Section */}
          <Text style={[styles.sectionHeader, { color: palette.textMuted }]}>GOOGLE DRIVE CLOUD PERSISTENCE</Text>
          <View style={[styles.settingsGroup, { backgroundColor: palette.cardBackground, borderColor: palette.borderLight }]}>
            <View style={styles.settingItem}>
              <View style={styles.settingTextCol}>
                <Text style={[styles.settingLabel, { color: palette.textPrimary }]}>Google Drive Integration</Text>
                <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
                  Direct client sync to private appData folder using OAuth 2.0 PKCE.
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  syncState.isAuthenticated ? styles.badgeSuccess : styles.badgeInactive,
                ]}
              >
                <Text style={styles.statusBadgeText}>
                  {syncState.isAuthenticated ? 'CONNECTED' : 'DISCONNECTED'}
                </Text>
              </View>
            </View>

            {syncState.lastSyncedTimestamp && (
              <View style={styles.settingSubRow}>
                <Text style={[styles.subLabel, { color: palette.textMuted }]}>Last Synced:</Text>
                <Text style={[styles.subValue, { color: palette.textPrimary }]}>
                  {new Date(syncState.lastSyncedTimestamp).toLocaleString()}
                </Text>
              </View>
            )}

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: palette.primaryNavy }]}
                onPress={this.handleSyncNow}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryActionText}>☁️ Sync Now</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryActionBtn, { backgroundColor: palette.pillBackground }]}
                onPress={this.handleRestore}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={[styles.secondaryActionText, { color: palette.textPrimary }]}>📥 Restore</Text>
              </TouchableOpacity>
            </View>

            {syncState.isAuthenticated && (
              <TouchableOpacity
                style={styles.disconnectBtn}
                onPress={this.handleDisconnectDrive}
                activeOpacity={0.7}
              >
                <Text style={styles.disconnectText}>Disconnect Google Drive</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Security & Cryptography Info */}
          <Text style={[styles.sectionHeader, { color: palette.textMuted }]}>SECURITY & PRIVACY</Text>
          <View style={[styles.settingsGroup, { backgroundColor: palette.cardBackground, borderColor: palette.borderLight }]}>
            <View style={styles.settingItem}>
              <View style={styles.settingTextCol}>
                <Text style={[styles.settingLabel, { color: palette.textPrimary }]}>Hardware Encryption</Text>
                <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
                  AES-256 local vault sealed with platform Keystore/Keychain.
                </Text>
              </View>
              <Text style={{ fontSize: 18 }}>🛡️</Text>
            </View>
            <View style={styles.settingItem}>
              <View style={styles.settingTextCol}>
                <Text style={[styles.settingLabel, { color: palette.textPrimary }]}>Zero Telemetry</Text>
                <Text style={[styles.settingDesc, { color: palette.textSecondary }]}>
                  Zero third-party tracking, ads, or external telemetry libraries.
                </Text>
              </View>
              <Text style={{ fontSize: 18 }}>🔒</Text>
            </View>
          </View>

          {/* Back Home Button */}
          <TouchableOpacity
            style={[styles.backHomeBtn, { backgroundColor: palette.cardBackground, borderColor: palette.borderLight }]}
            onPress={this.props.onNavigateHome}
            activeOpacity={0.8}
          >
            <Text style={[styles.backHomeText, { color: palette.textPrimary }]}>← Back to Dashboard</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Currency Selection Modal */}
        <Modal
          visible={isCurrencyModalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => this.setState({ isCurrencyModalOpen: false })}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <View style={[styles.modalContent, { backgroundColor: palette.cardBackground }]}>
              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalHeaderTitle, { color: palette.textPrimary }]}>Select Currency</Text>
                <TouchableOpacity
                  onPress={() => this.setState({ isCurrencyModalOpen: false })}
                  style={[styles.modalCloseBtn, { backgroundColor: palette.pillBackground }]}
                >
                  <Text style={[styles.modalCloseText, { color: palette.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                {ProfileScreen.CURRENCY_OPTIONS.map((c) => {
                  const isSelected = (userProfile.currencySymbol || '₹') === c.symbol;
                  return (
                    <TouchableOpacity
                      key={`${c.code}-${c.symbol}`}
                      style={[
                        styles.currencyOptionRow,
                        { borderColor: palette.borderLight },
                        isSelected && { backgroundColor: palette.pillBackground, borderColor: palette.vehicleBlue },
                      ]}
                      onPress={() => this.handleSelectCurrency(c.symbol)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.currencyCircle, { backgroundColor: palette.pillBackground }]}>
                        <Text style={[styles.currencyCircleSymbol, { color: palette.textPrimary }]}>{c.symbol}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.currencyOptionName, { color: palette.textPrimary }]}>{c.name}</Text>
                        <Text style={[styles.currencyOptionCode, { color: palette.textSecondary }]}>{c.code}</Text>
                      </View>
                      {isSelected && <Text style={{ color: palette.vehicleBlue, fontSize: 18 }}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Custom Currency Input */}
              <Text style={[styles.inputLabel, { color: palette.textMuted }]}>OR ENTER CUSTOM SYMBOL</Text>
              <View style={styles.customCurrencyRow}>
                <TextInput
                  style={[
                    styles.textInput,
                    { flex: 1, marginBottom: 0, backgroundColor: palette.inputBackground, color: palette.textPrimary, borderColor: palette.borderLight },
                  ]}
                  placeholder="e.g. $, kr, zł"
                  placeholderTextColor={palette.textMuted}
                  maxLength={5}
                  value={customCurrency}
                  onChangeText={(val) => this.setState({ customCurrency: val })}
                />
                <TouchableOpacity
                  style={[styles.applyCustomBtn, { backgroundColor: palette.primaryNavy }]}
                  onPress={this.handleApplyCustomCurrency}
                  activeOpacity={0.8}
                >
                  <Text style={styles.applyCustomBtnText}>Set</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Edit Profile Modal */}
        <Modal
          visible={isEditProfileModalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => this.setState({ isEditProfileModalOpen: false })}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <View style={[styles.modalContent, { backgroundColor: palette.cardBackground }]}>
              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalHeaderTitle, { color: palette.textPrimary }]}>Edit Profile Details</Text>
                <TouchableOpacity
                  onPress={() => this.setState({ isEditProfileModalOpen: false })}
                  style={[styles.modalCloseBtn, { backgroundColor: palette.pillBackground }]}
                >
                  <Text style={[styles.modalCloseText, { color: palette.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Avatar Selector */}
              <Text style={[styles.inputLabel, { color: palette.textMuted }]}>CHOOSE AVATAR</Text>
              <View style={styles.avatarPickerRow}>
                {ProfileScreen.AVATAR_OPTIONS.map((emoji) => {
                  const isSelected = editAvatar === emoji;
                  return (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.avatarOptionCircle,
                        isSelected && [styles.avatarOptionSelected, { borderColor: palette.vehicleBlue, backgroundColor: palette.pillBackground }],
                      ]}
                      onPress={() => this.setState({ editAvatar: emoji })}
                    >
                      <Text style={styles.avatarOptionEmoji}>{emoji}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Name */}
              <Text style={[styles.inputLabel, { color: palette.textMuted }]}>YOUR NAME</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: palette.inputBackground, color: palette.textPrimary, borderColor: palette.borderLight },
                ]}
                placeholder="Enter your name"
                placeholderTextColor={palette.textMuted}
                maxLength={40}
                value={editName}
                onChangeText={(text) => this.setState({ editName: text, errorMessage: '' })}
              />

              {/* Email */}
              <Text style={[styles.inputLabel, { color: palette.textMuted }]}>EMAIL (OPTIONAL)</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: palette.inputBackground, color: palette.textPrimary, borderColor: palette.borderLight },
                ]}
                placeholder="e.g. user@example.com"
                placeholderTextColor={palette.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                maxLength={60}
                value={editEmail}
                onChangeText={(text) => this.setState({ editEmail: text, errorMessage: '' })}
              />

              {/* Currency in Profile */}
              <Text style={[styles.inputLabel, { color: palette.textMuted }]}>CURRENCY SYMBOL</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: palette.inputBackground, color: palette.textPrimary, borderColor: palette.borderLight },
                ]}
                placeholder="e.g. ₹ or $ or €"
                placeholderTextColor={palette.textMuted}
                maxLength={5}
                value={editCurrency}
                onChangeText={(text) => this.setState({ editCurrency: text })}
              />

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              {/* Actions */}
              <TouchableOpacity
                style={[styles.saveProfileBtn, { backgroundColor: palette.primaryNavy }]}
                onPress={this.handleSaveProfile}
                activeOpacity={0.85}
              >
                <Text style={styles.saveProfileBtnText}>Save Profile</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Add / Edit Category Modal */}
        <Modal
          visible={isAddCategoryModalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => this.setState({ isAddCategoryModalOpen: false })}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <View style={[styles.modalContent, { backgroundColor: palette.cardBackground }]}>
              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalHeaderTitle, { color: palette.textPrimary }]}>
                  {editingCategoryId
                    ? 'Edit Category'
                    : `Add ${categoryActiveTab === 'EXPENSE' ? 'Expense' : 'Income'} Category`}
                </Text>
                <TouchableOpacity
                  onPress={() => this.setState({ isAddCategoryModalOpen: false })}
                  style={[styles.modalCloseBtn, { backgroundColor: palette.pillBackground }]}
                >
                  <Text style={[styles.modalCloseText, { color: palette.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>

              {categoryError ? <Text style={styles.errorText}>{categoryError}</Text> : null}

              <Text style={[styles.inputLabel, { color: palette.textMuted }]}>CATEGORY NAME</Text>
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
                  categoryActiveTab === 'EXPENSE'
                    ? 'e.g. Subscriptions, Gaming'
                    : 'e.g. Consulting, Royalties'
                }
                placeholderTextColor={palette.textMuted}
                maxLength={30}
                value={newCategoryName}
                onChangeText={(text) => this.setState({ newCategoryName: text, categoryError: '' })}
              />

              <Text style={[styles.inputLabel, { color: palette.textMuted }]}>CHOOSE EMOJI ICON</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.emojiPickerRow}
              >
                {ProfileScreen.CATEGORY_EMOJI_OPTIONS.map((emoji) => {
                  const isSelected = newCategoryEmoji === emoji;
                  return (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.emojiCircle,
                        { backgroundColor: palette.pillBackground },
                        isSelected && [
                          styles.emojiCircleSelected,
                          { borderColor: palette.vehicleBlue },
                        ],
                      ]}
                      onPress={() => this.setState({ newCategoryEmoji: emoji })}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.inputLabel, { color: palette.textMuted }]}>CHOOSE THEME COLOR</Text>
              <View style={styles.catColorPickerRow}>
                {ProfileScreen.CATEGORY_COLOR_OPTIONS.map((color) => {
                  const isSelected = newCategoryColor === color;
                  return (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.catColorCircleOption,
                        { backgroundColor: color },
                        isSelected && styles.catColorCircleSelected,
                      ]}
                      onPress={() => this.setState({ newCategoryColor: color })}
                      activeOpacity={0.8}
                    >
                      {isSelected && <Text style={styles.catColorCheckmark}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.catModalActionsRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: palette.pillBackground }]}
                  onPress={() => this.setState({ isAddCategoryModalOpen: false })}
                >
                  <Text style={[styles.cancelBtnText, { color: palette.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    { backgroundColor: currentTheme === 'dark' ? '#2563EB' : palette.primaryNavy },
                  ]}
                  onPress={this.handleSaveCategory}
                >
                  <Text style={styles.saveBtnText}>
                    {editingCategoryId ? 'Save Changes' : 'Create Category'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 130,
  },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  userCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderWidth: 1,
    ...AppTheme.Elevation.softShadow,
  },
  userCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 3,
  },
  editProfileBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginHorizontal: 20,
    marginBottom: 8,
    marginTop: 10,
  },
  settingsGroup: {
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    ...AppTheme.Elevation.softShadow,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  settingTextCol: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  settingDesc: {
    fontSize: 12,
    marginTop: 3,
  },
  themeSelectorRow: {
    flexDirection: 'row',
    gap: 6,
  },
  themeToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  themeToggleBtnActive: {
    borderColor: 'transparent',
  },
  themeToggleText: {
    fontSize: 12,
  },
  currencyPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  currencySymbolBadge: {
    fontSize: 16,
    fontWeight: '800',
  },
  currencyChangeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(42, 199, 105, 0.15)',
  },
  badgeInactive: {
    backgroundColor: 'rgba(142, 160, 184, 0.2)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2AC769',
  },
  settingSubRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  subLabel: {
    fontSize: 12,
    marginRight: 6,
  },
  subValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  primaryActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  secondaryActionBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryActionText: {
    fontWeight: '700',
    fontSize: 13,
  },
  disconnectBtn: {
    marginTop: 12,
    alignSelf: 'center',
    paddingVertical: 6,
  },
  disconnectText: {
    color: '#FF4D4F',
    fontSize: 12,
    fontWeight: '600',
  },
  backHomeBtn: {
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  backHomeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 26, 44, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 36,
    ...AppTheme.Elevation.floatingBarShadow,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  currencyOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  currencyCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyCircleSymbol: {
    fontSize: 16,
    fontWeight: '800',
  },
  currencyOptionName: {
    fontSize: 14,
    fontWeight: '600',
  },
  currencyOptionCode: {
    fontSize: 11,
    marginTop: 1,
  },
  customCurrencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  applyCustomBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  applyCustomBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 10,
  },
  avatarPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 8,
  },
  avatarOptionCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    borderWidth: 2,
  },
  avatarOptionEmoji: {
    fontSize: 22,
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 10,
  },
  errorText: {
    color: '#FF4D4F',
    fontSize: 13,
    fontWeight: '600',
    marginVertical: 6,
  },
  saveProfileBtn: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
  },
  saveProfileBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  addCatMiniBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addCatMiniText: {
    fontSize: 12,
    fontWeight: '700',
  },
  catTabRow: {
    flexDirection: 'row',
    margin: 12,
    padding: 4,
    borderRadius: 14,
  },
  catTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTabBtnActive: {
    ...AppTheme.Elevation.softShadow,
  },
  catTabText: {
    fontSize: 12,
  },
  catItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  catLeftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  catColorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  catEmojiText: {
    fontSize: 18,
  },
  catItemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  catDefaultTag: {
    fontSize: 11,
    marginTop: 2,
  },
  catCustomTag: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  catActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catActionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catActionIcon: {
    fontSize: 13,
  },
  emojiPickerRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  emojiCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiCircleSelected: {
    borderWidth: 2,
  },
  emojiText: {
    fontSize: 20,
  },
  catColorPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
    marginBottom: 16,
    paddingHorizontal: 6,
    paddingVertical: 6,
    overflow: 'visible',
  },
  catColorCircleOption: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  catColorCircleSelected: {
    borderColor: '#3B82F6',
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
    zIndex: 10,
    elevation: 3,
  },
  catColorCheckmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  catModalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
