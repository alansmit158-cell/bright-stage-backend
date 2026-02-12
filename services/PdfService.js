const PDFDocument = require('pdfkit');
const fs = require('fs');

class PdfService {
    constructor() {
        this.companies = {
            bright: {
                name: "Bright Stage",
                address: "Tunisia",
                phone: "+216 XX XXX XXX",
                email: "contact@brightstage.tn",
                website: "www.brightstage.tn",
                taxId: "XXXXX"
            },
            square: {
                name: "Square Event",
                address: "Rue UMA la Soukra, Ariana Tunis 2036",
                phone: "+216 51 367 000",
                email: "info@square-event.tn",
                website: "www.square-event.tn",
                taxId: "1572578/C/A/M/000"
            }
        };
    }

    generateQuote(project, stream, companyId = 'bright') {
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(stream);

        // Header
        this.generateHeader(doc, "DEVIS / QUOTE", companyId);

        // Client Info
        const clientName = project.client?.name || 'Client Inconnu';
        const clientAddr = project.client?.address || '';
        const clientContact = project.client?.contactPerson || '';

        doc.fontSize(10).text(`Client: ${clientName}`, 50, 130);
        doc.text(`Address: ${clientAddr}`);
        doc.text(`Contact: ${clientContact}`);
        doc.moveDown();

        // Table Header
        const tableTop = 200;
        doc.font("Helvetica-Bold");
        doc.text("Item", 50, tableTop);
        doc.text("Qty", 250, tableTop);
        doc.text("Days", 300, tableTop);
        doc.text("Price/Day", 350, tableTop);
        doc.text("Total", 450, tableTop);
        doc.font("Helvetica");

        // Items
        let y = tableTop + 25;
        let grandTotal = 0;

        project.items.forEach(item => {
            const duration = project.dates.totalDays || 1;
            const total = item.quantity * item.pricePerDay * duration;
            grandTotal += total;

            doc.text(item.name, 50, y);
            doc.text(item.quantity.toString(), 250, y);
            doc.text(duration.toString(), 300, y);
            doc.text(item.pricePerDay.toFixed(2), 350, y);
            doc.text(total.toFixed(2), 450, y);
            y += 20;
        });

        // Total
        doc.moveDown();
        doc.font("Helvetica-Bold").text(`Grand Total: ${grandTotal.toFixed(2)} TND`, 400, y + 20);

        doc.end();
    }

    generateInvoice(project, stream, companyId = 'bright') {
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(stream);

        this.generateHeader(doc, "FACTURE / INVOICE", companyId);

        // Invoice Number & Date
        doc.fontSize(10).text(`Invoice #: INV-${Date.now().toString().slice(-6)}`, 400, 100);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 400, 115);

        // Client Info
        doc.text(`Client: ${project.client.name}`, 50, 130);
        doc.text(`Address: ${project.client.address || ''}`);
        doc.text(`Contact: ${project.client.contactPerson || ''}`);
        doc.text(`Tax ID: ${project.client.taxId || ''}`); // Facture needs tax ID
        doc.moveDown();

        // Table Header
        const tableTop = 200;
        doc.font("Helvetica-Bold");
        doc.text("Item", 50, tableTop);
        doc.text("Qty", 250, tableTop);
        doc.text("Days", 300, tableTop);
        doc.text("Price/Day", 350, tableTop);
        doc.text("Total", 450, tableTop);
        doc.font("Helvetica");

        // Items
        let y = tableTop + 25;
        let grandTotal = 0;

        project.items.forEach(item => {
            const duration = project.dates.totalDays || 1;
            const total = item.quantity * item.pricePerDay * duration;
            grandTotal += total;

            doc.text(item.name, 50, y);
            doc.text(item.quantity.toString(), 250, y);
            doc.text(duration.toString(), 300, y);
            doc.text(item.pricePerDay.toFixed(2), 350, y);
            doc.text(total.toFixed(2), 450, y);
            y += 20;
        });

        // Totals
        y += 20;
        doc.font("Helvetica-Bold");
        doc.text(`Subtotal: ${grandTotal.toFixed(3)} DT`, 350, y);
        const tax = grandTotal * 0.19; // 19% VAT
        const stamp = 1.000; // 1 DT Timbre
        doc.text(`VAT (19%): ${tax.toFixed(3)} DT`, 350, y + 20);
        doc.text(`Timbre: ${stamp.toFixed(3)} DT`, 350, y + 40);
        doc.fontSize(12).text(`Total Due: ${(grandTotal + tax + stamp).toFixed(3)} DT`, 350, y + 60);

        doc.end();
    }

    generatePrepList(project, stream, companyId = 'bright') {
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(stream);

        this.generateHeader(doc, "LISTE DE PRÉPARATION", companyId);

        // Force move down to avoid header overlap
        doc.fontSize(12).text(`Project: ${project.eventName}`, 50, 180);
        doc.fontSize(10).text(`Date of Prep: ${new Date().toLocaleDateString()}`, 50, 200);

        // Checklist Table
        let y = 240;
        doc.font("Helvetica-Bold");
        doc.text("[ ]", 50, y);
        doc.text("Item", 80, y);
        doc.text("Category", 300, y);
        doc.text("Qty Needed", 450, y);
        doc.font("Helvetica");

        y += 25;

        project.items.forEach(item => {
            doc.rect(50, y, 15, 15).stroke(); // Checkbox
            doc.text(item.name, 80, y + 2);
            // doc.text(item.inventoryItem.category || '-', 300, y + 2); // Need population, assume manual loop for now or simple
            doc.text(item.quantity.toString(), 450, y + 2);
            y += 25;
        });

        doc.end();
    }

    generateManifest(project, stream, companyId = 'bright') {
        const doc = new PDFDocument({ margin: 50, layout: 'landscape' }); // Manifest often landscape for checkbox columns?
        doc.pipe(stream);

        this.generateHeader(doc, "EQUIPMENT MANIFEST", companyId);

        // Site & Team Info
        doc.fontSize(10).text(`Site: ${project.siteName}`, 50, 100);
        doc.text(`Team Leader: ${project.team?.siteLeader?.name || 'N/A'}`);

        // Table
        let y = 160;
        doc.font("Helvetica-Bold");
        doc.text("Item", 50, y);
        doc.text("Model", 200, y);
        doc.text("Qty", 300, y);
        doc.text("Storage", 350, y);
        doc.text("Check Out", 450, y); // Checkbox area
        doc.text("Check In", 500, y);  // Checkbox area

        doc.font("Helvetica");
        y += 20;

        project.items.forEach(item => {
            // Mock lookup if inventory item details aren't populated deeply enough, assuming name/model on item snapshot
            doc.text(item.name, 50, y);
            doc.text(item.model || '-', 200, y);
            doc.text(item.quantity.toString(), 300, y);
            // doc.text(item.inventoryItem.storageLocation...) // Needs deep population
            doc.rect(460, y, 10, 10).stroke(); // Checkbox
            doc.rect(510, y, 10, 10).stroke(); // Checkbox
            y += 20;
        });

        // Footer Signatures
        const bottom = 500;
        doc.text("Packer Signature", 50, bottom);
        doc.text("Driver Signature", 250, bottom);
        doc.text("Site Leader Signature", 450, bottom);

        doc.end();
    }

    generateTransportSlip(project, stream, companyId = 'bright') {
        const doc = new PDFDocument();
        doc.pipe(stream);

        const info = this.companies[companyId] || this.companies.bright;

        // Header specially formatted for official look
        doc.font("Helvetica-Bold").fontSize(16).text("AUTORISATION DE TRANSPORT", { align: 'center' });
        doc.moveDown();

        doc.fontSize(10);
        doc.font("Helvetica-Bold").text("Notre Entreprise:", 50, 100);
        doc.font("Helvetica");
        doc.text(info.name);
        doc.text(info.address);
        doc.text(`Tax ID: ${info.taxId || 'XXXXX'}`);

        doc.moveDown();
        doc.font("Helvetica-Bold").text("Chantier / Destination:");
        doc.font("Helvetica").text(project.siteName);
        doc.text(project.siteAddress);

        // Transport Details Table
        const startY = 250;
        doc.rect(50, startY, 500, 100).stroke();

        const row1 = startY + 15;
        const row2 = startY + 45;
        const row3 = startY + 75;

        doc.text("Date de Transport:", 60, row1);
        doc.font("Helvetica-Bold").text(project.transport?.transportDate ? new Date(project.transport.transportDate).toLocaleDateString('fr-FR') : '________________', 160, row1);
        doc.font("Helvetica");

        doc.text("Nom du Chauffeur:", 60, row2);
        doc.font("Helvetica-Bold").text(project.transport?.driverName || '________________', 160, row2);
        doc.font("Helvetica");

        doc.text("CIN:", 350, row2);
        doc.font("Helvetica-Bold").text(project.transport?.driverLicense || '_________', 380, row2);
        doc.font("Helvetica");

        doc.text("Véhicule:", 60, row3);
        doc.font("Helvetica-Bold").text(`${project.transport?.vehicleModel || ''} - ${project.transport?.vehiclePlate || ''}`, 160, row3);
        doc.font("Helvetica");

        // --- Equipment List ---
        doc.moveDown(4); // Move past the box
        const tableTop = 380;

        doc.font("Helvetica-Bold").fontSize(12).text("Liste du Matériel / Equipment List", 50, tableTop - 20);

        doc.fontSize(10);
        doc.text("Item", 50, tableTop);
        doc.text("Qty", 350, tableTop);
        doc.text("Notes", 420, tableTop);
        doc.font("Helvetica");

        let y = tableTop + 20;
        project.items.forEach(item => {
            if (y > 700) { // Simple pagination check
                doc.addPage();
                y = 50;
            }
            doc.text(item.name, 50, y);
            doc.text(item.quantity.toString(), 350, y);
            doc.lineJoin('round').rect(420, y, 100, 15).stroke(); // Notes box
            y += 20;
        });

        // Footer
        doc.moveDown(2);
        const footerY = y + 30; // Push footer below items
        doc.text("Signature et Cachet:", 50, footerY);

        doc.end();
    }

    generateTransferForm(project, stream, companyId = 'bright') {
        const doc = new PDFDocument();
        doc.pipe(stream);

        this.generateHeader(doc, "EQUIPMENT TRANSFER FORM", companyId);

        // Client & Site Info
        doc.fontSize(10).text(`Client: ${project.client.name}`, 50, 130);
        doc.text(`Site A (Transferor): ${project.siteName}`, 50, 150);
        // Ideally project would have explicit transfer info, but for now we map standard fields or placeholders
        doc.text(`Site B (Transferee): [Destination Site Details]`, 300, 150);

        // Managers
        doc.text(`Site A Manager: ${project.team.siteLeader?.name || ''}`, 50, 170);
        doc.text(`Site B Manager: [Name]`, 300, 170);

        // Table
        let y = 200;
        doc.font("Helvetica-Bold");
        doc.text("Item", 50, y);
        doc.text("Brand", 200, y);
        doc.text("Model", 300, y);
        doc.text("Qty", 450, y);
        doc.font("Helvetica");
        y += 20;

        project.items.forEach(item => {
            doc.text(item.name, 50, y);
            doc.text(item.brand || '-', 200, y);
            doc.text(item.model || '-', 300, y);
            doc.text(item.quantity.toString(), 450, y);
            y += 20;
        });

        // Signatures
        y = 450;
        doc.text("Transferor Signature (Release)", 50, y);
        doc.text("Transferee Signature (Receipt)", 300, y);
        doc.rect(50, y + 15, 200, 50).stroke();
        doc.rect(300, y + 15, 200, 50).stroke();

        doc.end();
    }

    generateHeader(doc, title, companyId = 'bright') {
        const info = this.companies[companyId] || this.companies.bright;
        try {
            if (fs.existsSync('assets/logo.png')) {
                // Future: add logic for square logo if available
                doc.image('assets/logo.png', 50, 45, { width: 50 });
            }
        } catch (e) {
            // Ignore missing logo
        }
        doc.fontSize(20).text(info.name, 110, 50);
        doc.fontSize(10).text(info.email, 200, 65, { align: 'right' });
        doc.moveDown();
        doc.fontSize(16).text(title, 50, 100);
    }

    generateInterSiteTransfer(data, stream) {
        const doc = new PDFDocument();
        doc.pipe(stream);

        // Header
        this.generateHeader(doc, "BON DE TRANSFERT INTER-CHANTIER");

        doc.fontSize(10);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 400, 100);

        doc.font("Helvetica-Bold").text("Source (Origin):", 50, 130);
        doc.font("Helvetica").text(data.sourceProjectName || 'Unknown', 150, 130);

        doc.font("Helvetica-Bold").text("Destination (Target):", 50, 150);
        doc.font("Helvetica").text(data.destProjectName || 'Unknown', 150, 150);

        doc.font("Helvetica-Bold").text("Chauffeur / Driver:", 50, 180);
        doc.font("Helvetica").text(data.driverName || '____________________', 150, 180);

        doc.font("Helvetica-Bold").text("Véhicule / Vehicle:", 50, 200);
        doc.font("Helvetica").text(data.vehiclePlate || '____________________', 150, 200);

        // Table
        const tableTop = 240;
        doc.font("Helvetica-Bold");
        doc.text("Item", 50, tableTop);
        doc.text("Qté/Qty", 400, tableTop);
        doc.font("Helvetica");

        let y = tableTop + 25;
        (data.items || []).forEach(item => {
            if (y > 700) { doc.addPage(); y = 50; }
            doc.text(item.name, 50, y);
            doc.text(item.quantity.toString(), 400, y);
            y += 20;
        });

        // Signatures
        y = Math.max(y + 40, 500);
        doc.font("Helvetica-Bold");
        doc.text("Visa Dépar (Source)", 50, y);
        doc.text("Visa Réception (Dest)", 350, y);

        doc.rect(50, y + 15, 200, 60).stroke();
        doc.rect(350, y + 15, 200, 60).stroke();

        doc.end();
    }
}

module.exports = new PdfService();
