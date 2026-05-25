const db = require('../db/connection');
const path = require('path');

const getResources = async (req, res) => {
  const { user_id } = req.query;
  const userRole = req.query.role || 'student'; // Assuming role is passed

  console.log('Get resources request:', { user_id, userRole });

  try {
    let query = `
      SELECT
        r.*,
        u.username AS uploaded_by_name,
        c.name AS category_name
      FROM resources r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN categories c ON r.category_id = c.id
    `;
    let params = [];

    if (userRole !== 'admin') {
      query += ' WHERE r.status = ?';
      params.push('approved');
    }

    query += ' ORDER BY r.created_at DESC, r.id DESC';

    const [resources] = await db.promise().query(query, params);
    console.log('Get resources result count:', resources.length);
    res.json(resources);
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const uploadResource = async (req, res) => {
  const { title, description, category_id, user_id } = req.body;
  const file = req.file;

  console.log('Upload resource request:', {
    title,
    description,
    category_id,
    user_id,
    file: file ? {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    } : null
  });

  if (!title || !file || !category_id || !user_id) {
    return res.status(400).json({ message: 'Title, file, category, and user are required' });
  }

  try {
    const file_path = file.filename;
    const file_name = file.originalname;

    console.log('Normalized upload path:', {
      stored_file_path: file_path,
      original_disk_path: file.path,
      file_name
    });

    const [result] = await db.promise().query(
      'INSERT INTO resources (title, description, category_id, file_path, file_name, user_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, description, category_id, file_path, file_name, user_id, 'pending']
    );

    const [insertedRows] = await db.promise().query(
      `
        SELECT
          r.*,
          u.username AS uploaded_by_name,
          c.name AS category_name
        FROM resources r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN categories c ON r.category_id = c.id
        WHERE r.id = ?
      `,
      [result.insertId]
    );

    console.log('Resource insert success:', insertedRows[0]);

    res.status(201).json({
      message: 'Resource uploaded',
      resourceId: result.insertId,
      resource: insertedRows[0] || null
    });
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
      `
        SELECT
          r.*,
          u.username AS uploaded_by_name,
          c.name AS category_name
        FROM resources r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN categories c ON r.category_id = c.id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC, r.id DESC
      `,
      [user_id]
    );
    console.log('Get my resources result count:', { user_id, count: resources.length });
    res.json(resources);
  } catch (error) {
    console.error('Get my resources error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getResources, uploadResource, getMyResources };
