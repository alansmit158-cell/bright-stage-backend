const nodemailer = require('nodemailer');

// Configure Transport (Placeholder - would come from ENV)
// For dev, we might verify connection or use ephemeral
// Assuming user will add SMTP_HOST, SMTP_USER, SMTP_PASS to .env
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const sendEmail = async ({ to, subject, html, attachments }) => {
    if (!process.env.SMTP_USER) {
        console.log(`[Email Mock] To: ${to}, Subject: ${subject}`);
        return true; // Mock success
    }

    try {
        const info = await transporter.sendMail({
            from: `"Bright Stage" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html,
            attachments
        });
        console.log("Message sent: %s", info.messageId);
        return true;
    } catch (error) {
        console.error("Email send error:", error);
        return false;
    }
};

const sendInvoiceReminder = async (invoice, clientEmail) => {
    // Generate Invoice PDF first? Or just link
    // Ideally we attach the PDF.

    // For now, simple text
    const subject = `Reminder: Invoice ${invoice.number} is Overdue`;
    const html = `
        <h3>Dear Client,</h3>
        <p>This is a friendly reminder that invoice <strong>${invoice.number}</strong> was due on ${new Date(invoice.dueDate).toLocaleDateString()}.</p>
        <p><strong>Amount Due: ${invoice.financials.totalInclTax - (invoice.totalPaid || 0)} DT</strong></p>
        <p>Please arrange payment at your earliest convenience.</p>
        <br>
        <p>Best regards,<br>Bright Stage Team</p>
    `;

    return await sendEmail({ to: clientEmail, subject, html });
};

module.exports = {
    sendEmail,
    sendInvoiceReminder
};
