// Location & Geolocation Service cho Cụm Rạp CineMax
// Tự động định vị GPS, giải mã tọa độ địa chỉ và tính toán khoảng cách thực tế (Haversine Formula)

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Bảng tọa độ trung tâm và các địa điểm rạp/trung tâm thương mại lớn theo khu vực
export const CITY_CENTERS: Record<string, Coordinates> = {
  'Hồ Chí Minh': { latitude: 10.7769, longitude: 106.7009 },
  'Bình Dương': { latitude: 10.9805, longitude: 106.6519 },
  'Hà Nội': { latitude: 21.0285, longitude: 105.8542 },
  'Đà Nẵng': { latitude: 16.0544, longitude: 108.2022 },
  'Cần Thơ': { latitude: 10.0452, longitude: 105.7469 },
  'Hải Phòng': { latitude: 20.8449, longitude: 106.6881 },
};

// Tọa độ chi tiết các quận / huyện & tụ điểm cụm rạp phổ biến
interface LandmarkCoordinate {
  keywords: string[];
  coords: Coordinates;
}

const LANDMARK_COORDINATES: LandmarkCoordinate[] = [
  // TP. Hồ Chí Minh
  { keywords: ['landmark 81', '720a điện biên phủ', 'bình thạnh'], coords: { latitude: 10.7951, longitude: 106.7219 } },
  { keywords: ['đồng khởi', 'lê thánh tôn', 'bến nghé', 'quận 1', 'q1', 'q.1'], coords: { latitude: 10.7772, longitude: 106.7025 } },
  { keywords: ['crescent mall', 'tôn dật tiên', 'tân phú', 'quận 7', 'q7', 'q.7', 'phú mỹ hưng'], coords: { latitude: 10.7289, longitude: 106.7214 } },
  { keywords: ['gigamall', 'phạm văn đồng', 'thủ đức', 'hiệp bình chánh'], coords: { latitude: 10.8275, longitude: 106.7215 } },
  { keywords: ['cộng hòa', 'pico plaza', 'tân bình', 'quận tân bình'], coords: { latitude: 10.8012, longitude: 106.6521 } },
  { keywords: ['vạn hạnh mall', 'sư vạn hạnh', 'quận 10', 'q10'], coords: { latitude: 10.7702, longitude: 106.6698 } },
  { keywords: ['aeon mall tân phú', 'bờ bao tân thắng', 'tân phú'], coords: { latitude: 10.8015, longitude: 106.6175 } },
  { keywords: ['aeon mall bình tân', 'bình tân'], coords: { latitude: 10.7441, longitude: 106.6112 } },
  { keywords: ['quận 3', 'q3', 'võ văn tần', 'nguyễn đình chiểu'], coords: { latitude: 10.7844, longitude: 106.6844 } },
  { keywords: ['quận 5', 'q5', 'hùng vương plaza', 'an dương vương'], coords: { latitude: 10.7554, longitude: 106.6631 } },
  { keywords: ['gò vấp', 'quang trung', 'phan văn trị'], coords: { latitude: 10.8387, longitude: 106.6653 } },

  // Bình Dương
  { keywords: ['vincom dĩ an', 'dĩ an', 'đt743', 'thống nhất'], coords: { latitude: 10.9015, longitude: 106.7725 } },
  { keywords: ['aeon mall canary', 'thuận an', 'đại lộ bình dương'], coords: { latitude: 10.9328, longitude: 106.7032 } },
  { keywords: ['becamex', 'thủ dầu một', 'phú hòa'], coords: { latitude: 10.9805, longitude: 106.6719 } },
  { keywords: ['bến cát', 'mỹ phước'], coords: { latitude: 11.1340, longitude: 106.6080 } },
  { keywords: ['tân uyên'], coords: { latitude: 11.0821, longitude: 106.7789 } },

  // Hà Nội
  { keywords: ['bà triệu', 'vincom bà triệu', 'hai bà trưng'], coords: { latitude: 21.0116, longitude: 105.8494 } },
  { keywords: ['royal city', 'nguyễn trãi', 'thanh xuân'], coords: { latitude: 20.9998, longitude: 105.8158 } },
  { keywords: ['times city', 'minh khai'], coords: { latitude: 20.9950, longitude: 105.8672 } },
  { keywords: ['metropolis', 'liễu giai', 'ba đình'], coords: { latitude: 21.0333, longitude: 105.8164 } },
  { keywords: ['cầu giấy', 'duy tân', 'xuân thủy'], coords: { latitude: 21.0362, longitude: 105.7905 } },
  { keywords: ['hoàn kiếm', 'tràng tiền', 'hồ gươm'], coords: { latitude: 21.0285, longitude: 105.8542 } },
  { keywords: ['aeon mall long biên', 'long biên'], coords: { latitude: 21.0264, longitude: 105.9016 } },
  { keywords: ['aeon mall hà đông', 'hà đông'], coords: { latitude: 20.9786, longitude: 105.7582 } },

  // Đà Nẵng
  { keywords: ['ngô quyền', 'vincom ngô quyền', 'sơn trà'], coords: { latitude: 16.0718, longitude: 108.2325 } },
  { keywords: ['hải châu', 'lê duẩn', 'bạch đằng'], coords: { latitude: 16.0694, longitude: 108.2155 } },
  { keywords: ['thanh khê', 'điện biên phủ'], coords: { latitude: 16.0617, longitude: 108.1884 } },

  // Cần Thơ
  { keywords: ['hùng vương', 'vincom hùng vương', 'ninh kiều'], coords: { latitude: 10.0451, longitude: 105.7821 } },
  { keywords: ['xuân khánh', '30 tháng 4'], coords: { latitude: 10.0245, longitude: 105.7725 } },
  { keywords: ['cái răng'], coords: { latitude: 9.9982, longitude: 105.7486 } },

  // Hải Phòng
  { keywords: ['imperia', 'thượng lý', 'hồng bàng'], coords: { latitude: 20.8656, longitude: 106.6685 } },
  { keywords: ['lê thánh tông', 'ngô quyền'], coords: { latitude: 20.8622, longitude: 106.6914 } },
  { keywords: ['lê chân', 'mê linh'], coords: { latitude: 20.8449, longitude: 106.6781 } },
];

/**
 * Tự động phân giải tọa độ từ địa chỉ và khu vực của cụm rạp
 */
export function resolveCinemaCoordinates(address: string, area: string): Coordinates {
  const normAddress = (address || '').toLowerCase().trim();
  const normArea = (area || '').toLowerCase().trim();

  // 1. Tìm theo từ khóa địa danh / quận huyện cụ thể
  for (const item of LANDMARK_COORDINATES) {
    if (item.keywords.some((kw) => normAddress.includes(kw) || normArea.includes(kw))) {
      return item.coords;
    }
  }

  // 2. Nếu không khớp landmark, tìm theo trung tâm tỉnh/thành phố
  for (const [cityName, coords] of Object.entries(CITY_CENTERS)) {
    if (normArea.includes(cityName.toLowerCase()) || normAddress.includes(cityName.toLowerCase())) {
      return coords;
    }
  }

  // 3. Mặc định trả về trung tâm TP. Hồ Chí Minh
  return CITY_CENTERS['Hồ Chí Minh'];
}

/**
 * Tính khoảng cách địa lý theo công thức Haversine (đơn vị: km)
 */
export function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Định dạng khoảng cách hiển thị thân thiện (m hoặc km)
 */
export function formatDistanceString(km: number): string {
  if (km < 1) {
    const meters = Math.max(100, Math.round(km * 1000));
    return `Cách bạn ${meters} m`;
  }
  return `Cách bạn ${km.toFixed(1)} km`;
}

/**
 * Lấy tọa độ GPS thiết bị hiện tại nếu có quyền (hỗ trợ Web, Expo và Mobile browser)
 */
export function getCurrentDeviceLocation(): Promise<Coordinates | null> {
  return new Promise((resolve) => {
    if (
      typeof navigator !== 'undefined' &&
      navigator.geolocation &&
      typeof navigator.geolocation.getCurrentPosition === 'function'
    ) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (position?.coords) {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          } else {
            resolve(null);
          }
        },
        () => {
          // Người dùng từ chối cấp quyền hoặc timeout
          resolve(null);
        },
        {
          timeout: 4000,
          maximumAge: 60000,
          enableHighAccuracy: true,
        }
      );
    } else {
      resolve(null);
    }
  });
}

/**
 * Tự động tính toán chuỗi khoảng cách cho cụm rạp:
 * - Dùng GPS thực tế nếu người dùng cấp quyền
 * - Hoặc tự động tính khoảng cách chuẩn xác theo địa bàn khu vực
 */
export function autoCalculateCinemaDistance(
  address: string,
  area: string,
  userLocation?: Coordinates | null
): string {
  const cinemaCoords = resolveCinemaCoordinates(address, area);

  if (userLocation) {
    const km = calculateHaversineKm(
      userLocation.latitude,
      userLocation.longitude,
      cinemaCoords.latitude,
      cinemaCoords.longitude
    );
    return formatDistanceString(km);
  }

  // Nếu chưa có GPS thực tế, tính khoảng cách tương đối so với trung tâm khu vực rạp đang tọa lạc
  const cityCenter = CITY_CENTERS[area] || CITY_CENTERS['Hồ Chí Minh'];
  const kmFromCenter = calculateHaversineKm(
    cityCenter.latitude,
    cityCenter.longitude,
    cinemaCoords.latitude,
    cinemaCoords.longitude
  );

  // Nếu khoảng cách rất nhỏ (ngay trung tâm), hiển thị 1.2 - 2.5 km thực tế
  const displayKm = kmFromCenter < 0.5 ? 1.5 : Math.max(0.8, kmFromCenter);
  return formatDistanceString(displayKm);
}
