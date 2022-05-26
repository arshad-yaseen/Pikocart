var db = require('../config/connection')
var collections = require('../config/collections')
var ObjectId = require('mongodb').ObjectId
module.exports = {
    addProduct:(product, callback)=> {
        db.get().collection(collections.PRODUCTS_COLLECTION).insertOne(product).then(()=> {
            callback(product._id)
        })
    },
    getAllProducts: ()=> {
        return new Promise(async(resolve,reject)=> {
            let products =await db.get().collection(collections.PRODUCTS_COLLECTION).find().toArray()
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
                    colors: product.colors,
                    sizes: product.sizes
                }
            }).then(()=> {
                resolve()
            })
        })
    }
}