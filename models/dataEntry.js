var mongoose = require("mongoose");

var dataEntrySchema = new mongoose.Schema({
    date: {default:'N/A',required:true, type:String},
    timeStamp: {required:true, type:String},
    headline: {default:'N/A',required:true, type:String},
    link: {default:'N/A',required:true, type:String},
    content: {default:'N/A', type:String},
    event: {default:'N/A',required:true, type:String},
    place: {default:'N/A',required:true, type:String},
    status: {default:'pending', type:String},
    locationInfo: {Type:Object}
});

module.exports = mongoose.model("dataEntry", dataEntrySchema);
