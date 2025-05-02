const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Replace with your actual MongoDB credentials
const MONGO_URI = "mongodb+srv://<your_username>:<your_encoded_password>@blacklist-cluster.npsjdlx.mongodb.net/?retryWrites=true&w=majority&appName=Blacklist-cluster";

// Connect Mongoose
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("MongoDB connected with Mongoose"))
.catch(err => console.error("Mongoose connection error:", err));

// Native MongoClient for testing route
const client = new MongoClient(MONGO_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// User Schema
const User = mongoose.model("User", new mongoose.Schema({
  username: String,
  password: String
}));

// Routes
app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const newUser = new User({ username, password });
    await newUser.save();
    res.json({ message: "Registration successful" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Server error during registration" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username, password });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    res.json({ message: "Login successful" });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});

app.get("/test-mongo", async (req, res) => {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    res.send("Pinged your deployment. Successfully connected to MongoDB!");
  } catch (err) {
    console.error("MongoDB test connection error:", err);
    res.status(500).send("MongoDB connection failed: " + err.message);
  } finally {
    await client.close();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
