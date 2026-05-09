const Redis = require('ioredis');

// Initialize Redis client. Connects to the Redis instance running on localhost:6379
const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

// Pre-defined list of products to seed into the Data Grid (Redis)
const products = [
  { id: "p1", name: "iPhone 15 Pro Max", price: 1199, description: "Latest Apple flagship with A17 Pro chip", image: "https://picsum.photos/seed/iphone15/400/400" },
  { id: "p2", name: "Samsung Galaxy S24 Ultra", price: 1099, description: "Samsung's premium with AI features", image: "https://picsum.photos/seed/galaxys24/400/400" },
  { id: "p3", name: "MacBook Air M3", price: 1299, description: "Ultra-thin laptop with M3 chip", image: "https://picsum.photos/seed/macbookm3/400/400" },
  { id: "p4", name: "Sony WH-1000XM5", price: 349, description: "Industry-leading noise cancelling headphones", image: "https://picsum.photos/seed/sonyxm5/400/400" },
  { id: "p5", name: "iPad Pro 12.9", price: 1099, description: "Most powerful iPad with M2 chip", image: "https://picsum.photos/seed/ipadpro/400/400" },
  { id: "p6", name: "AirPods Pro 2", price: 249, description: "Active noise cancellation with adaptive audio", image: "https://picsum.photos/seed/airpods/400/400" },
];

/**
 * Seeding function to populate Redis with initial data.
 * This is crucial for the Space-Based Architecture, ensuring data is kept
 * entirely in the Data Grid (Redis) instead of a traditional database.
 */
async function seed() {
  try {
    console.log('Seeding products to Redis...');
    
    // Extract all product IDs to maintain a master set of available products
    const productIds = products.map(p => p.id);
    
    // Store all product IDs in a Redis Set named 'products'.
    // This allows fast retrieval of all available product IDs.
    await redis.sadd('products', ...productIds);

    // Iterate over each product and store its details and initial stock
    for (const product of products) {
      // Store the product details as a Redis Hash using the key pattern 'product:{id}'
      await redis.hset(`product:${product.id}`, product);
      
      // Store the initial stock level (50 units) as a separate string using the key 'stock:{id}'
      // Separating stock from the main product hash prevents locking the entire product object during checkout
      await redis.set(`stock:${product.id}`, 50);
      
      console.log(`Seeded ${product.name} with stock 50`);
    }

    console.log('Seeding complete.');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    // Ensure the Redis connection is closed after seeding
    redis.disconnect();
  }
}

// Execute the seed function
seed();
