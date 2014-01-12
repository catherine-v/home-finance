var Expense = require('../data/models/expense');

module.exports = function (app) {
    app.get('/report/overview', overview);
    app.get('/report/month', monthReport);
}

overview = function (req, res, next) {
    res.render('report/overview', {});
}

monthReport = function (req, res, next) {
    // get list of months
    Expense.aggregate([
            { $project: { key: { month: { $month: "$date" }, year: { $year: "$date"} }, _id: 0 } },
            { $group: { _id: "$key" } },
            { $sort: { '_id.year': -1, '_id.month': -1 } }
        ], 
        function (err, result) {
            if (err) { return next(err) }
            
            var monthList = result.map(function (row) { return row._id.year + '-' + row._id.month });
            var curMonth = req.query.month;
            if (curMonth == undefined) {
                curMonth = monthList[0];
            }
            res.render('report/month', {
                monthList: monthList,
                curMonth: curMonth
            })
        }
    );
}