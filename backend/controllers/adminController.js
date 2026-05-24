const db = require('../db/connection');

const getAllResources = async (req, res) => {
  try {
    const [resources] = await db.promise().query(
      'SELECT r.*, u.username as uploaded_by_name FROM resources r JOIN users u ON r.user_id = u.id'
    );
    res.json(resources);
  } catch (error) {
    console.error('Get all resources error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const approveResource = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.promise().query(
      'UPDATE resources SET status = ? WHERE id = ?',
      ['approved', id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Resource not found' });
    }
    res.json({ message: 'Resource approved' });
  } catch (error) {
    console.error('Approve resource error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const rejectResource = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.promise().query(
      'UPDATE resources SET status = ? WHERE id = ?',
      ['rejected', id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Resource not found' });
    }
    res.json({ message: 'Resource rejected' });
  } catch (error) {
    console.error('Reject resource error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getAllResources, approveResource, rejectResource };