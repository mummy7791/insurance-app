const jwt = require("jsonwebtoken");

const auth = (roles = []) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({ message: "No token provided" });
      }

      const token = authHeader.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = decoded;

      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      next();
    } catch {
      return res.status(401).json({ message: "Token expired or invalid" });
    }
  };
};

module.exports = auth;