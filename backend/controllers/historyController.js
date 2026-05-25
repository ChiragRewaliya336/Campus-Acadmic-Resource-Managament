const db = require('../db/connection');
const path = require('path');
const fs = require('fs');
const uploadsDir = path.join(__dirname, '../uploads');

function getStoredFileName(resource) {
  if (!resource) {
    return '';
  }

  if (resource.file_path) {
    const normalizedPath = String(resource.file_path).replace(/\\/g, '/');
    const segments = normalizedPath.split('/');
    return segments[segments.length - 1] || '';
  }

  return '';
}

function resolveResourceFilePath(resource) {
  const candidates = [];
  const storedPath = resource?.file_path ? String(resource.file_path) : '';
  const normalizedStoredPath = storedPath.replace(/\\/g, '/');

  if (normalizedStoredPath) {
    if (!normalizedStoredPath.includes('/')) {
      candidates.push(path.join(uploadsDir, normalizedStoredPath));
    } else {
      candidates.push(path.resolve(storedPath));
    }
  }

  const storedFileName = getStoredFileName(resource);
  if (storedFileName) {
    candidates.push(path.join(uploadsDir, storedFileName));
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

const getUserHistory = async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ message: 'User ID required' });
  }

  try {
    const [history] = await db.promise().query(
      'SELECT h.*, r.title as resource_title FROM history h LEFT JOIN resources r ON h.resource_id = r.id WHERE h.user_id = ? ORDER BY h.created_at DESC',
      [user_id]
    );
    res.json(history);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const viewFile = async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ message: 'User ID required' });
  }

  try {
    const [resources] = await db.promise().query('SELECT * FROM resources WHERE id = ?', [id]);
    if (resources.length === 0) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    const resource = resources[0];
    const absolutePath = resolveResourceFilePath(resource);

    if (!absolutePath) {
      console.error('View file missing on server:', {
        resourceId: id,
        file_path: resource.file_path,
        file_name: resource.file_name
      });
      return res.status(404).json({ message: 'File not found on server' });
    }

    res.setHeader('Content-Disposition', `inline; filename="${resource.file_name}"`);
    return res.sendFile(absolutePath);
  } catch (error) {
    console.error('View file error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const downloadFile = async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ message: 'User ID required' });
  }

  try {
    const [resources] = await db.promise().query('SELECT * FROM resources WHERE id = ?', [id]);
    if (resources.length === 0) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    const resource = resources[0];
    const absolutePath = resolveResourceFilePath(resource);

    if (!absolutePath) {
      console.error('Download file missing on server:', {
        resourceId: id,
        file_path: resource.file_path,
        file_name: resource.file_name
      });
      return res.status(404).json({ message: 'File not found on server' });
    }

    // Log download
    await db.promise().query(
      'INSERT INTO history (user_id, action, resource_id, file_name) VALUES (?, ?, ?, ?)',
      [user_id, 'download', id, resource.file_name]
    );

    // Send file
    res.download(absolutePath, resource.file_name);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getUserHistory, viewFile, downloadFile };
