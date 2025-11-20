const index = async (req, res) => {
    try {
        const expenseSubCategories = await prisma.expense_subcategories.findMany();
        return res.status(200).json(expenseSubCategories);
    } catch (error) {
        console.error("Error fetching expense sub categories:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const create = async (req, res) => {
    try {
        const { expense_category_id, name, status, description } = req.body;
        let expenseSubCategory = null;
        if (req.body.id) {
            expenseSubCategory = await prisma.expense_subcategories.update({
                where: { id: parseInt(req.body.id) },
                data: { name, status: status ? "enabled" : "disabled", description, expense_category_id: parseInt(expense_category_id) },
            });
        } else {
            expenseSubCategory = await prisma.expense_subcategories.create({
                data: { name, status: status ? "enabled" : "disabled", description,
                    expense_category_id: parseInt(expense_category_id),
                    created_at: new Date() },
            });
        }
        return res.status(200).json(expenseSubCategory);
    } catch (error) {
        console.error("Error creating expense sub category:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const getSingle = async (req, res) => {
    try {
        const { id } = req.body;
        const expenseSubCategory = await prisma.expense_subcategories.findUnique({ where: { id: parseInt(id) } });
        return res.status(200).json(expenseSubCategory);
    } catch (error) {
        console.error("Error fetching expense sub category:", error);
        return res.status(500).json("Internal server error");
    }
};

const destroy = async (req, res) => {
    try {
        const { id } = req.body;
        const expenseSubCategory = await prisma.expense_subcategories.delete({ where: { id: parseInt(id) } });
        return res.status(200).json(expenseSubCategory);
    } catch (error) {
        console.error("Error deleting expense sub category:", error);
        return res.status(500).json("Internal server error");
    }
};

const getByCategory = async (req, res) => {
    try {
        const { category_id } = req.body;
        const expenseSubCategories = await prisma.expense_subcategories.findMany({ where: { expense_category_id: parseInt(category_id) } });
        return res.status(200).json(expenseSubCategories);
    } catch (error) {
        console.error("Error fetching expense sub categories by category:", error);
        return res.status(500).json("Internal server error");
    }
};

export { index, create, getSingle, destroy, getByCategory };