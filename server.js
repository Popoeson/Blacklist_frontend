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
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://Admin:BlacklistDatabase@blacklist-cluster.npsjdlx.mongodb.net/blacklistDB?retryWrites=true&w=majority', {
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
const companySchema = new mongoose.Schema({
  token: String,
  name: String,
  email: String,
  phone: String,
  password: String
});
const companySessionSchema = new mongoose.Schema({
  companyName: String,
  loginTime: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Session = mongoose.model('Session', sessionSchema);
const Employee = mongoose.model('Employee', employeeSchema);
const Token = mongoose.model('Token', tokenSchema);
const Company = mongoose.model('Company', companySchema);
const CompanySession = mongoose.model('CompanySession', companySessionSchema);

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
  } catch (err) {
    console.error("Admin registration error:", err);
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
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Company Registration with Debugging Logs
app.post('/api/company/register', async (req, res) => {
  try {
    const { token, name, email, phone, password } = req.body;
    console.log("Company registration attempt:", req.body);

    const tokenDoc = await Token.findOne({ token });
    if (!tokenDoc) {
      console.log("Token not found");
      return res.status(400).json({ message: "Invalid token" });
    }

    if (tokenDoc.claimedBy) {
      console.log("Token already claimed:", tokenDoc.claimedBy);
      return res.status(400).json({ message: "Token already used" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const company = new Company({
      token,
      name,
      email,
      phone,
      password: hashed
    });

    await company.save();
    console.log("Company saved");

    tokenDoc.claimedBy = name;
    await tokenDoc.save();
    console.log("Token updated");

    res.status(201).json({ message: "Company registered successfully" });
  } catch (err) {
    console.error("Company registration error:", err);
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

    await new CompanySession({ companyName: company.name }).save();
    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error("Company login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Token Generation
app.post('/api/tokens/generate', async (req, res) => {
  const newToken = 'BL-' + Math.random().toString(36).substr(2, 8).toUpperCase();
  try {
    await new Token({ token: newToken }).save();
    res.json({ token: newToken });
  } catch (err) {
    console.error("Token generation error:", err);
    res.status(500).json({ message: "Failed to generate token" });
  }
});

// Token Validation
app.post('/api/tokens/validate', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token is required" });

    const tokenDoc = await Token.findOne({ token });
    if (!tokenDoc) return res.status(400).json({ message: "Invalid token" });
    if (tokenDoc.claimedBy) return res.status(400).json({ message: "Token already used" });

    res.status(200).json({ message: "Token is valid" });
  } catch (err) {
    console.error("Token validation error:", err);
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
  } catch (err) {
    console.error("Employee upload error:", err);
    res.status(500).json({ message: 'Error uploading employee' });
  }
});

// Get Employees
app.get('/api/employees', async (_, res) => {
  try {
    const employees = await Employee.find();
    res.status(200).json(employees);
  } catch (err) {
    console.error("Get employees error:", err);
    res.status(500).json({ message: 'Error fetching employees' });
  }
});

// Get Admins
app.get('/api/admins', async (_, res) => {
  try {
    const admins = await User.find({}, 'username');
    res.json(admins);
  } catch (err) {
    console.error("Get admins error:", err);
    res.status(500).json({ message: 'Error fetching admins' });
  }
});

// Get Admin Sessions
app.get('/api/sessions', async (_, res) => {
  try {
    const sessions = await Session.find();
    res.json(sessions);
  } catch (err) {
    console.error("Get sessions error:", err);
    res.status(500).json({ message: 'Error fetching sessions' });
  }
});

// Get Companies
app.get('/api/companies', async (_, res) => {
  try {
    const companies = await Company.find({}, 'name email phone token');
    res.json(companies);
  } catch (err) {
    console.error("Get companies error:", err);
    res.status(500).json({ message: 'Error fetching companies' });
  }
});

// Get Company Sessions
app.get('/api/company-sessions', async (_, res) => {
  try {
    const sessions = await CompanySession.find();
    res.json(sessions);
  } catch (err) {
    console.error("Get company sessions error:", err);
    res.status(500).json({ message: 'Error fetching sessions' });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
