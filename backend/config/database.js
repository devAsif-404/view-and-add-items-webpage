const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const DB_PATH = path.join(__dirname, '..', 'items.db');

class Database {
  constructor() {
    this.db = null;
  }

  // Initialize database connection
  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          resolve();
        }
      });
    });
  }

  // Initialize database tables and sample data
  async initialize() {
    try {
      await this.connect();
      await this.createTables();
      await this.insertSampleData();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  // Create necessary tables
  createTables() {
    return new Promise((resolve, reject) => {
      const createItemsTable = `
        CREATE TABLE IF NOT EXISTS items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          description TEXT,
          coverImage TEXT,
          additionalImages TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createEnquiriesTable = `
        CREATE TABLE IF NOT EXISTS enquiries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          itemId INTEGER,
          itemName TEXT NOT NULL,
          userEmail TEXT,
          message TEXT,
          status TEXT DEFAULT 'pending',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (itemId) REFERENCES items (id)
        )
      `;

      this.db.serialize(() => {
        this.db.run(createItemsTable, (err) => {
          if (err) {
            console.error('Error creating items table:', err);
            reject(err);
            return;
          }
          console.log('Items table created or already exists');
        });

        this.db.run(createEnquiriesTable, (err) => {
          if (err) {
            console.error('Error creating enquiries table:', err);
            reject(err);
            return;
          }
          console.log('Enquiries table created or already exists');
          resolve();
        });
      });
    });
  }

  // Insert sample data if tables are empty
  insertSampleData() {
    return new Promise((resolve, reject) => {
      // Check if items table has data
      this.db.get("SELECT COUNT(*) as count FROM items", (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row.count === 0) {
          console.log('Inserting sample data...');
          
          const sampleItems = [
            {
              name: "Classic White Shirt",
              type: "Shirt",
              description: "A comfortable white cotton shirt perfect for formal and casual occasions. Made from premium cotton with a modern fit.",
              coverImage: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=300&h=300&fit=crop",
              additionalImages: JSON.stringify([
                "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=300&h=300&fit=crop",
                "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=300&h=300&fit=crop",
                "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300&h=300&fit=crop"
              ])
            },
            {
              name: "Denim Jeans",
              type: "Pant",
              description: "Premium quality denim jeans with a modern fit. Comfortable for everyday wear with excellent durability.",
              coverImage: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=300&h=300&fit=crop",
              additionalImages: JSON.stringify([
                "https://images.unsplash.com/photo-1542272604-787c3835535d?w=300&h=300&fit=crop",
                "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=300&h=300&fit=crop",
                "https://images.unsplash.com/photo-1506629905607-45320d4b1e39?w=300&h=300&fit=crop"
              ])
            },
            {
              name: "Running Shoes",
              type: "Shoes",
              description: "Lightweight running shoes with excellent cushioning and support. Perfect for jogging, running, and casual sports activities.",
              coverImage: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&h=300&fit=crop",
              additionalImages: JSON.stringify([
                "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&h=300&fit=crop",
                "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=300&h=300&fit=crop",
                "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=300&h=300&fit=crop"
              ])
            },
            {
              name: "Basketball",
              type: "Sports Gear",
              description: "Professional grade basketball with excellent grip and bounce. Perfect for indoor and outdoor courts.",
              coverImage: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=300&h=300&fit=crop",
              additionalImages: JSON.stringify([
                "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=300&h=300&fit=crop",
                "https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=300&h=300&fit=crop"
              ])
            },
            {
              name: "Leather Watch",
              type: "Accessories",
              description: "Elegant leather watch with stainless steel case. Water-resistant and perfect for both casual and formal occasions.",
              coverImage: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=300&h=300&fit=crop",
              additionalImages: JSON.stringify([
                "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=300&h=300&fit=crop",
                "https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?w=300&h=300&fit=crop"
              ])
            }
          ];

          const stmt = this.db.prepare(`
            INSERT INTO items (name, type, description, coverImage, additionalImages) 
            VALUES (?, ?, ?, ?, ?)
          `);

          sampleItems.forEach(item => {
            stmt.run([
              item.name,
              item.type,
              item.description,
              item.coverImage,
              item.additionalImages
            ]);
          });

          stmt.finalize((err) => {
            if (err) {
              console.error('Error inserting sample data:', err);
              reject(err);
            } else {
              console.log('Sample data inserted successfully');
              resolve();
            }
          });
        } else {
          console.log('Sample data already exists');
          resolve();
        }
      });
    });
  }

  // Get database instance
  getDB() {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  // Close database connection
  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
            reject(err);
          } else {
            console.log('Database connection closed');
            this.db = null;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  // Execute a query with parameters
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  // Get single row
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Get all rows
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Save enquiry to database
  async saveEnquiry(enquiryData) {
    const { itemId, itemName, userEmail, message } = enquiryData;
    
    const sql = `
      INSERT INTO enquiries (itemId, itemName, userEmail, message) 
      VALUES (?, ?, ?, ?)
    `;
    
    try {
      const result = await this.run(sql, [itemId, itemName, userEmail, message]);
      return result;
    } catch (error) {
      console.error('Error saving enquiry:', error);
      throw error;
    }
  }

  // Get all enquiries
  async getAllEnquiries() {
    const sql = `
      SELECT e.*, i.name as itemName, i.type as itemType 
      FROM enquiries e 
      LEFT JOIN items i ON e.itemId = i.id 
      ORDER BY e.createdAt DESC
    `;
    
    try {
      const enquiries = await this.all(sql);
      return enquiries;
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      throw error;
    }
  }
}

// Create and export database instance
const database = new Database();

module.exports = database;