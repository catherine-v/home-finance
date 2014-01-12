var Category = require('../../data/models/category');

function loadCategory(req, res, next) {  
    Category.findOne({_id: req.params.id})
        .exec(function(err, category) {
            if (err) { return next(err) }
            if (!category) { return res.send('Not found', 404) }
            req.category = category;
            next();    
        }); 
}

module.exports = loadCategory;
