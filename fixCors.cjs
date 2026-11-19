const fs = require('fs');
let content = fs.readFileSync('d:/Desktop/Robotriq CRM/server/server.js', 'utf8');

// Replace the strict CORS config with an open one
content = content.replace(
  /app\.use\(cors\(\{\s*origin:\s*\[.*?\],\s*methods:.*?\s*credentials:\s*true\s*\}\)\);/s,
  `app.use(cors({
  origin: function (origin, callback) {
    callback(null, true); // Allow anywhere
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));`
);

fs.writeFileSync('d:/Desktop/Robotriq CRM/server/server.js', content, 'utf8');
console.log('CORS updated to allow anywhere');
