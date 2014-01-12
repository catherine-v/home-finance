var async = require('async');

var Expense = require('../data/models/expense');

var loadExpense = require('./middleware/load_expense');
var categories = require('./middleware/load_categories');

var expensePerPage = 30;

module.exports = function (app) {
    app.get('/expense', categories.loadCategories, expenseList);
    app.get('/expense/new', categories.loadCategoriesFreq, addExpenseForm);
    app.post('/expense', addExpense);
    app.get('/expense/:id', loadExpense, categories.loadCategoriesFreq, editExpenseForm);
    app.put('/expense/:id', loadExpense, editExpense);
    app.delete('/expense/:id', loadExpense, deleteExpense);
}

expenseList = function (req, res, next) {
    var p = req.query.p && parseInt(req.query.p, 10) || 1;

    var filter = {};
    if (req.query.category) { filter.category = req.query.category }
    if (req.query.startDate && req.query.endDate) {
        filter.date = { $gte: req.query.startDate, $lte: req.query.endDate }
    }
    if (req.query.name) { filter.name = { $regex: req.query.name, $options: 'i'} }

    async.parallel([
        // select expenses for current page
        function (next) {
            Expense.find(filter)
                .skip(expensePerPage * (p-1))
                .limit(expensePerPage)
                .populate('category')
                .sort('-date name')
                .exec(next)
        },

        // select total amount of expenses
        function (next) {
            Expense.find(filter).count(next)
        },

        // calculate total
        function (next) {
            var o = {};
            o.map = function () { emit(1, this.count * this.price) }
            o.reduce = function (id, collection) { return Array.sum(collection) }
            o.query = filter;
            Expense.mapReduce(o, next);
        }
    ], 

    function (err, result) {
        if (err) { return next(err) }

        var expenses = result[0];
        var count = result[1];
        var total = result[2][0][0] ? result[2][0][0].value : 0;
        var lastPage = p * expensePerPage >= count;

        res.render('expense/list', { 
            expenses: expenses,
            categories: req.categories,
            filter: filter,
            total: total,
            page: p,
            totalPages: Math.ceil(count / expensePerPage),
            lastPage: lastPage
        });

    });
}

addExpenseForm = function(req, res) {
    res.render('expense/new', { 
        expense: { date: new Date() }, 
        categories: req.categories,
        action: '/expense',
        method: 'POST',
        actionName: 'Create',
        createNew: true
    });
}

addExpense = function(req, res, next) {
    var expense = req.body;
    Expense.create(expense, function (err, expense) {
        if (err) {
            if (err.name == 'ValidationError') {
                 return res.send(Object.keys(err.errors)
                           .map(function(errField) { return err.errors[errField].message })
                           .join('. '), 406);
            }
            else { return next(err) }
        }

        if (req.body.continue) { res.redirect('/expense/new') }
        else { res.redirect('/') }
    });
}

editExpenseForm = function(req, res) {
    var referer = req.headers.referer || '/';
    res.render('expense/new', { 
        expense: req.expense, 
        categories: req.categories,
        action: '/expense/' + req.expense._id,
        method: 'PUT',
        actionName: 'Update',
        referer: referer
    });
}

editExpense = function(req, res, next) {
    var newExpense = req.body;
    req.expense.update(newExpense, function (err) {
        if (err) {
            if (err.name == 'ValidationError') {
                 return res.send(Object.keys(err.errors)
                           .map(function(errField) { return err.errors[errField].message })
                           .join('. '), 406);
            }
            else { return next(err) }
        }

        if (req.body.referer) { res.redirect(req.body.referer) }
        else { res.redirect('/') }
    })
}


deleteExpense = function(req, res, next) {
    req.expense.remove(function(err) {
        if (err) { return next(err) }
        res.redirect('/');
    })
}