var db = require("../config/connection");
var collections = require("../config/collections");
var bcrypt = require("bcrypt");
var ObjectId = require("mongodb").ObjectId;
var Razorpay = require('razorpay');
const { resolve } = require("path");

var instance = new Razorpay({ key_id: 'rzp_test_y3s5vVhYBefajW', key_secret: 'ZdIYekK5qd5f5LC63zgWs8dL' })

module.exports = {
  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      userData.Password = await bcrypt.hash(userData.Password, 10);
      db.get()
        .collection(collections.USER_COLLECTION)
        .insertOne(userData)
        .then((res) => {
          resolve(res);
        });
    });
  },

  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false;
      var response;
      let user = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .findOne({ Email: userData.Email });
      if (user) {
        bcrypt.compare(userData.Password, user.Password).then((status) => {
          if (status) {
            response = user;
            resolve(response);
          } else {
            reject("Incorrect password");
          }
        });
      } else {
        reject("User not found");
      }
    });
  },
  addToCart: (productId, userId) => {
    let proObj = {
      item: ObjectId(productId),
      quantity: 1,
    };

    return new Promise(async (resolve, reject) => {
      let userCart = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .findOne({ user: ObjectId(userId) });

      if (userCart) {
        let proExist = userCart.products.findIndex(
          (products) => products.item == productId
        );

        if (proExist != -1) {
          db.get()
            .collection(collections.CART_COLLECTION)
            .update(
              { user: ObjectId(userId), "products.item": ObjectId(productId) },
              {
                $inc: { "products.$.quantity": 1 },
              }
            )
            .then(() => {
              resolve();
            });
        } else {
          db.get()
            .collection(collections.CART_COLLECTION)
            .updateOne(
              { user: ObjectId(userId) },

              {
                $push: { products: proObj },
              }
            )
            .then(() => {
              resolve();
            });
        }
      } else {
        let cartObj = {
          user: ObjectId(userId),
          products: [proObj],
        };
        db.get()
          .collection(collections.CART_COLLECTION)
          .insertOne(cartObj)
          .then(() => {
            resolve();
          });
      }
    });
  },
  getCartProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cartItems = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: ObjectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collections.PRODUCTS_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();
      resolve(cartItems);
    });
  },
  getCartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cartCount = 0;
      let cart = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .findOne({ user: ObjectId(userId) });
      if (cart) {
        cartCount = cart.products.length;
      }
      resolve(cartCount);
    });
  },

  incrementQuantity: (details) => {
    return new Promise((resolve, reject) => {
      if (parseInt(details.count) == -1 && details.quantity == 1) {
        db.get()
          .collection(collections.CART_COLLECTION)
          .update(
            { _id: ObjectId(details.cart) },
            { $pull: { products: { item: ObjectId(details.product) } } }
          )
          .then(() => {
            resolve({ itemRemoved: true });
          });
      }

      db.get()
        .collection(collections.CART_COLLECTION)
        .update(
          {
            _id: ObjectId(details.cart),
            "products.item": ObjectId(details.product),
          },
          {
            $inc: { "products.$.quantity": parseInt(details.count) },
          }
        )
        .then((response) => {
          resolve(details);
        });
    });
  },

  removeFromCart: (details) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.CART_COLLECTION)
        .update(
          { _id: ObjectId(details.cartId) },
          {
            $pull: { products: { item: ObjectId(details.proId) } },
          }
        )
        .then(() => {
          resolve({ itemRemoved: true });
        });
    });
  },

  getTotalPrice: (userId) => {
    return new Promise(async (resolve, reject) => {
      let Total = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: ObjectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collections.PRODUCTS_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: { $multiply: ["$quantity", "$product.dealprice"] },
              },
            },
          },
        ])
        .toArray();
      resolve(Total[0].total);
    });
  },

  placeOrder: (order, products, total) => {
    return new Promise((resolve, reject) => {
      let status = order.paymentmethod === "COD" ? "placed" : "pending";
      var dateObj = new Date();
      var month = dateObj.getUTCMonth() + 1; //months from 1-12
      var day = dateObj.getUTCDate();
      var year = dateObj.getUTCFullYear();

      newdate = year + "/" + month + "/" + day;

      let orderObj = {
        deliveryDetails: {
          name: order.name,
          mobile: order.mobile,
          pincode: order.pincode,
          place: order.place,
          address: order.address,
          city: order.city,
          state: order.state,
          landmark: order.landmark,
          alternatephone: order.alternatephone,
          paymentmethod: order.paymentmethod,
        },
        products: products,
        userId: ObjectId(order.userID),
        totalAmount: total,
        status: status,
        date: newdate,
      };

      db.get()
        .collection(collections.ORDER_COLLECTION)
        .insertOne(orderObj)
        .then((response) => {
          db.get()
            .collection(collections.CART_COLLECTION)
            .deleteOne({ user: ObjectId(order.userID) });
          resolve(orderObj);
        });
    });
  },
  getCartProductsList: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cart = await db
        .get()
        .collection(collections.CART_COLLECTION)
        .findOne({ user: ObjectId(userId) });
      resolve(cart.products);
    });
  },

  getOrderDetails: (user) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collections.ORDER_COLLECTION)
        .findOne({ userId: ObjectId(user) })
        .then((response) => {
          resolve(response);
        });
    });
  },

  getUserOrders: (user) => {
    return new Promise(async (resolve, reject) => {
      let userOrders = await db
        .get()
        .collection(collections.ORDER_COLLECTION)
        .find({ userId: ObjectId(user) })
        .toArray();
      resolve(userOrders);
    });
  },

  getOrderProducts:(orderId)=> {
    return new Promise(async(resolve,reject)=> {

      let orderProducts = await db
        .get()
        .collection(collections.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { _id: ObjectId(orderId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collections.PRODUCTS_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();
      resolve(orderProducts);

    })
  },

  createOrderRazorpay:(orderId,total)=> {
    return new Promise((resolve,reject)=> {
      var totalAmount = total * 100
      instance.orders.create({
        amount: totalAmount,
        currency: "INR",
        receipt: ""+orderId,
        notes: {
          key1: "value3",
          key2: "value2"
        }
      },function(err, response){
        if (err){
          console.log(err);
        }else{
          resolve(response)
        }
      })
    })
  },


  verifyPayment:(details)=> {
    return new Promise((resolve,reject)=> {
      const crypto = require('crypto')
      let hmac = crypto.createHmac('sha256','ZdIYekK5qd5f5LC63zgWs8dL')

      hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]']);
      hmac = hmac.digest('hex')

      console.log(hmac,details['payment[razorpay_signature]']);

      if(hmac == details['payment[razorpay_signature]']){
        resolve()
      }else{
        reject()
      }

    })
  },
  
  getAllProducts:()=> {
    return new Promise(async(resolve,reject)=> {
     let products = await db.get().collection(collections.PRODUCTS_COLLECTION).find().toArray()
     resolve(products)
    })
  },

  getProductsByCategory:(productCategory)=> {
    return new Promise(async(resolve,reject)=> {
      let products = await db.get().collection(collections.PRODUCTS_COLLECTION).find({category:productCategory}).toArray()
      resolve(products)
    })
  }


};
