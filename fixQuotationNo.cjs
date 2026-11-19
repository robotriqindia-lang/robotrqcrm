const fs = require('fs');

// 1. Update adminQuotationRoutes.js
let adminRoutes = fs.readFileSync('d:/Desktop/Robotriq CRM/server/routes/adminQuotationRoutes.js', 'utf8');

adminRoutes = adminRoutes.replace(
  /const quotationNo = `RQ\/\$\{currentYear\}\/\$\{\(count \+ 1\)\.toString\(\)\.padStart\(3, '0'\)\}`;/,
  "const quotationNo = `RQ/${currentYear}/${(count + 1).toString().padStart(3, '0')}`;\n        if (req.body.customData) req.body.customData.quotationNo = quotationNo;"
);

fs.writeFileSync('d:/Desktop/Robotriq CRM/server/routes/adminQuotationRoutes.js', adminRoutes, 'utf8');

// 2. Update QuotationRoutes.js
let salesRoutes = fs.readFileSync('d:/Desktop/Robotriq CRM/server/routes/QuotationRoutes.js', 'utf8');

salesRoutes = salesRoutes.replace(
  /const quotationNo = `MP\/\$\{currentYear\}\/\$\{\(count \+ 1\)\.toString\(\)\.padStart\(3, '0'\)\}`;/,
  "const quotationNo = `MP/${currentYear}/${(count + 1).toString().padStart(3, '0')}`;\n        if (req.body.customData) req.body.customData.quotationNo = quotationNo;"
);

fs.writeFileSync('d:/Desktop/Robotriq CRM/server/routes/QuotationRoutes.js', salesRoutes, 'utf8');

console.log('Fixed Quotation routes to set customData.quotationNo');
