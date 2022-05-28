var express = require('express');
const { Db, ObjectId } = require('mongodb');
var router = express.Router();
var productHelpers = require('../helpers/product-helper')
var userHelpers = require('../helpers/user-helper')
var StaffHelpers = require('../helpers/staff-helper')

let staffCode = '9946'

/* GET home page. */
router.get('/', async function(req, res, next) {
  let user = req.session.user
  let cartCount = null
  if (req.session.user){
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  let electronics = await userHelpers.getProductsByCategory('electronics')
  let mobiles = await userHelpers.getProductsByCategory('mobile')
  let laptops = await userHelpers.getProductsByCategory('laptop')
  let home = await userHelpers.getProductsByCategory('home')

  let searchHistory =  await userHelpers.getSearchHistory(13)

  let staff = req.session.staff
  let delivery_boy = req.session.staff_type == 'deliveryBoy'
  
  productHelpers.getSpecificNumberOfProducts(4).then((products)=> {
    res.render('user/home-page', { products, user,cartCount,electronics,mobiles,laptops,home,searchHistory,staff,delivery_boy});
  })

});

// VERIFY IS USER LOGGED IN FUNCTION
let verifyLogin=(req,res,next)=> {
  if(req.session.user){
    next()
  }else{
    res.redirect('/login')
  }
}

// VERIFY IS STAFF LOGGED IN FUNCTION
let verifyStaffLogin=(req,res,next)=> {
  if(req.session.staff){
    next()
  }else{
    res.redirect('/staff-login')
  }
}

router.get('/login', function(req, res, next){
  if(req.session.userLoggedIn){
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
  req.session.user = null
  req.session.userLoggedIn = false
  res.redirect('/')
})

router.post('/signup',(req, res)=> {
  userHelpers.doSignup(req.body).then((response)=> {
    req.session.staff = null
    res.redirect('/')
  })
})
router.post('/login',(req, res)=> {
  userHelpers.doLogin(req.body).then((response)=> {
    req.session.userLoggedIn = true
    req.session.user = response
    req.session.staff = null
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

  let staff = req.session.staff
  let delivery_boy = req.session.staff_type == 'deliveryBoy'
  
  res.render('user/products',{products,user,cartCount,staff,delivery_boy})
})

router.get('/search',async (req,res)=> {

  userHelpers.searchHistory(req.query)

  var firstWord = 'nothing';
  var SecondWord = 'nothing';

  if(req.query.search.split(' ')[0]){
    firstWord = req.query.search.split(' ')[0]
  }
  if(req.query.search.split(' ')[1]){
    SecondWord = req.query.search.split(' ')[1]
  }
  
  let searchProducts = await productHelpers.getProductsByWords(firstWord,SecondWord)

  var products = [];
  
  if(searchProducts.productsBySecondWord){
     products = searchProducts.productsByFirstWord.concat(searchProducts.productsBySecondWord)
  }else{
     products = searchProducts.productsByFirstWord
  }

  let staff = req.session.staff
  let delivery_boy = req.session.staff_type == 'deliveryBoy'

  res.render('user/search-product',{products,staff,delivery_boy})

})

router.get('/staff-signup',(req,res)=> {
  if(req.session.staff){
    if(req.session.staff_type == 'normal'){
      res.redirect('/admin')
    }else{
      res.redirect('/delivery-manage-panel')
    }
  }else{
    res.render('user/staff-signup',{staffSignupErr:req.session.staffSignupErr})
    req.session.staffSignupErr = false
  }
})
router.post('/staff-signup',async(req,res)=> {
  StaffHelpers.doStaffSignup(req.body).then((response)=> {
    StaffHelpers.getStaff(response).then((response)=> {
      if(response.staff_code == staffCode){
        if(response.staff_type == 'normal') {
          req.session.staff = response
          req.session.staff_type = 'normal'
          req.session.user = null
          res.redirect('/admin')
        }else{
          req.session.staff = response
          req.session.staff_type = 'deliveryBoy'
          req.session.user = null
          res.redirect('/delivery-manage-panel')
        }
      }else{
        req.session.staffSignupErr = 'Incorrect staff code'
        res.redirect('/staff-signup')
      }
    })
  })
})

router.get('/staff-logout',(req,res)=> {
  req.session.staff = null
  res.redirect('/')
})

router.get('/staff-login',(req,res)=> {
  res.render('user/staff-login',{staffLoginErr:req.session.staffLoginErr})
  req.session.staffLoginErr = false
})

router.post('/staff-login',(req,res)=> {
  StaffHelpers.doLogin(req.body,staffCode).then((response)=> {
    console.log(response);
    req.session.staff = response
    req.session.user = null
    if(response.staff_type == 'normal'){
      req.session.staff_type = 'normal'
    }else{
      req.session.staff_type = 'deliveryBoy'
    }
      res.redirect('/')
  }).catch((err)=> {
    req.session.staffLoginErr = err
    res.redirect('/staff-login')
  })
})


router.get('/delivery-manage-panel',(req,res)=> {
  res.send('Manage your Orders')
})

module.exports = router;
