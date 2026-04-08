const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "gudapatichandana53@gmail.com",
    pass: "zhedkijtccypkmwy"
  }
});

transporter.sendMail(
  {
    from: '"Test Mail" <gudapatichandana53@gmail.com>',
    to: "gudapatichandana53@gmail.com",
    subject: "SMTP TEST",
    text: "If you get this mail, Gmail SMTP works."
  },
  (err, info) => {
    if (err) {
      console.error("SMTP FAILED:", err);
    } else {
      console.log("SMTP SUCCESS:", info.response);
    }
  }
);

