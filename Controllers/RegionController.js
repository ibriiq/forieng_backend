import prisma from "../lib/prisma.js";

const DropdownType = [
  "regions",
  "sponsor_types",
  "cities",
  "districts",
  "villages",
];

const index = async (req, res) => {
  try {
    const { dropdown_type } = req.body;

    if (!dropdown_type) {
      return res.status(400).json({ error: "Dropdown type is required" });
    }

    // if (!DropdownType.includes(dropdown_type)) {
    //   return res.status(400).json({ error: "Invalid dropdown type" });
    // }

    const regions = await prisma.Setting.findMany({
      where: { dropdown_type },
    });
    return res.status(200).json(regions);
  } catch (error) {
    console.error("Error fetching regions:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const create = async (req, res) => {
  try {
    const Type = ["regions", "states", "cities", "districts", "villages"];

    const { id, categoryId, name, value, isActive } = req.body;

    console.log("categoryId", categoryId);
    console.log("name", name);
    console.log("value", value);
    console.log("isActive", isActive);
    console.log("Type", Type[categoryId]);

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    if (!value) {
      return res.status(400).json({ error: "Value is required" });
    }

    if (isActive === undefined) {
      return res.status(400).json({ error: "Is Active is required" });
    }

    let data;

    if (id) {
      data = await prisma.Setting.update({
        where: { id: id },
        data: {
          name,
          label: value,
          status: isActive ? "enabled" : "disabled",
          updated_at: new Date(),
        },
      });
    } else {
      data = await prisma.Setting.create({
        data: {
          name,
          label: value,
          status: isActive ? "enabled" : "disabled",
          dropdown_type: categoryId,
          created_by: req.user.id,
          created_at: new Date()
        },
      });
    }

    return res.status(200).json("Created successfully");
  } catch (error) {
    console.error("Error creating region:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getSingle = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }

    const region = await prisma.Setting.findUnique({
      where: { id: id },
    });
    return res.status(200).json(region);
  } catch (error) {
    console.error("Error getting single region:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


const destroy = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }

    await prisma.Setting.delete({
      where: { id: id },
    });
    return res.status(200).json("Deleted successfully");
  } catch (error) {
    console.error("Error deleting region:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export { index, create, getSingle, destroy };
