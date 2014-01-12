var mongoose = require('mongoose');

var CategorySchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        set: function (str) {
            return str.trim()
        }
    }
});

module.exports = CategorySchema;