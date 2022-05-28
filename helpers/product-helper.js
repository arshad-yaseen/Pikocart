var db = require('../config/connection')
var collections = require('../config/collections')
var ObjectId = require('mongodb').ObjectId
module.exports = {
    addProduct:(product, callback)=> {
        db.get().collection(collections.PRODUCTS_COLLECTION).insertOne(product).then(()=> {
            callback(product._id)
        })
    },
    getSpecificNumberOfProducts: (number)=> {
        return new Promise(async(resolve,reject)=> {
            let products =await db.get().collection(collections.PRODUCTS_COLLECTION).aggregate([

                {
                    $sample: { size: number }
                }

            ]).toArray()
            resolve(products)
        })
    },
    deleteProduct: (productId) => {
        return new Promise((resolve,reject)=> {
            db.get().collection(collections.PRODUCTS_COLLECTION).deleteOne({_id: ObjectId(productId)}).then((response)=> {
                resolve(response)
            })
        })
    },
    getProductDetails: (productId)=> {
        return new Promise(async(resolve, reject)=> {
            let product = await db.get().collection(collections.PRODUCTS_COLLECTION).findOne({_id: ObjectId(productId)})
            resolve(product)
        })
    },
    updateProduct: (product, productId)=> {
        return new Promise((resolve, reject)=> {
            db.get().collection(collections.PRODUCTS_COLLECTION).update({_id: ObjectId(productId)},{
                $set:{
                    name: product.name,
                    description: product.description,
                    category: product.category,
                    maxprice: product.maxprice,
                    dealprice: product.dealprice,
                    keyword: product.keyword,
                    offerpers: product.offerpers,
                    highlights: product.highlights,
                    stock: product.stock,
                    color: product.color,
                    size: product.size
                }
            }).then(()=> {
                resolve()
            })
        })
    },

    getProductsByWords:(firstWord,secondWord)=> {
        return new Promise(async(resolve,reject)=> {
            if(secondWord != 'nothing'){

                let productsByFirstWord = await db.get().collection(collections.PRODUCTS_COLLECTION).find({description: {$regex : firstWord,'$options' : 'i'}}).toArray()

                let productsBySecondWord = await db.get().collection(collections.PRODUCTS_COLLECTION).find({description: {$regex : secondWord,'$options' : 'i'}}).toArray()


                resolve({productsByFirstWord,productsBySecondWord})
            }else{
                let productsByFirstWord = await db.get().collection(collections.PRODUCTS_COLLECTION).find({description: {$regex : firstWord,'$options' : 'i'}}).toArray()
                resolve({productsByFirstWord})
            }
        })
    }

}