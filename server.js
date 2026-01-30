const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db/db.json');
const middlewares = jsonServer.defaults();
const cors = require('cors');

// Enable CORS for all origins (for development)
server.use(cors());

// Use default middlewares (logger, static, cors)
server.use(middlewares);

// Add custom routes if needed
server.use(jsonServer.bodyParser);

// Use router
server.use(router);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Anime Manga Tracker API is running on port ${PORT}`);
    console.log(`📊 API URL: http://localhost:${PORT}/items`);
    console.log(`👨‍💻 Created by: Mark Joseph Tabugon Rogasan`);
});
