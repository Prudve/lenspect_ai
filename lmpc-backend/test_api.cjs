const axios = require('axios');

async function testApi() {
  try {
    // 1. Login to get token
    const loginRes = await axios.post('http://localhost:3000/api/v1/users/login', {
      email: 'inspector@legalmetrology.gov.in', // Wait, let's use shiva's email or admin's email. I will need to check the DB for emails. Let's just use the admin user.
      password: 'password' // Assuming 'password' is the default password
    });
    
    const token = loginRes.data.data.accessToken;
    console.log("Logged in, token:", token);

    // 2. Fetch leaderboard
    const leaderboardRes = await axios.get('http://localhost:3000/api/v1/analytics/inspector-leaderboard?limit=100', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(JSON.stringify(leaderboardRes.data, null, 2));

  } catch (err) {
    console.error("API Error:", err.response ? err.response.data : err.message);
  }
}

testApi();
