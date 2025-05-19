const express = require('express');
const { body } = require('express-validator');
const eventAuth = require('../../middleware/eventAuth.js');
const adminAuth = require('../../middleware/adminAuth.js');
const auth = require('../../middleware/auth.js');
const profileCheck = require('../../middleware/profileCheck.js');
const { 
  createEvent, 
  updateEvent, 
  deleteEvent, 
  getEvents,
  getEventById,
  changeUserRole,
  registerForEvent,
  getEventRegistrations,
  getUserRegisteredEvents,
  getOrganizerEvents
} = require('./eventController');

const router = express.Router();

// Event validation middleware
const eventValidation = [
  body('name').trim().notEmpty().withMessage('Event name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](?:\s?[APap][Mm])?$/).withMessage('Valid time is required (HH:MM or HH:MM AM/PM)'),
  body('venue').trim().notEmpty().withMessage('Venue is required'),
  body('organizedBy').trim().notEmpty().withMessage('Organizer name is required'),
  body('totalSeats').isInt({ min: 1 }).withMessage('Total seats must be at least 1'),
  body('category').isIn(['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Other']),
  body('registrationDeadline').isISO8601().withMessage('Valid registration deadline is required'),
  body('contactEmail').isEmail().withMessage('Valid contact email is required'),
  body('contactPhone').matches(/^\+?[\d\s-]+$/).withMessage('Valid contact phone is required')
];
const updateEventValidation = [
    body('name').trim().optional().notEmpty().withMessage('Event name is required'),
    body('description').trim().optional().notEmpty().withMessage('Description is required'),
    body('date').optional().isISO8601().withMessage('Valid date is required'),
    body('time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](?:\s?[APap][Mm])?$/).withMessage('Valid time is required (HH:MM or HH:MM AM/PM)'),
    body('venue').trim().optional().notEmpty().withMessage('Venue is required'),
    body('organizedBy').trim().optional().notEmpty().withMessage('Organizer name is required'),
    body('totalSeats').optional().isInt({ min: 1 }).withMessage('Total seats must be at least 1'),
    body('category').optional().isIn(['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Other']),
    body('registrationDeadline').optional().isISO8601().withMessage('Valid registration deadline is required'),
    body('contactEmail').optional().isEmail().withMessage('Valid contact email is required'),
    body('contactPhone').optional().matches(/^\+?[\d\s-]+$/).withMessage('Valid contact phone is required')
  ];
  

// Validation for changing user roles
const changeRoleValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('newRole').isIn(['Student', 'Faculty', 'HOD', 'Principal', 'ISTE', 'IEEE', 'ETTC', 'Admin']).withMessage('Valid role is required')
];

// Public routes
router.get('/', getEvents);

// User registrations route (must come before /:id routes)
router.get('/user/registrations', auth, getUserRegisteredEvents);

// Routes with :id parameter
router.get('/:id', getEventById);
router.put('/:id', [eventAuth, updateEventValidation], updateEvent);
router.delete('/:id', eventAuth, deleteEvent);
router.post('/:id/register', [auth, profileCheck], registerForEvent);
router.get('/:id/registrations', eventAuth, getEventRegistrations);

// Protected routes
router.post('/', [eventAuth, eventValidation], createEvent);

// Get events created by the logged-in organizer
router.get('/organizer/events', eventAuth, getOrganizerEvents);

// Admin-only route
router.post('/change-role', [adminAuth, changeRoleValidation], changeUserRole);

module.exports = router;
