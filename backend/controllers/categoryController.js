const db = require('../db/connection');

const createCategory = async (req, res) => {
  const { name } = req.body;
  const created_by = req.body.user_id; // Assuming user_id is sent

  if (!name) {
    return res.status(400).json({ message: 'Category name is required' });
  }

  try {
    const [result] = await db.promise().query(
      'INSERT INTO categories (name, created_by) VALUES (?, ?)',
      [name, created_by]
    );
    res.status(201).json({ message: 'Category created', categoryId: result.insertId });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getCategories = async (req, res) => {
  try {
    const [categories] = await db.promise().query('SELECT * FROM categories');
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.promise().query('DELETE FROM categories WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json({ message: 'Category deleted' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { createCategory, getCategories, deleteCategory };