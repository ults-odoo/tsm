odoo.define('bi_pos_restrict_stock.ProductsWidget', function(require) {
	"use strict";
	const Registries = require('point_of_sale.Registries');
	const ProductsWidget = require('point_of_sale.ProductsWidget');
    const {Product} = require('point_of_sale.models');
    const { onMounted } = owl;

	const BiProductsWidget = (ProductsWidget) =>
		class extends ProductsWidget {
			setup() {
                super.setup();
                var self = this;
                onMounted(() => this._mounted());
            }
            _mounted() {
                let self = this;
                self.env.services['bus_service'].addEventListener('notification', ({ detail: notifications }) => {
                    self.syncProdData(notifications);
                });
                
            }
			get productsToDisplay() {    
                	   let self = this;
				let prods = super.productsToDisplay;
				let order = self.env.pos.get_order();
                let locations = self.env.pos.locations;
                let picking_warehouse = self.env.pos.picking_type.warehouse_id[0];
                locations = locations.filter(loc => loc.warehouse_id[0] == picking_warehouse)
                if(self.env.pos.config.stock_type == 'onhand'){
                    $.each(prods, function( i, prd ){
                        prd['qty_available'] = 0;
                        let loc_onhand = JSON.parse(prd.quant_text);
                        var quantity_available=0
                        _.each(locations,function(location){
                            $.each(loc_onhand, function( k, v ){
                                if(location.id == k){
                                    quantity_available = quantity_available + v[0];
                                }
                            })
                        })
                        let remain_on_hand_qty = 0;
                        if(prd['bi_on_hand'] > 0){
                            var bi_on_hand = order.get_display_product_qty(prd)
                            quantity_available = quantity_available - bi_on_hand
                        }
                        else{
                            remain_on_hand_qty =  quantity_available
                            var reserved_qty = order.get_display_product_qty(prd);
                            remain_on_hand_qty = remain_on_hand_qty -reserved_qty
                        }
                        prd['qty_available']=quantity_available
                        prd['remain_on_hand_qty'] = remain_on_hand_qty

                    });
                }else if(self.env.pos.config.stock_type == 'virtual'){
                    $.each(prods, function( i, prd ){
                        let loc_available = JSON.parse(prd.quant_text);
                        prd['virtual_available'] = 0;
                        var virtual_available=0
                        let total = 0;
                        let out = 0;
                        let inc = 0;
                        _.each(locations,function(location){
                            $.each(loc_available, function( k, v ){
                                if(location.id == k){
                                    total += v[0];
                                    if(v[1]){
                                        out += v[1];
                                    }
                                    if(v[2]){
                                        inc += v[2];
                                    }
                                    let final_data = (total + inc) - out
                                    virtual_available = final_data;
                                }
                            })
                        })
                        let remain_virtual_qty = 0;
                        if(prd['bi_on_virtual']>0){
                            var bi_on_virtual = order.get_display_product_qty(prd);
                            virtual_available = virtual_available - bi_on_virtual
                        }
                        else{
                            remain_virtual_qty =  virtual_available
                            var reserved_qty = order.get_display_product_qty(prd);
                            remain_virtual_qty = remain_virtual_qty - reserved_qty;
                        }
                        prd['virtual_available']=virtual_available
                        prd['remain_virtual_qty'] = remain_virtual_qty
                    });
                }
                else if(self.env.pos.config.stock_type == 'both'){
                    $.each(prods, function( i, prd ){
                        let loc_available = JSON.parse(prd.quant_text);
                        prd['virtual_available'] = 0;
                        prd['qty_available'] = 0;
                        var virtual_available=0
                        var quantity_available=0
                        let total = 0;
                        let out = 0;
                        let inc = 0;
                        _.each(locations,function(location){
                            $.each(loc_available, function( k, v ){
                                if(location.id == k){
                                    total += v[0];
                                    if(v[1]){
                                        out += v[1];
                                    }
                                    if(v[2]){
                                        inc += v[2];
                                    }
                                    let final_data = (total + inc) - out
                                    virtual_available = final_data;
                                    quantity_available = quantity_available + v[0];
                                }
                            })
                        })
                        let remain_on_hand_qty = 0;
                        if(prd['bi_on_hand'] > 0){
                            var bi_on_hand = order.get_display_product_qty(prd)
                            quantity_available = quantity_available - bi_on_hand
                        }
                        else{
                            remain_on_hand_qty =  quantity_available
                            var reserved_qty = order.get_display_product_qty(prd);
                            remain_on_hand_qty = remain_on_hand_qty -reserved_qty
                        }
                        prd['qty_available']=quantity_available
                        prd['remain_on_hand_qty'] = remain_on_hand_qty
                        let remain_virtual_qty = 0;
                        if(prd['bi_on_virtual']>0){
                            var bi_on_virtual = order.get_display_product_qty(prd);
                            virtual_available = virtual_available - bi_on_virtual
                        }
                        else{
                            remain_virtual_qty =  virtual_available
                            var reserved_qty = order.get_display_product_qty(prd);
                            remain_virtual_qty = remain_virtual_qty - reserved_qty;
                        }
                        prd['virtual_available']=virtual_available
                        prd['remain_virtual_qty'] = remain_virtual_qty
                    });
                }
                if (this.searchWord !== '') {
                    return this.env.pos.db.search_product_in_category(
                        this.selectedCategoryId,
                        this.searchWord
                    );
                } else {
                    return this.env.pos.db.get_product_by_category(this.selectedCategoryId);
                }
            }
            syncProdData(notifications){
                let self = this;
                notifications.forEach(function (ntf) {
                    ntf = JSON.parse(JSON.stringify(ntf))
                    if(ntf && ntf.type && ntf.type == "product.product/sync_data"){
                        let prod = ntf.payload.product[0];
                        let old_category_id = self.env.pos.db.product_by_id[prod.id];
                        let new_category_id = prod.pos_categ_id[0];
                        let stored_categories = self.env.pos.db.product_by_category_id;

                        prod.pos = self.env.pos;
                        if(self.env.pos.db.product_by_id[prod.id]){
                            if(old_category_id.pos_categ_id){
                                stored_categories[old_category_id.pos_categ_id[0]] = stored_categories[old_category_id.pos_categ_id[0]].filter(function(item) {
                                    return item != prod.id;
                                });
                            }
                            if(stored_categories[new_category_id]){
                                stored_categories[new_category_id].push(prod.id);
                            }
                            let updated_prod = self.updateProd(prod);
                        }else{
                            let updated_prod = self.updateProd(prod);
                        }
                    }
                });
            }

            updateProd(product){
                let self = this;
                self.env.pos._loadProductProduct([product]);
                const productMap = {};
                const productTemplateMap = {};

                product.pos = self.env.pos; 
                product.applicablePricelistItems = {};
                productMap[product.id] = product;
                productTemplateMap[product.product_tmpl_id[0]] = (productTemplateMap[product.product_tmpl_id[0]] || []).concat(product);
                let new_prod =  Product.create(product);
                for (let pricelist of self.env.pos.pricelists) {
                    for (const pricelistItem of pricelist.items) {
                        if (pricelistItem.product_id) {
                            let product_id = pricelistItem.product_id[0];
                            let correspondingProduct = productMap[product_id];
                            if (correspondingProduct) {
                                self.env.pos._assignApplicableItems(pricelist, correspondingProduct, pricelistItem);
                            }
                        }
                        else if (pricelistItem.product_tmpl_id) {
                            let product_tmpl_id = pricelistItem.product_tmpl_id[0];
                            let correspondingProducts = productTemplateMap[product_tmpl_id];
                            for (let correspondingProduct of (correspondingProducts || [])) {
                                self.env.pos._assignApplicableItems(pricelist, correspondingProduct, pricelistItem);
                            }
                        }
                        else {
                            for (const correspondingProduct of product) {
                                self.env.pos._assignApplicableItems(pricelist, correspondingProduct, pricelistItem);
                            }
                        }
                    }
                }
                self.env.pos.db.product_by_id[product.id] = new_prod ;
            }
            
        };
	Registries.Component.extend(ProductsWidget, BiProductsWidget);

	return ProductsWidget;

});
