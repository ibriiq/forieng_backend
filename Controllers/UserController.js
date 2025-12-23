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
      role: Joi.array().items(Joi.number()).required(),
      status: Joi.string().required(),
      // username: Joi.string().required(),


      id: Joi.number().integer().required(),
    });

    const { error, value } = userSchema.validate(req.body, {
      abortEarly: false, // This returns ALL errors instead of just the first one
    });

    if (error) {
      return res.status(400).json({ error: error.details });
    }

    const {
      id,
      department,
      name,
      email,
      password,
      phone,
      region,
      role,
      status,
      // username,
    } = value;

    if(id > 0) {
      const result = await prisma.$transaction(async (tx) => {

        let new_data = {
          department: department,
          name,
          email,
          phone,
          region,
          status,
        }
        if(password) {
          new_data.password = crypto.createHash("sha256").update(password).digest("hex");
        }
        const user = await tx.User.update({  
          where: { id },
          data: new_data,
        });
  
        // await tx.UserHasRole.create({
        //   data: {
        //     user_id: user.id,
        //     role_id: role,
        //     created_at: new Date()
        //   },
        // });

        await tx.$executeRaw`
          DELETE FROM user_has_roles WHERE user_id = ${user.id}
        `;
  
              // Use raw SQL to insert into the join table
          for (const r of role) {
            await tx.$executeRaw`
              INSERT INTO user_has_roles (user_id, role_id) 
              VALUES (${user.id}, ${r})
            `;
          }
  
      });
    }else{

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
      for (const r of role) {
            // Use raw SQL to insert into the join table
        await tx.$executeRaw`
          INSERT INTO user_has_roles (user_id, role_id) 
          VALUES (${user.id}, ${r})
        `;
      }

    });
  }

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


export const destroy = async (req, res) => {
  try {

    const { error, value } = Joi.object({
      id: Joi.number().integer().required(),
    }).validate(req.body, {
      abortEarly: false,
    });

    if(error) {
      return res.status(400).json({ error: error.details });
    }

    const { id } = value;

    await prisma.User.delete({ where: { id } });
    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export { create, getRoles, index };
