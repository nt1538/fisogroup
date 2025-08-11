const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
require('dotenv').config();
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const submitAgentRoutes = require('./routes/submitAgent');
const adminReportRoutes = require('./routes/adminProductionReport'); 
const { verifyToken } = require('./middleware/auth');
require('./cron/cron-jobs');

dotenv.config();
const app = express();

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use(cors());
//app.use(express.json());

// Routes
app.use('/api', authRoutes);
app.use('/api/users', verifyToken, userRoutes);
app.use('/api/orders', verifyToken, orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/reports', verifyToken, adminReportRoutes); // ⬅️ NEW
app.use('/api', submitAgentRoutes);


app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));