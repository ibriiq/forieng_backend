import crypto from "crypto";
import prisma from "../lib/prisma.js";

const login = async (req, res) => {
  console.log(req.body);

  const { email, password } = req.body || {};

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const trimmedEmail = email.trim().toLowerCase();
  const passwordStr = password.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return res.status(400).json({ error: "Invalid email format." });
  }
  if (passwordStr.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters." });
  }

  const user = await prisma.User.findFirst({
    where: { email: trimmedEmail, password: passwordStr },
  });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  // const activeSession = await prisma.Session.findFirst({
  //   where: { user_id: user.id, last_used_at: { lte: new Date() } },
  // });
  // if (activeSession) {
  //   return res
  //     .status(401)
  //     .json({ error: "User already is already logged in." });
  // }

  // try {

  // NOTE: Password verification is not implemented as no hashed password is in schema.
  // Add proper password hashing and verification as needed.

  // Generate opaque bearer token and store in DB with 5-minute expiry
  const token = crypto.randomBytes(32).toString("hex");
  const expiresInSeconds = 60 * 60;
  const expiresAtDate = new Date(Date.now() + expiresInSeconds * 1000);
  await prisma.Session.create({
    data: {
      token,
      user_id: user.id,
      expires_at: expiresAtDate,
      created_at: new Date(),
      updated_at: new Date(),
      last_used_at: new Date(),
    },
  });

  
  res.cookie("authToken", token, {
    httpOnly: true, // Crucial for security against XSS
    secure: process.env.NODE_ENV === "production", // Use true in production with HTTPS
    sameSite: "strict", // CSRF protection
    maxAge: expiresInSeconds * 1000, // Cookie expires when token does (in milliseconds)
    path: "/", // Accessible on all routes
    // domain: '.yourdomain.com' // Optional: specify domain if needed
  });
  
  console.log("res", process.env.NODE_ENV);
  console.log("res.cookie", res.cookie);
  console.log("res.token", token);

  return res.json({
    // token_type: "Bearer",
    // access_token: token,
    expires_in: expiresInSeconds,
    user: user,
  });
  // } catch (error) {
  //   return res.status(500).json({ error: error.message });
  // }
};


const userInfo = async (req, res) => {
  let user = req.user;
  console.log(user.id)
  const permissions = await prisma.$queryRaw`
    SELECT permissions.name as permission_name FROM user_has_roles
    INNER JOIN role_has_permissons ON user_has_roles.role_id = role_has_permissons.role_id
    INNER JOIN permissions ON role_has_permissons.permission_id = permissions.id
      WHERE user_id = ${parseInt(user.id)}
  `;
  // user.permissions = permissions.map(permission => permission.permission_name);
  user.permissions = permissions.map(permission => permission.permission_name).filter(permission => permission !== null);
  console.log("user.permissions", user.permissions);
  return res.status(200).json({ user: user });
};

const logout = async (req, res) => {
  try {
    let token = req.headers.authorization || "";
    token = token.split(" ")[1];

    res.clearCookie("authToken");

    // await prisma.Session.delete({ where: { token: token } });
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


export const getPermissions = async (req, res) => {
  try {
    const permissions = await prisma.permissions.findMany();
    let processedPermissions = [];
    for (const permission of permissions) {
      processedPermissions[permission.group][permission.module] = {
        "title": permission.title,
        "id": permission.id,
        "group": permission.group,
        "module": permission.module,
        "created_by": permission.created_by,
        "created_at": permission.created_at,
        "updated_at": permission.updated_at,
      };
    }
    console.log("processedPermissions", processedPermissions);
    return res.status(200).json(processedPermissions);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export { login, logout, userInfo };
