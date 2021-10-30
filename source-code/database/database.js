const mongoose = require("mongoose");

const uri = "mongodb://localhost:27017/parakeet";

mongoose.connect(uri, { useUnifiedTopology: true, useNewUrlParser: true, useFindAndModify: false });

const connection = mongoose.connection;

connection.once("open", () => {
  console.log("Połaczono z bazą danych");
});



