const db = require('../db/connection');
const path = require('path');

const getResources = async (req, res) => {
  const { user_id } = req.query;
  const userRole = req.query.role || 'student'; // Assuming role is passed

  try {
    let query = 'SELECT r.*, u.username as uploaded_by_name FROM resources r JOIN users u ON r.user_id = u.id';
    let params = [];

    if (userRole !== 'admin') {
      query += ' WHERE r.status = ?';
      params.push('approved');
    }

    const [resources] = await db.promise().query(query, params);
    res.json(resources);
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const uploadResource = async (req, res) => {
  const { title, description, category_id, user_id } = req.body;
  const file = req.file;

  if (!title || !file || !category_id || !user_id) {
    return res.status(400).json({ message: 'Title, file, category, and user are required' });
  }

  try {
    const file_path = file.path;
    const file_name = file.originalname;

    const [result] = await db.promise().query(
      'INSERT INTO resources (title, description, category_id, file_path, file_name, user_id) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, category_id, file_path, file_name, user_id]
    );

    res.status(201).json({ message: 'Resource uploaded', resourceId: result.insertId });
  } catch (error) {
    console.error('Upload resource error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getMyResources = async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ message: 'User ID required' });
  }

  try {
    const [resources] = await db.promise().query(
      'SELECT * FROM resources WHERE user_id = ?',
      [user_id]
    );
    res.json(resources);
  } catch (error) {
    console.error('Get my resources error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getResources, uploadResource, getMyResources };