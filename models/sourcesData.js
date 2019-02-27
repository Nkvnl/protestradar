var mongoose = require("mongoose");

var sourcesDataEntry = new mongoose.Schema({
    source: {default:'N/A',required:true, type:String},
});

module.exports = mongoose.model("sourcesDataEntry", sourcesDataEntry);
