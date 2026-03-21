import mongoose from 'mongoose';
import User from '../src/models/User';

const MONGODB_URI = process.env.MONGODB_URI;

async function fixDuplicateSuperAdmin() {
  await mongoose.connect(MONGODB_URI as string);
  
  const originalCeo = await User.findOne({ username: 'ceo@gharpayy' });
  const newlyCreatedAdmin = await User.findOne({ username: 'superadmin@gharpayy' });

  if (newlyCreatedAdmin && originalCeo) {
    await User.findByIdAndDelete(newlyCreatedAdmin._id);
    originalCeo.username = 'superadmin@gharpayy';
    originalCeo.email = 'superadmin@gharpayy';
    await originalCeo.save();
    console.log("Deleted the auto-generated duplicate account and successfully updated the original Super Admin credentials.");
  } else if (!originalCeo && newlyCreatedAdmin) {
     console.log("Original ceo@gharpayy doesn't exist anymore, superadmin@gharpayy is already setup!");
  } else if (originalCeo && !newlyCreatedAdmin) {
     originalCeo.username = 'superadmin@gharpayy';
     originalCeo.email = 'superadmin@gharpayy';
     await originalCeo.save();
     console.log("Successfully updated original Super Admin credentials.");
  }
  
  await mongoose.disconnect();
}

fixDuplicateSuperAdmin();
