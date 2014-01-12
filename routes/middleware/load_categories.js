var async = require('async');

var Expense = require('../../data/models/expense');
var Category = require('../../data/models/category');

function loadCategories(req, res, next) {
    Category.find().sort("name")
        .exec(function (err, categories) {
            if (err) { return next(err) }
            req.categories = categories;
            next();
        })
}

function loadCategoriesFreq(req, res, next) {  
    // select categories in order of frequency
    async.parallel([
        // get categories list
        function (next) {
            Category.find().exec(next);
        },

        // getc frequency
        function (next) {
            Expense.aggregate([
                { $project: { category: "$category"} },
                { $group: { _id: "$category", cnt: { $sum: 1 }} }
            ], next)
        }
    ], 
    function (err, res) {
        if (err) { return next(err) }

        var categories = res[0];
        var freqs = res[1];
        var dict = {};
        freqs.forEach(function (el) { dict[el._id] = el.cnt });
        categories.sort(function (cat1, cat2) { 
            var val1 = (dict[cat1._id] || 0),
                val2 = (dict[cat2._id] || 0);
            if (val2 == val1) { return val1 > val2 ? 1 : -1 }
            return val2 - val1;
        });

        req.categories = categories;
        next();
    });
}

module.exports.loadCategories = loadCategories;
module.exports.loadCategoriesFreq = loadCategoriesFreq;
