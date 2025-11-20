import Joi from "joi";
import crypto from "crypto";
import prisma from "../lib/prisma.js";


const create = async (req, res) => {
  try {
    // Example validation schema
    const userSchema = Joi.object({
      department: Joi.number().required(),
      name: Joi.string().max(50).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
      phone: Joi.string().required(),
      region: Joi.number().required(),
      role: Joi.number().required(),
      status: Joi.string().required(),
      username: Joi.string().required(),
    });

    const { error, value } = userSchema.validate(req.body, {
      abortEarly: false, // This returns ALL errors instead of just the first one
    });

    if (error) {
      return res.status(400).json({ error: error.details });
    }

    const {
      department,
      name,
      email,
      password,
      phone,
      region,
      role,
      status,
      username,
    } = value;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.User.create({
        data: {
          department: 1,
          name,
          email,
          password: crypto.createHash("sha256").update(password).digest("hex"),
          phone,
          region,
          status,
          // username,
        },
      });

      // await tx.UserHasRole.create({
      //   data: {
      //     user_id: user.id,
      //     role_id: role,
      //     created_at: new Date()
      //   },
      // });

            // Use raw SQL to insert into the join table
        await tx.$executeRaw`
        INSERT INTO user_has_roles (user_id, role_id) 
        VALUES (${user.id}, ${role})
      `;

    });

    return res.status(200).json({ message: "User created successfully" });
  } catch (error) {
    console.error("Error creating user:", error);

    return res.status(500).json({ error: "Internal server error" });
  }
};

const getRoles = async (req, res) => {
  try {
    const roles = await prisma.roles.findMany({
      select: {
        id: true,
        name: true,
      },
      where: {
        status: "enabled",
      },
    });
    return res.status(200).json(roles);
  } catch (error) {
    console.error("Error getting roles:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const index = async (req, res) => {
  try {
    const users = await prisma.User.findMany();
    return res.status(200).json(users);
  } catch (error) {
    console.error("Error getting users:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export { create, getRoles, index };
