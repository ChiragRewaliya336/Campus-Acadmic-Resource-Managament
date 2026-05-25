const db = require('../db/connection');
const path = require('path');
const fs = require('fs');
const uploadsDir = path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, '../uploads'));

function resolveStoredFilePath(resource) {
  const storedPath = resource?.file_path ? String(resource.file_path) : '';
  const normalizedStoredPath = storedPath.replace(/\\/g, '/');
  const candidates = [];

  if (normalizedStoredPath) {
    if (!normalizedStoredPath.includes('/')) {
      candidates.push(path.join(uploadsDir, normalizedStoredPath));
    } else {
      candidates.push(path.resolve(storedPath));
      candidates.push(path.join(uploadsDir, path.basename(normalizedStoredPath)));
    }
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

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

    await db.promise().query(
      'INSERT INTO history (user_id, action, resource_id, file_name) VALUES (?, ?, ?, ?)',
      [user_id, 'upload', result.insertId, file_name]
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

const deleteResource = async (req, res) => {
  const { id } = req.params;
  const actingUserId = req.query.user_id || req.body?.user_id;

  console.log('Delete request id:', id);

  try {
    const [resources] = await db.promise().query(
      'SELECT id, title, file_path, file_name FROM resources WHERE id = ?',
      [id]
    );

    if (resources.length === 0) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    const resource = resources[0];
    console.log('Found resource:', resource);
    console.log('Deleting file path:', resource.file_path);
    const resolvedPath = resolveStoredFilePath(resource);
    console.log('Delete resource record:', resource);
    console.log('Resolved file path:', resolvedPath);
    console.log('File exists:', resolvedPath ? fs.existsSync(resolvedPath) : false);

    if (actingUserId) {
      await db.promise().query(
        'INSERT INTO history (user_id, action, resource_id, file_name) VALUES (?, ?, ?, ?)',
        [actingUserId, 'delete', null, resource.file_name || resource.title]
      );
    }

    await db.promise().query(
      'DELETE FROM history WHERE resource_id = ?',
      [id]
    );

    const [result] = await db.promise().query(
      'DELETE FROM resources WHERE id = ?',
      [id]
    );
    console.log('Delete DB result:', result);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    if (resolvedPath && fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
    }

    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Delete resource error:', error);
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

module.exports = { getResources, uploadResource, getMyResources, deleteResource };
