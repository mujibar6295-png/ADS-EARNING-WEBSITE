const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.use(session({
    secret: 'secret-key-earn-app',
    resave: false,
    saveUninitialized: false
}));

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/earningApp', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// User Schema
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 0 },
    lastLoginDate: { type: String, default: "" },
    streak: { type: Number, default: 0 },
    spinsLeft: { type: Number, default: 3 },
    isAdmin: { type: Boolean, default: false }
});
const User = mongoose.model('User', UserSchema);

// Routes
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user });
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ email, password: hashedPassword });
        res.redirect('/login');
    } catch (err) {
        res.send("Error: Email already exists or invalid data.");
    }
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = user;
        res.redirect('/dashboard');
    } else {
        res.send("Invalid credentials");
    }
});

app.get('/dashboard', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const currentUser = await User.findById(req.session.user._id);
    res.render('dashboard', { user: currentUser });
});

// Captcha & Spin Completion Reward Route
app.post('/add-reward', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false });
    const { amount } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
        req.session.user._id,
        { $inc: { balance: amount || 0.5 } },
        { new: true }
    );
    req.session.user = updatedUser;
    res.json({ success: true, newBalance: updatedUser.balance });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
