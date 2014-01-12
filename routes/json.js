var Expense = require('../data/models/expense');
var Category = require('../data/models/category');

var categories = require('./middleware/load_categories');

module.exports = function (app) {
    app.get('/json/10days', data10Days);
    app.get('/json/month', dataMonth);
    app.get('/json/expense-overview', categories.loadCategoriesFreq, expenseOverview);
}

reportForPeriod = function (startDate, endDate, res, next) {
    var o = {};
    o.map = function () { emit(this.category, this.count * this.price) }
    o.reduce = function (cat, expenses) { return Array.sum(expenses) }
    o.query = {date: {$gte: startDate, $lte: endDate}};

    Expense.mapReduce(o, function (err, data) {
        if (err) { return next(err) }
        Category.populate(data, { path: "_id", select: "name" }, 
            function (err, spends) {
                if (err) { return next(err) }
                
                var sorted = spends.sort(function (a, b) { return b.value - a.value })
                    .map(function (el) { return [ el._id.name, parseFloat(el.value.toFixed(2)) ] });
                res.json(sorted);
            }
        ); 
    });
}

data10Days = function (req, res, next) {
    var endDate = new Date(),
        startDate = endDate - 10 * 24 * 60 * 60 * 1000;
    reportForPeriod(startDate, endDate, res, next);
}

dataMonth = function (req, res, next) {
    var month = req.query.month;
    var curMonthDate = new Date(month + '-1'),
        nextMonthDate = new Date(curMonthDate.getFullYear(), curMonthDate.getMonth() + 1, 1);

    reportForPeriod(curMonthDate, nextMonthDate-1, res, next);
}

expenseOverview = function (req, res, next) {
    Expense.aggregate([
        { $project: { 
            _id: 0, 
            key: { category: "$category", month: { $month: "$date" }, year: { $year: "$date" } }, 
            total: { $multiply: ["$price", "$count"] } } 
        },
        { $group: { _id: "$key", total: { $sum: "$total" } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ], 

    function (err, result) {
        if (err) { return next(err) }
        var data = [],
            catDict = {}, catArr = [], header = [];
        req.categories.forEach(function (cat) { 
            catDict[cat._id] = cat.name; 
            catArr.push(cat._id.toString());
            header.push(cat.name);
        });
        header.unshift("Month");
        data.push(header);
        var ind = 0, len = header.length;

        result.forEach(function (el) {
            var key = el._id.month + '/' + el._id.year;
            if (data[ind][0] != key) {
                // new month - new row in data
                data.push(new Array(len));
                ind += 1;
                data[ind][0] = key;
            }

            var catId = el._id.category.toString();
            if (catArr.indexOf(catId) >= 0) {
                data[ind][catArr.indexOf(catId) + 1] = parseFloat(el.total.toFixed(2));
            }
        });

        for (var i = 1; i < data.length; i++) {
            for (var j = 1; j < len; j++) {
                if (data[i][j] == undefined) data[i][j] = 0;
            }
        }
        //console.log(data);

        res.json(data);
    })
}