// UC43: View Notifications & Mark As Read
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationAPI } from '@/services/api';
import { NotificationItem, NotificationType } from '@/types/notification';
import { useAuth } from '@/context/auth-context';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  onNotificationsUpdated?: () => void;
}

export default function NotificationModal({
  visible,
  onClose,
  onNotificationsUpdated,
}: NotificationModalProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);

  const currentUserId = user?.id || 'guest';

  const fetchNotifications = async () => {
    try {
      const res = await NotificationAPI.getNotifications(currentUserId);
      if (res.success) {
        setNotifications(res.notifications || []);
      }
    } catch (err) {
      console.log('[Fetch Notifications Error]', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      fetchNotifications();
    }
  }, [visible, currentUserId]);

  const handleMarkAsRead = async (notif: NotificationItem) => {
    setSelectedNotif(notif);
    if (!notif.isRead) {
      try {
        await NotificationAPI.markAsRead(notif.id, currentUserId);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        onNotificationsUpdated?.();
      } catch (err) {
        console.log('[Mark As Read Error]', err);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await NotificationAPI.markAllAsRead(currentUserId);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      onNotificationsUpdated?.();
    } catch (err) {
      console.log('[Mark All As Read Error]', err);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (selectedType === 'all') return true;
    return n.type === selectedType;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'promotion':
        return { name: 'gift-outline' as const, color: '#F59E0B', label: 'Khuyến mãi' };
      case 'order':
        return { name: 'receipt-outline' as const, color: '#10B981', label: 'Đơn hàng' };
      case 'movie':
        return { name: 'film-outline' as const, color: '#E50914', label: 'Phim mới' };
      case 'system':
      default:
        return { name: 'notifications-outline' as const, color: '#3B82F6', label: 'Hệ thống' };
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="notifications" size={22} color="#E50914" />
              <Text style={styles.headerTitle}>Thông Báo Của Bạn</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount} mới</Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Sub Header / Mark All Action */}
          <View style={styles.subHeaderBar}>
            <Text style={styles.subHeaderText}>
              Cập nhật ưu đãi, trạng thái vé & đồ ăn CineMax
            </Text>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllBtn}>
                <Ionicons name="checkmark-done" size={15} color="#10B981" />
                <Text style={styles.markAllBtnText}>Đọc tất cả</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Category Tabs */}
          <View style={styles.typeTabsRow}>
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'order', label: 'Đơn hàng' },
              { key: 'promotion', label: 'Ưu đãi' },
              { key: 'movie', label: 'Phim' },
              { key: 'system', label: 'Hệ thống' },
            ].map((tab) => {
              const active = selectedType === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setSelectedType(tab.key)}
                  style={[styles.typeTab, active && styles.typeTabActive]}>
                  <Text style={[styles.typeTabText, active && styles.typeTabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Body Content */}
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#E50914" />
              <Text style={styles.loadingText}>Đang tải danh sách thông báo...</Text>
            </View>
          ) : filteredNotifications.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="notifications-off-outline" size={48} color="#6B7280" />
              <Text style={styles.emptyTitle}>Chưa có thông báo nào</Text>
              <Text style={styles.emptySub}>
                Khi có ưu đãi hoặc cập nhật đơn vé, CineMax sẽ thông báo cho bạn ngay tại đây.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={() => {
                    setIsRefreshing(true);
                    fetchNotifications();
                  }}
                  tintColor="#E50914"
                />
              }>
              {filteredNotifications.map((notif) => {
                const info = getTypeIcon(notif.type);
                const isUnread = !notif.isRead;

                return (
                  <TouchableOpacity
                    key={notif.id}
                    onPress={() => handleMarkAsRead(notif)}
                    activeOpacity={0.8}
                    style={[
                      styles.notifCard,
                      isUnread && styles.notifCardUnread,
                    ]}>
                    <View style={[styles.typeIconBox, { backgroundColor: `${info.color}20` }]}>
                      <Ionicons name={info.name} size={20} color={info.color} />
                    </View>

                    <View style={styles.notifContent}>
                      <View style={styles.notifTopRow}>
                        <View style={[styles.typeTag, { borderColor: info.color }]}>
                          <Text style={[styles.typeTagText, { color: info.color }]}>
                            {info.label}
                          </Text>
                        </View>
                        <Text style={styles.notifTime}>
                          {new Date(notif.createdAt).toLocaleDateString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.notifTitle,
                          isUnread && styles.notifTitleUnread,
                        ]}>
                        {notif.title}
                      </Text>

                      <Text style={styles.notifMessage} numberOfLines={selectedNotif?.id === notif.id ? undefined : 2}>
                        {notif.message}
                      </Text>
                    </View>

                    {isUnread && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Footer Detail Modal popup if tapped */}
          {selectedNotif && (
            <View style={styles.detailPopupBox}>
              <View style={styles.detailPopupHeader}>
                <Text style={styles.detailPopupTitle}>{selectedNotif.title}</Text>
                <TouchableOpacity onPress={() => setSelectedNotif(null)}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.detailPopupBody}>{selectedNotif.message}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '60%',
    paddingBottom: 24,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  unreadBadge: {
    backgroundColor: '#E50914',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#262626',
  },
  subHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  subHeaderText: {
    fontSize: 12,
    color: '#9CA3AF',
    flex: 1,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  markAllBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  typeTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  typeTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1F2937',
  },
  typeTabActive: {
    backgroundColor: '#E50914',
  },
  typeTabText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  typeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 10,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1D24',
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#262626',
  },
  notifCardUnread: {
    backgroundColor: '#20242D',
    borderColor: '#3B82F6',
  },
  typeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notifContent: {
    flex: 1,
  },
  notifTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeTag: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  notifTime: {
    fontSize: 11,
    color: '#6B7280',
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D1D5DB',
    marginBottom: 4,
  },
  notifTitleUnread: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  notifMessage: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E50914',
    marginLeft: 8,
    marginTop: 6,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#9CA3AF',
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E5E7EB',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  detailPopupBox: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#262626',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#E50914',
  },
  detailPopupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailPopupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  detailPopupBody: {
    fontSize: 12,
    color: '#D1D5DB',
    lineHeight: 18,
  },
});

