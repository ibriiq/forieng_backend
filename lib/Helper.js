import crypto from "crypto";

export const SendSms = (to, sms) => {
    
  
// Load environment variables (use dotenv if needed)
const { SMS_USERNAME, SMS_PASSWORD, SMS_SENDERID, SMS_KEY } = process.env;

// Inputs
const number = to; // replace with your $number
let message = sms; // replace with your $message

// Replace spaces with %20 (like str_ireplace in PHP)
message = message.replace(/ /g, '%20');

// Format current date as DD/MM/YYYY (matches Laravel's now()->format('d/m/Y'))
const now = new Date();
const day = String(now.getDate()).padStart(2, '0');
const month = String(now.getMonth() + 1).padStart(2, '0');
const year = now.getFullYear();
const formattedDate = `${day}/${month}/${year}`;

// Build the hash string (order matters!)
const hashString = [
  SMS_USERNAME,
  SMS_PASSWORD,
  number,
  message,
  SMS_SENDERID,
  formattedDate,
  SMS_KEY
].join('|');

// Generate uppercase MD5 hash
const hashkey = crypto
  .createHash('md5')
  .update(hashString)
  .digest('hex')
  .toUpperCase();

// Prepare form data as URL-encoded string
const formData = new URLSearchParams({
  from: SMS_SENDERID,
  to: number,
  msg: message,
  key: hashkey,
});

// Send POST request using fetch
fetch('https://sms.mytelesom.com/index.php/Gway/sendsms', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: formData,
  // ⚠️ Only disable SSL verification if absolutely necessary (insecure!)
  // Node.js fetch doesn't have a direct 'verify: false' option,
  // but you can bypass SSL by setting environment variable:
  // NODE_TLS_REJECT_UNAUTHORIZED=0 (not recommended for production)
})
  .then(response => response.text())
  .then(data => {
    console.log('SMS Response:', data);
  })
  .catch(error => {
    console.error('Error sending SMS:', error);
  });
}