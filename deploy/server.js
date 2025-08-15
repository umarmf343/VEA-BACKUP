// Minimal wrapper to run Next's standalone server
process.env.NODE_ENV = 'production'
process.env.PORT = process.env.PORT || '3000'
process.chdir(__dirname)

// Start the server produced by `next build` (output: 'standalone')
require('./.next/standalone/server.js')
