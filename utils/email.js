const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "gudapatichandana53@gmail.com",
    pass: "zhedkijtccypkmwy"   // Gmail App Password
  }
});

async function sendOTPEmail(toEmail, otp) {
  const mailOptions = {
    from: '"Secure Research Portal" <gudapatichandana53@gmail.com>',
    to: toEmail,
    subject: "OTP for Password Recovery",
    text: `Your OTP is: ${otp}\n\nThis OTP is valid for 2 minutes.`
  };

  await transporter.sendMail(mailOptions);
  console.log("📧 OTP sent to:", toEmail, "OTP:", otp);
}

module.exports = sendOTPEmail;
