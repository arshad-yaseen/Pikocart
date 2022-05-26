function addToCart(proId){
    $.ajax({
        url: '/add-to-cart/'+proId,
        method: 'get',
        success:(response)=> {
            if(response.status){
                let count_value = $("#cart-count").html()
                count_value=parseInt(count_value) + 1
                $("#cart-count").html(count_value)

            }
        }
    })
}