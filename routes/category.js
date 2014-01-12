var async = require('async');

var Category = require('../data/models/category');
var Expense = require('../data/models/expense');
var categories = require('./middleware/load_categories');
var loadCategory = require('./middleware/load_category');

var expensePerPage = 30;

module.exports = function (app) {
    app.get('/category', categories.loadCategories, categoriesList);
    app.get('/category/:name/expenses', expensesByCategory);
    app.get('/category/new', addCategoryForm);
    app.post('/category', addCategory);
    app.get('/category/:id', loadCategory, editCategoryForm);
    app.put('/category/:id', loadCategory, editCategory);
    app.delete('/category/:id', loadCategory, deleteCategory);
}

categoriesList = function (req, res, next) {
    var o = {};
    o.map = function () { emit(this.category, this.count * this.price) }
    o.reduce = function (cat, expenses) { return Array.sum(expenses) }
    Expense.mapReduce(o, function (err, result) {
        if (err) { next(err) }
        var total = {};
        result.forEach(function (el) { total[el._id] = el.value });
        res.render('category/list', {
            categories: req.categories,
            total: total
        })
    })
}

expensesByCategory = function (req, res, next) {
    var p = req.query.p && parseInt(req.query.p, 10) || 1;

    Category.findOne({ name: req.params.name }, 
        function (err, category) {
            if (err) { next(err) }

            async.parallel([
                // get expense list
                function (next) {
                    Expense.find({ category: category._id })
                        .skip(expensePerPage * (p-1))
                        .limit(expensePerPage)
                        .sort('-date')
                        .exec(next)
                },

                // select total amount of expenses
                function (next) {
                    Expense.find({ category: category._id }).count(next)
                }
            ],

            function (err, result) {
                if (err) { next(err) }

                var expenses = result[0];
                var count = result[1];

                res.render('category/expense_list', {
                    category: category,
                    expenses: expenses,
                    page: p,
                    lastPage: p * expensePerPage >= count,
                    totalPages: Math.ceil(count / expensePerPage)
                })

            })
        }
    );
}

addCategoryForm = function (req, res) {
    res.render('category/new', {
        category: { name: '' },
        action: '/category',
        method: 'POST',
        actionName: 'Create'
    })
}

addCategory = function (req, res, next) {
    Category.create(req.body, function (err, category) {
        if (err) { 
            if (err.name == 'ValidationError') {
                 return res.send(Object.keys(err.errors)
                           .map(function(errField) { return err.errors[errField].message })
                           .join('. '), 406);
            }
            else if (err.code == 11000) { console.log('Category "%s" already exists', req.body.name) }
            else { return next(err) }
        }
        res.redirect('/category')
    })
}

editCategoryForm = function (req, res) {
    res.render('category/new', {
        category: req.category,
        action: '/category/' + req.category._id,
        method: 'PUT',
        actionName: 'Update'
    })
}

editCategory = function (req, res, next) {
    req.category.update(req.body, function (err) {
        if (err) {
            if (err.name == 'ValidationError') {
                 return res.send(Object.keys(err.errors)
                           .map(function(errField) { return err.errors[errField].message })
                           .join('. '), 406);
            }
            else if (err.code == 11000) { console.log('Category "%s" already exists', req.body.name) }
            else { return next(err) }
        }
        res.redirect('/category')
    })
}

deleteCategory = function (req, res, next) {
    req.category.remove(function(err) {
        if (err) { return next(err) }
        res.redirect('/category');
    });
}