import prisma from '../lib/prisma.js';

const excludedPaths = new Set(['/api/login', '/api/logout','/api/OTPVerification']);

const userInfo = async (req, res, next) => {


  const path = req.originalUrl.split('?')[0];

  if (excludedPaths.has(path)) {
    return next();
  }

  const cookieToken = req.cookies; // Use req.cookies instead of req.headers.authorization

  
  const token = cookieToken.authToken;
  // console.log("token", token);


  if (!token) {
    return res.status(401).json({ error: 'Not Authenticated.' });
  }

  // console.log(token);

  try {
    const session = await prisma.Session.findUnique({
      where: { token },
    });

    if (!session || session.expires_at <= new Date()) {
      return res.status(401).json({ error: 'Session expired or invalid.' });
    }

    const user = await prisma.User.findUnique({
      where: { id: session.user_id },
    });
    
    // console.log("user", user);

    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    const role_id = await prisma.$queryRaw`
      SELECT role_id FROM user_has_roles WHERE user_id = ${user.id}
    `;

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role_id: role_id.map(role => role.role_id),
      "last_otp": user.last_otp,
    };

    req.session = session;

    return next();
  } catch (error) {
    console.error('Failed to attach user to request:', error);
    return res.status(500).json({ error: 'Failed to authenticate request.' });
  }
};

export default userInfo;

