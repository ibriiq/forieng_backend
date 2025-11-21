import prisma from "../lib/prisma.js";

const index = async (req, res) => {
  try {
    const documentTypes = await prisma.document_types.findMany();
    return res.status(200).json(documentTypes);
  } catch (error) {
    console.error("Error fetching document types:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const create = async (req, res) => {
  try {
    const { id, name, price, validity } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    if (price === undefined || price === null) {
      return res.status(400).json({ error: "Price is required" });
    }

    if (validity === undefined || validity === null) {
      return res.status(400).json({ error: "Validity is required" });
    }

    let documentType;

    if (id) {
      // Update existing document type
      documentType = await prisma.document_types.update({
        where: { id: parseInt(id) },
        data: {
          name,
          price: parseFloat(price),
          validity: parseInt(validity),
        },
      });
    } else {
      
      documentType = await prisma.document_types.create({
        data: {
          name,
          price: parseFloat(price),
          validity: parseInt(validity),
          created_by: parseInt(req.user.id),
          created_at: new Date(),
        },
      });
    }

    return res.status(200).json(documentType);
  } catch (error) {
    console.error("Error creating/updating document type:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getSingle = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }

    const documentType = await prisma.document_types.findUnique({
      where: { id: parseInt(id) },
    });

    if (!documentType) {
      return res.status(404).json({ error: "Document type not found" });
    }

    return res.status(200).json(documentType);
  } catch (error) {
    console.error("Error fetching document type:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const destroy = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }

    await prisma.document_types.delete({
      where: { id: parseInt(id) },
    });

    return res.status(200).json({ message: "Document type deleted successfully" });
  } catch (error) {
    console.error("Error deleting document type:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export { index, create, getSingle, destroy };

