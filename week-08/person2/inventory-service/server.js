const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');
require('dotenv').config();

const app = express();

// Enable CORS for cross-machine requests
app.use(cors());

// Parse incoming JSON payloads
app.use(express.json());

// Set up server port, default to 8084
const PORT = process.env.PORT || 8084;

// Connect to the central Data Grid (Redis)
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

/**
 * GET /stock/:productId
 * Retrieves the current available stock for a specific product.
 */
app.get('/stock/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Fetch the stock value directly from Redis memory
    const stock = await redis.get(`stock:${productId}`);

    // If the key doesn't exist, Redis returns null
    if (stock === null) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ productId, stock: parseInt(stock, 10) });
  } catch (error) {
    console.error('Error fetching stock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /stock/decrease
 * Decreases the stock for a given product when an order is checked out.
 * This relies heavily on Atomic Operations to prevent race conditions during Flash Sales.
 */
app.post('/stock/decrease', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    // Validate the incoming payload
    if (!productId || !quantity || quantity <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid productId or quantity' });
    }

    /**
     * Lua Script for Atomic Check-and-Set.
     * During a Flash Sale, thousands of requests might hit this endpoint simultaneously.
     * If we check the stock in Node.js and then update it, we risk a "Race Condition"
     * where multiple threads read the same stock value and bypass the zero limit.
     * Running a Lua script guarantees that checking the balance and deducting the stock 
     * is executed as a single, indivisible (atomic) operation directly inside Redis engine.
     */
    const luaScript = `
      -- Get the current stock from Redis
      local current = tonumber(redis.call('GET', KEYS[1]))
      
      -- If the key doesn't exist, return -1 (Not Found)
      if current == nil then return -1 end
      
      -- If the stock is less than the requested quantity, return -2 (Not enough stock)
      if current < tonumber(ARGV[1]) then return -2 end
      
      -- Proceed to decrease the stock and return the new remaining value
      return redis.call('DECRBY', KEYS[1], ARGV[1])
    `;
    
    // Execute the Lua script. "1" indicates the number of keys passed to the script.
    const result = await redis.eval(luaScript, 1, `stock:${productId}`, quantity);

    // Handle custom error codes returned by the Lua script
    if (result === -1) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    if (result === -2) {
      return res.status(400).json({ success: false, message: 'Not enough stock' });
    }

    // Success response with the remaining inventory count
    res.json({ success: true, remaining: result });
  } catch (error) {
    console.error('Error decreasing stock:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /stock
 * Bonus endpoint to fetch stock levels for all products at once.
 */
app.get('/stock', async (req, res) => {
  try {
    // Get all available product IDs from the Set
    const productIds = await redis.smembers('products');
    
    // Initialize Redis Pipeline for batch processing
    const pipeline = redis.pipeline();

    productIds.forEach(id => {
      pipeline.get(`stock:${id}`);
    });

    const results = await pipeline.exec();
    const stocks = [];

    for (let i = 0; i < results.length; i++) {
      const stockData = results[i][1];
      if (stockData !== null) {
          stocks.push({
              productId: productIds[i],
              stock: parseInt(stockData, 10)
          });
      }
    }

    res.json(stocks);
  } catch (error) {
      console.error('Error fetching all stocks:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});

// Bind to 0.0.0.0 to expose this service to the local network
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Inventory PU running on port ${PORT}`);
});
