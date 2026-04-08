
//Access Control Model (ACL)



const ACL = {
  student: ["upload"],           // Student can only upload content
  reviewer: ["read"],            // Reviewer can only read content
  admin: ["upload", "read", "delete"] // Admin has full permissions
};

// Exporting a middleware function for access control
// This function enforces authorization rules programmatically
module.exports = function (action) {

  // Middleware function used in routes
  return (req, res, next) => {

    // Role is extracted from authenticated user
    // req.user is assumed to be set after successful authentication
    const role = req.user.role;

    // Check 1: Validate if role exists in ACL
    // Prevents undefined or unauthorized roles
    if (!ACL[role]) {
      return res.status(403).json({ message: "Invalid role" });
    }

    // Check 2: Verify whether the role has permission
    // to perform the requested action
    if (!ACL[role].includes(action)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // If role and permission are valid, allow request to proceed
    next();
  };
};
