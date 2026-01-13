// Setup file for Jest
import { pool } from '../config/database';

beforeAll(async () => {
    // Connect to database or mock
    // For now we just ensure we can connect
    try {
        // await pool.connect();
        console.log('Test environment setup');
    } catch (error) {
        console.error('Failed to connect to test database', error);
    }
});

afterAll(async () => {
    // Close database connection
    await pool.end();
});
