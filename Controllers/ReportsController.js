

export const index = async (req, res) => {
    try {
        const role_id = req.user.role_id;
        
        const reports = await prisma.$queryRaw`
        SELECT report_centers.* FROM report_centers
        join permissions on report_centers.permission = permissions.name
        join role_has_permissons on permissions.id = role_has_permissons.permission_id and role_has_permissons.role_id in (${role_id.join(',')})
        `;
        return res.status(200).json(reports);
    } catch (error) {
        console.error("Error fetching reports:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}


export const load_report = async (req, res) => {
    try {
        const { id } = req.body;
        let report_id = Buffer.from(id, 'base64').toString('utf-8');
        const report = await prisma.$queryRaw`
        SELECT * FROM report_centers where id = ${report_id}
        `;


        console.log("report", report[0].permission);


        const role_id = req.user.role_id;
        console.log("role_id", role_id.join(','));
        let reports = `
        SELECT permission_id FROM role_has_permissons
            join permissions on role_has_permissons.permission_id = permissions.id
            where role_has_permissons.role_id in (${role_id.join(',')}) and permissions.name = '${report[0].permission ? report[0].permission : ''}'
        `;

        console.log("reports", reports);

        const report_permission = await prisma.$queryRawUnsafe(reports);

        console.log("report_permission", report_permission);
        
        if(report_permission.length < 1) {
            return res.status(403).json("You are not authorized to access this report");
        }


        const report_parameters = await prisma.$queryRaw`
        SELECT * FROM report_parameters where report_id = ${report_id}
        `;



        return res.status(200).json({
            report: report[0] ? report[0] : null,
            report_parameters: report_parameters ? report_parameters : null
        });
    } catch (error) {
        console.error("Error fetching report:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}


export const run_report = async (req, res) => {
    try {
        const { id } = req.body;
        let report_id = Buffer.from(id, 'base64').toString('utf-8');
        const report = await prisma.$queryRaw`
        SELECT proc_name FROM report_centers where id = ${report_id}
        `;

        
        if (report.length > 0) {
            const proc_name = report[0].proc_name;
            console.log(req.body.filters);

            let filters = "";
            let count = 0;
            req.body.filters.forEach(filter => {
                filters += ` '${filter.value}'`;

                if(count < req.body.filters.length - 1) {
                    filters += ", ";
                }
                count++;
            });

            console.log(filters);
            
            let query = `EXEC ${proc_name} ${filters}`;

            console.log(query);

            // const result = await prisma.$queryRaw` exec ${proc_name} ${filters}`;
            const result = await prisma.$queryRawUnsafe(query);
            console.log(result);
            return res.status(200).json(result);
        } else {
            return res.status(404).json({ error: "Report not found" });
        }
    } catch (error) {
        return res.status(500).json("Internal server error");
    }
}


export const get_param_values = async (req, res) => {
    try {
        const { param_id } = req.body;
        const param_values = await prisma.$queryRaw`
        SELECT * FROM report_parameters where id = ${param_id}
        `;

        console.log("param_values", param_values);

        const sql = param_values[0].values ? param_values[0].values : '';
        if(sql) {
            const result = await prisma.$queryRawUnsafe(sql);
            return res.status(200).json(result);
        } else {
            return res.status(404).json({ error: "Param values not found" });
        }
        return res.status(200).json(result);
    } catch (error) {
        console.error("Error fetching param values:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}