
// AUTHENTICATION
// SUB-TOPIC: Token-Based Authentication


const jwt = require("jsonwebtoken");

// Middleware to authenticate user requests
module.exports = function (req, res, next) {

  // Extract Authorization header from request
  // Expected format: "Bearer <JWT_TOKEN>"
  const authHeader = req.headers.authorization;

  // Step 1: Check whether token exists
  // Prevents unauthenticated access
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  // Step 2: Extract JWT token from header
  const token = authHeader.split(" ")[1];

  try {
    // Step 3: Verify JWT token using secret key
    // Ensures token integrity and authenticity
    const decoded = jwt.verify(token, "secretkey");

    // Step 4: Attach decoded user details to request object
    // This enables authorization checks in later middleware
    // decoded contains: { username, role }
    req.user = decoded;

    // Step 5: Allow request to proceed
    next();
  } catch (err) {
    // If token verification fails, deny access
    return res.status(401).json({ message: "Invalid token" });
  }
};
