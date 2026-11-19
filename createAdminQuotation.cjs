const fs = require('fs');

// 1. Create Model
let modelCode = fs.readFileSync('d:/Desktop/Robotriq CRM/server/models/Quotation.js', 'utf8');
modelCode = modelCode.replace(/SalesLead/g, 'Lead');
modelCode = modelCode.replace(/Quotation/g, 'AdminQuotation');
modelCode = modelCode.replace(/quotationSchema/g, 'adminQuotationSchema');
fs.writeFileSync('d:/Desktop/Robotriq CRM/server/models/AdminQuotation.js', modelCode);

// 2. Create Routes
let routeCode = fs.readFileSync('d:/Desktop/Robotriq CRM/server/routes/quotationRoutes.js', 'utf8');
routeCode = routeCode.replace(/Quotation/g, 'AdminQuotation');
routeCode = routeCode.replace(/SalesLead/g, 'Lead');
routeCode = routeCode.replace(/MP\//g, 'RQ/'); 
fs.writeFileSync('d:/Desktop/Robotriq CRM/server/routes/adminQuotationRoutes.js', routeCode);

// 3. Register in server.js
let serverCode = fs.readFileSync('d:/Desktop/Robotriq CRM/server/server.js', 'utf8');
if (!serverCode.includes('adminQuotationRoutes')) {
    serverCode = serverCode.replace(
        "const quotationRoutes = require('./routes/quotationRoutes');",
        "const quotationRoutes = require('./routes/quotationRoutes');\nconst adminQuotationRoutes = require('./routes/adminQuotationRoutes');"
    );
    serverCode = serverCode.replace(
        "app.use('/api/quotations', quotationRoutes);",
        "app.use('/api/quotations', quotationRoutes);\napp.use('/api/admin-quotations', adminQuotationRoutes);"
    );
    fs.writeFileSync('d:/Desktop/Robotriq CRM/server/server.js', serverCode);
}

console.log('Model and Routes created successfully.');
