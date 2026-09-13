const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI, { dbName: 'LENSPECT' }).then(async () => {
  const db = mongoose.connection.db;
  console.log("Connected to DB:", db.databaseName);
  
  const leaderboard = await db.collection('users').aggregate([
        { $match: { role: 'INSPECTOR' } },
        {
            $lookup: {
                from: "inspections",
                localField: "_id",
                foreignField: "inspector",
                as: "inspections"
            }
        },
        {
            $project: {
                inspector: {
                    _id: "$_id",
                    fullName: "$fullName",
                    email: "$email",
                    username: "$username"
                },
                totalScans: { $size: "$inspections" },
                compliantScans: {
                    $size: {
                        $filter: {
                            input: "$inspections",
                            as: "ins",
                            cond: { $eq: ["$$ins.complianceStatus", "COMPLIANT"] }
                        }
                    }
                },
                nonCompliantScans: {
                    $size: {
                        $filter: {
                            input: "$inspections",
                            as: "ins",
                            cond: { $eq: ["$$ins.complianceStatus", "NON_COMPLIANT"] }
                        }
                    }
                }
            }
        },
        { $sort: { totalScans: -1 } },
        { $limit: 10 },
        {
            $project: {
                _id: 0
            }
        }
    ]).toArray();
  
  console.log(JSON.stringify(leaderboard, null, 2));
  mongoose.disconnect();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
