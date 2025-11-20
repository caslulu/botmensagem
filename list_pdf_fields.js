const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function listFields() {
    const assetsDir = path.join(__dirname, 'src', 'main', 'rta', 'assets');
    const templatePath = path.join(assetsDir, 'rta_template_allstate.pdf');

    if (!fs.existsSync(templatePath)) {
        console.error('Template not found:', templatePath);
        return;
    }

    const pdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log('Fields in PDF:');
    fields.forEach(field => {
        const name = field.getName();
        console.log(`- ${name}`);
    });
}

listFields().catch(console.error);
