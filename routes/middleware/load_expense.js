var Expense = require('../../data/models/expense');

function loadExpense(req, res, next) {  
    Expense.findOne({_id: req.params.id})
        .exec(function(err, expense) {
            if (err) { return next(err) }
            if (!expense) { return res.send('Not found', 404) }
            req.expense = expense;
            next();    
        }); 
}

module.exports = loadExpense;
