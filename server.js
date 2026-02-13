const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http'); // Import HTTP
const { Server } = require("socket.io"); // Import Socket.io
const InventoryItem = require('./models/InventoryItem');
const Project = require('./models/Project');
const User = require('./models/User'); // Required for populate
const MaintenanceTicket = require('./models/MaintenanceTicket');
const PdfService = require('./services/PdfService');
const Message = require('./models/Message'); // Import Message Model

const { protect, authorize } = require('./middleware/authMiddleware');
const Attendance = require('./models/Attendance'); // Import Attendance for Rest Check

const app = express();
const server = http.createServer(app); // Create HTTP Server

// CORS Configuration
const corsOptions = {
    origin: ["http://localhost:5173", "http://localhost:3000", "http://192.168.1.16:8081", "http://localhost:8081", "http://192.168.100.153:8081", "http://192.168.100.153:5173"], // Allow Frontend, Mobile & Web Expo
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
};

app.use(cors(corsOptions));
app.use(express.json());

// Basic health check for Vercel
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', environment: process.env.NODE_ENV || 'development' });
});

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL;
let io;

if (!isVercel) {
    io = new Server(server, {
        cors: {
            origin: ["http://localhost:5173", "http://localhost:3000", "http://192.168.1.16:8081", "http://localhost:8081", "http://192.168.100.153:8081", "http://192.168.100.153:5173"],
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Socket.io Connection Logic
    io.on('connection', (socket) => {
        console.log(`User Connected: ${socket.id}`);

        // Join Global Chat
        socket.on('join_chat', (data) => {
            socket.join('general');
            console.log(`User ${data?.name || socket.id} joined general chat`);
        });

        // Handle Message
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
mongoose.connect(process.env.MONGODB_URI, { family: 4 })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

mongoose.connection.on('error', err => {
    console.error('MongoDB runtime error:', err);
});
mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

// --- Routes ---
const authRoutes = require('./routes/authRoutes');
const ledProjectRoutes = require('./routes/ledProjectRoutes');
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

// Use Routes
app.use('/api/flycases', flycaseRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/led-projects', ledProjectRoutes);
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
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/carriers', require('./routes/carrierRoutes'));
app.use('/api/delivery-notes', require('./routes/deliveryNoteRoutes'));

app.get('/api/test-connection', (req, res) => {
    res.json({ success: true, message: "Backend is reachable!", time: new Date().toISOString() });
});

// Get All Users - Accessible to all authenticated users for team selection
app.get('/api/users', protect, async (req, res) => {
    try {
        const users = await User.find({ isActive: true }).select('-password -plainPassword');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update User - Founder, Manager
app.put('/api/users/:id', protect, authorize('Founder', 'Manager'), async (req, res) => {
    try {
        const { name, email, role, isActive, password } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (name) user.name = name;
        if (email) user.email = email;
        if (role) user.role = role;
        if (req.body.phone) user.phone = req.body.phone;
        if (req.body.cin) user.cin = req.body.cin;
        if (isActive !== undefined) user.isActive = isActive;
        if (password) {
            // Store both hashed and plain password
            user.password = password;
            user.plainPassword = password;
        }

        // --- Expert Profile Updates ---
        if (req.body.drivingLicenses) user.drivingLicenses = req.body.drivingLicenses;
        if (req.body.technicalSkills) user.technicalSkills = req.body.technicalSkills;
        if (req.body.emergencyContact) user.emergencyContact = req.body.emergencyContact;
        if (req.body.baseRate !== undefined) user.baseRate = req.body.baseRate;
        if (req.body.documents) user.documents = req.body.documents;
        if (req.body.birthDate) user.birthDate = req.body.birthDate;
        if (req.body.hireDate) user.hireDate = req.body.hireDate;


        await user.save();
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add Points to User - Founder, Manager
app.post('/api/users/:id/points', protect, authorize('Founder', 'Manager'), async (req, res) => {
    try {
        const { points, reason } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.points = (user.points || 0) + parseInt(points);
        user.pointsHistory.push({
            reason: reason || 'Achievement',
            points: parseInt(points),
            date: new Date()
        });

        await user.save();
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.use('/api/clients', clientRoutes); // Granular protection inside routes for Read vs Write
app.use('/api/drivers', driverRoutes);
app.use('/api/freelancers', require('./routes/freelancerRoutes')); // Register Freelancer Routes
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/invoices', require('./routes/invoiceRoutes'));
app.use('/api/public', require('./routes/publicRoutes'));
app.use('/api/banking', require('./routes/bankRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes')); // [NEW]
app.use('/api/accounting', require('./routes/accountingRoutes')); // [NEW]
app.use('/api/settings', require('./routes/settingsRoutes')); // [NEW]
app.use('/api/subcontracted', require('./routes/subcontractedRoutes')); // [NEW]
app.use('/api/hr', require('./routes/hrRoutes')); // [NEW] HR Advanced Routes

// --- Inventory Routes ---

// Get All Inventory - Public/Worker Access OK (or protect if strict)
app.get('/api/inventory', async (req, res) => {
    try {
        const items = await InventoryItem.find();
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Inventory Item by Barcode - Public/Worker Access
app.get('/api/inventory/barcode/:barcode', async (req, res) => {
    try {
        let item = await InventoryItem.findOne({ barcode: req.params.barcode });

        // If not found by barcode, try searching by _id (fallback for QR codes containing ID)
        if (!item && mongoose.Types.ObjectId.isValid(req.params.barcode)) {
            item = await InventoryItem.findById(req.params.barcode);
        }

        if (!item) return res.status(404).json({ error: 'Item not found' });
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Inventory Item - Founder, Manager, Storekeeper
app.post('/api/inventory', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const newItem = new InventoryItem(req.body);
        const savedItem = await newItem.save();
        res.status(201).json(savedItem);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update Inventory Item - Founder, Manager, Storekeeper
app.put('/api/inventory/:id', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const updatedItem = await InventoryItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedItem);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete Inventory Item - Founder, Manager
app.delete('/api/inventory/:id', protect, authorize('Founder', 'Manager'), async (req, res) => {
    try {
        await InventoryItem.findByIdAndDelete(req.params.id);
        res.json({ message: 'Item deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Inventory Item History (Rentals & Maintenance)
app.get('/api/inventory/:id/history', protect, async (req, res) => {
    try {
        const itemId = req.params.id;
        console.log(`[History] Fetching history for item: ${itemId}`);

        const item = await InventoryItem.findById(itemId);
        if (!item) return res.status(404).json({ error: 'Item not found' });

        // 1. Fetch Maintenance History
        const maintenance = await MaintenanceTicket.find({ inventoryItem: itemId }).sort({ createdAt: -1 });
        console.log(`[History] Found ${maintenance.length} maintenance tickets`);

        // 2. Fetch Rental History (Projects including this item)
        const rentals = await Project.find({
            'items.inventoryItem': itemId,
            status: { $in: ['Confirmed', 'Pickup', 'Return', 'Done'] }
        }).sort({ 'dates.start': -1 });
        console.log(`[History] Found ${rentals.length} projects`);

        const formattedRentals = rentals.map(p => {
            const projectItem = p.items.find(i => i.inventoryItem && i.inventoryItem.toString() === itemId);
            return {
                projectId: p._id,
                eventName: p.eventName,
                clientName: p.client?.name || p.clientName || 'Unknown',
                startDate: p.dates?.start,
                endDate: p.dates?.end,
                status: p.status,
                quantity: projectItem ? projectItem.quantity : 0
            };
        });

        res.json({
            item,
            maintenance,
            rentals: formattedRentals
        });
    } catch (err) {
        console.error("[History Error]", err);
        res.status(500).json({ error: err.message });
    }
});

// Excel Import Route
const multer = require('multer');
const xlsx = require('xlsx');
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/inventory/import', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        let addedCount = 0;
        let updatedCount = 0;

        for (const row of data) {
            // Mapping Logic: Expect headers like Name, Brand, Model, Qty...
            const name = row['Name'] || row['Nom'];
            if (!name) continue;

            // Try to find existing item by name and model to update, or create new
            const existingItem = await InventoryItem.findOne({
                name: name,
                model: row['Model'] || ''
            });

            const quantity = parseInt(row['Qty'] || row['Quantité'] || 0) || 0;

            if (existingItem) {
                existingItem.quantity += quantity; // Add to existing stock
                await existingItem.save();
                updatedCount++;
            } else {
                const newItem = new InventoryItem({
                    name: name,
                    brand: row['Brand'] || row['Marque'] || 'Generic',
                    model: row['Model'] || '',
                    category: row['Category'] || row['Catégorie'] || 'Accessoires structure', // Default fallback
                    quantity: quantity,
                    state: 'Fonctionnel', // Default
                    barcode: row['Barcode'] || `GEN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    storageLocation: {
                        zone: row['Zone'] || 'A',
                        shelving: row['Shelving'] || '1',
                        shelf: row['Shelf'] || '1'
                    }
                });
                await newItem.save();
                addedCount++;
            }
        }

        // No cleanup needed for memory storage

        res.json({ message: 'Import successful', added: addedCount, updated: updatedCount });
    } catch (err) {
        console.error("Import error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- Translation Route ---
const googleTranslationService = require('./services/GoogleTranslationService');

app.post('/api/translate', async (req, res) => {
    try {
        const { text, targetLang } = req.body;
        if (!text || !targetLang) return res.status(400).json({ error: 'Missing text or targetLang' });

        const translated = await googleTranslationService.translateText(text, targetLang);
        res.json({ translatedText: translated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Project Routes ---
const googleCalendarService = require('./services/GoogleCalendarService');

// Get All Projects
// Get All Projects
app.get('/api/projects', protect, async (req, res) => {
    try {
        let query = {};

        // Filter for Site Manager: Only projects created by them OR assigned to them
        if (req.user.role === 'Site Manager') {
            query = {
                $or: [
                    { createdBy: req.user._id },
                    { assignedUsers: req.user._id }
                ]
            };
        }

        const projects = await Project.find(query)
            .populate('items.inventoryItem')
            .populate('clientId')
            .populate('createdBy', 'username name email')
            .populate('assignedUsers', 'name email');

        res.json(projects);
    } catch (err) {
        console.error("Error fetching projects:", err);
        res.status(500).json({ error: err.message });
    }
});

// Create Project - Founder, Manager, Site Manager
app.post('/api/projects', protect, authorize('Founder', 'Manager', 'Site Manager'), async (req, res) => {
    try {
        const projectData = {
            ...req.body,
            createdBy: req.user._id,
            createdByName: req.user.username || req.user.name || 'Unknown',
            // Validation V0: All projects start as unvalidated (pending)
            isValidated: false
        };
        const newProject = new Project(projectData);
        const savedProject = await newProject.save();

        // Populate client info for the calendar event
        const populatedProject = await savedProject.populate('clientId');

        // Sync with Google Calendar
        // We do this asynchronously (don't await) so we don't block the UI if Google is slow
        googleCalendarService.addProjectEvent(populatedProject)
            .then(() => console.log(`Project ${savedProject.projectName} synced to Google Calendar.`))
            .catch(err => console.error("Calendar Sync Failed:", err));

        res.status(201).json(savedProject);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get Project by ID
app.get('/api/projects/:id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id).populate('items.inventoryItem');
        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Project
app.put('/api/projects/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const userRole = req.user.role;

        const project = await Project.findById(id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        // --- LOCK CHECK ---
        const isLocked = project.permissions?.locked;
        const canBypassLock = ['Founder', 'Manager', 'Storekeeper'].includes(userRole);

        // If locked and user cannot bypass, deny ALL edits
        if (isLocked && !canBypassLock) {
            return res.status(403).json({ error: 'Project is LOCKED. Contact Manager/Founder to edit.' });
        }
        // Even if Admin, warn if they didn't explicitly unlock? No, just allow.

        // Check for Status Change to 'Confirmed' -> Create Reservations
        // Legacy check, now mapped to 'Pickup' or validation logic
        if (updates.status === 'Pickup' && project.status !== 'Pickup') {
            // Logic handled in /validate usually, but if manual update:
            const Reservation = require('./models/Reservation');
            // ... (Reservation logic remains if needed)
        }

        // Apply updates
        Object.assign(project, updates);
        await project.save();

        res.json(project);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// --- Validation & Locking Endpoints ---

// Submit for Validation (Locks the project)
app.post('/api/projects/:id/lock', protect, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        project.validationStatus = 'Pending';
        project.permissions.locked = true; // Lock it
        await project.save();

        // Notify Admins (Future: Socket/Email)
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Unlock Project (Admin Only)
app.post('/api/projects/:id/unlock', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        project.permissions.locked = false;
        project.permissions.unlockedBy = req.user._id;
        await project.save();
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Logistics Workflow Endpoints ---

// 1. Validate Project (Storekeeper/Manager) - Moves to Pickup + Locked
app.post('/api/projects/:id/validate', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        project.validationStatus = 'Validated';
        project.isValidated = true;
        project.status = 'Pickup'; // Move to Ops phase
        project.permissions.locked = true; // Ensure it stays locked

        // Auto-ready for exit if prep is done? Or let Ops do it.
        // Let's set logisticsStatus to Prep enabled.
        if (project.logisticsStatus === 'Prep') {
            // Keep it in Prep, waiting for PrepList check? Or ready?
            // Usually moves to ReadyForExit after Prep Check.
            // We'll leave logisticsStatus as is.
        }

        await project.save();
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Alias for PC App
app.post('/api/projects/:id/validate-manifest', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        project.validationStatus = 'Validated';
        project.isValidated = true;

        // When validated, if it was in Prep, it's now ReadyForExit
        if (project.logisticsStatus === 'Prep') {
            project.logisticsStatus = 'ReadyForExit';
        }

        await project.save();
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/projects/:id/cancel-validation', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        // Guard: Cannot cancel if already scanned for exit or in pickup phase
        if (project.status !== 'Confirmed') {
            return res.status(400).json({ error: 'Cannot cancel validation once project has left the site.' });
        }

        project.validationStatus = 'Draft';
        project.isValidated = false;

        if (project.logisticsStatus === 'ReadyForExit') {
            project.logisticsStatus = 'Prep';
        }

        project.exitQrCode = null; // Invalidate any generated QR

        await project.save();
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Generate Exit QR (Chef Chantier)
app.post('/api/projects/:id/qr/exit', protect, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        if (project.validationStatus !== 'Validated') {
            return res.status(400).json({ error: 'Project must be Validated first' });
        }

        const qrToken = `EXIT-${project._id}-${Date.now()}`; // Simple unique token
        project.exitQrCode = qrToken;
        project.logisticsStatus = 'ReadyForExit';
        await project.save();

        res.json({ qrCode: qrToken });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Scan Exit QR (Storekeeper)
app.post('/api/projects/:id/scan/exit', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const { qrCode } = req.body;
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        if (project.exitQrCode !== qrCode) {
            return res.status(400).json({ error: 'Invalid QR Code' });
        }

        project.logisticsStatus = 'OnSite';
        project.status = 'Pickup'; // Update main status to Pickup/Active
        project.exitScannedAt = new Date();
        project.exitScannedBy = req.user._id;
        project.exitQrCode = null; // Consume the code
        await project.save();

        res.json({ message: 'Exit Confirmed', project });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Generate Return QR (Chef Chantier) - Date Guard
app.post('/api/projects/:id/qr/return', protect, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        // Date Guard
        const today = new Date();
        // project.dates.end is the return date.
        // We allow return strictly on or after the return date (ignoring time for simplicity, or strict)
        // Let's assume strict for now as per "dans la date de retour"
        // But practically, "on or after" is safer. User said "dans la date de retour".
        const returnDate = new Date(project.dates.end);

        // Reset time to midnight for comparison
        today.setHours(0, 0, 0, 0);
        returnDate.setHours(0, 0, 0, 0);

        if (today < returnDate) {
            return res.status(400).json({ error: "Cannot generate Return QR before the return date." });
        }

        const qrToken = `RETURN-${project._id}-${Date.now()}`;
        project.returnQrCode = qrToken;
        project.logisticsStatus = 'Returning';
        await project.save();

        res.json({ qrCode: qrToken });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Scan Return QR (Storekeeper) -> Returns Project for Checklist
app.post('/api/projects/:id/scan/return', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const { qrCode } = req.body;
        const project = await Project.findById(req.params.id)
            .populate('items.inventoryItem'); // Populate for checklist

        if (!project) return res.status(404).json({ error: 'Project not found' });

        if (project.returnQrCode !== qrCode) {
            return res.status(400).json({ error: 'Invalid QR Code' });
        }

        // We verify the QR but don't "consume" it yet until the verification checklist is submitted
        // Or we can mark it as 'VerificationInProgress'
        // For now, just return the project details to the Storekeeper's app
        res.json({ message: 'Return QR Valid', project });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Finalize Return (Storekeeper) -> Points logic
app.post('/api/projects/:id/return/finalize', protect, authorize('Founder', 'Manager', 'Storekeeper'), async (req, res) => {
    try {
        const { missingItems, brokenItems, cleanReturn } = req.body;
        // missingItems: [{ itemId, qty }]
        // brokenItems: [{ itemId, qty }]

        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        // Update Project Return Report
        project.returnReport = {
            missingItems,
            brokenItems,
            cleanReturn
        };
        project.logisticsStatus = 'Returned';
        project.status = 'Done'; // Close project
        project.returnScannedAt = new Date();
        project.returnScannedBy = req.user._id;
        project.returnQrCode = null; // Consume

        // Points Logic - Award to Creator AND all Assigned Users (Team)
        const teamUserIds = [project.createdBy, ...(project.assignedUsers || [])];
        // Remove duplicates if any
        const uniqueTeamIds = [...new Set(teamUserIds.map(id => id.toString()))];

        for (const userId of uniqueTeamIds) {
            const teamMember = await User.findById(userId);
            if (!teamMember) continue;

            if (cleanReturn) {
                teamMember.points = (teamMember.points || 0) + 100;
                teamMember.pointsHistory.push({
                    reason: `Clean Return - Project ${project.eventName} (Team)`,
                    points: 100,
                    date: new Date()
                });
            } else if (missingItems && missingItems.length > 0) {
                teamMember.points = (teamMember.points || 0) - 100;
                teamMember.pointsHistory.push({
                    reason: `Missing Items - Project ${project.eventName} (Team)`,
                    points: -100,
                    date: new Date()
                });
            }
            await teamMember.save();
        }

        await project.save();
        res.json({ message: 'Return Finalized', pointsUpdated: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Checkout Project (Status: Confirmed -> Pickup)
app.put('/api/projects/:id/checkout', async (req, res) => {
    try {
        const { driverId, vehicleId } = req.body;
        const project = await Project.findById(req.params.id);

        if (!project) return res.status(404).json({ error: 'Project not found' });
        if (project.status !== 'Confirmed') return res.status(400).json({ error: 'Project must be Confirmed to checkout' });

        // Update status and logistics
        project.status = 'Pickup';
        // You might want to save driver/vehicle info to the project or a Transfer record here
        // For simplicity, we just authorize the status change

        await project.save();
        res.json(project);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Check-in Project (Status: Pickup -> Return/Done)
app.put('/api/projects/:id/checkin', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { damages } = req.body; // Array of { inventoryItem: _id, notes: "Broken" }
        const project = await Project.findById(req.params.id).session(session);

        if (!project) throw new Error('Project not found');

        // Update Status
        project.status = 'Done'; // Or 'Return' if it needs processing

        // Process Damages
        if (damages && damages.length > 0) {
            for (const damage of damages) {
                // Find item and update state
                const item = await InventoryItem.findById(damage.inventoryItem).session(session);
                if (item) {
                    item.state = 'à vérifier'; // Mark as needs verification
                    // Optional: Create Maintenance Ticket automatically
                    const ticket = new MaintenanceTicket({
                        inventoryItem: item._id,
                        description: `Reported from Return of ${project.eventName}: ${damage.notes}`,
                        reportedBy: 'System Scan',
                        priority: 'High'
                    });
                    await ticket.save({ session });
                    await item.save({ session });
                }
            }
        }

        await project.save({ session });
        await session.commitTransaction();
        res.json(project);
    } catch (err) {
        await session.abortTransaction();
        res.status(400).json({ error: err.message });
    } finally {
        session.endSession();
    }
});

// --- Document Generation Routes ---

app.get('/api/projects/:id/quote', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id).populate('client');
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const companyId = req.query.company || 'bright';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=quote-${project.eventName}.pdf`);

        PdfService.generateQuote(project, res, companyId);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/projects/:id/invoice', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id).populate('client');
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const companyId = req.query.company || 'bright';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${project.eventName}.pdf`);

        PdfService.generateInvoice(project, res, companyId);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/projects/:id/preplist', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const safeName = (project.eventName || 'project').replace(/[^a-z0-9]/gi, '_');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="preplist-${safeName}.pdf"`);

        PdfService.generatePrepList(project, res);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/projects/:id/manifest', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const companyId = req.query.company || 'bright';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=manifest-${project.eventName}.pdf`);

        PdfService.generateManifest(project, res, companyId);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/projects/:id/transport', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const companyId = req.query.company || 'bright';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=transport-${project.eventName}.pdf`);

        PdfService.generateTransportSlip(project, res, companyId);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/projects/:id/transfer', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const companyId = req.query.company || 'bright';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=transfer-${project.eventName}.pdf`);

        PdfService.generateTransferForm(project, res, companyId);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Toggle Preparation Status (Ready)
app.put('/api/projects/:id/toggle-prep', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        project.preparationStatus = project.preparationStatus === 'Ready' ? 'Pending' : 'Ready';
        await project.save();
        res.json(project);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// --- Availability Check Route ---
app.post('/api/availability', async (req, res) => {
    try {
        const { startDate, endDate, siteAddress, excludeProjectId } = req.body;
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start) || isNaN(end)) {
            return res.status(400).json({ error: 'Invalid dates' });
        }

        // 1. Fetch all 'Confirmed' or 'Pickup' projects that overlap with the date range
        // Note: We exclude 'Draft', 'Quote', 'Return', 'Done' from blocking stock (unless user wants Quote to block?)
        // Usually only Confirmed projects block stock.
        const query = {
            status: { $in: ['Confirmed', 'Pickup'] },
            $or: [
                { 'dates.start': { $lte: end }, 'dates.end': { $gte: start } }
            ]
        };

        if (excludeProjectId) {
            query._id = { $ne: excludeProjectId };
        }

        const overlappingProjects = await Project.find(query).populate('items.inventoryItem');

        // 2. Calculate Item Availability
        const itemUsage = {}; // itemId -> totalReserved
        overlappingProjects.forEach(proj => {
            proj.items.forEach(item => {
                if (item.source === 'internal' && item.inventoryItem) {
                    const iid = item.inventoryItem._id.toString();
                    itemUsage[iid] = (itemUsage[iid] || 0) + (item.quantity || 0);
                }
            });
        });

        const allItems = await InventoryItem.find({});
        const itemAvailability = {};

        allItems.forEach(item => {
            // Basic stock check
            let effectiveStock = item.quantity;

            // Deduct maintenance/broken if applicable (assuming maintenanceQuantity is blocked)
            // If 'state' is not functional, entire stock might be compromised, but let's stick to qty logic for now if available.
            // If item.state is broken, maybe available is 0? 
            // User requirement: "ne pas disponible ... état matériel maintenance"
            if (item.state !== 'Fonctionnel' && item.state !== 'Bon') {
                // If the main state is bad, assume 0 available? 
                // Or just deduct maintenanceQuantity? 
                // Let's assume maintenanceQuantity are broken parts.
            }
            effectiveStock -= (item.maintenanceQuantity || 0);

            const reserved = itemUsage[item._id.toString()] || 0;
            const available = Math.max(0, effectiveStock - reserved);
            itemAvailability[item._id.toString()] = {
                available,
                total: item.quantity,
                reserved
            };
        });

        // 3. Logistics Availability (Drivers & Vehicles)
        // Rule: Start Day (Delivery) and End Day (Return) are the busy days.
        // Projects in between don't block driver if he returns.
        // However, standard logic is often blocking the whole period. 
        // User said: "pool for driver is available after the day of start ... and before the day of return"
        // This confirms blocking is primarily on Start Date and End Date.

        const grandTunisKeywords = ['tunis', 'ariana', 'ben arous', 'manouba', 'carthage', 'marsa', 'gammarth', 'lac', 'soukra', 'mourouj', 'bardo'];
        const isGrandTunis = (addr) => {
            if (!addr) return false;
            const lower = addr.toLowerCase().replace('tunisia', ''); // Remove country to avoid 'Tunisia' matching 'Tunis'
            return grandTunisKeywords.some(k => lower.includes(k));
        };
        const isNewProjectGrandTunis = isGrandTunis(siteAddress);

        // We need to check collisions specifically on req.startDate and req.endDate
        // Find projects that have start==req.start OR end==req.start OR start==req.end OR end==req.end
        // actually simpler: verify driver assignments on specific dates. (start and end)

        const busyLogistics = {
            drivers: {}, // driverId -> { date -> count }
            vehicles: {} // vehicleId -> { date -> count }
        };

        const targetDates = [start.toISOString().split('T')[0], end.toISOString().split('T')[0]];
        // Unique dates (if start == end)
        const uniqueTargetDates = [...new Set(targetDates)];

        overlappingProjects.forEach(proj => {
            if (!proj.transport) return;
            const pStart = proj.dates.start.toISOString().split('T')[0];
            const pEnd = proj.dates.end.toISOString().split('T')[0];

            // Check collision with requested start/end
            // A driver is busy on pStart and pEnd.
            [pStart, pEnd].forEach(busyDate => {
                if (uniqueTargetDates.includes(busyDate)) {
                    // Check Driver
                    if (proj.transport.driverName) {
                        // We need driver ID actually! Project schema currently stores driverName.
                        // This is a flaw in the current schema. It implies name uniqueness.
                        // Let's use name as key for now or fix schema later.
                        const dName = proj.transport.driverName;
                        if (!busyLogistics.drivers[dName]) busyLogistics.drivers[dName] = {};
                        if (!busyLogistics.drivers[dName][busyDate]) busyLogistics.drivers[dName][busyDate] = { count: 0, grandTunis: true };

                        busyLogistics.drivers[dName][busyDate].count++;
                        // If ANY project on this day is NOT Grand Tunis, the whole day is blocked for multi-trips
                        if (!isGrandTunis(proj.siteAddress)) {
                            busyLogistics.drivers[dName][busyDate].grandTunis = false;
                        }
                    }
                    // Check Vehicle
                    if (proj.transport.vehiclePlate) { // Vehicle identified by plate? Schema has vehicleModel/vehiclePlate
                        const vKey = proj.transport.vehiclePlate || proj.transport.vehicleModel;
                        if (!busyLogistics.vehicles[vKey]) busyLogistics.vehicles[vKey] = {};
                        if (!busyLogistics.vehicles[vKey][busyDate]) busyLogistics.vehicles[vKey][busyDate] = { count: 0, grandTunis: true };

                        busyLogistics.vehicles[vKey][busyDate].count++;
                        if (!isGrandTunis(proj.siteAddress)) {
                            busyLogistics.vehicles[vKey][busyDate].grandTunis = false;
                        }
                    }
                }
            });
        });



        // Check Team Availability (Users)
        // Users are blocked for the ENTIRE duration of the project, not just start/end (typically).
        // Or should we apply the same rule? Assuming entire duration for staff.
        const unavailableUsers = [];
        overlappingProjects.forEach(proj => {
            if (proj.assignedUsers && proj.assignedUsers.length > 0) {
                // If this project overlaps at all (which it does, by query def), these users are busy.
                // UNLESS the project is 'Return' or 'Done', but query filters for Confirmed/Pickup.
                proj.assignedUsers.forEach(uid => {
                    const userId = uid._id ? uid._id.toString() : uid.toString();
                    if (!unavailableUsers.includes(userId)) {
                        unavailableUsers.push(userId);
                    }
                });
            }
        });

        // 4. Check Rest Time (11h Rule)
        // Find users who worked late previous day or are working early next day relative to start/end.
        // Simplified: Check if any user has a checkout within 11 hours before start.
        const restWarnings = []; // List of { userId, reason }

        try {
            // Threshold: Start Date - 11 hours
            const restThreshold = new Date(start.getTime() - (11 * 60 * 60 * 1000));

            // Find attendance records where checkOut > restThreshold AND checkOut < start
            // Effectively saying they finished less than 11 hours before this project starts
            const recentWork = await Attendance.find({
                checkOut: { $gt: restThreshold, $lt: start }
            }).populate('user', 'name');

            recentWork.forEach(att => {
                const uid = att.user._id.toString();
                if (!unavailableUsers.includes(uid)) {
                    // Only warn if they aren't already blocked by direct overlap
                    const checkOutTime = new Date(att.checkOut).toLocaleTimeString();
                    restWarnings.push({
                        userId: uid,
                        reason: `Rest Violation: Worked until ${checkOutTime} on previous shift.`
                    });
                }
            });
        } catch (e) {
            console.error("Rest check failed", e);
        }

        // Determine Unavailable Drivers/Vehicles
        const unavailableDrivers = [];
        const unavailableVehicles = [];

        Object.keys(busyLogistics.drivers).forEach(dName => {
            const days = busyLogistics.drivers[dName];
            let isBlocked = false;
            uniqueTargetDates.forEach(date => {
                if (days[date]) {
                    const dailyLoad = days[date].count;
                    const allGrandTunis = days[date].grandTunis;
                    // Rule: Grand Tunis projects allow up to 3 trips. Others 1.
                    const limit = (isNewProjectGrandTunis && allGrandTunis) ? 3 : 0; // If any is not GT, limit is 1 (strict) -> actually if ALREADY 1 non-GT, it's blocked.
                    // Let's simplified: 
                    // If isNewProjectGrandTunis AND all existing are GrandTunis -> limit 3.
                    // Else -> limit 1.

                    if (dailyLoad >= 1) {
                        // If we are strictly adding 1, check if we can add more.
                        if (isNewProjectGrandTunis && allGrandTunis && dailyLoad < 3) {
                            // OK
                        } else {
                            isBlocked = true;
                        }
                    }
                }
            });
            if (isBlocked) unavailableDrivers.push(dName);
        });

        Object.keys(busyLogistics.vehicles).forEach(vKey => {
            const days = busyLogistics.vehicles[vKey];
            let isBlocked = false;
            uniqueTargetDates.forEach(date => {
                if (days[date]) {
                    const dailyLoad = days[date].count;
                    const allGrandTunis = days[date].grandTunis;
                    if (dailyLoad >= 1) {
                        if (isNewProjectGrandTunis && allGrandTunis && dailyLoad < 3) {
                            // OK
                        } else {
                            isBlocked = true;
                        }
                    }
                }
            });
            if (isBlocked) unavailableVehicles.push(vKey);
        });

        res.json({
            itemAvailability,
            unavailableDrivers,
            unavailableVehicles,
            unavailableUsers,
            restWarnings
        });


    } catch (err) {
        console.error("Availability Check Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/projects/:id/toggle-ready', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).send('Project not found');

        project.preparationStatus = project.preparationStatus === 'Ready' ? 'Pending' : 'Ready';
        await project.save();
        res.json(project);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// --- Maintenance Routes ---

// --- MAINTENANCE ROUTES ---
// MaintenanceTicket already required at top

app.get('/api/maintenance', async (req, res) => {
    try {
        const tickets = await MaintenanceTicket.find().populate('inventoryItem').sort({ createdAt: -1 });
        res.json(tickets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/maintenance', async (req, res) => {
    try {
        const ticket = new MaintenanceTicket(req.body);
        const savedTicket = await ticket.save();

        // Auto-update item state to 'à vérifier' or 'Cassé'
        await InventoryItem.findByIdAndUpdate(req.body.inventoryItem, { state: 'à vérifier' });

        res.status(201).json(savedTicket);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/maintenance/:id/resolve', async (req, res) => {
    try {
        const ticket = await MaintenanceTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ error: "Ticket not found" });

        ticket.status = 'Resolved';
        ticket.resolvedAt = new Date();
        ticket.resolutionNotes = req.body.resolutionNotes || "Fixed";
        await ticket.save();

        // Optionally update item state back to Functional
        const item = await InventoryItem.findById(ticket.inventoryItem);
        if (item) {
            item.state = 'Fonctionnel';
            await item.save();
        }

        res.json(ticket);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// --- INVENTORY AUDIT ROUTES ---
const InventoryAudit = require('./models/InventoryAudit');

// Create Audit (Snapshot)
app.post('/api/audits', async (req, res) => {
    try {
        // 1. Fetch all current inventory
        const allItems = await InventoryItem.find({});

        // 2. Prepare audit items snapshot
        const auditItems = allItems.map(item => ({
            inventoryItem: item._id,
            systemQty: item.quantity,
            countedQty: item.quantity, // Default to system qty to start
            discrepancy: 0
        }));

        const audit = new InventoryAudit({
            name: req.body.name || `Audit ${new Date().toLocaleDateString()}`,
            type: req.body.type || 'Spot Check',
            items: auditItems,
            status: 'Draft'
        });

        await audit.save();
        res.status(201).json(audit);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/audits', async (req, res) => {
    try {
        const audits = await InventoryAudit.find().sort({ createdAt: -1 });
        res.json(audits);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/audits/:id', async (req, res) => {
    try {
        const audit = await InventoryAudit.findById(req.params.id).populate('items.inventoryItem');
        if (!audit) return res.status(404).json({ error: "Audit not found" });
        res.json(audit);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/audits/:id', async (req, res) => {
    try {
        const { items, status } = req.body;
        const audit = await InventoryAudit.findById(req.params.id);
        if (!audit) return res.status(404).json({ error: "Audit not found" });

        if (items) {
            // Update counts and calc discrepancies
            items.forEach(updateItem => {
                const docItem = audit.items.find(i => i._id.toString() === updateItem._id);
                if (docItem) {
                    docItem.countedQty = updateItem.countedQty;
                    docItem.discrepancy = updateItem.countedQty - docItem.systemQty;
                    docItem.notes = updateItem.notes;
                }
            });
        }

        if (status) audit.status = status;

        if (status === 'Finalized') {
            audit.finalizedAt = new Date();
            // Optional: Here we could auto-update the main inventory quantities based on the audit
            // For safety, we will just record the audit for now.
        }

        await audit.save();
        res.json(audit);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Ticket (Resolve/Update status)
app.put('/api/maintenance/:id', async (req, res) => {
    try {
        const updatedTicket = await MaintenanceTicket.findByIdAndUpdate(req.params.id, req.body, { new: true });

        // If fixed, update item state back to 'Fonctionnel'
        if (req.body.status === 'Fixed') {
            await InventoryItem.findByIdAndUpdate(updatedTicket.inventoryItem, { state: 'Fonctionnel' });
            updatedTicket.dateResolved = new Date();
            await updatedTicket.save();
        }

        res.json(updatedTicket);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// --- Transfer Routes ---
const Transfer = require('./models/Transfer');

app.post('/api/transfers', async (req, res) => {
    const { sourceProjectId, destProjectId, items, driverName, vehiclePlate, senderSig, receiverSig } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Create Transfer Record
        const transfer = new Transfer({
            sourceProject: sourceProjectId,
            destinationProject: destProjectId,
            items,
            driverName,
            vehiclePlate,
            senderSignature: senderSig,
            receiverSignature: receiverSig
        });
        await transfer.save({ session });

        // 2. Remove from Source Project (reduce quantity or remove line item)
        const sourceProj = await Project.findById(sourceProjectId).session(session);
        if (!sourceProj) throw new Error("Source Project not found");

        for (const tItem of items) {
            const existingItem = sourceProj.items.find(i => i.inventoryItem.toString() === tItem.inventoryItem);
            if (existingItem) {
                if (existingItem.quantity < tItem.quantity) {
                    throw new Error(`Not enough ${tItem.name} in source project`);
                }
                existingItem.quantity -= tItem.quantity;
            }
        }
        await sourceProj.save({ session });

        // 3. Add to Destination Project
        const destProj = await Project.findById(destProjectId).session(session);
        if (!destProj) throw new Error("Destination Project not found");

        for (const tItem of items) {
            const existingItem = destProj.items.find(i => i.inventoryItem.toString() === tItem.inventoryItem);
            if (existingItem) {
                existingItem.quantity += parseInt(tItem.quantity);
            } else {
                destProj.items.push({
                    inventoryItem: tItem.inventoryItem,
                    name: tItem.name,
                    quantity: parseInt(tItem.quantity),
                    pricePerDay: 0
                });
            }
        }
        await destProj.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json(transfer);
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ error: err.message });
    }
});

// Get All Transfers
app.get('/api/transfers', async (req, res) => {
    try {
        const transfers = await Transfer.find()
            .sort({ createdAt: -1 })
            .populate('sourceProject', 'eventName')
            .populate('destinationProject', 'eventName')
            .populate('items.inventoryItem', 'name model');
        res.json(transfers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generate Transfer PDF by ID
app.get('/api/transfers/:id/pdf', async (req, res) => {
    try {
        const transfer = await Transfer.findById(req.params.id)
            .populate('sourceProject', 'eventName')
            .populate('destinationProject', 'eventName');

        if (!transfer) return res.status(404).json({ error: 'Transfer not found' });

        const data = {
            sourceProjectName: transfer.sourceProject?.eventName || 'Unknown Source',
            destProjectName: transfer.destinationProject?.eventName || 'Unknown Destination',
            driverName: transfer.driverName,
            vehiclePlate: transfer.vehiclePlate,
            items: transfer.items,
            date: transfer.createdAt
        };

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=transfer-${transfer._id}.pdf`);
        PdfService.generateInterSiteTransfer(data, res);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generate Transfer PDF (Inter-Site) from Form Data (On-the-fly)
app.post('/api/transfers/pdf', async (req, res) => {
    try {
        const data = req.body; // { sourceProjectName, destProjectName, driverName, vehiclePlate, items: [] }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=transfer-slip.pdf`);
        PdfService.generateInterSiteTransfer(data, res);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- HR & Loss Routes ---
const LossReport = require('./models/LossReport');

// Get All Loss Reports
app.get('/api/loss-reports', async (req, res) => {
    try {
        const reports = await LossReport.find().populate('inventoryItem').sort({ createdAt: -1 });
        res.json(reports);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Loss Report
app.post('/api/loss-reports', async (req, res) => {
    try {
        const report = new LossReport(req.body);
        await report.save();

        // Auto-update item state to 'Pièces manquantes' or similar if needed
        // For now, we assume it's just a financial record

        res.status(201).json(report);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// --- Messages Routes ---
app.get('/api/messages', async (req, res) => {
    try {
        // Fetch last 100 messages from 'general' room
        const messages = await Message.find({ room: 'general' })
            .sort({ createdAt: 1 })
            .limit(100);
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start Server (Socket.io + Express)
if (require.main === module) {
    const SERVER_PORT = process.env.PORT || 5000;
    server.listen(SERVER_PORT, () => {
        console.log(`Server & Socket.io running on port ${SERVER_PORT}`);
    });
}

// Export the Express app for Vercel
module.exports = app;
