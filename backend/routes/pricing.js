// Nguyễn Minh Quân - CE180048
const express = require('express');
const router = express.Router();
const PricingRule = require('../models/PricingRule');
const { DEFAULT_PRICING_RULES } = require('../seed/seedPricingRules');

// Helper định dạng tiền tệ VND
function formatCurrencyVND(amount) {
  const num = Math.round(Number(amount) || 0);
  return `${num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
}

// Helper tự động tạo chuỗi biểu diễn giá trị điều chỉnh
function formatAdjustmentText(adjustmentType, adjustmentValue) {
  const val = Number(adjustmentValue) || 0;
  switch (adjustmentType) {
    case 'fixed_surcharge':
      return `+${formatCurrencyVND(Math.abs(val))}`;
    case 'fixed_discount':
      return `-${formatCurrencyVND(Math.abs(val))}`;
    case 'percentage_surcharge':
      return `+${Math.abs(val)}%`;
    case 'percentage_discount':
      return `-${Math.abs(val)}%`;
    case 'fixed_price':
      return formatCurrencyVND(val);
    default:
      return `${val}`;
  }
}

// ─── 1. GET /api/pricing/rules: Lấy danh sách quy tắc giá vé (hỗ trợ filter & search) ───
router.get('/rules', async (req, res) => {
  try {
    const { category, isActive, search } = req.query;
    const filter = {};

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (isActive !== undefined && isActive !== 'all') {
      filter.isActive = isActive === 'true' || isActive === true;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { code: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { condition: { $regex: q, $options: 'i' } },
      ];
    }

    const rules = await PricingRule.find(filter).sort({ priority: 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      total: rules.length,
      rules,
    });
  } catch (err) {
    console.error('Lỗi khi lấy danh sách quy tắc giá vé:', err);
    return res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách quy tắc giá vé',
      error: err.message,
    });
  }
});

// ─── 2. GET /api/pricing/rules/summary: Thống kê tổng quan quy tắc giá vé ───
router.get('/rules/summary', async (req, res) => {
  try {
    const [total, active, inactive, formatRules, seatRules, dayRules, timeRules, audienceRules] = await Promise.all([
      PricingRule.countDocuments(),
      PricingRule.countDocuments({ isActive: true }),
      PricingRule.countDocuments({ isActive: false }),
      PricingRule.countDocuments({ category: 'format' }),
      PricingRule.countDocuments({ category: 'seat_type' }),
      PricingRule.countDocuments({ category: 'day_of_week' }),
      PricingRule.countDocuments({ category: 'time_slot' }),
      PricingRule.countDocuments({ category: 'audience' }),
    ]);

    return res.status(200).json({
      success: true,
      summary: {
        total,
        active,
        inactive,
        byCategory: {
          format: formatRules,
          seat_type: seatRules,
          day_of_week: dayRules,
          time_slot: timeRules,
          audience: audienceRules,
        },
      },
    });
  } catch (err) {
    console.error('Lỗi khi lấy thống kê quy tắc giá vé:', err);
    return res.status(500).json({
      success: false,
      message: 'Không thể tải thống kê quy tắc giá vé',
      error: err.message,
    });
  }
});

// ─── 3. GET /api/pricing/rules/:id: Chi tiết một quy tắc giá vé ───
router.get('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let rule = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      rule = await PricingRule.findById(id);
    }
    if (!rule) {
      rule = await PricingRule.findOne({ code: id.toUpperCase() });
    }

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy quy tắc giá vé yêu cầu',
      });
    }

    return res.status(200).json({
      success: true,
      rule,
    });
  } catch (err) {
    console.error('Lỗi khi lấy chi tiết quy tắc giá vé:', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết quy tắc giá vé',
      error: err.message,
    });
  }
});

// ─── 4. POST /api/pricing/rules: Thêm quy tắc giá vé mới (Create) ───
router.post('/rules', async (req, res) => {
  try {
    const {
      code,
      name,
      category,
      adjustmentType,
      adjustmentValue,
      condition,
      applicableFormats,
      applicableDays,
      applicableTimeFrom,
      applicableTimeTo,
      applicableSeatTypes,
      targetAudience,
      description,
      priority,
      isActive,
    } = req.body;

    if (!code || !String(code).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Mã quy tắc (code) là bắt buộc và không được để trống.',
      });
    }

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên quy tắc giá vé là bắt buộc.',
      });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const existing = await PricingRule.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Mã quy tắc "${cleanCode}" đã tồn tại trong hệ thống. Vui lòng chọn mã khác.`,
      });
    }

    const adjType = adjustmentType || 'fixed_surcharge';
    const adjVal = Number(adjustmentValue) || 0;
    const formatted = formatAdjustmentText(adjType, adjVal);

    const newRule = new PricingRule({
      code: cleanCode,
      name: String(name).trim(),
      category: category || 'format',
      adjustmentType: adjType,
      adjustmentValue: adjVal,
      adjustmentFormatted: formatted,
      condition: condition ? String(condition).trim() : '',
      applicableFormats: Array.isArray(applicableFormats) ? applicableFormats : [],
      applicableDays: Array.isArray(applicableDays) ? applicableDays.map(Number) : [],
      applicableTimeFrom: applicableTimeFrom ? String(applicableTimeFrom).trim() : '',
      applicableTimeTo: applicableTimeTo ? String(applicableTimeTo).trim() : '',
      applicableSeatTypes: Array.isArray(applicableSeatTypes) ? applicableSeatTypes : [],
      targetAudience: targetAudience || 'all',
      description: description ? String(description).trim() : '',
      priority: Number(priority) || 10,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    await newRule.save();

    return res.status(201).json({
      success: true,
      message: `Tạo mới quy tắc giá vé "${newRule.name}" thành công!`,
      rule: newRule,
    });
  } catch (err) {
    console.error('Lỗi khi tạo mới quy tắc giá vé:', err);
    return res.status(500).json({
      success: false,
      message: 'Không thể thêm quy tắc giá vé mới',
      error: err.message,
    });
  }
});

// ─── 5. PUT /api/pricing/rules/:id: Sửa thông tin quy tắc giá vé (Update) ───
router.put('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let rule = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      rule = await PricingRule.findById(id);
    }
    if (!rule) {
      rule = await PricingRule.findOne({ code: id.toUpperCase() });
    }

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy quy tắc giá vé cần chỉnh sửa',
      });
    }

    const {
      name,
      category,
      adjustmentType,
      adjustmentValue,
      condition,
      applicableFormats,
      applicableDays,
      applicableTimeFrom,
      applicableTimeTo,
      applicableSeatTypes,
      targetAudience,
      description,
      priority,
      isActive,
    } = req.body;

    if (name !== undefined) rule.name = String(name).trim();
    if (category !== undefined) rule.category = category;
    if (adjustmentType !== undefined) rule.adjustmentType = adjustmentType;
    if (adjustmentValue !== undefined) rule.adjustmentValue = Number(adjustmentValue);
    rule.adjustmentFormatted = formatAdjustmentText(rule.adjustmentType, rule.adjustmentValue);

    if (condition !== undefined) rule.condition = String(condition).trim();
    if (applicableFormats !== undefined) rule.applicableFormats = Array.isArray(applicableFormats) ? applicableFormats : [];
    if (applicableDays !== undefined) rule.applicableDays = Array.isArray(applicableDays) ? applicableDays.map(Number) : [];
    if (applicableTimeFrom !== undefined) rule.applicableTimeFrom = String(applicableTimeFrom).trim();
    if (applicableTimeTo !== undefined) rule.applicableTimeTo = String(applicableTimeTo).trim();
    if (applicableSeatTypes !== undefined) rule.applicableSeatTypes = Array.isArray(applicableSeatTypes) ? applicableSeatTypes : [];
    if (targetAudience !== undefined) rule.targetAudience = targetAudience;
    if (description !== undefined) rule.description = String(description).trim();
    if (priority !== undefined) rule.priority = Number(priority);
    if (isActive !== undefined) rule.isActive = Boolean(isActive);

    await rule.save();

    return res.status(200).json({
      success: true,
      message: `Cập nhật quy tắc giá vé "${rule.name}" thành công!`,
      rule,
    });
  } catch (err) {
    console.error('Lỗi khi cập nhật quy tắc giá vé:', err);
    return res.status(500).json({
      success: false,
      message: 'Không thể cập nhật quy tắc giá vé',
      error: err.message,
    });
  }
});

// ─── 6. PATCH /api/pricing/rules/:id/toggle: Bật / Tắt kích hoạt nhanh quy tắc ───
router.patch('/rules/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    let rule = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      rule = await PricingRule.findById(id);
    }
    if (!rule) {
      rule = await PricingRule.findOne({ code: id.toUpperCase() });
    }

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy quy tắc giá vé',
      });
    }

    rule.isActive = !rule.isActive;
    await rule.save();

    return res.status(200).json({
      success: true,
      message: `Đã ${rule.isActive ? 'kích hoạt' : 'tạm dừng'} quy tắc "${rule.name}"!`,
      rule,
    });
  } catch (err) {
    console.error('Lỗi khi thay đổi trạng thái quy tắc giá vé:', err);
    return res.status(500).json({
      success: false,
      message: 'Không thể thay đổi trạng thái quy tắc giá vé',
      error: err.message,
    });
  }
});

// ─── 7. DELETE /api/pricing/rules/:id: Xóa quy tắc giá vé (Delete) ───
router.delete('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let rule = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      rule = await PricingRule.findById(id);
    }
    if (!rule) {
      rule = await PricingRule.findOne({ code: id.toUpperCase() });
    }

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy quy tắc giá vé cần xóa',
      });
    }

    const ruleName = rule.name;
    const ruleCode = rule.code;
    await rule.deleteOne();

    return res.status(200).json({
      success: true,
      message: `Đã xóa thành công quy tắc giá vé "${ruleName}" (${ruleCode})!`,
    });
  } catch (err) {
    console.error('Lỗi khi xóa quy tắc giá vé:', err);
    return res.status(500).json({
      success: false,
      message: 'Không thể xóa quy tắc giá vé',
      error: err.message,
    });
  }
});

// ─── 8. POST /api/pricing/rules/reset-defaults: Khôi phục lại bộ quy tắc chuẩn rạp ───
router.post('/rules/reset-defaults', async (req, res) => {
  try {
    await PricingRule.deleteMany({});
    const inserted = await PricingRule.insertMany(DEFAULT_PRICING_RULES);

    return res.status(200).json({
      success: true,
      message: `Đã khôi phục thành công ${inserted.length} quy tắc giá vé niêm yết chuẩn của hệ thống rạp!`,
      rules: inserted,
    });
  } catch (err) {
    console.error('Lỗi khi khôi phục quy tắc giá vé:', err);
    return res.status(500).json({
      success: false,
      message: 'Không thể khôi phục bộ quy tắc mặc định',
      error: err.message,
    });
  }
});

// ─── 9. POST /api/pricing/calculate-preview: Xem trước giá vé áp dụng các quy tắc ───
router.post('/calculate-preview', async (req, res) => {
  try {
    const {
      basePrice = 90000,
      format = '2D',
      dayOfWeek = 1, // 0-6
      time = '19:30',
      seatType = 'standard',
      targetAudience = 'adult',
    } = req.body;

    // Lấy tất cả quy tắc đang kích hoạt
    const activeRules = await PricingRule.find({ isActive: true }).sort({ priority: 1 });

    let calculatedPrice = Number(basePrice) || 90000;
    const appliedRules = [];

    // Kiểm tra xem có quy tắc fixed_price nào áp dụng không (ví dụ Happy Wednesday)
    const fixedPriceRule = activeRules.find((r) => {
      if (r.adjustmentType !== 'fixed_price') return false;
      if (r.category === 'day_of_week' && r.applicableDays && r.applicableDays.includes(Number(dayOfWeek))) {
        if (!r.applicableFormats.length || r.applicableFormats.includes(format)) {
          if (!r.applicableSeatTypes.length || r.applicableSeatTypes.includes(seatType)) {
            return true;
          }
        }
      }
      return false;
    });

    if (fixedPriceRule) {
      calculatedPrice = fixedPriceRule.adjustmentValue;
      appliedRules.push({
        code: fixedPriceRule.code,
        name: fixedPriceRule.name,
        adjustmentFormatted: fixedPriceRule.adjustmentFormatted,
        impact: `Đồng giá: ${formatCurrencyVND(calculatedPrice)}`,
      });
    }

    // Áp dụng các quy tắc phụ thu định dạng
    activeRules.forEach((r) => {
      if (r.category === 'format' && r.applicableFormats.includes(format)) {
        if (r.adjustmentType === 'fixed_surcharge') {
          calculatedPrice += r.adjustmentValue;
          appliedRules.push({
            code: r.code,
            name: r.name,
            adjustmentFormatted: r.adjustmentFormatted,
            impact: `+${formatCurrencyVND(r.adjustmentValue)}`,
          });
        }
      }
    });

    // Áp dụng quy tắc ngày chiếu (nếu chưa áp dụng fixed_price)
    if (!fixedPriceRule) {
      activeRules.forEach((r) => {
        if (r.category === 'day_of_week' && r.applicableDays.includes(Number(dayOfWeek))) {
          if (r.adjustmentType === 'fixed_surcharge') {
            calculatedPrice += r.adjustmentValue;
            appliedRules.push({
              code: r.code,
              name: r.name,
              adjustmentFormatted: r.adjustmentFormatted,
              impact: `+${formatCurrencyVND(r.adjustmentValue)}`,
            });
          }
        }
      });
    }

    // Áp dụng khung giờ (time_slot)
    const [hh] = String(time).split(':').map(Number);
    activeRules.forEach((r) => {
      if (r.category === 'time_slot') {
        let matches = false;
        if (r.applicableTimeFrom && r.applicableTimeTo) {
          const [fromH] = r.applicableTimeFrom.split(':').map(Number);
          const [toH] = r.applicableTimeTo.split(':').map(Number);
          matches = hh >= fromH && hh < toH;
        } else if (r.applicableTimeTo) {
          const [toH] = r.applicableTimeTo.split(':').map(Number);
          matches = hh < toH;
        } else if (r.applicableTimeFrom) {
          const [fromH] = r.applicableTimeFrom.split(':').map(Number);
          matches = hh >= fromH;
        }

        if (matches) {
          if (r.adjustmentType === 'fixed_surcharge') {
            calculatedPrice += r.adjustmentValue;
            appliedRules.push({
              code: r.code,
              name: r.name,
              adjustmentFormatted: r.adjustmentFormatted,
              impact: `+${formatCurrencyVND(r.adjustmentValue)}`,
            });
          } else if (r.adjustmentType === 'fixed_discount') {
            calculatedPrice += r.adjustmentValue; // r.adjustmentValue âm
            appliedRules.push({
              code: r.code,
              name: r.name,
              adjustmentFormatted: r.adjustmentFormatted,
              impact: `${formatCurrencyVND(r.adjustmentValue)}`,
            });
          }
        }
      }
    });

    // Áp dụng loại ghế (seat_type)
    activeRules.forEach((r) => {
      if (r.category === 'seat_type' && r.applicableSeatTypes.includes(seatType)) {
        if (r.adjustmentType === 'fixed_surcharge') {
          calculatedPrice += r.adjustmentValue;
          appliedRules.push({
            code: r.code,
            name: r.name,
            adjustmentFormatted: r.adjustmentFormatted,
            impact: `+${formatCurrencyVND(r.adjustmentValue)}`,
          });
        } else if (r.adjustmentType === 'percentage_discount' && seatType === 'couple') {
          // Ghế đôi: x2 vé rồi trừ discount
          calculatedPrice = Math.round((calculatedPrice * 2 * (1 + r.adjustmentValue / 100)) / 5000) * 5000;
          appliedRules.push({
            code: r.code,
            name: r.name,
            adjustmentFormatted: r.adjustmentFormatted,
            impact: `2 vé ${r.adjustmentFormatted}`,
          });
        }
      }
    });

    // Áp dụng đối tượng khán giả (audience)
    if (targetAudience !== 'adult') {
      activeRules.forEach((r) => {
        if (r.category === 'audience' && (r.targetAudience === targetAudience || (targetAudience === 'senior' && r.targetAudience === 'child'))) {
          if (r.adjustmentType === 'fixed_discount') {
            calculatedPrice += r.adjustmentValue;
            appliedRules.push({
              code: r.code,
              name: r.name,
              adjustmentFormatted: r.adjustmentFormatted,
              impact: `${formatCurrencyVND(r.adjustmentValue)}`,
            });
          }
        }
      });
    }

    // Làm tròn 5.000đ và không để giá âm
    calculatedPrice = Math.max(45000, Math.round(calculatedPrice / 5000) * 5000);

    return res.status(200).json({
      success: true,
      preview: {
        basePrice,
        calculatedPrice,
        calculatedPriceFormatted: formatCurrencyVND(calculatedPrice),
        format,
        dayOfWeek,
        time,
        seatType,
        targetAudience,
        appliedRules,
      },
    });
  } catch (err) {
    console.error('Lỗi khi tính toán xem trước giá vé:', err);
    return res.status(500).json({
      success: false,
      message: 'Không thể tính toán xem trước giá vé',
      error: err.message,
    });
  }
});

module.exports = router;
