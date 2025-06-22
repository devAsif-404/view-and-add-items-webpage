const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const database = require('../config/database');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// GET all items
router.get('/', async (req, res) => {
  try {
    const rows = await database.all("SELECT * FROM items ORDER BY createdAt DESC");
    
    // Parse additionalImages JSON string back to array
    const items = rows.map(item => ({
      ...item,
      additionalImages: item.additionalImages ? JSON.parse(item.additionalImages) : []
    }));
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// GET single item by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const row = await database.get("SELECT * FROM items WHERE id = ?", [id]);
    
    if (!row) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Parse additionalImages JSON string back to array
    const item = {
      ...row,
      additionalImages: row.additionalImages ? JSON.parse(row.additionalImages) : []
    };
    
    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// POST new item
router.post('/', upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'additionalImages', maxCount: 5 }
]), async (req, res) => {
  const { name, type, description } = req.body;
  
  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }
  
  let coverImagePath = '';
  let additionalImagePaths = [];
  
  if (req.files) {
    if (req.files.coverImage) {
      coverImagePath = `/uploads/${req.files.coverImage[0].filename}`;
    }
    
    if (req.files.additionalImages) {
      additionalImagePaths = req.files.additionalImages.map(file => `/uploads/${file.filename}`);
    }
  }
  
  const sql = `
    INSERT INTO items (name, type, description, coverImage, additionalImages) 
    VALUES (?, ?, ?, ?, ?)
  `;
  
  try {
    const result = await database.run(sql, [
      name,
      type,
      description || '',
      coverImagePath,
      JSON.stringify(additionalImagePaths)
    ]);
    
    res.json({
      id: result.id,
      message: 'Item successfully added',
      item: {
        id: result.id,
        name,
        type,
        description,
        coverImage: coverImagePath,
        additionalImages: additionalImagePaths,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// PUT update item by ID
router.put('/:id', upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'additionalImages', maxCount: 5 }
]), async (req, res) => {
  const { id } = req.params;
  const { name, type, description } = req.body;
  
  try {
    // Check if item exists
    const existingItem = await database.get("SELECT * FROM items WHERE id = ?", [id]);
    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    let coverImagePath = existingItem.coverImage;
    let additionalImagePaths = existingItem.additionalImages ? JSON.parse(existingItem.additionalImages) : [];
    
    // Update images if new ones are uploaded
    if (req.files) {
      if (req.files.coverImage) {
        coverImagePath = `/uploads/${req.files.coverImage[0].filename}`;
      }
      
      if (req.files.additionalImages) {
        additionalImagePaths = req.files.additionalImages.map(file => `/uploads/${file.filename}`);
      }
    }
    
    const sql = `
      UPDATE items 
      SET name = ?, type = ?, description = ?, coverImage = ?, additionalImages = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await database.run(sql, [
      name || existingItem.name,
      type || existingItem.type,
      description !== undefined ? description : existingItem.description,
      coverImagePath,
      JSON.stringify(additionalImagePaths),
      id
    ]);
    
    res.json({
      id: parseInt(id),
      message: 'Item updated successfully',
      item: {
        id: parseInt(id),
        name: name || existingItem.name,
        type: type || existingItem.type,
        description: description !== undefined ? description : existingItem.description,
        coverImage: coverImagePath,
        additionalImages: additionalImagePaths,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE item by ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if item exists
    const existingItem = await database.get("SELECT * FROM items WHERE id = ?", [id]);
    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Delete the item
    await database.run("DELETE FROM items WHERE id = ?", [id]);
    
    res.json({
      message: 'Item deleted successfully',
      id: parseInt(id)
    });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// GET items by type
router.get('/type/:type', async (req, res) => {
  const { type } = req.params;
  
  try {
    const rows = await database.all(
      "SELECT * FROM items WHERE type = ? ORDER BY createdAt DESC", 
      [type]
    );
    
    // Parse additionalImages JSON string back to array
    const items = rows.map(item => ({
      ...item,
      additionalImages: item.additionalImages ? JSON.parse(item.additionalImages) : []
    }));
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching items by type:', error);
    res.status(500).json({ error: 'Failed to fetch items by type' });
  }
});

// GET item types (distinct types)
router.get('/meta/types', async (req, res) => {
  try {
    const rows = await database.all("SELECT DISTINCT type FROM items ORDER BY type");
    const types = rows.map(row => row.type);
    res.json(types);
  } catch (error) {
    console.error('Error fetching item types:', error);
    res.status(500).json({ error: 'Failed to fetch item types' });
  }
});

module.exports = router;