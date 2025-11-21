import Joi from "joi";
import prisma from "../lib/prisma.js";

const countryOfOriginSchema = Joi.object({
  id: Joi.number().integer().optional(),
  name: Joi.string().trim().max(500).required(),
  nationality_id: Joi.number().integer().required(),
  description: Joi.string().trim().max(500).allow("", null).optional(),
  status: Joi.string().trim().max(50).allow("", null).optional(),
});

const index = async (req, res) => {
  try {
    const countries = await prisma.country_of_origins.findMany({
      orderBy: {
        created_at: "desc",
      },
    });
    return res.status(200).json(countries);
  } catch (error) {
    console.error("Error fetching countries of origin:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const create = async (req, res) => {
  try {
    const { error, value } = countryOfOriginSchema.validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      return res.status(400).json({ error: error.details });
    }

    const { id, name, nationality_id, description, status } = value;

    let countryOfOrigin;

    if (id) {
      // Update existing country of origin
      countryOfOrigin = await prisma.country_of_origins.update({
        where: { id: parseInt(id) },
        data: {
          name,
          nationality_id: parseInt(nationality_id),
          description: description || null,
          status: status || null,
        },
      });
    } else {
      // Create new country of origin
      countryOfOrigin = await prisma.country_of_origins.create({
        data: {
          name,
          nationality_id: parseInt(nationality_id),
          description: description || null,
          status: status || null,
          created_by: parseInt(req.user.id),
          created_at: new Date(),
        },
      });
    }

    return res.status(200).json(countryOfOrigin);
  } catch (error) {
    console.error("Error creating/updating country of origin:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getSingle = async (req, res) => {
  try {
    const { error, value } = Joi.object({
      id: Joi.number().integer().required(),
    }).validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      return res.status(400).json({ error: error.details });
    }

    const { id } = value;

    const countryOfOrigin = await prisma.country_of_origins.findUnique({
      where: { id: parseInt(id) },
    });

    if (!countryOfOrigin) {
      return res.status(404).json({ error: "Country of origin not found" });
    }

    return res.status(200).json(countryOfOrigin);
  } catch (error) {
    console.error("Error fetching country of origin:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const destroy = async (req, res) => {
  try {
    const { error, value } = Joi.object({
      id: Joi.number().integer().required(),
    }).validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      return res.status(400).json({ error: error.details });
    }

    const { id } = value;

    await prisma.country_of_origins.delete({
      where: { id: parseInt(id) },
    });

    return res.status(200).json({ message: "Country of origin deleted successfully" });
  } catch (error) {
    console.error("Error deleting country of origin:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getCountryOfOriginById = async (req, res) => {
  try {
    const { id } = req.body;
    const countryOfOrigin = await prisma.country_of_origins.findMany({
      where: { nationality_id: parseInt(id) },
    });
    return res.status(200).json(countryOfOrigin);
  } catch (error) {
    console.error("Error fetching country of origin:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export { index, create, getSingle, destroy };

