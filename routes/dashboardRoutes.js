const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

// Patient dashboard data
router.get('/patient', protect, restrictTo('patient'), async (req, res) => {
  res.json({
    name: req.user.name,
    role: req.user.role,
    upcomingAppointments: [
      { date: '2025-12-01', time: '10:30 AM', doctor: 'Dr. Ananya Kulkarni', treatment: 'Dental Cleaning' },
    ],
    services: [
      'Cosmetic Dentistry',
      'Root Canal Treatment',
      'Braces & Aligners',
      'Teeth Whitening',
      'Pediatric Dentistry',
    ],
  });
});

// Doctor dashboard data
router.get('/doctor', protect, restrictTo('doctor'), async (req, res) => {
  res.json({
    name: req.user.name,
    role: req.user.role,
    todayAppointments: [
      { patient: 'Afrah Mohammad', time: '09:30 AM', treatment: 'Root Canal Consultation' },
      { patient: 'Srishti Manvi', time: '11:00 AM', treatment: 'Teeth Whitening' },
    ],
    quickActions: [
      'View Today’s Schedule',
      'Update Treatment Notes',
      'View Patient History',
    ],
  });
});

// Admin dashboard data
router.get('/admin', protect, restrictTo('admin'), async (req, res) => {
  res.json({
    name: req.user.name,
    role: req.user.role,
    stats: {
      totalPatients: 250,
      totalDoctors: 5,
      appointmentsToday: 32,
    },
    adminActions: [
      'Manage Doctors',
      'View Appointment Report',
      'Manage Patient Records',
      'Configure Clinic Timings',
    ],
  });
});

module.exports = router;
