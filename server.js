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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
mongoose.connect('mongodb+srv://Admin:BlacklistDatabase@blacklist-cluster.npsjdlx.mongodb.net/blacklistDB?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Schemas
const userSchema = new mongoose.Schema({ username: String, password: String });
const sessionSchema = new mongoose.Schema({ username: String, loginTime: { type: Date, default: Date.now } });
const employeeSchema = new mongoose.Schema({ name: String, photo: String, description: String, uploadedBy: String });
const tokenSchema = new mongoose.Schema({ token: String, claimedBy: String, createdAt: { type: Date, default: Date.now } });
const companySchema = new mongoose.Schema({ token: String, password: String });

const User = mongoose.model('User', userSchema);
const Session = mongoose.model('Session', sessionSchema);
const Employee = mongoose.model('Employee', employeeSchema);
const Token = mongoose.model('Token', tokenSchema);
const Company = mongoose.model('Company', companySchema);

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, fileFilter: (req, file, cb) => {
  cb(null, file.mimetype.startsWith('image'));
}});

// Admin Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ message: "Username already exists" });

    const hashed = await bcrypt.hash(password, 10);
    await new User({ username, password: hashed }).save();
    res.status(201).json({ message: "Registration successful" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Admin Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await User.findOne({ username });
    if (!admin) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    await new Session({ username }).save();
    res.json({ message: "Login successful", username });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Company Registration
app.post('/api/company/register', async (req, res) => {
  try {
    const { token, password } = req.body;
    const tokenDoc = await Token.findOne({ token });

    if (!tokenDoc) return res.status(400).json({ message: "Invalid token" });
    if (tokenDoc.claimedBy) return res.status(400).json({ message: "Token already used" });

    const hashed = await bcrypt.hash(password, 10);
    await new Company({ token, password: hashed }).save();

    tokenDoc.claimedBy = token;
    await tokenDoc.save();

    res.status(201).json({ message: "Company registered successfully" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Company Login
app.post('/api/company/login', async (req, res) => {
  try {
    const { token, password } = req.body;
    const company = await Company.findOne({ token });
    if (!company) return res.status(400).json({ message: "Company not found" });

    const isMatch = await bcrypt.compare(password, company.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    res.json({ message: "Login successful", token });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Token Generation
app.post('/api/tokens/generate', async (req, res) => {
  const newToken = 'BL-' + Math.random().toString(36).substr(2, 8).toUpperCase();
  try {
    await new Token({ token: newToken }).save();
    res.json({ token: newToken });
  } catch {
    res.status(500).json({ message: "Failed to generate token" });
  }
});

// Token Validation for Enter Token Page
app.post('/api/tokens/validate', async (req, res) => {
  try {
    const { token } = req.body;
    const tokenDoc = await Token.findOne({ token });
    if (!tokenDoc) return res.status(400).json({ message: "Invalid token" });
    if (tokenDoc.claimedBy) return res.status(400).json({ message: "Token already used" });

    res.status(200).json({ message: "Token is valid" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Employee Upload
app.post('/api/employees', upload.single('photo'), async (req, res) => {
  try {
    const { name, description, uploadedBy } = req.body;
    const photo = req.file.filename;
    await new Employee({ name, description, photo, uploadedBy }).save();
    res.status(201).json({ message: 'Employee uploaded successfully' });
  } catch {
    res.status(500).json({ message: 'Error uploading employee' });
  }
});

// Get Employees
app.get('/api/employees', async (_, res) => {
  try {
    const employees = await Employee.find();
    res.status(200).json(employees);
  } catch {
    res.status(500).json({ message: 'Error fetching employees' });
  }
});

// Admin Info
app.get('/api/admins', async (_, res) => {
  try {
    const admins = await User.find({}, 'username');
    res.json(admins);
  } catch {
    res.status(500).json({ message: 'Error fetching admins' });
  }
});

// Session Info
app.get('/api/sessions', async (_, res) => {
  try {
    const sessions = await Session.find();
    res.json(sessions);
  } catch {
    res.status(500).json({ message: 'Error fetching sessions' });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
