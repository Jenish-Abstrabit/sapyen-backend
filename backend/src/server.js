require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { connectDB } = require('./config/database');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to DynamoDB
(async () => {
  try {
    await connectDB();
  } catch (error) {
    console.error('Failed to connect to DynamoDB:', error);
    process.exit(1);
  }
})();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Log registered routes
console.log('Registered Routes:');
app._router.stack.forEach(function(r){
    if (r.route && r.route.path){
        console.log(r.route.path)
    } else if(r.name === 'router'){
        r.handle.stack.forEach(function(r){
            if (r.route && r.route.path){
                console.log('/api' + r.route.path)
            }
        })
    }
});

// Error handling
app.use(errorHandler);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});