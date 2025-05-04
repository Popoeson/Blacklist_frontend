const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded images from the /uploads route
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
mongoose.connect('mongodb+srv://Admin:BlacklistDatabase@blacklist-cluster.npsjdlx.mongodb.net/?retryWrites=true&w=majority&appName=Blacklist-cluster', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Schemas and Models
const userSchema = new mongoose.Schema({ username: String, password: String });
const User = mongoose.model('User', userSchema);

const sessionSchema = new mongoose.Schema({ username: String, loginTime: { type: Date, default: Date.now } });
const Session = mongoose.model('Session', sessionSchema);

const employeeSchema = new mongoose.Schema({
  name: String,
  photo: String,
  description: String,
  uploadedBy: String
});
const Employee = mongoose.model('Employee', employeeSchema);

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) cb(null, true);
  else cb(new Error('Only images are allowed'), false);
};
const upload = multer({ storage, fileFilter });

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: "Username already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "Registration successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    const session = new Session({ username });
    await session.save();

    res.json({ message: "Login successful", username });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Upload Employee
app.post('/api/employees', upload.single('photo'), async (req, res) => {
  try {
    const { name, description, uploadedBy } = req.body;
    const photo = req.file.filename;

    const newEmployee = new Employee({ name, description, photo, uploadedBy });
    await newEmployee.save();
    res.status(201).json({ message: 'Employee uploaded successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error uploading employee' });
  }
});

// Get Employees
app.get('/api/employees', async (req, res) => {
  try {
    const employees = await Employee.find();
    res.status(200).json(employees);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching employees' });
  }
});

// Get Admins
app.get('/api/admins', async (req, res) => {
  try {
    const admins = await User.find({}, 'username');
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching admins' });
  }
});

// Get Sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await Session.find();
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching sessions' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
