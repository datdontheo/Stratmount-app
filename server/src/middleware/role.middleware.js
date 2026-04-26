const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

const requireAdmin = requireRole('ADMIN');
const requireAdminOrWarehouse = requireRole('ADMIN', 'WAREHOUSE');

module.exports = { requireRole, requireAdmin, requireAdminOrWarehouse };
