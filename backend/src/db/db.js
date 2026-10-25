const mongoose = require("mongoose");
const foodPartnerModel = require("../models/foodpartner.model");

async function connectDB() {
  await mongoose.connect(process.env.MONGO_URL);
  await foodPartnerModel.init();

  const indexes = await foodPartnerModel.collection.indexes();
  const obsoleteNameIndex = indexes.find((index) => {
    const keys = Object.entries(index.key || {});
    return (
      index.unique === true &&
      keys.length === 1 &&
      keys[0][0] === "name" &&
      keys[0][1] === 1
    );
  });

  if (obsoleteNameIndex) {
    await foodPartnerModel.collection.dropIndex(obsoleteNameIndex.name);
    console.log(`Removed obsolete food partner index: ${obsoleteNameIndex.name}`);
  }

  console.log("Database Connected");
}

module.exports = connectDB;