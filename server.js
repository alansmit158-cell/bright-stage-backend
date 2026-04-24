const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const { protect } = require('./middleware/authMiddleware');

// Models
const Message = require('./models/Message');

// Config & DB
const connectDB = require('./config/db');

// Root App Setup
const app = express();
const server = http.createServer(app);

// isVercel check
const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL;

// CORS Configuration
const corsOptions = {
    origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://192.168.1.16:8081",
        "http://localhost:8081",
        "http://192.168.100.153:8081",
        "http://192.168.100.153:5173",
        "https://bright-stage-pc-app.vercel.app",
        "https://bright-stage-mobile-app.vercel.app",
        "https://bright-stage-2026.vercel.app"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
};

app.use(cors(corsOptions));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Health Checks
app.get('/', (req, res) => {
    res.status(200).send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #000; color: #fff; height: 100vh; display: flex; flex-direction: column; justify-content: center;">
            <h1 style="color: #ffa500; font-size: 3rem; margin-bottom: 10px;">BRIGHT STAGE</h1>
            <p style="font-size: 1.2rem;">The Production Backend is <strong>ONLINE</strong>.</p>
            <p style="color: #888;">API Endpoint: <code>/api</code></p>
            <div style="margin: 30px auto; width: 50px; height: 2px; background: #ffa500;"></div>
            <p><small style="color: #555;">v1.1.0 - Professional Clean Version</small></p>
        </div>
    `);
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        environment: process.env.NODE_ENV || 'production',
        dbConnected: mongoose.connection.readyState === 1
    });
});

// Socket.io (Only for non-Vercel)
if (!isVercel) {
    const io = new Server(server, {
        cors: corsOptions
    });

    io.on('connection', (socket) => {
        console.log(`User Connected: ${socket.id}`);

        socket.on('join_chat', (data) => {
            socket.join('general');
            console.log(`User ${data?.name || socket.id} joined general chat`);
        });

        socket.on('send_message', async (data) => {
            try {
                const newMessage = new Message(data);
                await newMessage.save();
                io.to(data.room || 'general').emit('receive_message', data);
            } catch (err) {
                console.error("Error saving message:", err);
            }
        });

        socket.on('disconnect', () => {
            console.log("User Disconnected", socket.id);
        });
    });
}

// Database Connection
connectDB();

// Route Definitions
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const accountingRoutes = require('./routes/accountingRoutes');
const bankRoutes = require('./routes/bankRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const clientRoutes = require('./routes/clientRoutes');
const driverRoutes = require('./routes/driverRoutes');
const freelancerRoutes = require('./routes/freelancerRoutes');
const hrRoutes = require('./routes/hrRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const publicRoutes = require('./routes/publicRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const subcontractedRoutes = require('./routes/subcontractedRoutes');
const flycaseRoutes = require('./routes/flycaseRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const carrierRoutes = require('./routes/carrierRoutes');
const deliveryNoteRoutes = require('./routes/deliveryNoteRoutes');
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const auditRoutes = require('./routes/auditRoutes');
const transferRoutes = require('./routes/transferRoutes');
const lossReportRoutes = require('./routes/lossReportRoutes');
const ledProjectRoutes = require('./routes/ledProjectRoutes');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/freelancers', freelancerRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/subcontracted', subcontractedRoutes);
app.use('/api/flycases', flycaseRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/carriers', carrierRoutes);
app.use('/api/delivery-notes', deliveryNoteRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/loss-reports', lossReportRoutes);
app.use('/api/led-projects', ledProjectRoutes);

// Catch-all 404
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

// Start Server
if (require.main === module) {
    const SERVER_PORT = process.env.PORT || 5000;
    server.listen(SERVER_PORT, () => {
        console.log(`Bright Stage Server running on port ${SERVER_PORT}`);
    });
}

module.exports = app;
