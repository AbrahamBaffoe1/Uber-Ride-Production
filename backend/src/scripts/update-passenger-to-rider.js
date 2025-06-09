/**
 * Migration script to update users with 'passenger' role to 'rider' role 
 * when accessed through the rider app
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../mongodb/models/User');

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

// Update passenger users to rider role
async function updatePassengerToRider() {
  try {
    // Find all users with passenger role that have accessed the rider app
    // (We'll identify them by checking if they have riderProfile data or location data)
    const users = await User.find({ 
      role: 'passenger',
      $or: [
        { 'riderProfile': { $exists: true } },
        { 'lastRiderAppLogin': { $exists: true } }
      ]
    });

    console.log(`Found ${users.length} users to update from passenger to rider role`);

    if (users.length === 0) {
      console.log('No users need to be updated. Exiting...');
      return;
    }

    // Update each user's role to 'rider'
    let updateCount = 0;
    for (const user of users) {
      // Update directly with updateOne to bypass validation
      await User.updateOne(
        { _id: user._id },
        { $set: { role: 'rider' } }
      );
      updateCount++;
      
      if (updateCount % 10 === 0) {
        console.log(`Updated ${updateCount}/${users.length} users...`);
      }
    }

    console.log(`Successfully updated ${updateCount} users from passenger to rider role`);
  } catch (error) {
    console.error('Error updating users:', error);
  }
}

// Main function
async function main() {
  await connectToDatabase();
  await updatePassengerToRider();
  mongoose.connection.close();
  console.log('Database connection closed');
}

// Run the script
main();
