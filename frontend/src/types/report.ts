// UC45: View Reports
export interface ReportSummary {
  totalRevenue: number;
  ticketRevenue: number;
  foodRevenue: number;
  totalDiscount: number;
  totalOrders: number;
  totalTicketsSold: number;
  totalFoodItemsSold: number;
  averageOrderValue: number;
}

export interface TopMovieStat {
  movieId: string;
  title: string;
  poster?: string;
  ticketsSold: number;
  revenue: number;
}

export interface TopFoodStat {
  id: string;
  name: string;
  category: string;
  image?: string;
  quantitySold: number;
  revenue: number;
}

export interface RevenueTrend {
  date: string;
  totalRevenue: number;
  ticketRevenue: number;
  foodRevenue: number;
  ordersCount: number;
}

