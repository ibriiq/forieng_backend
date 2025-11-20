

const index = async (req, res) => {
  try {
    const expenses = await prisma.expense_categories.findMany();
    return res.status(200).json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


const create = async (req, res) => {
  try {
    const { name, status, description } = req.body;

    let expenseCategory = null;
    if (req.body.id) {
      expenseCategory = await prisma.expense_categories.update({
        where: { id: parseInt(req.body.id) },
        data: { name, status: status ? "enabled" : "disabled", description },
      });
    } else {
      expenseCategory = await prisma.expense_categories.create({
        data: { name, status: status ? "enabled" : "disabled", description, created_at: new Date() },
      });
    }
    return res.status(200).json(expenseCategory);
  } catch (error) {
    console.error("Error creating expense:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};



const getSingle = async (req, res) => {
  try {
    const { id } = req.body;
    const expense = await prisma.expense_categories.findUnique({ where: { id: parseInt(id) } });
    return res.status(200).json(expense);
  } catch (error) {
    console.error("Error fetching expense:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const destroy = async (req, res) => {
  try {
    const expense = await prisma.expense_categories.delete({ where: { id: parseInt(req.body.id) } });
    return res.status(200).json(expense);
  } catch (error) {
    console.error("Error deleting expense:", error);
    return res.status(500).json("Internal server error");
  }
};

export { create, index, getSingle, destroy };