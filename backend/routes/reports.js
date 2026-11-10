// UC45: View Reports (Reporting)
// Báo cáo cơ bản về đặt vé, doanh thu và phim phổ biến
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { requireAdmin } = require('../middleware/auth');

// Toàn bộ báo cáo chỉ dành cho Quản trị viên (Admin)
router.use(requireAdmin);

// ════════════════════════════════════════════════════════════
// GET /api/reports/summary  (UC45: Tổng quan doanh thu & vé)
// ════════════════════════════════════════════════════════════
router.get('/summary', async (req, res) => {
  try {
    const orders = await Order.find({ paymentStatus: 'paid' });

    let totalRevenue = 0;
    let ticketRevenue = 0;
    let foodRevenue = 0;
    let totalDiscount = 0;
    let totalTicketsSold = 0;
    let totalFoodItemsSold = 0;

    orders.forEach((order) => {
      totalRevenue += Number(order.totalPrice || 0);
      ticketRevenue += Number(order.subtotalTickets || 0);
      foodRevenue += Number(order.subtotalFoods || 0);
      totalDiscount += Number(order.discountAmount || 0);
      totalTicketsSold += (order.tickets || []).length;
      (order.foods || []).forEach((f) => {
        totalFoodItemsSold += Number(f.quantity || 0);
      });
    });

    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    return res.json({
      success: true,
      data: {
        totalRevenue,
        ticketRevenue,
        foodRevenue,
        totalDiscount,
        totalOrders,
        totalTicketsSold,
        totalFoodItemsSold,
        averageOrderValue,
      },
    });
  } catch (err) {
    console.error('[GET /api/reports/summary]', err);
    return res.status(500).json({ success: false, message: 'Lỗi tạo báo cáo tổng quan doanh thu.' });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/reports/top-movies  (UC45: Top phim phổ biến nhất)
// ════════════════════════════════════════════════════════════
router.get('/top-movies', async (req, res) => {
  try {
    const orders = await Order.find({ paymentStatus: 'paid' });
    const movieStats = {};

    orders.forEach((order) => {
      const mId = order.movie?.id || order.movie?.title || 'other';
      if (!movieStats[mId]) {
        movieStats[mId] = {
          movieId: mId,
          title: order.movie?.title || 'Phim rạp',
          poster: order.movie?.poster || '',
          ticketsSold: 0,
          revenue: 0,
        };
      }
      movieStats[mId].ticketsSold += (order.tickets || []).length;
      movieStats[mId].revenue += Number(order.subtotalTickets || 0);
    });

    const topMovies = Object.values(movieStats).sort((a, b) => b.revenue - a.revenue);

    return res.json({
      success: true,
      topMovies,
    });
  } catch (err) {
    console.error('[GET /api/reports/top-movies]', err);
    return res.status(500).json({ success: false, message: 'Lỗi tạo thống kê phim phổ biến.' });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/reports/top-foods  (UC45: Top đồ ăn/nước uống bán chạy)
// ════════════════════════════════════════════════════════════
router.get('/top-foods', async (req, res) => {
  try {
    const orders = await Order.find({ paymentStatus: 'paid' });
    const foodStats = {};

    orders.forEach((order) => {
      (order.foods || []).forEach((item) => {
        const key = item.foodId || item.name;
        if (!foodStats[key]) {
          foodStats[key] = {
            id: key,
            name: item.name,
            category: item.category,
            image: item.image,
            quantitySold: 0,
            revenue: 0,
          };
        }
        const qty = Number(item.quantity || 0);
        const price = Number(item.price || 0);
        foodStats[key].quantitySold += qty;
        foodStats[key].revenue += qty * price;
      });
    });

    const topFoods = Object.values(foodStats).sort((a, b) => b.quantitySold - a.quantitySold);

    return res.json({
      success: true,
      topFoods,
    });
  } catch (err) {
    console.error('[GET /api/reports/top-foods]', err);
    return res.status(500).json({ success: false, message: 'Lỗi tạo thống kê đồ ăn thức uống.' });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/reports/revenue-trends  (UC45: Xu hướng doanh thu gần đây)
// ════════════════════════════════════════════════════════════
router.get('/revenue-trends', async (req, res) => {
  try {
    const orders = await Order.find({ paymentStatus: 'paid' }).sort({ createdAt: 1 });
    const dayMap = {};

    orders.forEach((order) => {
      const dateKey = new Date(order.createdAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      });

      if (!dayMap[dateKey]) {
        dayMap[dateKey] = {
          date: dateKey,
          totalRevenue: 0,
          ticketRevenue: 0,
          foodRevenue: 0,
          ordersCount: 0,
        };
      }

      dayMap[dateKey].totalRevenue += Number(order.totalPrice || 0);
      dayMap[dateKey].ticketRevenue += Number(order.subtotalTickets || 0);
      dayMap[dateKey].foodRevenue += Number(order.subtotalFoods || 0);
      dayMap[dateKey].ordersCount += 1;
    });

    const trends = Object.values(dayMap);

    return res.json({
      success: true,
      trends,
    });
  } catch (err) {
    console.error('[GET /api/reports/revenue-trends]', err);
    return res.status(500).json({ success: false, message: 'Lỗi tạo xu hướng doanh thu.' });
  }
});

module.exports = router;

