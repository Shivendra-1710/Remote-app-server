module.exports = (req, res, next) => {
  // Check if user exists and is admin
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }

  next();
}; 