// MOCK: Hardcoded data for analytics charts
// TODO (DBMS Project): Replace these with SQL GROUP BY and date-aggregation queries

export const getIncidentDistribution = async (req, res) => {
    try {
        const mockDistribution = [
            { type_name: 'Fire', count: 45 },
            { type_name: 'Flood', count: 30 },
            { type_name: 'Medical Emergency', count: 52 },
            { type_name: 'Road Accident', count: 15 }
        ];
        res.json(mockDistribution);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getIncidentTrends = async (req, res) => {
    try {
        const mockTrends = [
            { date: '2024-01-01', count: 5 },
            { date: '2024-01-02', count: 12 },
            { date: '2024-01-03', count: 8 },
            { date: '2024-01-04', count: 15 },
            { date: '2024-01-05', count: 3 },
            { date: '2024-01-06', count: 7 }
        ];
        res.json(mockTrends);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getResponseTrends = async (req, res) => {
    try {
        const mockResponseTrends = [
            { date: '2024-01-01', avg_time: 15.2 },
            { date: '2024-01-02', avg_time: 18.5 },
            { date: '2024-01-03', avg_time: 14.1 },
            { date: '2024-01-04', avg_time: 12.0 },
            { date: '2024-01-05', avg_time: 13.5 },
            { date: '2024-01-06', avg_time: 11.2 }
        ];
        res.json(mockResponseTrends);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
