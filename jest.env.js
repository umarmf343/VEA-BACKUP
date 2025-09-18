process.env.DATABASE_URL = process.env.DATABASE_TEST_URL || "postgresql://localhost:5432/vea_test"
process.env.NODE_ENV = process.env.NODE_ENV || "test"
