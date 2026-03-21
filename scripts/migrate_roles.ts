import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI as string;

if (!uri) {
  console.error("MONGODB_URI is missing. Run with --env-file=.env");
  process.exit(1);
}

async function run() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB via mongoose");
    const db = mongoose.connection.db;
    if (!db) throw new Error("DB connection failed");

    const users = db.collection('users');
    const leads = db.collection('leads');

    // 1. Rename 'ceo' to 'super_admin'
    const ceoResult = await users.updateMany(
      { role: 'ceo' },
      { $set: { role: 'super_admin' } }
    );
    console.log(`Updated ${ceoResult.modifiedCount} users from 'ceo' to 'super_admin'`);

    // 2. Rename 'agent' to 'member'
    const agentResult = await users.updateMany(
      { role: 'agent' },
      { $set: { role: 'member' } }
    );
    console.log(`Updated ${agentResult.modifiedCount} users from 'agent' to 'member'`);

    // 3. Rename 'assignedAgentId' to 'assignedMemberId' in leads
    const leadsResult = await leads.updateMany(
      { assignedAgentId: { $exists: true } },
      { $rename: { 'assignedAgentId': 'assignedMemberId' } }
    );
    console.log(`Renamed 'assignedAgentId' to 'assignedMemberId' in ${leadsResult.modifiedCount} leads`);

  } finally {
    await mongoose.disconnect();
    console.log("Migration complete.");
  }
}

run().catch(console.dir);
