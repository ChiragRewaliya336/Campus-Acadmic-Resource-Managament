const db = require('../db/connection');
const path = require('path');
const fs = require('fs');

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

    // Log download
    await db.promise().query(
      'INSERT INTO history (user_id, action, resource_id, file_name) VALUES (?, ?, ?, ?)',
      [user_id, 'download', id, resource.file_name]
    );

    // Send file
    res.download(resource.file_path, resource.file_name);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getUserHistory, downloadFile };