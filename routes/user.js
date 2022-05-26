var express = require('express');
const { Db } = require('mongodb');
var router = express.Router();
var productHelpers = require('../helpers/product-helper')
var userHelpers = require('../helpers/user-helper')

/* GET home page. */
router.get('/', async function(req, res, next) {
  let user = req.session.user
  let cartCount = null
  if (req.session.user){
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  productHelpers.getAllProducts().then((products)=> {
    res.render('user/home-page', { products, user,cartCount});
  })

});

// VERIFY IS USER LOGGED IN FUNCTION
let verifyLogin=(req,res,next)=> {
  if(req.session.loggedIn){
    next()
  }else{
    res.redirect('/login')
  }
}

router.get('/login', function(req, res, next){
  if(req.session.loggedIn){
    res.redirect('/')
  }else {
  res.render('user/login', {loginErr: req.session.loginErr})
  req.session.loginErr = null
  }
})

router.get('/signup', function(req, res, next){
  res.render('user/signup')
})
router.get('/logout', function(req, res, next){
  req.session.destroy()
  res.redirect('/')
})

router.post('/signup',(req, res)=> {
  userHelpers.doSignup(req.body).then((response)=> {
    res.redirect('/')
  })
})
router.post('/login',(req, res)=> {
  userHelpers.doLogin(req.body).then((response)=> {
    req.session.loggedIn = true
    req.session.user = response
      res.redirect('/')
  }).catch((err)=> {
    req.session.loginErr = err
    res.redirect('/login')
  })
})

router.get('/cart',verifyLogin,async(req,res)=>{
  let user = req.session.user
  let cartProducts =await userHelpers.getCartProducts(req.session.user._id)
  
  if(cartProducts.length != '0'){
    var subTotal = await userHelpers.getTotalPrice(req.session.user._id)
  }

  let isCartItemsZero = cartProducts.length == 0

  console.log(isCartItemsZero);

  let cartCount = null
  if (req.session.user){
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  let taxPers = 1 // 2 PERCENTAGE
  let shippingfee = 0;
  let tax = Math.trunc((taxPers / 100) * subTotal)
  let Total = subTotal + tax + shippingfee

  req.session.tax = tax

  res.render('user/cart',{user,cartProducts, subTotal, tax, shippingfee, Total, cartCount, isCartItemsZero})
})

router.get('/add-to-cart/:id', (req, res)=> {
  userHelpers.addToCart(req.params.id,req.session.user._id).then((response)=> {
    res.json({status: true})
  })
})

router.post('/increment-product-quantity',(req,res)=> {
  userHelpers.incrementQuantity(req.body).then((response)=> {
    res.json(response)
  })
})

router.post('/remove-cart-product',(req,res)=> {
  userHelpers.removeFromCart(req.body).then((response)=> {
    res.json(response)
  })
})

router.get('/place-order',verifyLogin,async(req,res)=> {

  let tax = req.session.tax

  let total = await userHelpers.getTotalPrice(req.session.user._id)
  let totalPrice = total + tax
  
  let orderDetails = await userHelpers.getOrderDetails(req.session.user._id)

  let user = req.session.user
  let cartCount = null
  if (req.session.user){
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }

  res.render('user/place-order',{user,cartCount,totalPrice,orderDetails})
})

router.post('/place-order',async(req,res)=> {
  let products = await userHelpers.getCartProductsList(req.body.userID)
  let subTotal = await userHelpers.getTotalPrice(req.body.userID)
  let totalPrice = subTotal + req.session.tax 

  
  userHelpers.placeOrder(req.body,products,totalPrice).then((response)=> {
    req.session.order=response
    if(response.deliveryDetails.paymentmethod == 'COD'){
    res.json({codStatus:true})
    }else{
      userHelpers.createOrderRazorpay(response._id,totalPrice).then((response)=> {
        res.json(response)
      })
    }
  })
})

router.get('/order-placed',async(req,res)=> {
  let COD = true
  if(req.session.order){
    COD = req.session.order.status == 'placed'
    console.log(req.session.order);
  }

  let user = req.session.user
  let cartCount = null
  if (req.session.user){
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }

  res.render('user/order-placed',{order:req.session.order,COD,user,cartCount})
})

router.get('/my-orders',verifyLogin,async(req,res)=> {

  let user = req.session.user
  let cartCount = null
  if (req.session.user){
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }

  let orders =await userHelpers.getUserOrders(req.session.user._id)
  res.render('user/my-orders',{orders,user,cartCount})
})

router.get('/my-orders/products/:id',async(req,res)=> {

  let user = req.session.user
  let cartCount = null
  if (req.session.user){
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }

  let userOrderProducts = await userHelpers.getOrderProducts(req.params.id)
  res.render('user/order-products',{userOrderProducts,cartCount,user})
})

router.post('/verify-payment',(req,res)=> {
    userHelpers.verifyPayment(req.body).then((response)=> {
      res.json({status:true})
    }).catch((err)=> {
      res.json({status:false})
    })
})

router.get('/products/:category',async(req,res)=> {

  let user = req.session.user
  let cartCount = null
  if (req.session.user){
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }

  let products = []
  if(req.params.category == 'all'){
    products = await userHelpers.getAllProducts()
  }else{
    products = await userHelpers.getProductsByCategory(req.params.category)
  }
  res.render('user/products',{products,user,cartCount})
})


module.exports = router;
