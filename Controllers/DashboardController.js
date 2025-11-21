import prisma from "../lib/prisma.js";

const analytics = async (req, res) => {
    try {
        const analytics = await prisma.$queryRaw`
        select sum(total_foreigners) as total_foreigners, sum(total_active_applications) as total_active_applications, sum(total_pending_applications) as total_pending_applications from (
            SELECT count(*) as total_foreigners, 0 as total_active_applications, 0 as total_pending_applications FROM foreigners
            union all
            SELECT 0 as total_foreigners, count(*) as total_active_applications, 0 as total_pending_applications FROM applications where status <> 'under_review'
            union all
            SELECT 0 as total_foreigners, 0 as total_active_applications, count(*) as total_pending_applications FROM applications where status = 'Pending'
    )z
        `;
        return res.status(200).json(analytics);
    } catch (error) {
        console.error("Error fetching analytics:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Get key metrics for dashboard cards
const getKeyMetrics = async (req, res) => {
    try {
        // Calculate total foreigners
        const totalForeigners = await prisma.foreigners.count();

        // Calculate monthly increase (current month registrations)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyIncrease = await prisma.foreigners.count({
            where: {
                created_at: {
                    gte: startOfMonth
                }
            }
        });

        // Get active sponsors (verified and active status)
        const activeSponsors = await prisma.sponsors.count({
            where: {
                status: 'active'
            }
        });

        // Get pending incidents (applications with status 'Pending' that require attention)
        const pendingIncidents = await prisma.applications.count({
            where: {
                status: 'Pending'
            }
        });

        // Get expiring documents (applications with expiry_date in next 30 days)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const expiringDocuments = await prisma.applications.count({
            where: {
                expiry_date: {
                    gte: new Date(),
                    lte: thirtyDaysFromNow
                }
            }
        });

        return res.status(200).json({
            totalForeigners,
            monthlyIncrease,
            activeSponsors,
            pendingIncidents,
            expiringDocuments
        });
    } catch (error) {
        console.error("Error fetching key metrics:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Get registration and deportation trends (monthly data)
const getRegistrationTrends = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        
        // Get monthly registration data for current year
        const registrationData = await prisma.$queryRaw`
            SELECT 
                MONTH(entry_date) as month,
                COUNT(*) as registrations
            FROM foreigners
            WHERE YEAR(entry_date) = ${currentYear}
            GROUP BY MONTH(entry_date)
            ORDER BY month
        `;

        // For deportation, we'll use applications with certain statuses or expired applications
        // Since there's no explicit deportation field, we'll consider expired applications
        // or applications where expiry_date has passed - adjust logic as needed based on your business rules
        // const deportationData = await prisma.$queryRaw`
        //     SELECT 
        //         MONTH(expiry_date) as month,
        //         COUNT(*) as deportations
        //     FROM applications
        //     WHERE YEAR(expiry_date) = ${currentYear}
        //     AND expiry_date < GETDATE()
        //     GROUP BY MONTH(expiry_date)
        //     ORDER BY month
        // `;

        // Format data for chart (ensure all months are included)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formattedData = months.map((monthName, index) => {
            const monthNumber = index + 1;
            const registration = registrationData.find(r => r.month === monthNumber);
            const deportation = 0;
            
            return {
                month: monthName,
                registrations: registration ? parseInt(registration.registrations) : 0,
                deportations: 0
            };
        });

        return res.status(200).json(formattedData);
    } catch (error) {
        console.error("Error fetching registration trends:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Get nationality distribution (pie chart data)
const getNationalityDistribution = async (req, res) => {
    try {
        const nationalityData = await prisma.$queryRaw`
            SELECT 
                settings.name,
                COUNT(*) as value
            FROM foreigners
            join settings on foreigners.nationality = settings.id
            GROUP BY settings.name
            ORDER BY value DESC
        `;


        return res.status(200).json(nationalityData);
    } catch (error) {
        console.error("Error fetching nationality distribution:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Get recent alerts
const getRecentAlerts = async (req, res) => {
    try {
        const alerts = [];

        // Check for expiring documents
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const expiringCount = await prisma.applications.count({
            where: {
                expiry_date: {
                    gte: new Date(),
                    lte: thirtyDaysFromNow
                }
            }
        });

        if (expiringCount > 0) {
            alerts.push({
                message: `${expiringCount} documents expiring in next 30 days`,
                timestamp: new Date(),
                type: 'warning',
                priority: 'warning'
            });
        }

        // Check for new sponsor applications (sponsors created in last 24 hours)
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        const recentSponsors = await prisma.sponsors.findMany({
            where: {
                created_at: {
                    gte: oneDayAgo
                }
            },
            select: {
                id: true,
                region: true,
                created_at: true
            }
        });

        recentSponsors.forEach(sponsor => {
            alerts.push({
                message: `New sponsor application from ${sponsor.region || 'unknown'} region`,
                timestamp: sponsor.created_at,
                type: 'info',
                priority: 'info'
            });
        });

        // Check for high-risk individuals (pending applications with urgent status)
        const urgentApplications = await prisma.applications.findMany({
            where: {
                status: 'Pending',
                note: {
                    contains: 'high-risk'
                }
            },
            take: 1,
            orderBy: {
                created_at: 'desc'
            }
        });

        if (urgentApplications.length > 0) {
            alerts.push({
                message: 'High-risk individual flagged in system',
                timestamp: urgentApplications[0].created_at,
                type: 'urgent',
                priority: 'urgent'
            });
        }

        // Monthly report generation alert (simulated - you might have actual report generation logic)
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        alerts.push({
            message: 'Monthly report generated successfully',
            timestamp: lastMonth,
            type: 'success',
            priority: 'success'
        });

        // Sort by timestamp (most recent first) and limit to 10
        alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Format timestamps to show relative time
        const formattedAlerts = alerts.slice(0, 10).map(alert => {
            const timeAgo = getTimeAgo(alert.timestamp);
            return {
                ...alert,
                timeAgo
            };
        });

        return res.status(200).json(formattedAlerts);
    } catch (error) {
        console.error("Error fetching recent alerts:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Get weekly incident trends (line chart data)
const getWeeklyIncidentTrends = async (req, res) => {
    try {
        // Get current date and calculate last 5 weeks
        const now = new Date();
        const weeks = [];

        for (let i = 4; i >= 0; i--) {
            const weekEnd = new Date(now);
            weekEnd.setDate(weekEnd.getDate() - (i * 7));
            const weekStart = new Date(weekEnd);
            weekStart.setDate(weekStart.getDate() - 7);

            // Count applications (incidents) for this week
            const count = await prisma.applications.count({
                where: {
                    created_at: {
                        gte: weekStart,
                        lt: weekEnd
                    }
                }
            });

            weeks.push({
                week: `W${5 - i}`,
                incidents: count
            });
        }

        return res.status(200).json(weeks);
    } catch (error) {
        console.error("Error fetching weekly incident trends:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Helper function to calculate time ago
const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) {
        return `${seconds} seconds ago`;
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }
    
    const days = Math.floor(hours / 24);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
};

export { 
    analytics, 
    getKeyMetrics, 
    getRegistrationTrends, 
    getNationalityDistribution, 
    getRecentAlerts, 
    getWeeklyIncidentTrends 
};