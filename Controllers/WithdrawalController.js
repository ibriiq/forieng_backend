import Joi from "joi";


const index = async (req, res) => {
    try {
        const withdrawals = await prisma.withdrawals.findMany();
        return res.status(200).json(withdrawals);
    } catch (error) {
        console.error("Error fetching withdrawals:", error);
        return res.status(500).json("Internal server error");
    }
};

const create = async (req, res) => {
    try {

        const { error, value } = Joi.object({
            amount: Joi.number().required(),
            description: Joi.string().required(),
            category: Joi.number().required(),
            subCategory: Joi.number().required(),
            department: Joi.number().required(),
            priority: Joi.string().required(),
            justification: Joi.string().required(),
            requestedBy: Joi.string().required(),
        }).validate(req.body);

        if (error) return res.status(400).json({ error: error.details[0].message });

        const { amount, description, category, subCategory, department, priority, justification, requestedBy } = value;
        const withdrawal = await prisma.withdrawals.create({
            data: {
                amount,
                priority: priority,
                description,
                expense_category: category,
                expense_sub_category: subCategory,
                department_id: department,
                requested_by: requestedBy,
                business_justification: justification,
                created_by: req.user.id,
                created_at: new Date(),
                status: "compeleted",
                reference: "WTH-" + (new Date().getFullYear()) + "-" + String(await prisma.withdrawals.count() + 1).padStart(4, '0')
            },
        });
        return res.status(200).json(withdrawal);
    } catch (error) {
        console.error("Error creating withdrawal:", error);
        return res.status(500).json("Internal server error");
    }
};

const getSingle = async (req, res) => {
    try {
        const { id } = req.body;
        const withdrawal = await prisma.withdrawals.findUnique({ where: { id: parseInt(id) } });
        return res.status(200).json(withdrawal);
    } catch (error) {
        console.error("Error fetching withdrawal:", error);
        return res.status(500).json("Internal server error");
    }
};

const destroy = async (req, res) => {
    try {
        const { id } = req.body;
        const withdrawal = await prisma.withdrawals.delete({ where: { id: parseInt(id) } });
        return res.status(200).json(withdrawal);
    } catch (error) {
        console.error("Error deleting withdrawal:", error);
        return res.status(500).json("Internal server error");
    }
};


const history = async (req, res) => {
    try {
        const history = await prisma.$queryRaw`
                select cast(created_at as Date) date, cast(created_at as time) time, amount,'revenue' description, 'revenue' type, 
                'completed' status, '' reference  from payments
                union all
                select cast(created_at as Date) date,cast(created_at as time) time, -amount, 'withdrawal' description, 'withdrawal' type,
                status, reference
                from withdrawals`;
        return res.status(200).json(history);
    } catch (error) {
        console.error("Error fetching history:", error);
        return res.status(500).json("Internal server error");
    }
};

const balance = async (req, res) => {
    try {
        const balance = await prisma.$queryRaw`
                select sum(payment)-sum(wth) balance from (
                select sum(cast(amount as money)) as payment, 0 wth from payments
                union all
                select 0 payment,sum(cast(amount as money)) as wth from withdrawals
            )z`;
        return res.status(200).json(balance[0].balance ? balance[0].balance : 0);
    } catch (error) {
        console.error("Error fetching balance:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};




const dashboard_cards = async (req, res) => {
    try {
        const total_revenue = await prisma.$queryRaw`
                select sum(cast(amount as money)) as total from payments`;

        const this_month_revenue = await prisma.$queryRaw`
                select sum(cast(amount as money)) as total from payments where cast(created_at as Date) = cast(getdate() as Date)`;


        const total_pending_withdrawals = await prisma.$queryRaw`
                select sum(cast(amount as money)) as total from withdrawals where status = 'pending'`;

        const total_withdrawals = await prisma.$queryRaw`
                select sum(cast(amount as money)) as total from withdrawals`;


        return res.status(200).json({
            total_revenue: total_revenue[0].total ? total_revenue[0].total : 0,
            total_withdrawals: total_withdrawals[0].total ? total_withdrawals[0].total : 0,
            total_pending_withdrawals: total_pending_withdrawals[0].total ? total_pending_withdrawals[0].total : 0,
            this_month_revenue: this_month_revenue[0].total ? this_month_revenue[0].total : 0
        });
    } catch (error) {
        console.error("Error fetching total revenue:", error);
        return res.status(500).json("Internal server error");
    }
};



export { index, create, getSingle, destroy, history, balance, dashboard_cards };