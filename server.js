// ========================
// Import required modules
// ========================
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

// ========================
// Initialize app
// ========================
const app = express();
const PORT = process.env.PORT || 3000;

// ========================
// Middleware
// ========================

// Parse JSON bodies
app.use(bodyParser.json());

// 🔍 Custom logger middleware
app.use((req, res, next) => {
  const now = new Date();
  console.log(`[${now.toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// 🔐 Authentication middleware (simple API key check)
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== 'mysecretapikey') {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized: Missing or invalid API key'
    });
  }
  next();
};

// 🧩 Validation middleware for product creation and update
const validateProduct = (req, res, next) => {
  const { name, price } = req.body;

  if (!name || typeof name !== 'string') {
    return next(new ValidationError('Product name is required and must be a string'));
  }

  if (price === undefined || typeof price !== 'number') {
    return next(new ValidationError('Product price is required and must be a number'));
  }

  next();
};

// ========================
// Custom Error Classes
// ========================
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Invalid data') {
    super(message, 400);
  }
}

// ========================
// Sample In-memory Data
// ========================
let products = [
  {
    id: '1',
    name: 'Laptop',
    description: 'High-performance laptop with 16GB RAM',
    price: 1200,
    category: 'electronics',
    inStock: true
  },
  {
    id: '2',
    name: 'Smartphone',
    description: 'Latest model with 128GB storage',
    price: 800,
    category: 'electronics',
    inStock: true
  },
  {
    id: '3',
    name: 'Coffee Maker',
    description: 'Programmable coffee maker with timer',
    price: 50,
    category: 'kitchen',
    inStock: false
  }
];

// ========================
// Routes
// ========================

// Root
app.get('/', (req, res) => {
  res.send('Hello World 🚀');
});

// 🧩 GET all products (with filtering + pagination)
app.get('/api/products', (req, res) => {
  let { category, page = 1, limit = 3 } = req.query;
  page = parseInt(page);
  limit = parseInt(limit);

  let filtered = products;
  if (category) {
    filtered = filtered.filter(p => p.category === category);
  }

  const start = (page - 1) * limit;
  const end = start + limit;
  const paginated = filtered.slice(start, end);

  res.json({
    status: 'success',
    page,
    total: filtered.length,
    data: paginated
  });
});

// 🧩 Search products by name
app.get('/api/products/search', (req, res) => {
  const { name } = req.query;
  if (!name) return next(new ValidationError('Search term "name" is required'));

  const results = products.filter(p =>
    p.name.toLowerCase().includes(name.toLowerCase())
  );

  res.json({
    status: 'success',
    count: results.length,
    data: results
  });
});

// 🧩 Get product statistics (count by category)
app.get('/api/products/stats', (req, res) => {
  const stats = products.reduce((acc, product) => {
    acc[product.category] = (acc[product.category] || 0) + 1;
    return acc;
  }, {});

  res.json({
    status: 'success',
    data: stats
  });
});

// 🧩 GET a specific product
app.get('/api/products/:id', (req, res, next) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) return next(new NotFoundError(`Product with ID ${req.params.id} not found`));

  res.json({
    status: 'success',
    data: product
  });
});

// 🧩 POST - Create a new product
app.post('/api/products', authenticate, validateProduct, (req, res) => {
  const { name, description, price, category, inStock } = req.body;
  const newProduct = {
    id: uuidv4(),
    name,
    description,
    price,
    category,
    inStock: inStock ?? true
  };

  products.push(newProduct);

  res.status(201).json({
    status: 'success',
    message: 'Product successfully added',
    data: newProduct
  });
});

// 🧩 PUT - Update a product
app.put('/api/products/:id', authenticate, validateProduct, (req, res, next) => {
  const productIndex = products.findIndex(p => p.id === req.params.id);
  if (productIndex === -1)
    return next(new NotFoundError(`Product with ID ${req.params.id} not found`));

  products[productIndex] = { ...products[productIndex], ...req.body };

  res.json({
    status: 'success',
    message: 'Product successfully updated',
    data: products[productIndex]
  });
});

// 🧩 DELETE - Delete a product
app.delete('/api/products/:id', authenticate, (req, res, next) => {
  const productIndex = products.findIndex(p => p.id === req.params.id);
  if (productIndex === -1)
    return next(new NotFoundError(`Product with ID ${req.params.id} not found`));

  const deletedProduct = products.splice(productIndex, 1);

  res.json({
    status: 'success',
    message: 'Product successfully deleted',
    data: deletedProduct[0]
  });
});

// 🧩 Handle unknown routes
app.use((req, res, next) => {
  next(new NotFoundError('Route not found'));
});

// Global Error Handler

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});


// Start server

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
