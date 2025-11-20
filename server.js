import express from 'express';
import router from './routes.js';
import userInfo from './middleware/userInfo.js';
import cors from 'cors';
import cookieParser from 'cookie-parser'; // Import cookie-parser

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