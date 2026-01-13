"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
beforeAll(async () => {
    try {
        console.log('Test environment setup');
    }
    catch (error) {
        console.error('Failed to connect to test database', error);
    }
});
afterAll(async () => {
    await database_1.pool.end();
});
//# sourceMappingURL=setup.js.map