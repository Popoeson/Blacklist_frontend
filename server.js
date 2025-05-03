const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('uploads')); // Serve static files from the "uploads" folder

// MongoDB Connection
mongoose.connect('mongodb+srv://Admin:BlacklistDatabase@blacklist-cluster.npsjdlx.mongodb.net/?retryWrites=true&w=majority&appName=Blacklist-cluster', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String
});

const User = mongoose.model('User', userSchema);

// Employee Schema
const employeeSchema = new mongoose.Schema({
  name: String,
  photo: String,
  reason: String,
});

const Employee = mongoose.model('Employee', employeeSchema);

// Multer Storage Configuration (for storing files in uploads folder)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads');  // Store files in "uploads" folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));  // Unique filename
  }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);  // Accept image files
  } else {
    cb(new Error('Not an image'), false);  // Reject non-image files
  }
};

// Multer upload configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter
});

// Register Endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    res.status(200).json({ message: 'Login successful' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Employee Upload Endpoint
app.post('/api/employees', upload.single('photo'), async (req, res) => {
  try {
    const { name, reason } = req.body;
    const photo = req.file.filename;  // Get the uploaded file's name

    const newEmployee = new Employee({ name, reason, photo });
    await newEmployee.save();
    res.status(201).json({ message: 'Employee uploaded successfully' });
  } catch (err) {
    console.error('Error uploading employee:', err);
    res.status(500).json({ message: 'Error uploading employee' });
  }
});

// Fetch Employees Endpoint
app.get('/api/employees', async (req, res) => {
  try {
    const employees = await Employee.find();  // Fetch all employees from DB
    res.status(200).json(employees);
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ message: 'Error fetching employees' });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
