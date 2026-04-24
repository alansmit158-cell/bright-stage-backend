const Project = require('../models/Project');
const Invoice = require('../models/Invoice');
const Reservation = require('../models/Reservation');
const InventoryItem = require('../models/InventoryItem');

// Get Quote Details (Public)
exports.getPublicQuote = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await Project.findById(id).populate('client');

        if (!project) {
            return res.status(404).json({ message: 'Quote not found' });
        }

        // Security: Only allow if status is Quote
        if (project.status !== 'Quote') {
            // If it's already confirmed, we might want to show a "Already Accepted" screen, but for now just show it.
            // But we definitely shouldn't show Drafts.
            if (project.status === 'Draft') {
                return res.status(403).json({ message: 'This quote is still a draft.' });
            }
        }

        // Return sanitized data
        const publicData = {
            id: project._id,
            eventName: project.eventName,
            clientName: project.client.name,
            dates: project.dates,
            items: project.items,
            financials: project.financials,
            status: project.status,
            createdAt: project.createdAt
        };

        res.json(publicData);
    } catch (error) {
        console.error('Error fetching public quote:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Accept Quote
exports.acceptQuote = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await Project.findById(id).populate('client');

        if (!project) {
            return res.status(404).json({ message: 'Quote not found' });
        }

        if (project.status !== 'Quote') {
            return res.status(400).json({ message: 'Quote is not in a valid state to be accepted (must be Quote status).' });
        }

        // 1. Update Status to Confirmed
        project.status = 'Confirmed';
        project.paymentStatus = 'Unpaid'; // Explicitly set to Unpaid until deposit is handled
        await project.save();

        // 2. Generate Deposit Invoice (30%)
        console.log("DEBUG: Generating Deposit Invoice for Project:", project._id);
        console.log("DEBUG: Financials:", project.financials);

        const totalIncl = project.financials.totalInclTax || 0;
        const totalExcl = project.financials.totalExclTax || 0;
        const totalTax = project.financials.totalTax || 0;

        const depositAmount = totalIncl * 0.30;

        // Generate a simple Invoice Number
        const count = await Invoice.countDocuments();
        const year = new Date().getFullYear();
        const invoiceNumber = `INV-${year}-DEP-${String(count + 1).padStart(3, '0')}`;

        const depositInvoice = new Invoice({
            number: invoiceNumber,
            client: {
                id: project.clientId || null,
                name: project.client ? project.client.name : "Unknown",
                address: project.client ? project.client.address : "",
                taxId: project.client ? project.client.taxId : "",
                contactPerson: project.client ? project.client.contactPerson : ""
            },
            date: new Date(),
            dueDate: new Date(new Date().setDate(new Date().getDate() + 7)), // Due in 7 days
            items: [{
                name: `Deposit for ${project.eventName}`,
                description: '30% Advance Payment',
                quantity: 1,
                unitPrice: (totalExcl * 0.30), // HT
                total: (totalExcl * 0.30) // HT
            }],
            financials: {
                totalExclTax: (totalExcl * 0.30),
                totalTax: (totalTax * 0.30),
                stampDuty: 0,
                totalInclTax: depositAmount
            },
            status: 'Sent',
            relatedProject: project._id,
            notes: 'Generated automatically upon quote acceptance.'
        });

        console.log("DEBUG: Saving Invoice:", depositInvoice);
        await depositInvoice.save();
        console.log("DEBUG: Invoice Saved.");

        // 3. Create Reservations
        const reservations = project.items.map(item => ({
            project: project._id,
            item: item.inventoryItem,
            itemName: item.name,
            quantity: item.quantity,
            dates: project.dates,
            status: 'Active'
        }));

        if (reservations.length > 0) {
            await Reservation.insertMany(reservations);
        }

        res.json({
            message: 'Quote accepted successfully',
            projectId: project._id,
            invoiceId: depositInvoice._id
        });

    } catch (error) {
        console.error('Error accepting quote:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
