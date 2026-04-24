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
                address: "Rue UMA la Soukra, Ariana Tunis 2036, Tunisie",
                phone: "+216 51 367 000",
                email: "squareeventstunisia@gmail.com",
                website: "www.square-event.tn",
                taxId: "M.F: 1572578/C"
            }
        };
    }

    generateQuote(project, stream, companyId = 'bright', customSettings = null) {
        return this.generateQuoteModern(project, stream, companyId, customSettings);
    }

    generateQuoteModern(project, stream, companyId = 'bright', customSettings = null) {
        const doc = new PDFDocument({ margin: 40 });
        doc.pipe(stream);

        let info = this.companies[companyId] || this.companies.bright;
        if (customSettings) {
            info = {
                name: customSettings.companyName || info.name,
                address: customSettings.address?.street || info.address,
                phone: customSettings.phone || info.phone,
                email: customSettings.email || info.email,
                website: customSettings.website || info.website,
                taxId: customSettings.taxId || info.taxId
            };
        }

        // --- 1. HEADER (Logo Left, Info Right) ---
        try {
            let logoPath = 'assets/logo.png';
            if (companyId === 'square') {
                const squareLogo = 'assets/cropped-square-event-logo-02-1-e1704932051635.png';
                logoPath = fs.existsSync(squareLogo) ? squareLogo : 'assets/square_logo.png';
            }
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 40, 30, { width: 120 });
            }
        } catch (e) {}

        doc.fontSize(9).font("Helvetica-Bold");
        const headerX = 350;
        doc.text(info.name.toUpperCase(), headerX, 40, { width: 200, align: 'right' });
        doc.font("Helvetica").fontSize(8);
        doc.text(info.address, headerX, 55, { width: 200, align: 'right' });
        doc.text(`Contact: ${info.phone}`, headerX, 75, { width: 200, align: 'right' });
        doc.text(`Email: ${info.email}`, headerX, 85, { width: 200, align: 'right' });
        doc.text(`Web: ${info.website}`, headerX, 95, { width: 200, align: 'right' });

        // --- 2. TITLE SECTION (Line | CENTERED TITLE | Line) ---
        doc.moveDown(4);
        const titleY = 120;
        doc.moveTo(40, titleY + 10).lineTo(230, titleY + 10).strokeColor("#e2e8f0").stroke();
        doc.moveTo(370, titleY + 10).lineTo(555, titleY + 10).stroke();
        
        doc.font("Helvetica-Bold").fontSize(16).fillColor("#1e293b").text("DEVIS / QUOTE", 0, titleY, { align: 'center' });
        doc.fillColor("black");

        // --- 3. INFO BOXES (Facturer à vs Details) ---
        const leftCol = 40;
        const rightCol = 320;
        let infoY = 160;

        // Left: Billing Info
        doc.fontSize(10).font("Helvetica-Bold").text("Facturer à", leftCol, infoY);
        doc.fontSize(11).text(project.clientId?.name || project.client?.name || 'Client Inconnu', leftCol, infoY + 15);
        doc.font("Helvetica").fontSize(9);
        doc.text(`MF: ${project.clientId?.taxId || project.client?.taxId || '________________'}`, leftCol, infoY + 32);
        doc.text(`${project.clientId?.address || project.client?.address || 'Tunisia'}`, leftCol, infoY + 45, { width: 230 });

        // Right: Project / Quote Details Table
        const boxHeight = 70;
        doc.rect(rightCol, infoY, 235, boxHeight).strokeColor("#e2e8f0").stroke();
        
        // Row 1
        doc.font("Helvetica-Bold").fontSize(9).text("N° de Devis", rightCol + 5, infoY + 8);
        doc.font("Helvetica").text(project._id.toString().slice(-6).toUpperCase(), rightCol + 100, infoY + 8);
        doc.moveTo(rightCol, infoY + 23).lineTo(rightCol + 235, infoY + 23).stroke();

        // Row 2
        doc.font("Helvetica-Bold").text("Date d'émission", rightCol + 5, infoY + 31);
        doc.font("Helvetica").text(new Date().toLocaleDateString('fr-FR'), rightCol + 100, infoY + 31);
        doc.moveTo(rightCol, infoY + 46).lineTo(rightCol + 235, infoY + 46).stroke();

        // Row 3
        doc.font("Helvetica-Bold").text("Jours de Travail", rightCol + 5, infoY + 54);
        doc.font("Helvetica").text(String(project.dates?.totalDays || 1), rightCol + 100, infoY + 54);

        // Site Info Line
        infoY += 85;
        doc.font("Helvetica-Bold").fontSize(10).text("Adresse du projet:", leftCol, infoY);
        doc.font("Helvetica").text(project.siteName || project.siteAddress || '-', leftCol + 100, infoY);

        // --- 4. ITEMS TABLE ---
        const tableTop = infoY + 30;
        const col1 = leftCol;      // #
        const col2 = leftCol + 30; // Description
        const col3 = 330;          // Qty
        const col4 = 380;          // Days
        const col5 = 440;          // PU HT
        const col6 = 500;          // Total HT

        // Header
        doc.rect(leftCol, tableTop, 515, 25).fill("#f1f5f9").strokeColor("#e2e8f0").stroke();
        doc.fill("#334155").font("Helvetica-Bold").fontSize(9);
        doc.text("#", col1 + 5, tableTop + 8);
        doc.text("Article & Description", col2 + 5, tableTop + 8);
        doc.text("Qté", col3, tableTop + 8);
        doc.text("Jours", col4, tableTop + 8);
        doc.text("P.U HT", col5, tableTop + 8);
        doc.text("Montant HT", col6, tableTop + 8);

        let itemY = tableTop + 25;
        let subtotalHT = 0;
        doc.font("Helvetica").fillColor("black");

        (project.items || []).forEach((item, index) => {
            if (itemY > 700) {
                doc.addPage();
                itemY = 50;
                // Re-draw header if needed
            }
            
            const duration = item.type === 'Rent' ? (item.days || project.dates?.totalDays || 1) : 1;
            const quantity = item.quantity || 0;
            const unitPrice = item.price || 0;
            const discount = item.discount || 0;
            
            const lineTotal = (quantity * unitPrice * duration) * (1 - (discount / 100));
            subtotalHT += lineTotal;

            doc.rect(leftCol, itemY, 515, 30).stroke();
            doc.text(String(index + 1), col1 + 5, itemY + 10);
            doc.font("Helvetica-Bold").text(item.name || '-', col2 + 5, itemY + 10, { width: 230 });
            doc.font("Helvetica").text(String(quantity), col3, itemY + 10);
            doc.text(String(duration), col4, itemY + 10);
            doc.text(unitPrice.toFixed(3), col5, itemY + 10);
            doc.text(lineTotal.toFixed(3), col6, itemY + 10);
            
            itemY += 30;
        });

        // --- 5. TOTALS SECTION ---
        itemY += 20;
        if (itemY > 750) { doc.addPage(); itemY = 50; }

        const totalsX = 350;
        const valX = 500;

        doc.font("Helvetica-Bold");
        doc.text("Total HT:", totalsX, itemY);
        doc.text(`${subtotalHT.toFixed(3)} DT`, valX, itemY);

        itemY += 15;
        const tax = subtotalHT * 0.19;
        doc.text("TVA (19%):", totalsX, itemY);
        doc.text(`${tax.toFixed(3)} DT`, valX, itemY);

        itemY += 15;
        const stamp = 1.000;
        doc.text("Timbre Fiscal:", totalsX, itemY);
        doc.text(`${stamp.toFixed(3)} DT`, valX, itemY);

        itemY += 20;
        doc.fontSize(12).fillColor("#0f172a");
        doc.text("TOTAL TTC:", totalsX, itemY);
        doc.text(`${(subtotalHT + tax + stamp).toFixed(3)} DT`, valX, itemY);

        // --- 6. FOOTER ---
        const footerY = 740;
        doc.moveTo(40, footerY - 10).lineTo(555, footerY - 10).strokeColor("#e2e8f0").stroke();
        
        // Centered Footer Logo
        try {
            let logoPath = 'assets/logo.png';
            if (companyId === 'square') { logoPath = 'assets/cropped-square-event-logo-02-1-e1704932051635.png'; }
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 275, footerY, { width: 50 });
            }
        } catch(e) {}

        doc.fontSize(8).fillColor("#64748b").font("Helvetica");
        doc.text(info.address, 0, footerY + 55, { align: 'center' });
        doc.text(`Tél: ${info.phone} - Email: ${info.email} - MF: ${info.taxId}`, 0, footerY + 65, { align: 'center' });
        
        doc.font("Helvetica-Bold").fillColor("#0f172a").text("Signature autorisée", 40, footerY + 80);

        doc.end();
    }

    generateInvoice(project, stream, companyId = 'bright', customSettings = null) {
        return this.generateQuoteModern(project, stream, companyId, customSettings);
    }

    generateInvoiceFromModel(invoice, stream, companyId = 'bright', customSettings = null) {
        const doc = new PDFDocument({ margin: 40 });
        doc.pipe(stream);

        let info = this.companies[companyId] || this.companies.bright;
        if (customSettings) {
            info = {
                name: customSettings.companyName || info.name,
                address: customSettings.address?.street || info.address,
                phone: customSettings.phone || info.phone,
                email: customSettings.email || info.email,
                website: customSettings.website || info.website,
                taxId: customSettings.taxId || info.taxId
            };
        }

        // --- 1. HEADER ---
        try {
            let logoPath = 'assets/logo.png';
            if (companyId === 'square') {
                const squareLogo = 'assets/cropped-square-event-logo-02-1-e1704932051635.png';
                logoPath = fs.existsSync(squareLogo) ? squareLogo : 'assets/square_logo.png';
            }
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 40, 30, { width: 120 });
            }
        } catch (e) {}

        doc.fontSize(9).font("Helvetica-Bold");
        const headerX = 350;
        doc.text(info.name.toUpperCase(), headerX, 40, { width: 200, align: 'right' });
        doc.font("Helvetica").fontSize(8);
        doc.text(info.address, headerX, 55, { width: 200, align: 'right' });
        doc.text(`Contact: ${info.phone}`, headerX, 75, { width: 200, align: 'right' });
        doc.text(`Email: ${info.email}`, headerX, 85, { width: 200, align: 'right' });

        // --- 2. TITLE SECTION ---
        doc.moveDown(4);
        const titleY = 120;
        doc.moveTo(40, titleY + 10).lineTo(200, titleY + 10).strokeColor("#e2e8f0").stroke();
        doc.moveTo(400, titleY + 10).lineTo(555, titleY + 10).stroke();
        
        doc.font("Helvetica-Bold").fontSize(16).fillColor("#1e293b").text("FACTURE / INVOICE", 0, titleY, { align: 'center' });
        doc.fillColor("black");

        // --- 3. INFO BOXES ---
        const leftCol = 40;
        const rightCol = 320;
        let infoY = 160;

        // Left: Billing Info
        doc.fontSize(10).font("Helvetica-Bold").text("Facturer à", leftCol, infoY);
        doc.fontSize(11).text(invoice.client?.name || 'Client Inconnu', leftCol, infoY + 15);
        doc.font("Helvetica").fontSize(9);
        doc.text(`MF: ${invoice.client?.taxId || '________________'}`, leftCol, infoY + 32);
        doc.text(`${invoice.client?.address || 'Tunisia'}`, leftCol, infoY + 45, { width: 230 });

        // Right: Invoice Details Box
        const boxHeight = 70;
        doc.rect(rightCol, infoY, 235, boxHeight).strokeColor("#e2e8f0").stroke();
        
        doc.font("Helvetica-Bold").fontSize(9).text("N° de Facture", rightCol + 5, infoY + 8);
        doc.font("Helvetica").text(invoice.number, rightCol + 100, infoY + 8);
        doc.moveTo(rightCol, infoY + 23).lineTo(rightCol + 235, infoY + 23).stroke();

        doc.font("Helvetica-Bold").text("Date d'émission", rightCol + 5, infoY + 31);
        doc.font("Helvetica").text(new Date(invoice.date).toLocaleDateString('fr-FR'), rightCol + 100, infoY + 31);
        doc.moveTo(rightCol, infoY + 46).lineTo(rightCol + 235, infoY + 46).stroke();

        doc.font("Helvetica-Bold").text("Date d'échéance", rightCol + 5, infoY + 54);
        doc.font("Helvetica").text(invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-FR') : '-', rightCol + 100, infoY + 54);

        // --- 4. ITEMS TABLE ---
        const tableTop = infoY + 90;
        const col1 = leftCol;      // #
        const col2 = leftCol + 30; // Description
        const col3 = 330;          // Qty
        const col4 = 380;          // PU HT
        const col5 = 450;          // TVA
        const col6 = 500;          // Total HT

        doc.rect(leftCol, tableTop, 515, 25).fill("#f1f5f9").strokeColor("#e2e8f0").stroke();
        doc.fill("#334155").font("Helvetica-Bold").fontSize(8);
        doc.text("#", col1 + 5, tableTop + 8);
        doc.text("Désignation / Article", col2 + 5, tableTop + 8);
        doc.text("Qté", col3, tableTop + 8);
        doc.text("P.U HT", col4, tableTop + 8);
        doc.text("TVA", col5, tableTop + 8);
        doc.text("Total HT", col6, tableTop + 8);

        let itemY = tableTop + 25;
        doc.font("Helvetica").fillColor("black");

        (invoice.items || []).forEach((item, index) => {
            if (itemY > 700) { doc.addPage(); itemY = 50; }
            
            doc.rect(leftCol, itemY, 515, 30).stroke();
            doc.text(String(index + 1), col1 + 5, itemY + 10);
            doc.font("Helvetica-Bold").text(item.name || '-', col2 + 5, itemY + 10, { width: 230 });
            doc.font("Helvetica").text(String(item.quantity || 0), col3, itemY + 10);
            doc.text((item.unitPrice || 0).toFixed(3), col4, itemY + 10);
            doc.text(`${(item.taxRate * 100) || 19}%`, col5, itemY + 10);
            doc.text((item.total || 0).toFixed(3), col6, itemY + 10);
            
            itemY += 30;
        });

        // --- 5. TOTALS ---
        itemY += 20;
        if (itemY > 750) { doc.addPage(); itemY = 50; }

        const totalsX = 350;
        const valX = 500;

        doc.font("Helvetica-Bold");
        doc.text("Total HT:", totalsX, itemY);
        doc.text(`${invoice.financials.totalExclTax.toFixed(3)} DT`, valX, itemY);

        itemY += 15;
        doc.text(`TVA (19%):`, totalsX, itemY);
        doc.text(`${invoice.financials.totalTax.toFixed(3)} DT`, valX, itemY);

        itemY += 15;
        doc.text("Timbre Fiscal:", totalsX, itemY);
        doc.text(`${invoice.financials.stampDuty.toFixed(3)} DT`, valX, itemY);

        itemY += 20;
        doc.fontSize(12).fillColor("#0f172a");
        doc.text("TOTAL TTC:", totalsX, itemY);
        doc.text(`${invoice.financials.totalInclTax.toFixed(3)} DT`, valX, itemY);

        // --- 6. FOOTER ---
        const footerY = 740;
        doc.moveTo(40, footerY - 10).lineTo(555, footerY - 10).strokeColor("#e2e8f0").stroke();
        
        try {
            let logoPath = 'assets/logo.png';
            if (companyId === 'square') { logoPath = 'assets/cropped-square-event-logo-02-1-e1704932051635.png'; }
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 275, footerY, { width: 50 });
            }
        } catch(e) {}

        doc.fontSize(8).fillColor("#64748b").font("Helvetica");
        doc.text(info.address, 0, footerY + 55, { align: 'center' });
        doc.text(`Tél: ${info.phone} - Email: ${info.email} - MF: ${info.taxId}`, 0, footerY + 65, { align: 'center' });
        
        doc.font("Helvetica-Bold").fillColor("#0f172a").text("Signature autorisée", 40, footerY + 80);

        doc.end();
    }

    // New: Specific for Invoice model which has different field mapping
    generatePrepList(project, stream, companyId = 'bright', customSettings = null) {
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(stream);

        this.generateHeader(doc, "LISTE DE PRÉPARATION", companyId, customSettings);

        // Force move down to avoid header overlap
        doc.fontSize(12).text(`Project: ${project.eventName || 'N/A'}`, 50, 180);
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

        (project.items || []).forEach(item => {
            doc.rect(50, y, 15, 15).stroke(); // Checkbox
            doc.text(item.name || '-', 80, y + 2);
            // doc.text(item.inventoryItem?.category || '-', 300, y + 2);
            doc.text(String(item.quantity || 0), 450, y + 2);
            y += 25;
        });

        doc.end();
    }

    generateManifest(project, stream, companyId = 'bright', customSettings = null) {
        const doc = new PDFDocument({ margin: 50, layout: 'landscape' }); // Manifest often landscape for checkbox columns?
        doc.pipe(stream);

        this.generateHeader(doc, "EQUIPMENT MANIFEST", companyId, customSettings);

        // Site & Team Info
        doc.fontSize(10).text(`Site: ${project.siteName || 'N/A'}`, 50, 100);
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

        (project.items || []).forEach(item => {
            // Mock lookup if inventory item details aren't populated deeply enough, assuming name/model on item snapshot
            doc.text(item.name || '-', 50, y);
            doc.text(item.model || '-', 200, y);
            doc.text(String(item.quantity || 0), 300, y);
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

    generateTransportSlip(project, stream, companyId = 'bright', customSettings = null) {
        const doc = new PDFDocument();
        doc.pipe(stream);

        let info = this.companies[companyId] || this.companies.bright;
        if (customSettings) {
            info = {
                name: customSettings.companyName || info.name,
                address: customSettings.address?.street || info.address,
                phone: customSettings.phone || info.phone,
                email: customSettings.email || info.email,
                website: customSettings.website || info.website,
                taxId: customSettings.taxId || info.taxId
            };
        }

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
        (project.items || []).forEach(item => {
            if (y > 700) { // Simple pagination check
                doc.addPage();
                y = 50;
            }
            doc.text(item.name || '-', 50, y);
            doc.text(String(item.quantity || 0), 350, y);
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
        doc.fontSize(10).text(`Client: ${project.client?.name || 'Unknown'}`, 50, 130);
        doc.text(`Site A (Transferor): ${project.siteName || 'N/A'}`, 50, 150);
        // Ideally project would have explicit transfer info, but for now we map standard fields or placeholders
        doc.text(`Site B (Transferee): [Destination Site Details]`, 300, 150);

        // Managers
        doc.text(`Site A Manager: ${project.team?.siteLeader?.name || ''}`, 50, 170);
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

        (project.items || []).forEach(item => {
            doc.text(item.name || '-', 50, y);
            doc.text(item.brand || '-', 200, y);
            doc.text(item.model || '-', 300, y);
            doc.text(String(item.quantity || 0), 450, y);
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

    generateHeader(doc, title, companyId = 'bright', customSettings = null) {
        let info = this.companies[companyId] || this.companies.bright;
        if (customSettings) {
            info = {
                name: customSettings.companyName || info.name,
                email: customSettings.email || info.email,
                address: customSettings.address?.street || info.address,
                phone: customSettings.phone || info.phone,
                website: customSettings.website || info.website,
                taxId: customSettings.taxId || info.taxId
            };
        }

        try {
            let logoPath = 'assets/logo.png';
            if (companyId === 'square') {
                const squareLogo = 'assets/cropped-square-event-logo-02-1-e1704932051635.png';
                logoPath = fs.existsSync(squareLogo) ? squareLogo : 'assets/square_logo.png';
            }

            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 50, 45, { width: 50 });
            } else if (companyId === 'square' && fs.existsSync('assets/logo.png')) {
                // Fallback to default logo if square logo doesn't exist
                doc.image('assets/logo.png', 50, 45, { width: 50 });
            }
        } catch (e) {
            // Ignore missing logo
        }
        doc.fontSize(20).text(info.name, 110, 50);
        doc.fontSize(10).text(info.email, 200, 65, { align: 'right' });
        doc.moveDown();
        doc.fontSize(16).text(String(title), 50, 100);
    }

    generateDeliveryNote(note, stream, companyId = 'bright', customSettings = null) {
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(stream);

        this.generateHeader(doc, "BON DE LIVRAISON", companyId, customSettings);

        // BL Number & Date
        doc.fontSize(10).font("Helvetica-Bold").text(`Nº: ${note.number}`, 400, 100);
        doc.font("Helvetica").text(`Date: ${new Date(note.date).toLocaleDateString('fr-FR')}`, 400, 115);

        // Project / Client Info
        doc.fontSize(10).font("Helvetica-Bold").text("Projet / Chantier:", 50, 130);
        doc.font("Helvetica").text(note.project?.eventName || 'N/A');
        doc.text(note.project?.siteName || '');
        doc.text(note.project?.siteAddress || '');
        doc.moveDown();

        // Transport & Carrier Info
        const boxY = 190;
        doc.rect(50, boxY, 500, 80).stroke();
        doc.font("Helvetica-Bold").text("Informations Transporteur / Chauffeur", 60, boxY + 10);
        doc.font("Helvetica");
        doc.text(`Nom: ${note.driverName || '-'}`, 60, boxY + 30);
        doc.text(`Tél: ${note.driverPhone || '-'}`, 60, boxY + 45);
        doc.text(`CIN: ${note.driverCin || '-'}`, 60, boxY + 60);

        doc.text(`Véhicule: ${note.vehicleModel || '-'}`, 300, boxY + 30);
        doc.text(`Matricule: ${note.vehiclePlate || '-'}`, 300, boxY + 45);

        // Items Table
        const tableTop = 290;
        doc.font("Helvetica-Bold");
        doc.text("Désignation / Item", 50, tableTop);
        doc.text("Quantité / Qty", 450, tableTop);
        doc.font("Helvetica");

        let y = tableTop + 20;
        doc.moveTo(50, y - 5).lineTo(550, y - 5).stroke();

        (note.items || []).forEach(item => {
            if (y > 700) {
                doc.addPage();
                y = 50;
                doc.font("Helvetica-Bold");
                doc.text("Désignation / Item", 50, y);
                doc.text("Quantité / Qty", 450, y);
                doc.font("Helvetica");
                y += 20;
            }
            doc.text(item.name || '-', 50, y);
            doc.text(String(item.quantity || 0), 450, y);
            y += 20;
        });

        // Signatures
        const footerY = Math.max(y + 40, 650);
        doc.font("Helvetica-Bold");
        doc.text("Cachet et Signature Magasin", 50, footerY);
        doc.text("Signature Chauffeur / Client", 350, footerY);

        doc.rect(50, footerY + 15, 200, 60).stroke();
        doc.rect(350, footerY + 15, 200, 60).stroke();

        if (note.notes) {
            doc.fontSize(10).font("Helvetica-Oblique").text(`Notes: ${note.notes}`, 50, footerY - 30);
        }

        doc.end();
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
            doc.text(item.name || '-', 50, y);
            doc.text(String(item.quantity || 0), 400, y);
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
    async generateGlobalQrPdf(items, flycases, stream) {
        const QRCode = require('qrcode');
        const doc = new PDFDocument({ margin: 20, autoFirstPage: false });
        doc.pipe(stream);

        // Helper to draw a single QR cell
        const drawCell = async (x, y, width, height, data, label, subLabel) => {
            doc.rect(x, y, width, height).stroke();

            // QR Code
            try {
                const qrDataUrl = await QRCode.toDataURL(data);
                doc.image(qrDataUrl, x + 10, y + 10, { width: width - 20, height: width - 20 });
            } catch (e) {
                console.error("QR Gen Error", e);
            }

            // Labels
            doc.fontSize(10).text(label, x + 5, y + height - 35, { width: width - 10, align: 'center' });
            doc.fontSize(8).fillColor('grey').text(subLabel, x + 5, y + height - 20, { width: width - 10, align: 'center' }).fillColor('black');
        };

        // --- SECTION 1: ITEMS (9 per page, 3x3) ---
        // Layout: A4 is ~595 x 842 pts. Margin 20.
        // Grid: 3 cols, 3 rows.
        // Width available: 555. Cell width: ~185.
        // Height available: 800. Cell height: ~260.

        const itemPageConfig = { cols: 3, rows: 3, cellWidth: 185, cellHeight: 250, startX: 20, startY: 20 };

        let col = 0;
        let row = 0;
        let pageAdded = false;

        // Flatten items based on quantity
        const virtualItems = [];
        items.forEach(item => {
            const qty = item.quantity || 1;
            for (let i = 0; i < qty; i++) {
                virtualItems.push({
                    name: item.name,
                    // Unique-ish Data: ItemID + Index (or just ItemID if user wants duplicates)
                    // User said: "beam 300 en a qte 12 ... 12 qrcode"
                    // Usually this implies tracking. Let's encode: ID::Index 
                    // OR just the barcode if they are identical. 
                    // Let's use the Barcode. If they scan it, it finds the Item.
                    data: item.barcode || item._id.toString(),
                    sub: `${item.model || ''} (${i + 1}/${qty})`
                });
            }
        });

        if (virtualItems.length > 0) {
            doc.addPage();
            pageAdded = true;
            doc.fontSize(16).text("INVENTORY ITEMS", 20, 20);
            doc.moveDown();
        }

        // We need to manage cursor manually since we are drawing grids
        // Reset for grid
        if (virtualItems.length > 0) {
            // Actually, let's start fresh page for first grid
            // doc.addPage() was called.
            // Overwrite startY to skip title? Or just use full pages.
            // Let's use full pages for stickers.

            // If we want title page, do it separate.
            // Let's assume these are for sticker paper, so NO title, just maximizing space.
            // So start fresh page immediately for grid.
        }

        let i = 0;
        while (i < virtualItems.length) {
            if (col === 0 && row === 0) doc.addPage();

            const item = virtualItems[i];
            const x = itemPageConfig.startX + (col * itemPageConfig.cellWidth);
            const y = itemPageConfig.startY + (row * itemPageConfig.cellHeight);

            await drawCell(x, y, itemPageConfig.cellWidth, itemPageConfig.cellHeight, item.data, item.name, item.sub);

            col++;
            if (col >= itemPageConfig.cols) {
                col = 0;
                row++;
                if (row >= itemPageConfig.rows) {
                    row = 0;
                }
            }
            i++;
        }

        // --- SECTION 2: FLYCASES (4 per page, 2x2) ---
        // User requested 4 per page. A4 height ~842. minus margin 40. Available ~800. Cell ~400.

        const flyConfig = { cols: 2, rows: 2, cellWidth: 270, cellHeight: 380, startX: 20, startY: 20 };

        // Reset for Flycases
        col = 0; row = 0;
        // Flatten Flycases? Flycases are usually unique entries in DB?
        // Model says: qrCodeID (unique). So iterate flycases directly.
        // If Model has capacity but is unique document, just use it.
        // Wait, Flycase model has NO quantity field usually (it's 1 physical case).
        // Checking Flycase.js... it has `equipment`, `capacity`, `qrCodeID`. No `quantity` field.
        // So assuming `flycases` passed in are individual documents.

        // But user said "6 flycaise alor 6 qrcode".

        let j = 0;
        while (j < flycases.length) {
            if (col === 0 && row === 0) doc.addPage();

            const fly = flycases[j];
            const x = flyConfig.startX + (col * flyConfig.cellWidth);
            const y = flyConfig.startY + (row * flyConfig.cellHeight);

            // Fetch Equipment Name if populated
            const eqName = fly.equipment?.name || 'Unknown Equipment';

            await drawCell(x, y, flyConfig.cellWidth, flyConfig.cellHeight, fly.qrCodeID, `FLYCASE: ${fly.qrCodeID}`, eqName);

            col++;
            if (col >= flyConfig.cols) {
                col = 0;
                row++;
                if (row >= flyConfig.rows) {
                    row = 0;
                }
            }
            j++;
        }

        doc.end();
    }
    generateLedConfigPdf(stats, config, stream, companyId = 'bright', customSettings = null) {
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(stream);

        this.generateHeader(doc, "LED CONFIGURATION REPORT", companyId, customSettings);

        doc.fontSize(10);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 400, 100);

        // Project Info
        doc.font("Helvetica-Bold").text("Equipment Specs:", 50, 140);
        doc.font("Helvetica").text(`Cabinet: ${stats.spec?.name || 'Unknown'}`, 60, 160);
        doc.text(`Dimensions: ${stats.spec?.width || 0} x ${stats.spec?.height || 0} mm`, 60, 175);
        doc.text(`Pixel Pitch: ${stats.spec?.pixelPitch || 0} mm`, 60, 190);
        doc.text(`Weight: ${stats.spec?.weight || 0} kg`, 60, 205);

        doc.font("Helvetica-Bold").text("Configuration Input:", 300, 140);
        doc.font("Helvetica").text(`Type: ${config.configType || 'Flat'}`, 310, 160);
        doc.text(`Face A: ${config.faceA?.cols || 0} x ${config.faceA?.rows || 0}`, 310, 175);
        if (config.configType === 'L-Shape' || config.configType === 'U-Shape') {
            doc.text(`Face B: ${config.faceB?.cols || 0} x ${config.faceB?.rows || 0}`, 310, 190);
        }

        doc.moveDown(3);

        // Stats Overview
        doc.font("Helvetica-Bold").fontSize(14).text("STATISTICS & REQUIREMENTS", 50, 250);

        doc.rect(50, 270, 500, 120).stroke();

        doc.fontSize(10).font("Helvetica-Bold").text("Total Panels:", 60, 280);
        doc.font("Helvetica").text(`${stats.hardware?.totalTiles || 0} pcs`, 180, 280);

        doc.font("Helvetica-Bold").text("Total Resolution:", 60, 305);
        doc.font("Helvetica").text(`${stats.resolution?.totalW || 0} x ${stats.resolution?.totalH || 0} px`, 180, 305);

        doc.font("Helvetica-Bold").text("Physical Dimensions:", 60, 330);
        doc.font("Helvetica").text(`${((stats.dimensions?.totalWidth_mm || 0) / 1000).toFixed(2)}m (W) x ${((stats.dimensions?.faceA_mm?.h || 0) / 1000).toFixed(2)}m (H)`, 180, 330);

        doc.font("Helvetica-Bold").text("Total Weight:", 300, 280);
        doc.font("Helvetica").text(`${stats.hardware?.totalWeightKg || 0} kg`, 400, 280);

        doc.font("Helvetica-Bold").text("Max Power:", 300, 305);
        doc.font("Helvetica").text(`${stats.hardware?.totalPowerW || 0} W`, 400, 305);

        doc.font("Helvetica-Bold").text("Est. Current (230V):", 300, 330);
        doc.font("Helvetica").text(`${stats.hardware?.ampsAssuming240V || 0} A`, 400, 330);

        doc.moveDown(4);

        doc.end();
    }

    generateStructureCalcPdf(stats, config, stream, companyId = 'bright', customSettings = null) {
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(stream);

        this.generateHeader(doc, "STRUCTURE CALCULATION REPORT", companyId, customSettings);

        doc.fontSize(10);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 400, 100);

        // Inputs
        doc.font("Helvetica-Bold").text("Global Dimensions:", 50, 140);
        doc.font("Helvetica").text(`Length: ${config.length || 0} m`, 60, 160);
        doc.text(`Width: ${config.width || 0} m`, 60, 175);
        doc.text(`Height: ${config.height || 0} m`, 60, 190);

        doc.font("Helvetica-Bold").text("Truss Specifications:", 300, 140);
        doc.font("Helvetica").text(`Type: ${config.structureType?.toUpperCase() || ''}`, 310, 160);
        doc.text(`Towers: ${stats.towSpec?.name || ''}`, 310, 175);
        doc.text(`Grid (L): ${stats.gridSpecL?.name || ''}`, 310, 190);
        doc.text(`Grid (W): ${stats.gridSpecW?.name || ''}`, 310, 205);

        // Load & Weights
        doc.font("Helvetica-Bold").fontSize(14).text("LOAD ANALYSIS", 50, 250);

        doc.rect(50, 270, 500, 100).stroke();

        doc.fontSize(10).font("Helvetica-Bold").text("Aluminum Weight:", 60, 285);
        doc.font("Helvetica").text(`${(stats.aluWeight || 0).toFixed(1)} kg`, 180, 285);

        doc.font("Helvetica-Bold").text("Total Load (with LED):", 60, 310);
        doc.font("Helvetica").text(`${(stats.totalLoad || 0).toFixed(1)} kg`, 180, 310);

        doc.font("Helvetica-Bold").text("Point Load Limit:", 300, 285);
        doc.font("Helvetica").text(`${(stats.pointLoadLimit || 0).toFixed(1)} kg/tower`, 420, 285);

        doc.font("Helvetica-Bold").text("Est. Point Load:", 300, 310);
        doc.font("Helvetica").fillColor(stats.isOverload ? "red" : "black").text(`${(stats.pointLoad || 0).toFixed(1)} kg/tower`, 420, 310);
        doc.fillColor("black");

        doc.font("Helvetica-Bold").text("Load Margin:", 300, 335);
        doc.font("Helvetica").fillColor(stats.isOverload ? "red" : "black").text(`${(stats.loadPercentage || 0).toFixed(1)}%`, 420, 335);
        doc.fillColor("black");

        if (stats.isOverload) {
            doc.font("Helvetica-Bold").fillColor("red").text("WARNING: STRUCTURE OVERLOAD DETECTED!", 50, 390, { align: 'center' });
            doc.fillColor("black");
        }

        // Equipment List
        doc.font("Helvetica-Bold").fontSize(12).text("Equipment Summary:", 50, 420);
        doc.font("Helvetica").fontSize(10);
        doc.text(`${stats.totals?.s3 || 0}x 3m  |  ${stats.totals?.s2 || 0}x 2m  |  ${stats.totals?.s1 || 0}x 1m  |  ${stats.totals?.s05 || 0}x 0.5m`, 60, 440);
        doc.text(`${stats.totals?.corners || 0}x Junctions  |  ${stats.totals?.bases || 0}x Base Plates  |  ${stats.totals?.hinges || 0}x Manchons C.`, 60, 455);

        doc.end();
    }
}

module.exports = new PdfService();
