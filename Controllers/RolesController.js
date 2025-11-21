import prisma from "../lib/prisma.js";

const index = async (req, res) => {
  try {
    const roles = await prisma.roles.findMany();
    return res.status(200).json(roles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const create = async (req, res) => {
  try {
    const { id, name, status } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    let role;

    if (id) {
      // Update existing role using raw SQL for consistency
      await prisma.$executeRaw`
        UPDATE roles 
        SET name = ${name}, 
            status = ${status},
            updated_at = ${new Date()}
        WHERE id = ${parseInt(id)}
      `;
      
      // Fetch the updated role
      role = await prisma.roles.findUnique({
        where: { id: parseInt(id) },
      });
    } else {
      // Create new role using raw SQL due to Unsupported timestamp type
      await prisma.$executeRaw`
        INSERT INTO roles (name, status, created_by, created_at, updated_at)
        VALUES (${name}, ${status}, ${parseInt(req.user?.id || 1)}, ${new Date()}, ${new Date()})
      `;
      
      // Fetch the created role (most recently created with this name)
      role = await prisma.roles.findFirst({
        where: { name },
        orderBy: { id: 'desc' },
      });
    }

    return res.status(200).json(role);
  } catch (error) {
    console.error("Error creating/updating role:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getSingle = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }

    const role = await prisma.roles.findUnique({
      where: { id: parseInt(id) },
    });

    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    return res.status(200).json(role);
  } catch (error) {
    console.error("Error fetching role:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const destroy = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }

    // Delete role permissions first
    await prisma.$executeRaw`
      DELETE FROM role_has_permissons WHERE role_id = ${parseInt(id)}
    `;

    // Delete the role
    await prisma.$executeRaw`
      DELETE FROM roles WHERE id = ${parseInt(id)}
    `;

    return res.status(200).json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Error deleting role:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getPermissions = async (req, res) => {
  try {
    const { role_id } = req.body;


    // Get permissions for the role
    const rolePermissions = await prisma.$queryRaw`
      SELECT id, name as permission_name
      FROM permissions
    `;

    return res.status(200).json(rolePermissions);
  } catch (error) {
    console.error("Error fetching role permissions:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const setPermissions = async (req, res) => {
  try {
    const { role_id, permission_ids } = req.body;

    if (!role_id) {
      return res.status(400).json({ error: "role_id is required" });
    }

    if (!Array.isArray(permission_ids)) {
      return res.status(400).json({ error: "permission_ids must be an array" });
    }

    await prisma.$transaction(async (tx) => {
      // Delete existing permissions for the role
      await tx.$executeRaw`
        DELETE FROM role_has_permissons WHERE role_id = ${parseInt(role_id)}
      `;

      // Insert new permissions
      if (permission_ids.length > 0) {
        for (const permission_id of permission_ids) {
          await tx.$executeRaw`
            INSERT INTO role_has_permissons (role_id, permission_id, created_at, updated_at)
            VALUES (${parseInt(role_id)}, ${parseInt(permission_id)}, ${new Date()}, ${new Date()})
          `;
        }
      }
    });

    // Fetch updated permissions
    const updatedPermissions = await prisma.$queryRaw`
      SELECT rp.id, rp.role_id, rp.permission_id, p.name as permission_name
      FROM role_has_permissons rp
      INNER JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ${parseInt(role_id)}
    `;

    return res.status(200).json({
      message: "Permissions updated successfully",
      permissions: updatedPermissions,
    });
  } catch (error) {
    console.error("Error setting role permissions:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export { index, create, getSingle, destroy, getPermissions, setPermissions };

