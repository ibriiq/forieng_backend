import crypto from "crypto";
import { timingSafeEqual } from 'crypto';
import prisma from "../lib/prisma.js";
import { SendSms } from "../lib/Helper.js";


const login = async (req, res) => {

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
    where: { email: trimmedEmail },
  });
  if (!user) {




    return res.status(401).json({ error: "Invalid credentials." });
  }

  // Verify password using crypto (SHA-256 hash)
  if (!user.password) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  const hashedPassword = crypto.createHash("sha256").update(passwordStr).digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  try {
    const storedHashBuffer = Buffer.from(user.password, "hex");
    const providedHashBuffer = Buffer.from(hashedPassword, "hex");

    // Check if buffers have the same length before comparing
    if (storedHashBuffer.length !== providedHashBuffer.length) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    if (!timingSafeEqual(storedHashBuffer, providedHashBuffer)) {
      return res.status(401).json({ error: "Invalid credentials." });
    }
  } catch (error) {
    // If password format is invalid, return error
    return res.status(401).json({ error: "Invalid credentials." });
  }



  let otp = Math.floor(100000 + Math.random() * 900000);

  // SendSms(user.phone, `Your OTP is ${otp}`);

  await prisma.User.update({
    where: { id: user.id },
    data: {
      last_otp: otp.toString(),
      otp_expires_at: new Date(Date.now() + 10 * 60 * 1000),
    },
  });


  res.cookie("temporary_user_id", user.id,{
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 5 * 60 * 1000, // 5 minutes
    path: "/",
  });


  return res.status(200).json({ message: "Successfully Sent OTP to your phone", user: {
    // id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role_id: user.role_id
  }});


  // } catch (error) {
  //   return res.status(500).json({ error: error.message });
  // }
};


export const verifyOtp = async (req, res) => {
  const { otp} = req.body;
  const temporary_user_id = req.cookies.temporary_user_id;
  if (!temporary_user_id) {
    return res.status(401).json({ error: "Invalid temporary user id." });
  }
  const user = await prisma.User.findUnique({
    where: { id: parseInt(temporary_user_id) },
  });
  // console.log("user", user);
  console.log("otp", otp);
  console.log("last_otp", user.last_otp);
  console.log("otp", otp.toString());
  if (user.last_otp !== otp) {
    return res.status(401).json({ error: "Invalid OTP." });
  }
  if (user.otp_expires_at < new Date()) {
    return res.status(401).json({ error: "OTP expired." });
  }


  
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


  return res.status(200).json({ user: {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone
  }});
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
