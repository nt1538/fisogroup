const bcrypt = require('bcrypt');
const crypto = require('crypto'); // New
const ACCESS_CODE = 'Access121';

router.post('/register', async (req, res) => {
  const { name, email, password, introducer_id, access_code } = req.body;
  if (access_code !== ACCESS_CODE) return res.status(403).json({ error: 'Invalid access code' });

  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (name, email, password, introducer_id) VALUES ($1, $2, $3, $4)',
      [name, email, hash, introducer_id || null]
    );
    res.json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body; // `password` is SHA-256 hash from frontend
  try {
    const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userQuery.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    // Hash incoming SHA-256 value with bcrypt again and compare with DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, process.env.JWT_SECRET || 'your_secret_key', { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, name: user.name, is_admin: user.is_admin } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

