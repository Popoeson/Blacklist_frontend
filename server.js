const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
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

// Employee Schema
const employeeSchema = new mongoose.Schema({
  name: String,
  photo: String,
  description: String,  // Add description field
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

// Employee Upload Endpoint
app.post('/api/employees', upload.single('photo'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const photo = req.file.filename;  // Get the uploaded file's name

    const newEmployee = new Employee({ name, description, photo });
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
