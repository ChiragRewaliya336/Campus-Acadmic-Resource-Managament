const db = require('../db/connection');

const getAllResources = async (req, res) => {
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
        ORDER BY r.created_at DESC, r.id DESC
      `
    );
    console.log('Admin resource fetch results:', {
      count: resources.length,
      statuses: resources.map(resource => resource.status),
      resources
    });
    res.json(resources);
  } catch (error) {
    console.error('Get all resources error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const [users] = await db.promise().query(
      'SELECT id, username, email, role FROM users ORDER BY id DESC'
    );
    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role) {
    return res.status(400).json({ message: 'Role is required' });
  }

  try {
    const [result] = await db.promise().query(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found', success: false });
    }

    res.json({ message: 'User role updated successfully', success: true });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Internal server error', success: false });
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
    console.log('Resource approved:', { id });
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
    console.log('Resource rejected:', { id });
    res.json({ message: 'Resource rejected' });
  } catch (error) {
    console.error('Reject resource error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getAllResources, getAllUsers, updateUserRole, approveResource, rejectResource };
