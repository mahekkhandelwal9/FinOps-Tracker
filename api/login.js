export default function handler(req, res) {
  if (req.method === 'POST') {
    // Mock login response
    res.status(200).json({
      user: {
        id: '1',
        email: 'demo@finops.com',
        name: 'Demo User',
        role: 'admin'
      },
      token: 'mock-jwt-token-for-demo'
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}