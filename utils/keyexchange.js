const crypto = require("crypto");

/*
  Diffie–Hellman Key Exchange Utility
  Used ONLY for demonstration (lab-safe)
*/

// Create server-side DH instance
const dh = crypto.createDiffieHellman(2048);
dh.generateKeys();

// Generate shared secret using client public key
function generateSharedKey(clientPublicKey) {
  return dh.computeSecret(clientPublicKey);
}

module.exports = {
  dh,
  generateSharedKey
};
