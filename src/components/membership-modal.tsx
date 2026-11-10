import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  User,
  MembershipTier,
  TierConfigItem,
  PointTransaction,
  VoucherItem,
  RewardCatalogItem,
} from '@/types/auth';
import { MembershipAPI } from '@/services/api';

interface MembershipModalProps {
  visible: boolean;
  onClose: () => void;
  token?: string;
  user: User;
  onPointsUpdated?: (newPoints: number) => void;
}

const DEFAULT_TIERS_CONFIG: Record<MembershipTier, TierConfigItem> = {
  Standard: {
    tier: 'Standard',
    name: 'Thành viên Tiêu Chuẩn',
    minPoints: 0,
    maxPoints: 299,
    nextTier: 'Silver',
    nextTierPoints: 300,
    accentColor: '#9CA3AF',
    cardBackground: '#1F2937',
    pointRate: '5% chi tiêu vé',
    benefits: [
      'Tích lũy 5% giá trị vé xem phim',
      'Tặng 01 vé xem phim 2D vào tháng sinh nhật',
      'Nhận thông báo ưu đãi ra mắt phim sớm',
      'Thanh toán tiện lợi qua mã thẻ ảo',
    ],
  },
  Silver: {
    tier: 'Silver',
    name: 'Thành viên Bạc (Silver)',
    minPoints: 300,
    maxPoints: 599,
    nextTier: 'Gold',
    nextTierPoints: 600,
    accentColor: '#E5E7EB',
    cardBackground: '#374151',
    pointRate: '7% chi tiêu vé',
    benefits: [
      'Tích lũy 7% giá trị vé xem phim',
      'Tặng Combo 1 Bắp + 1 Nước vào tháng sinh nhật',
      'Giảm 5% giá bắp nước tại quầy trực tiếp',
      'Ưu tiên chọn ghế đẹp trong phòng chiếu',
      'Bao gồm mọi quyền lợi hạng Tiêu Chuẩn',
    ],
  },
  Gold: {
    tier: 'Gold',
    name: 'Thành viên Vàng (Gold)',
    minPoints: 600,
    maxPoints: 1199,
    nextTier: 'VIP',
    nextTierPoints: 1200,
    accentColor: '#F59E0B',
    cardBackground: '#78350F',
    pointRate: '10% chi tiêu vé',
    benefits: [
      'Tích lũy 10% giá trị vé xem phim',
      'Tặng 02 vé xem phim 2D + 1 Bắp ngọt sinh nhật',
      'Giảm 10% giá bắp nước & combo quầy bar',
      'Tặng 2 lượt miễn phí đổi vé xem phim',
      'Ưu tiên xếp hàng tại quầy vé riêng biệt',
      'Bao gồm mọi quyền lợi hạng Bạc',
    ],
  },
  VIP: {
    tier: 'VIP',
    name: 'Thành viên Kim Cương (VIP)',
    minPoints: 1200,
    maxPoints: 99999,
    nextTier: null,
    nextTierPoints: null,
    accentColor: '#EF4444',
    cardBackground: '#450A0A',
    pointRate: '12% chi tiêu vé',
    benefits: [
      'Tích lũy tối đa 12% giá trị vé xem phim',
      'Miễn phí nâng hạng phòng chiếu IMAX / Gold Class',
      'Đặc quyền sử dụng phòng chờ thương gia VIP Lounge',
      'Vé mời tham dự các sự kiện công chiếu phim bom tấn',
      'Tặng quà tri ân đặc biệt cuối năm từ CineMax',
      'Bao gồm toàn bộ quyền lợi của các hạng dưới',
    ],
  },
};

const DEFAULT_REWARDS: RewardCatalogItem[] = [
  {
    id: 'reward_drink',
    title: '01 Ly Coca-Cola / Sprite Lớn',
    category: 'Đồ uống',
    pointsCost: 80,
    icon: 'cafe-outline',
    description: 'Áp dụng cho mọi cụm rạp CineMax trên toàn quốc',
  },
  {
    id: 'reward_popcorn',
    title: '01 Bắp Rang Bơ Caramel Size L',
    category: 'Bắp bơ',
    pointsCost: 150,
    icon: 'fast-food-outline',
    description: 'Thơm lừng vị bơ caramel truyền thống rạp phim',
  },
  {
    id: 'reward_upgrade_vip',
    title: 'Miễn Phí Nâng Hạng Ghế VIP',
    category: 'Đặc quyền',
    pointsCost: 200,
    icon: 'star-outline',
    description: 'Trải nghiệm hàng ghế trung tâm VIP êm ái tốt nhất',
  },
  {
    id: 'reward_ticket_2d',
    title: '01 Vé Xem Phim 2D Tiêu Chuẩn',
    category: 'Vé xem phim',
    pointsCost: 250,
    icon: 'ticket-outline',
    description: 'Đổi vé xem phim 2D cho bất kỳ suất chiếu ngày thường',
  },
  {
    id: 'reward_combo_discount',
    title: 'Voucher Giảm 50.000đ Combo Bắp Nước',
    category: 'Voucher',
    pointsCost: 300,
    icon: 'gift-outline',
    description: 'Khấu trừ trực tiếp khi mua combo bắp nước tại quầy',
  },
];

const INITIAL_POINT_HISTORY: PointTransaction[] = [
  {
    date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    description: 'Tích điểm vé xem phim Dune: Part Two IMAX',
    pointsChange: +35,
    balanceAfter: 350,
  },
  {
    date: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    description: 'Tích điểm mua combo bắp nước tại quầy',
    pointsChange: +15,
    balanceAfter: 315,
  },
  {
    date: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
    description: 'Tích điểm vé xem phim Godzilla x Kong',
    pointsChange: +50,
    balanceAfter: 300,
  },
  {
    date: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    description: 'Điểm thưởng chào mừng gia nhập CineMax',
    pointsChange: +250,
    balanceAfter: 250,
  },
];

export function MembershipModal({
  visible,
  onClose,
  token,
  user,
  onPointsUpdated,
}: MembershipModalProps) {
  const [activeTab, setActiveTab] = useState<'benefits' | 'rewards' | 'history'>('benefits');
  const [viewTier, setViewTier] = useState<MembershipTier>(user.membershipTier);
  const [currentPoints, setCurrentPoints] = useState<number>(user.loyaltyPoints || 0);
  const [pointHistory, setPointHistory] = useState<PointTransaction[]>(INITIAL_POINT_HISTORY);
  const [vouchers, setVouchers] = useState<VoucherItem[]>([
    {
      code: 'CNM-VCH-8821',
      title: '01 Ly Nước Ngọt Lớn Miễn Phí',
      discount: 'Đồ uống',
      pointsCost: 80,
      expiryDate: '30/12/2026',
      isUsed: false,
    },
  ]);
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Load history from backend
  useEffect(() => {
    let isCancelled = false;
    if (visible && token) {
      MembershipAPI.getInfo(token)
        .then((res) => {
          if (res.success && res.membership) {
            if (res.membership.loyaltyPoints !== undefined) {
              setCurrentPoints(res.membership.loyaltyPoints);
            }
            if (res.membership.vouchers) {
              setVouchers(res.membership.vouchers);
            }
          }
        })
        .catch(() => {});

      MembershipAPI.getHistory(token)
        .then((res) => {
          if (!isCancelled && res.success && res.pointHistory) {
            setPointHistory(res.pointHistory);
          }
        })
        .catch(() => {});
    }

    return () => {
      isCancelled = true;
    };
  }, [visible, token]);

  // Compute tier progress
  const currentConfig = DEFAULT_TIERS_CONFIG[user.membershipTier];
  let pointsNeeded = 0;
  let progressPercent = 100;

  if (currentConfig.nextTierPoints) {
    const tierRange = currentConfig.nextTierPoints - currentConfig.minPoints;
    const currentInTier = Math.max(0, currentPoints - currentConfig.minPoints);
    pointsNeeded = Math.max(0, currentConfig.nextTierPoints - currentPoints);
    progressPercent = Math.min(100, Math.round((currentInTier / tierRange) * 100));
  }

  // Redeem Reward (UC10)
  const handleRedeemReward = async (reward: RewardCatalogItem) => {
    if (currentPoints < reward.pointsCost) {
      Alert.alert(
        'Không đủ điểm thưởng',
        `Bạn cần ${reward.pointsCost} điểm để đổi ${reward.title}. Hiện bạn đang có ${currentPoints} điểm.`
      );
      return;
    }

    Alert.alert(
      'Xác nhận đổi quà',
      `Bạn có muốn dùng ${reward.pointsCost} điểm tích lũy để nhận voucher "${reward.title}" không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đổi ngay',
          onPress: async () => {
            setIsRedeeming(true);
            const newBalance = currentPoints - reward.pointsCost;
            const newVoucherCode = `CNM-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

            const newVoucher: VoucherItem = {
              code: newVoucherCode,
              title: reward.title,
              discount: reward.category,
              pointsCost: reward.pointsCost,
              expiryDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toLocaleDateString('vi-VN'),
              isUsed: false,
            };

            const newTx: PointTransaction = {
              date: new Date().toISOString(),
              description: `Đổi quà [${reward.title}]`,
              pointsChange: -reward.pointsCost,
              balanceAfter: newBalance,
            };

            if (token) {
              try {
                await MembershipAPI.redeemReward(token, reward.id);
              } catch {
                // fall through to local update
              }
            }

            setCurrentPoints(newBalance);
            setVouchers((prev) => [newVoucher, ...prev]);
            setPointHistory((prev) => [newTx, ...prev]);

            if (onPointsUpdated) {
              onPointsUpdated(newBalance);
            }

            setIsRedeeming(false);
            Alert.alert(
              'Đổi quà thành công!',
              `Mã voucher của bạn là: [${newVoucherCode}]. Bạn có thể xem trong mục "Kho Voucher của tôi".`
            );
          },
        },
      ]
    );
  };

  const getCardTheme = (tier: MembershipTier) => {
    switch (tier) {
      case 'VIP':
        return {
          bg: '#450A0A',
          border: '#DC2626',
          badge: '#EF4444',
          accent: '#F87171',
          name: 'KIM CƯƠNG (VIP)',
        };
      case 'Gold':
        return {
          bg: '#451A03',
          border: '#D97706',
          badge: '#F59E0B',
          accent: '#FBBF24',
          name: 'HẠNG VÀNG (GOLD)',
        };
      case 'Silver':
        return {
          bg: '#1E293B',
          border: '#94A3B8',
          badge: '#CBD5E1',
          accent: '#E2E8F0',
          name: 'HẠNG BẠC (SILVER)',
        };
      default:
        return {
          bg: '#181E2C',
          border: '#475569',
          badge: '#94A3B8',
          accent: '#CBD5E1',
          name: 'TIÊU CHUẨN (STANDARD)',
        };
    }
  };

  const cardTheme = getCardTheme(user.membershipTier);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.crownBadgeIcon}>
              <Ionicons name="ribbon" size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Hội Viên CineMax Privilege</Text>
              <Text style={styles.headerSubtitle}>UC10: Manage Membership & Loyalty Points</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Virtual Membership Card */}
          <View
            style={[
              styles.membershipCard,
              { backgroundColor: cardTheme.bg, borderColor: cardTheme.border },
            ]}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardBrand}>CINEMAX PRIVILEGE</Text>
                <Text style={[styles.cardTierText, { color: cardTheme.accent }]}>
                  {cardTheme.name}
                </Text>
              </View>
              <View style={styles.chipWrapper}>
                <Ionicons name="hardware-chip-outline" size={28} color="#F59E0B" />
              </View>
            </View>

            <View style={styles.cardMiddleRow}>
              <Text style={styles.cardName}>{user.fullName.toUpperCase()}</Text>
              <Text style={styles.cardPhone}>
                {user.phone ? user.phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3') : ''}
              </Text>
            </View>

            <View style={styles.cardBottomRow}>
              <View>
                <Text style={styles.cardPointLabel}>ĐIỂM TÍCH LŨY HIỆN TẠI</Text>
                <Text style={styles.cardPointsText}>{currentPoints} PTS</Text>
              </View>

              <View style={styles.cardTierBadge}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.cardTierBadgeText}>Hạng {user.membershipTier}</Text>
              </View>
            </View>
          </View>

          {/* Tier Progress Bar */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressTitle}>Tiến trình thăng hạng</Text>
              <Text style={styles.progressValueText}>{progressPercent}%</Text>
            </View>

            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>

            <Text style={styles.progressDesc}>
              {currentConfig.nextTier ? (
                <>
                  Bạn đang có <Text style={styles.boldWhite}>{currentPoints} điểm</Text>. Cần thêm{' '}
                  <Text style={styles.boldRed}>{pointsNeeded} điểm</Text> để thăng hạng{' '}
                  <Text style={styles.boldGold}>
                    {DEFAULT_TIERS_CONFIG[currentConfig.nextTier].name}
                  </Text>
                  !
                </>
              ) : (
                'Chúc mừng! Bạn đang giữ hạng thành viên Kim Cương (VIP) cao quý nhất!'
              )}
            </Text>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'benefits' && styles.tabButtonActive]}
              onPress={() => setActiveTab('benefits')}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={activeTab === 'benefits' ? '#FFFFFF' : '#9CA3AF'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.tabButtonText, activeTab === 'benefits' && styles.tabButtonTextActive]}>
                Đặc quyền
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'rewards' && styles.tabButtonActive]}
              onPress={() => setActiveTab('rewards')}>
              <Ionicons
                name="gift-outline"
                size={16}
                color={activeTab === 'rewards' ? '#FFFFFF' : '#9CA3AF'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.tabButtonText, activeTab === 'rewards' && styles.tabButtonTextActive]}>
                Đổi quà ({DEFAULT_REWARDS.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
              onPress={() => setActiveTab('history')}>
              <Ionicons
                name="receipt-outline"
                size={16}
                color={activeTab === 'history' ? '#FFFFFF' : '#9CA3AF'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.tabButtonText, activeTab === 'history' && styles.tabButtonTextActive]}>
                Lịch sử điểm
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: BENEFITS */}
          {activeTab === 'benefits' && (
            <View style={styles.tabContentSection}>
              {/* Tier selector chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tierSelectorRow}>
                {(['Standard', 'Silver', 'Gold', 'VIP'] as MembershipTier[]).map((t) => {
                  const isCur = t === user.membershipTier;
                  const isSel = t === viewTier;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[styles.tierChip, isSel && styles.tierChipActive]}
                      onPress={() => setViewTier(t)}>
                      <Text style={[styles.tierChipText, isSel && styles.tierChipTextActive]}>
                        Hạng {t} {isCur ? ' (Hiện tại)' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Selected Tier Card */}
              <View style={styles.benefitsCard}>
                <View style={styles.benefitsHeader}>
                  <View>
                    <Text style={styles.benefitsTitle}>{DEFAULT_TIERS_CONFIG[viewTier].name}</Text>
                    <Text style={styles.benefitsRate}>
                      Tỷ lệ tích điểm: {DEFAULT_TIERS_CONFIG[viewTier].pointRate}
                    </Text>
                  </View>
                  <View style={styles.minPointBadge}>
                    <Text style={styles.minPointText}>
                      Từ {DEFAULT_TIERS_CONFIG[viewTier].minPoints} điểm
                    </Text>
                  </View>
                </View>

                <View style={styles.benefitsList}>
                  {DEFAULT_TIERS_CONFIG[viewTier].benefits.map((b, idx) => (
                    <View key={idx} style={styles.benefitItemRow}>
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginRight: 8 }} />
                      <Text style={styles.benefitItemText}>{b}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* TAB 2: REWARDS STORE & MY VOUCHERS */}
          {activeTab === 'rewards' && (
            <View style={styles.tabContentSection}>
              {/* My Vouchers Banner if any */}
              {vouchers.length > 0 && (
                <View style={styles.vouchersSection}>
                  <Text style={styles.vouchersSectionTitle}>
                    🎟️ Kho Voucher Của Bạn ({vouchers.length})
                  </Text>
                  {vouchers.map((v, i) => (
                    <View key={i} style={styles.voucherItemCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.voucherTitle}>{v.title}</Text>
                        <Text style={styles.voucherCode}>Mã: {v.code}</Text>
                        <Text style={styles.voucherExpiry}>Hạn dùng: {v.expiryDate}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.useVoucherBtn}
                        onPress={() =>
                          Alert.alert('Sử dụng Voucher', `Hãy đưa mã [${v.code}] cho nhân viên quầy để áp dụng ưu đãi!`)
                        }>
                        <Text style={styles.useVoucherText}>Dùng ngay</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.sectionHeaderTitle}>Danh mục đổi quà từ điểm tích lũy:</Text>

              {DEFAULT_REWARDS.map((reward) => {
                const canAfford = currentPoints >= reward.pointsCost;
                return (
                  <View key={reward.id} style={styles.rewardCard}>
                    <View style={styles.rewardIconBox}>
                      <Ionicons name={reward.icon} size={24} color="#E50914" />
                    </View>

                    <View style={styles.rewardDetails}>
                      <Text style={styles.rewardTitle}>{reward.title}</Text>
                      <Text style={styles.rewardDesc}>{reward.description}</Text>
                      <View style={styles.pointsCostRow}>
                        <Ionicons name="star" size={14} color="#F59E0B" />
                        <Text style={styles.pointsCostText}>{reward.pointsCost} Điểm</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.redeemBtn,
                        !canAfford && styles.redeemBtnDisabled,
                      ]}
                      onPress={() => handleRedeemReward(reward)}
                      disabled={isRedeeming || !canAfford}>
                      <Text style={[styles.redeemBtnText, !canAfford && styles.redeemBtnTextDisabled]}>
                        {canAfford ? 'Đổi quà' : 'Chưa đủ'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* TAB 3: POINTS TRANSACTION HISTORY */}
          {activeTab === 'history' && (
            <View style={styles.tabContentSection}>
              <Text style={styles.sectionHeaderTitle}>Nhật ký biến động điểm tích lũy:</Text>

              {pointHistory.map((item, idx) => {
                const isPositive = item.pointsChange > 0;
                return (
                  <View key={idx} style={styles.historyItemRow}>
                    <View
                      style={[
                        styles.historyIconCircle,
                        { backgroundColor: isPositive ? '#064E3B' : '#7F1D1D' },
                      ]}>
                      <Ionicons
                        name={isPositive ? 'arrow-up' : 'arrow-down'}
                        size={16}
                        color={isPositive ? '#10B981' : '#EF4444'}
                      />
                    </View>

                    <View style={styles.historyInfo}>
                      <Text style={styles.historyDesc}>{item.description}</Text>
                      <Text style={styles.historyDate}>
                        {new Date(item.date).toLocaleDateString('vi-VN')} • Số dư: {item.balanceAfter} pts
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.pointsChangeText,
                        { color: isPositive ? '#10B981' : '#EF4444' },
                      ]}>
                      {isPositive ? `+${item.pointsChange}` : item.pointsChange}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  crownBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  membershipCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardBrand: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  cardTierText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
  chipWrapper: {
    padding: 4,
  },
  cardMiddleRow: {
    marginVertical: 18,
  },
  cardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  cardPhone: {
    fontSize: 13,
    color: '#CBD5E1',
    marginTop: 4,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: 12,
  },
  cardPointLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  cardPointsText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  cardTierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  cardTierBadgeText: {
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  progressCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: 'bold',
  },
  progressValueText: {
    fontSize: 13,
    color: '#E50914',
    fontWeight: 'bold',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#E50914',
    borderRadius: 4,
  },
  progressDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  boldWhite: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  boldRed: {
    color: '#E50914',
    fontWeight: 'bold',
  },
  boldGold: {
    color: '#F59E0B',
    fontWeight: 'bold',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#E50914',
  },
  tabButtonText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  tabContentSection: {
    gap: 12,
  },
  tierSelectorRow: {
    gap: 8,
    marginBottom: 4,
  },
  tierChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tierChipActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  tierChipText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  tierChipTextActive: {
    color: '#000000',
    fontWeight: 'bold',
  },
  benefitsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  benefitsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  benefitsRate: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 2,
  },
  minPointBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  minPointText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: 'bold',
  },
  benefitsList: {
    gap: 10,
  },
  benefitItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitItemText: {
    fontSize: 13,
    color: '#CBD5E1',
    flex: 1,
  },
  vouchersSection: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  vouchersSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  voucherItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  voucherTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  voucherCode: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: 'bold',
    marginTop: 2,
  },
  voucherExpiry: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  useVoucherBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  useVoucherText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#CBD5E1',
    marginBottom: 4,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  rewardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  rewardDetails: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  rewardDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  pointsCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  pointsCostText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: 'bold',
  },
  redeemBtn: {
    backgroundColor: '#E50914',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  redeemBtnDisabled: {
    backgroundColor: '#334155',
  },
  redeemBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  redeemBtnTextDisabled: {
    color: '#64748B',
  },
  historyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  historyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyInfo: {
    flex: 1,
  },
  historyDesc: {
    fontSize: 13,
    color: '#F8FAFC',
    fontWeight: '500',
  },
  historyDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  pointsChangeText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});
