import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  PanResponderInstance,
} from 'react-native';
import { AppTheme } from '../theme/AppTheme';
import { WalletModel } from '../types';
import { SecurityService } from '../security/SecurityService';

interface StackedWalletCardProps {
  wallets: WalletModel[];
  isPrivacyMode: boolean;
  currencySymbol?: string;
  themeMode?: 'light' | 'dark';
  onTogglePrivacy: () => void;
  onSwapWallet?: (walletId: string) => void;
  onManageWallets?: () => void;
  onLongPressCard?: (wallet: WalletModel) => void;
}

interface StackedWalletCardState {
  activeIndex: number;
}

export class StackedWalletCard extends React.Component<
  StackedWalletCardProps,
  StackedWalletCardState
> {
  private pan = new Animated.ValueXY();
  private panResponder: PanResponderInstance;

  constructor(props: StackedWalletCardProps) {
    super(props);
    this.state = {
      activeIndex: 0,
    };

    this.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dx) > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2
        );
      },
      onPanResponderMove: (_, gestureState) => {
        this.pan.setValue({ x: gestureState.dx, y: 0 });
      },
      onPanResponderRelease: (_, gestureState) => {
        const swipeThreshold = 55;
        if (gestureState.dx < -swipeThreshold) {
          this.animateCardTransition('NEXT');
        } else if (gestureState.dx > swipeThreshold) {
          this.animateCardTransition('PREV');
        } else {
          Animated.spring(this.pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            friction: 6,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(this.pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start();
      },
    });
  }

  public componentDidUpdate(prevProps: StackedWalletCardProps): void {
    if (this.props.wallets.length !== prevProps.wallets.length) {
      if (this.state.activeIndex >= this.props.wallets.length) {
        this.setState({ activeIndex: Math.max(0, this.props.wallets.length - 1) });
      }
    }
  }

  private animateCardTransition = (direction: 'NEXT' | 'PREV'): void => {
    const { wallets } = this.props;
    if (wallets.length <= 1) {
      Animated.spring(this.pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
      }).start();
      return;
    }

    const exitX = direction === 'NEXT' ? -320 : 320;
    Animated.timing(this.pan, {
      toValue: { x: exitX, y: 0 },
      duration: 170,
      useNativeDriver: true,
    }).start(() => {
      const count = wallets.length;
      const nextIndex =
        direction === 'NEXT'
          ? (this.state.activeIndex + 1) % count
          : (this.state.activeIndex - 1 + count) % count;

      this.pan.setValue({ x: 0, y: 0 });
      this.selectWalletByIndex(nextIndex);
    });
  };

  private selectWalletByIndex = (index: number): void => {
    const { wallets, onSwapWallet } = this.props;
    if (index < 0 || index >= wallets.length) return;
    const targetWallet = wallets[index];
    this.setState({ activeIndex: index });
    if (onSwapWallet && targetWallet) {
      onSwapWallet(targetWallet.id);
    }
  };

  public static readonly CARD_FALLBACK_PALETTE: string[] = [
    '#1E293B', // Slate Navy
    '#312E81', // Indigo Night
    '#064E3B', // Deep Emerald
    '#881337', // Crimson Rose
    '#4C1D95', // Deep Purple
    '#78350F', // Warm Amber
    '#18181B', // Charcoal
    '#134E4A', // Teal Ocean
    '#1E3A8A', // Cobalt Blue
    '#701A75', // Plum Fuchsia
  ];

  private getCardBackgroundColor(wallet?: WalletModel, index: number = 0): string {
    if (wallet?.colorHex) {
      return wallet.colorHex;
    }
    if (!wallet) return '#162238';
    if (wallet.type === 'CREDIT_CARD') {
      return '#4C1D95';
    }
    const palIdx = Math.abs(index) % StackedWalletCard.CARD_FALLBACK_PALETTE.length;
    return StackedWalletCard.CARD_FALLBACK_PALETTE[palIdx] || '#1E293B';
  }

  private renderNetworkLogo(network?: 'VISA' | 'MASTERCARD'): React.ReactNode {
    if (network === 'VISA') {
      return (
        <View style={styles.visaBadge}>
          <Text style={styles.visaText}>VISA</Text>
        </View>
      );
    }
    return (
      <View style={styles.networkLogoContainer}>
        <View style={[styles.cardCircle, { backgroundColor: '#EB001B', marginRight: -6 }]} />
        <View style={[styles.cardCircle, { backgroundColor: '#F79E1B' }]} />
      </View>
    );
  }

  public render(): React.ReactNode {
    const {
      wallets,
      isPrivacyMode,
      currencySymbol = '₹',
      themeMode = 'light',
      onTogglePrivacy,
      onManageWallets,
      onLongPressCard,
    } = this.props;
    const { activeIndex } = this.state;
    const palette = AppTheme.getPalette(themeMode);
    const hasWallets = Boolean(wallets && wallets.length > 0);

    const safeIndex = hasWallets ? Math.min(activeIndex, wallets.length - 1) : 0;
    const primaryWallet = hasWallets ? (wallets[safeIndex] || wallets[0]) : null;
    const secondaryIndex = hasWallets && wallets.length > 1 ? (safeIndex + 1) % wallets.length : 0;
    const secondaryWallet = hasWallets && wallets.length > 1 ? wallets[secondaryIndex] : null;

    const displayBalance = SecurityService.formatMaskedAmount(
      primaryWallet ? primaryWallet.balance : 0,
      isPrivacyMode,
      currencySymbol
    );

    const isCreditCard = primaryWallet?.type === 'CREDIT_CARD';
    const totalCreditLimit = primaryWallet?.creditLimit || (isCreditCard ? 50000 : undefined);
    const availableLimit = primaryWallet?.balance || 0;
    const usedLimit = totalCreditLimit ? Math.max(0, totalCreditLimit - availableLimit) : 0;
    const utilizationRate =
      totalCreditLimit && totalCreditLimit > 0
        ? Math.min(100, Math.round((usedLimit / totalCreditLimit) * 100))
        : 0;

    const maskedCardNumber = '•••• •••• •••• ••••';

    const cardRotate = this.pan.x.interpolate({
      inputRange: [-200, 0, 200],
      outputRange: ['-8deg', '0deg', '8deg'],
    });

    return (
      <View style={styles.container}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>My Wallet</Text>
            <Text style={[styles.swipeHintText, { color: palette.textSecondary }]}>
              {hasWallets
                ? 'Hold card for Transfer / Settlement • Swipe to switch'
                : 'Manage and connect your payment accounts'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {hasWallets && (
              <TouchableOpacity
                onPress={onTogglePrivacy}
                style={[styles.iconButton, { backgroundColor: palette.pillBackground }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionIcon, { color: palette.textSecondary }]}>
                  {isPrivacyMode ? '👁️' : '👁️‍🗨️'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onManageWallets}
              style={[styles.iconButton, { backgroundColor: palette.pillBackground }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionIcon, { color: palette.textSecondary }]}>•••</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Empty State when no card exists */}
        {!hasWallets ? (
          <View style={styles.cardsStackWrapper}>
            <View
              style={[
                styles.emptyCardContainer,
                {
                  backgroundColor: palette.cardBackground,
                  borderColor: palette.borderLight,
                },
              ]}
            >
              <View style={[styles.emptyIconCircle, { backgroundColor: palette.pillBackground }]}>
                <Text style={styles.emptyIconEmoji}>💳</Text>
              </View>
              <Text style={[styles.emptyCardTitle, { color: palette.textPrimary }]}>
                No account added
              </Text>
              <Text style={[styles.emptyCardSubtitle, { color: palette.textSecondary }]}>
                Add a savings, cash, or credit account to start tracking your balance and expenses
              </Text>
              <TouchableOpacity
                style={[
                  styles.addAccountBtn,
                  { backgroundColor: themeMode === 'dark' ? '#2563EB' : palette.primaryNavy },
                ]}
                onPress={onManageWallets}
                activeOpacity={0.85}
              >
                <Text style={styles.addAccountBtnText}>+ Add Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Stacked Cards Area */}
            <View style={styles.cardsStackWrapper}>
              {/* Secondary Layered Card Behind */}
              {secondaryWallet && (
                <TouchableOpacity
                  style={[
                    styles.backgroundCard,
                    {
                      backgroundColor: this.getCardBackgroundColor(secondaryWallet, secondaryIndex),
                      opacity: 0.55,
                    },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => this.animateCardTransition('NEXT')}
                >
                  <View style={styles.bgCardContent}>
                    <Text style={styles.bgCardName} numberOfLines={1}>
                      {secondaryWallet.name}
                    </Text>
                    <Text style={styles.bgCardRfid}>📶</Text>
                  </View>
                  <View style={styles.bgCardFooter}>
                    <Text style={styles.bgCardBrand}>{secondaryWallet.cardNetwork || 'VISA'}</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Foreground Active Card with Gestures & Long Press */}
              <Animated.View
                {...this.panResponder.panHandlers}
                style={[
                  styles.foregroundCard,
                  {
                    backgroundColor: this.getCardBackgroundColor(primaryWallet || undefined, safeIndex),
                    transform: [{ translateX: this.pan.x }, { rotate: cardRotate }],
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.touchableCardInner}
                  activeOpacity={0.92}
                  delayLongPress={350}
                  onLongPress={() => {
                    if (onLongPressCard && primaryWallet) {
                      onLongPressCard(primaryWallet);
                    }
                  }}
                >
                  {/* Card Header */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.walletBadge}>
                      <View style={styles.shieldIconWrapper}>
                        <Text style={styles.shieldIcon}>🛡️</Text>
                      </View>
                      <Text style={styles.walletName}>{primaryWallet?.name || 'Main wallet'}</Text>
                      {primaryWallet?.isPrimary && (
                        <View style={styles.activeTag}>
                          <Text style={styles.activeTagText}>ACTIVE</Text>
                        </View>
                      )}
                      {isCreditCard && (
                        <View style={styles.creditTag}>
                          <Text style={styles.creditTagText}>CREDIT</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => this.animateCardTransition('NEXT')}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.rfidIcon}>📶</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Card Middle: Balance & Limit */}
                  <View style={styles.cardMiddleRow}>
                    <View style={styles.balanceLabelRow}>
                      <Text style={styles.cardBalance}>{displayBalance}</Text>
                      {isCreditCard && (
                        <Text style={styles.availableBadge}>Available Limit</Text>
                      )}
                    </View>

                    {isCreditCard && totalCreditLimit ? (
                      <View style={styles.creditLimitInfo}>
                        <View style={styles.limitStatsRow}>
                          <Text style={styles.limitStatsText}>
                            Limit: {currencySymbol}{totalCreditLimit.toLocaleString('en-IN')}
                          </Text>
                          <Text style={styles.limitStatsText}>
                            Used: {currencySymbol}{usedLimit.toLocaleString('en-IN')} ({utilizationRate}%)
                          </Text>
                        </View>
                        <View style={styles.limitProgressBarTrack}>
                          <View
                            style={[
                              styles.limitProgressBarFill,
                              {
                                width: `${utilizationRate}%`,
                                backgroundColor:
                                  utilizationRate > 80 ? '#FF5757' : '#2AC769',
                              },
                            ]}
                          />
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.accountTypeLabel}>
                        {primaryWallet?.type.replace('_', ' ') || 'CASH ACCOUNT'}
                      </Text>
                    )}
                  </View>

                  {/* Card Bottom: Card Number & Network Logo */}
                  <View style={styles.cardBottomRow}>
                    <Text style={styles.cardNumber}>{maskedCardNumber}</Text>
                    {this.renderNetworkLogo(primaryWallet?.cardNetwork)}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Carousel Pagination Dots */}
            {wallets.length > 1 && (
              <View style={styles.paginationRow}>
                {wallets.map((wallet, idx) => {
                  const isActive = idx === safeIndex;
                  return (
                    <TouchableOpacity
                      key={wallet ? wallet.id : `dot-${idx}`}
                      onPress={() => this.selectWalletByIndex(idx)}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    >
                      <View style={isActive ? styles.paginationPillActive : styles.paginationDot} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 20,
  },
  titleRow: {
    flexDirection: 'column',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppTheme.Colors.primaryNavy,
  },
  swipeHintText: {
    fontSize: 11,
    color: AppTheme.Colors.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F3F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 13,
    color: AppTheme.Colors.textSecondary,
  },
  cardsStackWrapper: {
    height: 205,
    position: 'relative',
    marginHorizontal: 20,
    justifyContent: 'center',
  },
  backgroundCard: {
    position: 'absolute',
    right: 0,
    top: 10,
    width: '92%',
    height: 185,
    borderRadius: 22,
    backgroundColor: '#8FA0B8',
    opacity: 0.55,
    padding: 20,
    justifyContent: 'space-between',
    ...AppTheme.Elevation.cardShadow,
  },
  bgCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bgCardName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.85,
    marginLeft: '72%',
  },
  bgCardRfid: {
    fontSize: 16,
    color: '#FFFFFF',
    transform: [{ rotate: '90deg' }],
  },
  bgCardFooter: {
    alignItems: 'flex-end',
  },
  bgCardBrand: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  foregroundCard: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '93%',
    height: 198,
    borderRadius: 22,
    backgroundColor: '#162238',
    ...AppTheme.Elevation.cardShadow,
    overflow: 'hidden',
  },
  touchableCardInner: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shieldIconWrapper: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#4A5B78',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  shieldIcon: {
    fontSize: 11,
  },
  walletName: {
    fontSize: 14,
    color: '#E0E7F3',
    fontWeight: '600',
  },
  activeTag: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(42, 199, 105, 0.2)',
  },
  activeTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2AC769',
    letterSpacing: 0.6,
  },
  creditTag: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 138, 0, 0.25)',
  },
  creditTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFB74D',
    letterSpacing: 0.6,
  },
  rfidIcon: {
    fontSize: 16,
    color: '#A0B2CD',
    transform: [{ rotate: '90deg' }],
  },
  cardMiddleRow: {
    marginVertical: 4,
  },
  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  cardBalance: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  availableBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#A0B2CD',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  accountTypeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8A9DBA',
    letterSpacing: 1.2,
    marginTop: 4,
  },
  creditLimitInfo: {
    marginTop: 6,
  },
  limitStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  limitStatsText: {
    fontSize: 10,
    color: '#A0B2CD',
    fontWeight: '500',
  },
  limitProgressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  limitProgressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardNumber: {
    fontSize: 13,
    color: '#A0B2CD',
    fontWeight: '600',
    letterSpacing: 1,
  },
  networkLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    opacity: 0.9,
  },
  visaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  visaText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  emptyCardContainer: {
    width: '100%',
    height: 198,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    ...AppTheme.Elevation.cardShadow,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyIconEmoji: {
    fontSize: 22,
  },
  emptyCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyCardSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 14,
  },
  addAccountBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 18,
    ...AppTheme.Elevation.softShadow,
  },
  addAccountBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  paginationPillActive: {
    width: 18,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: AppTheme.Colors.primaryNavy,
    marginHorizontal: 4,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1DBEA',
    marginHorizontal: 4,
  },
});
