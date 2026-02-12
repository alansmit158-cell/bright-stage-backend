const axios = require('axios');
require('dotenv').config();

async function testUsersRoute() {
    try {
        // We'll try to find a token from a previous login or just check if the route is registered
        // Since I don't have a live token easily accessible in the terminal, I'll just check if the server is running and the route exists (it should return 401 if protect works)
        const baseUrl = 'http://localhost:5000/api/users';
        console.log(`Testing GET ${baseUrl}...`);

        try {
            const response = await axios.get(baseUrl);
            console.log('Response Status:', response.status);
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('Success: Route exists and is protected (Returned 401 as expected without token).');
            } else {
                console.error('Error:', error.message);
            }
        }
    } catch (err) {
        console.error('Test failed:', err);
    }
}

testUsersRoute();
