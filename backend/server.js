require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const database = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize database
async function initializeApp() {
  try {
    await database.initialize();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

// Routes
const itemRoutes = require('./routes/items');
app.use('/api/items', itemRoutes);

// Email route
app.post('/api/enquire', async (req, res) => {
  const { itemName, userEmail, message, itemId } = req.body;
  
  try {
    // Save enquiry to database
    await database.saveEnquiry({
      itemId: itemId || null,
      itemName,
      userEmail: userEmail || 'anonymous@example.com',
      message: message || `User is interested in ${itemName}`
    });

    // Configure nodemailer (you'll need to set up your email credentials)
    const transporter = nodemailer.createTransporter({
      service: 'gmail', // or your email service
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com', // Use environment variable
        pass: process.env.EMAIL_PASS || 'your-app-password'     // Use environment variable
      }
    });
    
    const mailOptions = {
      from: userEmail || 'noreply@itemstore.com',
      to: process.env.STORE_EMAIL || 'store@example.com', // Static email ID
      subject: `Enquiry for ${itemName}`,
      html: `
        <h2>New Item Enquiry</h2>
        <p><strong>Item:</strong> ${itemName}</p>
        <p><strong>From:</strong> ${userEmail || 'Anonymous'}</p>
        <p><strong>Message:</strong></p>
        <p>${message || 'User is interested in this item.'}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        <hr>
        <p><em>This enquiry has been saved to the database.</em></p>
      `
    };
    
    // For demo purposes, we'll just log the email instead of sending
    console.log('Email would be sent:', mailOptions);
    console.log('Enquiry saved to database successfully');
    
    res.json({ 
      success: true, 
      message: 'Enquiry submitted successfully!' 
    });
    
    // Uncomment below to actually send email (make sure to set up environment variables)
    /*
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Email error:', error);
        // Don't fail the request if email fails, enquiry is already saved
      } else {
        console.log('Email sent:', info.response);
      }
    });
    */
    
  } catch (error) {
    console.error('Error processing enquiry:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit enquiry. Please try again.' 
    });
  }
});

// Get all enquiries (admin endpoint)
app.get('/api/enquiries', async (req, res) => {
  try {
    const enquiries = await database.getAllEnquiries();
    res.json(enquiries);
  } catch (error) {
    console.error('Error fetching enquiries:', error);
    res.status(500).json({ error: 'Failed to fetch enquiries' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: database.getDB() ? 'Connected' : 'Disconnected'
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  try {
    await database.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server
initializeApp().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`API Base URL: http://localhost:${PORT}/api`);
  });
});

module.exports = app;