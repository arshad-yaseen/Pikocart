var mongoClient = require('mongodb').MongoClient

const state = {
    db: null
}

module.exports.connect=function(done){

    let url = 'mongodb+srv://arshadyaseen:nk3B7pJ6vmnFsIZY@cluster0.o26x8dy.mongodb.net/?retryWrites=true&w=majority'
    let dbname = 'Pikocart'

    mongoClient.connect(url, (err, data)=> {
        if (err) return done(err)
        state.db=data.db(dbname)
        done()   
    })

}

module.exports.get=function(){
    return state.db
}