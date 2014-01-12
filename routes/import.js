var csv = require('csv'),
    async = require('async'),
    fs = require('fs'),
    Log = require('log');

var Expense = require('../data/models/expense');
var Category = require('../data/models/category');

var loadCategories = require('./middleware/load_categories').loadCategories;

module.exports = function (app) {
    app.get('/import', chooseFile);
    app.post('/import', loadCategories, load);
    app.del('/clear', clearExpenses);
    app.get('/export', exportForm);
    app.post('/export', exportData);
}

chooseFile = function(req, res, next) {
    res.render('import/import');
}

load = function(req, res, next) {
    var total = 0;
    var minDate = new Date(2100, 1, 1), 
        maxDate = new Date(1900, 1, 1), 
        startDate = undefined;
    var categories = {};
    var logger = new Log('info', fs.createWriteStream('import' + 
        (new Date()).toJSON().slice(0, 19).replace(/[-.,:T\s]/g, "") + '.log'));

    req.categories.forEach(function (obj) {
        categories[obj.name] = obj._id;
    })


    function addExpense(data, callback) {

        function createExpense(categoryId) {
            data.category = categoryId;
            Expense.create(data, function (err, expense) {
                if (err) { return callback(err) }
                if (minDate > expense.date) minDate = expense.date;
                if (maxDate < expense.date) maxDate = expense.date;
                if (startDate == undefined) startDate = expense.created_at;
                callback();
            });
        }

        if (data.category in categories) { createExpense(categories[data.category]) }
        else {
            Category.create({'name': data.category}, function (err, category) {
                if (err) { 
                    if (err.code == 11000) { createExpense(categories[data.category]) }
                    else { callback(err) }
                }
                else {
                    logger.info('New category "%s" is created', category.name);
                    categories[category.name] = category._id;
                    createExpense(category._id);
                }
            })
        }
    }

    var queue = async.queue(addExpense, 5);
    queue.drain = function () {
        logger.info("Total records imported: %d", total);
        if (req.body.override) {
            // Remove old values
            Expense.remove(
                { created_at: {$lt: startDate}, date: {$lte: maxDate, $gte: minDate} }, 
                function (err) {
                    if (err) { 
                        logger.error('Error deleting old recodrs: %s', err.message);
                        return next(err) 
                    }
                    res.redirect('/');
                })
        }
        else res.redirect('/');
    }

    // parse csv file
    logger.info('Importing from %s', req.files.file.name);
    csv().from.path(req.files.file.path, { encoding: 'utf8', columns: true })
        .on('record', function(row, index) {
            queue.push(row, function (err, result) {
                if (err) { 
                    logger.error('Error during row processing: %s', err.message);
                    return
                }
                total += 1;
            })
        })
        .on('error', function(err) {
            logger.error('Error reading the file: %s', err.message);
            return next(err);
        });
}

clearExpenses = function (req, res, next) {
    Expense.remove({}, function (err) {
        if (err) { return next(err) }
        res.redirect('/')
    })
}

exportForm = function (req, res, next) {
    res.render('import/export');
}

exportData = function (req, res, next) {
    var startDate = req.body.start,
        endDate = req.body.end;
    var fileName = 'export' + (new Date()).toJSON().slice(0, 19).replace(/[-.,:T\s]/g, "") + '.csv';
    Expense.find({ date: { $gte: startDate, $lte: endDate }})
        .sort('-date name')
        .populate('category')
        .exec(function (err, expenses) {
            csv()
            .from.array(expenses, {
                columns: ['date', 'name', 'count', 'price', 'category']
            })
            .to.path(fileName, {
                header: true,
                encoding: 'utf8',
                quoted: true
            })
            .transform(function (row, index) {
                row.category = row.category.name;
                row.date = row.date.toJSON().slice(0, 10);
                return row;
            })
            .on('error', function (err) {
                return next(err);
            })
            .on('close', function () {
                res.download(fileName);
            });
        })
}