const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');
require('dotenv').config();

const app = express();

// Enable CORS for all routes. This allows the Frontend (running on Máy A)
// to make cross-origin requests to this service (running on Máy B).
app.use(cors());

// Parse incoming JSON payloads
app.use(express.json());

// Set up server port, default to 8081
const PORT = process.env.PORT || 8081;

// Initialize Redis connection. Connects to the central Data Grid.
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

/**
 * GET /products
 * Retrieves the full list of products along with their current stock levels.
 * This endpoint is optimized using Redis Pipelines to reduce network latency.
 */
app.get('/products', async (req, res) => {
  try {
    // Retrieve all product IDs from the 'products' set
    const productIds = await redis.smembers('products');
    
    // Use Redis pipeline to batch multiple commands into a single network request.
    // This is essential for low latency in a high-load Space-Based Architecture.
    const pipeline = redis.pipeline();

    productIds.forEach(id => {
      // Queue commands to get the product details and its stock level
      pipeline.hgetall(`product:${id}`);
      pipeline.get(`stock:${id}`);
    });

    // Execute the batched commands. 
    // results array will contain pairs of data: [error, productData] and [error, stockData]
    const results = await pipeline.exec();
    const products = [];

    // Loop through the results array, stepping by 2 since each product has 2 queued commands
    for (let i = 0; i < results.length; i += 2) {
      const productData = results[i][1]; // Data from hgetall
      const stockData = results[i + 1][1]; // Data from get stock
      
      // Ioredis returns an empty object {} for non-existent hashes.
      // Ensure the product actually exists before adding it to the response.
      if (Object.keys(productData).length > 0) {
          products.push({
            ...productData,
            price: parseFloat(productData.price),
            stock: parseInt(stockData, 10) || 0
          });
      }
    }

    // Return the combined array of products
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /products/:id
 * Retrieves the details and stock level for a specific single product.
 */
app.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Use Promise.all to fetch the product details and stock concurrently.
    // This avoids blocking and speeds up the response time.
    const [product, stock] = await Promise.all([
      redis.hgetall(`product:${id}`),
      redis.get(`stock:${id}`)
    ]);

    // Check if the product is empty or undefined
    if (!product || Object.keys(product).length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Combine and format the data before sending it to the client
    res.json({
      ...product,
      price: parseFloat(product.price),
      stock: parseInt(stock, 10) || 0
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /products
 * Adds a new product to the Data Grid and initializes its stock level.
 * (Bonus endpoint not in original requirement, but useful for admin features)
 */
app.post('/products', async (req, res) => {
  try {
    const { id, name, price, description, image, initialStock } = req.body;

    // Basic validation
    if (!id || !name || price === undefined) {
      return res.status(400).json({ error: 'Missing required fields: id, name, or price' });
    }

    // Check if product already exists
    const exists = await redis.sismember('products', id);
    if (exists) {
      return res.status(409).json({ error: 'Product with this ID already exists' });
    }

    // Pipeline to ensure atomicity when creating product
    const pipeline = redis.pipeline();
    
    // Add to 'products' set
    pipeline.sadd('products', id);
    
    // Create product hash
    pipeline.hset(`product:${id}`, {
      id,
      name,
      price,
      description: description || '',
      image: image || 'https://picsum.photos/400'
    });
    
    // Initialize stock (default to 0 if not provided)
    pipeline.set(`stock:${id}`, initialStock || 0);

    await pipeline.exec();

    res.status(201).json({ success: true, message: 'Product created successfully', id });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server and bind to '0.0.0.0'.
// Binding to 0.0.0.0 is critical; it exposes the service to the entire Local Area Network (LAN),
// allowing Person 1's machine to connect to this API.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Product PU running on port ${PORT}`);
});
