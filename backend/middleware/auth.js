const jwt = require("jsonwebtoken");

const auth = (roles = []) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({ message: "No token provided" });
      }

      if (!authHeader.startsWith("Bearer ")) return res.status(401).json({ message: "Invalid authorization header" });
      const token = authHeader.slice(7).trim();
      if (!token) return res.status(401).json({ message: "No token provided" });
      if (!process.env.JWT_SECRET) { console.error("JWT_SECRET is not configured"); return res.status(503).json({ message: "Authentication service unavailable" }); }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded?.id || !decoded?.role) return res.status(401).json({ message: "Invalid token payload" });

      req.user = decoded;

      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      next();
    } catch (error) {
      if (error?.name === "TokenExpiredError") return res.status(401).json({ message: "Session expired" });
      return res.status(401).json({ message: "Token expired or invalid" });
    }
  };
};

module.exports = auth;