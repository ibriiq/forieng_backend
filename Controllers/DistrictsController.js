import prisma from "../lib/prisma.js";

const index = async (req, res) => {
  try {
    const districts = await prisma.$queryRaw`
      SELECT districts.*, settings.name as region_name FROM districts
      LEFT JOIN settings ON districts.region = settings.id and settings.dropdown_type = 'regions'
    `;
    return res.status(200).json(districts);
  } catch (error) {
    console.error("Error fetching districts:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const create = async (req, res) => {
  try {
    const { id, region_id, name, status } = req.body;

    if (!region_id) {
      return res.status(400).json({ error: "Region is required" });
    }

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    let district;

    if (id) {
      // Update existing district
      district = await prisma.districts.update({
        where: { id: parseInt(id) },
        data: {
          region: parseInt(region_id),
          name,
          status,
          updated_at: new Date(),
        },
      });
    } else {
      // Create new district
      district = await prisma.districts.create({
        data: {
          region: parseInt(region_id),
          name,
          status,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }

    return res.status(200).json(district);
  } catch (error) {
    console.error("Error creating/updating district:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getSingle = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }

    // Get district with populated region data
    const district = await prisma.$queryRaw`
      SELECT 
        districts.*,
        regions.id as region_id,
        regions.name as region_name,
        regions.label as region_label,
        regions.status as region_status
      FROM districts
      LEFT JOIN regions ON districts.region = regions.id
      WHERE districts.id = ${parseInt(id)}
    `;

    if (!district || district.length === 0) {
      return res.status(404).json({ error: "District not found" });
    }

    return res.status(200).json(district[0]);
  } catch (error) {
    console.error("Error fetching district:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const destroy = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }

    await prisma.districts.delete({
      where: { id: parseInt(id) },
    });

    return res.status(200).json({ message: "District deleted successfully" });
  } catch (error) {
    console.error("Error deleting district:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getByRegionDistrict = async (req, res) => {
  try {
    const { region_id } = req.body; 
    console.log("region_id", region_id);
    const districts = await prisma.$queryRaw`
      SELECT districts.*, settings.name as region_name FROM districts
      LEFT JOIN settings ON districts.region = settings.id and settings.dropdown_type = 'regions'
      WHERE districts.region = ${parseInt(region_id)}
    `;
    return res.status(200).json(districts);
  } catch (error) {
    console.error("Error fetching districts by region:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};




export { index, create, getSingle, destroy };

