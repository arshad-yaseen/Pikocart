
var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helper');
const userHelpers = require('../helpers/user-helper');


// VERIFY IS STAFF LOGGED IN FUNCTION
let verifyStaffLogin=(req,res,next)=> {
  if(req.session.staff){
    next()
  }else{
    res.redirect('/staff-login')
  }
}

/* GET users listing. */
router.get('/', verifyStaffLogin, function(req, res, next) {
  userHelpers.getAllProducts().then((products)=> {
    console.log(products);
    res.render('admin/view-products', {admin: true, products})
  })
});

router.get('/add-product',verifyStaffLogin, function(req, res){
  res.render('admin/add-product', {admin:true})
})

router.post('/add-product', async function(req, res){
  productHelpers.addProduct(req.body,(result)=> {
    let mainImage = req.files.mainImage
    var imageExtension = mainImage.name.split('.').pop();
    mainImage.mv('./public/product-images/' + result + '.' + imageExtension, (err)=> {
      if (!err) {
        res.render('admin/add-product', {admin:true})
      }else{
        console.log(err);
      }
    })

  })
});

router.get('/delete-product/:id',verifyStaffLogin,(req,res)=> {
  let productId = req.params.id
  productHelpers.deleteProduct(productId).then((response)=> {
    res.redirect('/admin')
  })
})

router.get('/edit-product/:id',verifyStaffLogin, async(req,res)=> {
  let productId = req.params.id
  let product =await productHelpers.getProductDetails(productId) 
  res.render('admin/edit-product',{product,admin: true})
})

router.post('/edit-product',(req,res)=> {

    let id = req.body.id
    productHelpers.updateProduct(req.body, id).then(()=> {
      res.redirect('/admin')
    })

    if (req.files) {
    let mainImage = req.files.mainImage
    var imageExtension = mainImage.name.split('.').pop();
    mainImage.mv('./public/product-images/' + id + '.' + imageExtension)
    }
})



module.exports = router;
