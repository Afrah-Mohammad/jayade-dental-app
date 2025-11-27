const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const Appointment = require('../models/Appointment');

const router = express.Router();

const MAX_APPTS_PER_DAY = 10;

// Convert "YYYY-MM-DD" → Date at midnight
function toDateOnly(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /api/appointments/my  → all appointments of logged-in patient
router.get('/my', protect, restrictTo('patient'), async (req, res) => {
  try {
    const appts = await Appointment.find({ patient: req.user._id })
      .sort({ date: 1 });

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

    const day = toDateOnly(date);
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

    const day = toDateOnly(date);

    // 1 patient = max 1 appointment per day
    const existing = await Appointment.findOne({
      patient: req.user._id,
      date: day,
    });

    if (existing) {
      return res.status(400).json({
        message: 'You already have an appointment on this date.',
      });
    }

    // Check capacity for that day
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
      status: 'pending', // later admin/doctor can confirm
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

module.exports = router;
