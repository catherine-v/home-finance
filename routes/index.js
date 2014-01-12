var async = require('async');

var Expense = require('../data/models/expense');
var Category = require('../data/models/category');

var expensePerPage = 30;

module.exports = function (app) {
	app.get('/', index);
}

index = function(req, res, next) {
    var p = req.query.p && parseInt(req.query.p, 10) || 1;

    async.parallel([
        // select expenses for current page
        function (next) {
            Expense.find()
                .skip(expensePerPage * (p-1))
                .limit(expensePerPage)
                .populate('category')
                .sort('-date name')
                .exec(next)
        },

        // select total amount of expenses
        function (next) {
            Expense.count(next)
        }
    ], 

    function (err, result) {
        if (err) { return next(err) }

        var expenses = result[0];
        var count = result[1];
        var lastPage = p * expensePerPage >= count;

        res.render('index', { 
            expenses: expenses,
            page: p,
            totalPages: Math.ceil(count / expensePerPage),
            lastPage: lastPage
        });

    });
};