export function hxGetProducts(req, res, data) {
    const hxTrigger = req.header('hx-trigger');
    const target = req.header('hx-target');
    const { products, currentPage, totalPages, total } = data;
    console.log(products[0].categories);
    if (hxTrigger.startsWith('pills-')) {
        return res.render('snippets/pills', { products, layout: false, target });
    }
}