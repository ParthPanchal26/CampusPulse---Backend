const { validationResult } = require('express-validator');
const Event = require('../../models/Event.js');
const User = require('../../models/User.js'); // Import the User model

exports.createEvent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
console.log(req.body)
    const eventData = {
      ...req.body,
      organizerId: req.user.userId,
      availableSeats:req.body.totalSeats
    };


    console.log("--------------------------------------------------------------------------------------------");
    const event = new Event(eventData);
    console.log(event);
    await event.save();

    res.status(201).json({
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }

    if (req.body.totalSeats) {
      const seatsDifference = req.body.totalSeats - event.totalSeats;
      req.body.availableSeats = event.availableSeats + seatsDifference;
    }

    if (req.body.availableSeats < 0) {
      return res.status(400).json({ message: 'Available seats cannot be negative' });
    }

    Object.keys(req.body).forEach(key => {
      if (req.body[key]) {
        event[key] = req.body[key];
      }
    });

    await event.save();

    res.json({
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Ensure the logged-in user is the creator
    if (event.organizerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }

    // Use findByIdAndDelete instead of remove()
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getEvents = async (req, res) => {
  try {
    const { category, expired } = req.query;
    const query = {};

    if (category) {
      query.category = category;
    }

    if (expired !== undefined) {
      query.isExpired = expired === 'true';
    }

    const events = await Event.find(query).sort({ date: 1 });
    
    // Add capacity information to each event
    const eventsWithCapacity = events.map(event => {
      return {
        ...event.toObject(),
        capacity: {
          total: event.totalSeats,
          available: event.availableSeats,
          filled: event.totalSeats - event.availableSeats,
          percentageFilled: Math.round(((event.totalSeats - event.availableSeats) / event.totalSeats) * 100)
        }
      };
    });
    
    res.json(eventsWithCapacity);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Add capacity information to the response
    const eventWithCapacity = {
      ...event.toObject(),
      capacity: {
        total: event.totalSeats,
        available: event.availableSeats,
        filled: event.totalSeats - event.availableSeats,
        percentageFilled: Math.round(((event.totalSeats - event.availableSeats) / event.totalSeats) * 100)
      }
    };
    
    res.json(eventWithCapacity);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.changeUserRole = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, newRole } = req.body;

    // Check if the user making the request is an admin
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to change roles' });
    }

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the user's role
    user.role = newRole;
    await user.save();

    res.json({
      message: `User role updated successfully to ${newRole}`,
      user
    });
  } catch (error) {
    console.error('Change user role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Register for an event
exports.registerForEvent = async (req, res) => {
  try {
    console.log("=== Starting Event Registration ===");
    console.log("Request user object:", req.user);
    console.log("Request params:", req.params);
    
    const eventId = req.params.id;
    const userId = req.user.userId;
    console.log("Event ID:", eventId);
    console.log("User ID:", userId);

    // Find the user
    const user = await User.findById(userId);
    console.log("Found user:", user ? "Yes" : "No");
    if (!user) {
      console.log("User not found in database");
      return res.status(404).json({ message: 'User not found' });
    }
    console.log("User role:", user.role);
    console.log("Profile completed:", user.hasCompletedProfile);

    // Check if user is a student
    if (user.role !== 'Student') {
      return res.status(403).json({ message: 'Only students can register for events' });
    }

    // Check if user has completed their profile
    if (!user.hasCompletedProfile) {
      return res.status(403).json({ 
        message: 'You must complete your profile before registering for events',
        profileRequired: true
      });
    }

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if event is expired or registration deadline has passed
    const now = new Date();
    if (now > event.registrationDeadline) {
      return res.status(400).json({ message: 'Registration for this event has closed' });
    }

    // Check if there are available seats
    if (event.availableSeats <= 0) {
      return res.status(400).json({ message: 'No seats available for this event' });
    }

    // Check if user is already registered for this event
    if (user.registeredEvents.includes(eventId)) {
      return res.status(400).json({ message: 'You are already registered for this event' });
    }

    // Check if user is already in the event's registered users
    const isAlreadyRegistered = event.registeredUsers.some(
      registration => registration.userId.toString() === userId
    );
    
    if (isAlreadyRegistered) {
      return res.status(400).json({ message: 'You are already registered for this event' });
    }

    // Register user for the event
    event.registeredUsers.push({ userId });
    event.availableSeats -= 1;
    await event.save();

    // Add event to user's registered events
    user.registeredEvents.push(eventId);
    await user.save();

    return res.status(200).json({ 
      message: 'Successfully registered for the event',
      event: {
        id: event._id,
        name: event.name,
        date: event.date,
        time: event.time,
        venue: event.venue
      }
    });
  } catch (error) {
    console.error('Error registering for event:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get registered users for an event
exports.getEventRegistrations = async (req, res) => {
  try {
    console.log("Fetching registrations - Request params:", req.params);
    console.log("Event ID from params:", req.params.id);
    
    if (!req.params.id) {
      console.error("Error: Event ID is undefined");
      return res.status(400).json({ message: 'Event ID is required' });
    }
    
    // Check if ID is a valid MongoDB ObjectId
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      console.error("Error: Invalid event ID format");
      return res.status(400).json({ message: 'Invalid event ID format' });
    }
    
    const event = await Event.findById(req.params.id);
    if (!event) {
      console.error("Error: Event not found for ID:", req.params.id);
      return res.status(404).json({ message: 'Event not found' });
    }

    console.log("Found event:", event.name);
    console.log("Event organizer ID:", event.organizerId);
    console.log("Request user ID:", req.user.userId);

    // Ensure the logged-in user is the creator
    if (event.organizerId.toString() !== req.user.userId) {
      console.error("Unauthorized access attempt by user:", req.user.userId);
      return res.status(403).json({ message: 'Not authorized to view registrations' });
    }

    console.log("Number of registrations:", event.registeredUsers.length);

    // Get full user details for each registration
    const registrationsWithUserDetails = await Promise.all(
      event.registeredUsers.map(async (registration) => {
        try {
          const user = await User.findById(registration.userId).select('-password');
          
          console.log("Found user:", user ? user._id : "None");
          
          // Transform registration data to include more user details
          return {
            registrationId: registration._id,
            registeredAt: registration.registeredAt || new Date(),
            userId: registration.userId,
            user: user ? {
              name: user.name,
              email: user.email,
              phoneNumber: user.phoneNumber || 'N/A',
              enrollmentNumber: user.enrollmentNumber || 'N/A',
              department: user.department || 'N/A',
              class: user.class || 'N/A',
              year: user.year || 'N/A',
              semester: user.semester || 'N/A'
            } : null
          };
        } catch (err) {
          console.error("Error processing user:", registration.userId, err);
          return {
            registrationId: registration._id,
            registeredAt: registration.registeredAt || new Date(),
            userId: registration.userId,
            user: null,
            error: "Failed to retrieve user data"
          };
        }
      })
    );

    console.log("Processed registrations:", registrationsWithUserDetails.length);
    
    res.json(registrationsWithUserDetails);
  } catch (error) {
    console.error('Get event registrations error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get events registered by the user
exports.getUserRegisteredEvents = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get events registered by the user with more details
    const registeredEvents = await Event.find({
      _id: { $in: user.registeredEvents }
    }).select('name description date time venue organizedBy category totalSeats availableSeats registrationDeadline contactEmail contactPhone');

    // Format the response with registration status and capacity information
    const formattedEvents = registeredEvents.map(event => {
      return {
        id: event._id,
        name: event.name,
        description: event.description,
        date: event.date,
        time: event.time,
        venue: event.venue,
        organizedBy: event.organizedBy,
        category: event.category,
        capacity: {
          total: event.totalSeats,
          available: event.availableSeats,
          filled: event.totalSeats - event.availableSeats,
          percentageFilled: Math.round(((event.totalSeats - event.availableSeats) / event.totalSeats) * 100)
        },
        registrationDeadline: event.registrationDeadline,
        contactEmail: event.contactEmail,
        contactPhone: event.contactPhone,
        registrationStatus: 'Registered'
      };
    });

    return res.status(200).json({
      totalEvents: formattedEvents.length,
      registeredEvents: formattedEvents
    });
  } catch (error) {
    console.error('Error fetching user registered events:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get events created by the logged-in organizer
exports.getOrganizerEvents = async (req, res) => {
  try {
    const organizerId = req.user.userId;
    console.log('Fetching events for organizer:', organizerId);

    const events = await Event.find({ organizerId }).sort({ date: 1 });
    console.log('Found events count:', events.length);

    // Add capacity information to each event
    const eventsWithCapacity = events.map(event => {
      return {
        ...event.toObject(),
        capacity: {
          total: event.totalSeats,
          available: event.availableSeats,
          filled: event.totalSeats - event.availableSeats,
          percentageFilled: Math.round(((event.totalSeats - event.availableSeats) / event.totalSeats) * 100)
        }
      };
    });

    res.json(eventsWithCapacity);
  } catch (error) {
    console.error('Get organizer events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
