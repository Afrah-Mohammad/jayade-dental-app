const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const Appointment = require('../models/Appointment');

const router = express.Router();

const MAX_APPTS_PER_DAY = 10;

// Convert "YYYY-MM-DD" string → Date object at midnight
function dateFromString(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ================== PATIENT ROUTES ==================

// GET /api/appointments/my  → all appointments for logged-in patient
router.get('/my', protect, restrictTo('patient'), async (req, res) => {
  try {
    const appts = await Appointment.find({ patient: req.user._id }).sort({
      date: 1,
    });
    res.json(appts);
  } catch (err) {
    console.error('Fetch patient appointments error:', err);
    res.status(500).json({ message: 'Could not load appointments' });
  }
});

// GET /api/appointments/availability?date=YYYY-MM-DD
router.get('/availability', protect, restrictTo('patient'), async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    const day = dateFromString(date);
    const count = await Appointment.countDocuments({ date: day });

    const available = count < MAX_APPTS_PER_DAY;
    res.json({
      date: day,
      available,
      bookedCount: count,
      maxPerDay: MAX_APPTS_PER_DAY,
    });
  } catch (err) {
    console.error('Availability error:', err);
    res.status(500).json({ message: 'Could not check availability' });
  }
});

// POST /api/appointments/book  { service, date }
router.post('/book', protect, restrictTo('patient'), async (req, res) => {
  try {
    const { service, date } = req.body;

    if (!service || !date) {
      return res
        .status(400)
        .json({ message: 'Service and date are required' });
    }

    const day = dateFromString(date);

    // One appointment per patient per day
    const existing = await Appointment.findOne({
      patient: req.user._id,
      date: day,
    });

    if (existing) {
      return res.status(400).json({
        message: 'You already have an appointment on this date.',
      });
    }

    // Check clinic capacity
    const count = await Appointment.countDocuments({ date: day });
    if (count >= MAX_APPTS_PER_DAY) {
      return res
        .status(400)
        .json({ message: 'No slots available on this date.' });
    }

    const appt = await Appointment.create({
      patient: req.user._id,
      service,
      date: day,
      status: 'pending',
    });

    res.status(201).json({
      message: 'Appointment request submitted.',
      appointment: appt,
    });
  } catch (err) {
    console.error('Book appointment error:', err);
    res.status(500).json({ message: 'Could not book appointment' });
  }
});

// ================== DOCTOR / ADMIN ROUTES ==================

// GET /api/appointments/day?date=YYYY-MM-DD
// List all appointments for a given day (default = today)
router.get('/day', protect, restrictTo('doctor', 'admin'), async (req, res) => {
  try {
    const { date } = req.query;
    const dateStr =
      date || new Date().toISOString().slice(0, 10); // default today
    const day = dateFromString(dateStr);

    const appts = await Appointment.find({ date: day })
      .populate('patient', 'name email phone')
      .sort({ createdAt: 1 });

    res.json(appts);
  } catch (err) {
    console.error('Day appointments error:', err);
    res.status(500).json({ message: 'Could not load appointments' });
  }
});

// PATCH /api/appointments/:id/status  { status: 'pending' | 'confirmed' | 'cancelled' }
router.patch(
  '/:id/status',
  protect,
  restrictTo('doctor', 'admin'),
  async (req, res) => {
    try {
      const { status } = req.body;
      const allowed = ['pending', 'confirmed', 'cancelled'];
      if (!allowed.includes(status)) {
        return res
          .status(400)
          .json({ message: 'Invalid status value provided.' });
      }

      const appt = await Appointment.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      ).populate('patient', 'name email phone');

      if (!appt) {
        return res.status(404).json({ message: 'Appointment not found.' });
      }

      res.json({
        message: 'Appointment status updated.',
        appointment: appt,
      });
    } catch (err) {
      console.error('Update status error:', err);
      res.status(500).json({ message: 'Could not update appointment status' });
    }
  }
);

module.exports = router;
