var mongoose = require('mongoose');

function readDate(handle) {
    if (!handle) { return null }
    return Date.parse(handle);
}

function readNumber(str) {
    if (!str) { return 0 }
    var num = str.replace(',', '.');
    if (isNaN(num)) { return 0 }
    return +num;
}

var ExpenseSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        set: readDate
    },
    name: {
        type: String,
        required: true
    },
    count: {
        type: Number,
        required: true,
        set: readNumber
    },
    price: {
        type: Number,
        required: true,
        set: readNumber
    },
    category: {
        type: mongoose.Schema.ObjectId,
        ref: 'Category'
    },
    created_at: Date
});

ExpenseSchema.virtual('sum').get(function () {
    return this.count * this.price;
});

ExpenseSchema.path('created_at')
    .default(function () { return new Date() })
    .set(function (val) { return undefined });

ExpenseSchema.methods.formatDate = function () {
    return this.date.toJSON().slice(0, 10)
    //return this.date.getDate() + '.' + (1 + this.date.getMonth()) + '.' + this.date.getFullYear()
}

ExpenseSchema.pre('save', function (next) {
    if (!this.isNew) {
        this.created_at = undefined;
    }
    next();
});

module.exports = ExpenseSchema;