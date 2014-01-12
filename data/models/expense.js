var mongoose = require('mongoose');
var ExpenseSchema = require('../schemas/expense');
	
var Expense = mongoose.model('Expense', ExpenseSchema);

module.exports = Expense;