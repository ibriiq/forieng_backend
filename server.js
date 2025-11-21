import express from 'express';
import router from './routes.js';
import userInfo from './middleware/userInfo.js';
import cors from 'cors';
import cookieParser from 'cookie-parser'; // Import cookie-parser
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const app = express();

// Configure CORS options
const corsOptions = {
  origin: 'http://localhost:8080', // Allow only your React dev server
  credentials: true, // Important if you're sending cookies or need credentials
  // Add other options if needed, like allowed methods or headers
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Example: specify allowed methods
  // allowedHeaders: ['Content-Type', 'Authorization'], // Example: specify allowed headers
  credentials: true, // **CRITICAL**: Allows cookies to be sent
};




// Get current directory equivalent to __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(join(__dirname, ''));

// Now you can use __dirname as before
app.use(express.static(join(__dirname, '')));



app.use(cors(corsOptions));

const PORT = process.env.PORT || 3000;
const host = process.env.HOST || 'localhost';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());
app.use(userInfo);

app.use('/api', router);






app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});