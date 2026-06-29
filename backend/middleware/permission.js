const permission = (requiredPermission) => {
  return (req, res, next) => {
    const role = req.user?.role;
    const permissions = req.user?.permissions || [];

    if (role === "admin") return next();

    if (permissions.includes(requiredPermission)) return next();

    return res.status(403).json({
      message: "Access denied. You do not have permission.",
    });
  };
};

module.exports = permission;